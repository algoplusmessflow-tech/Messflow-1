import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Phone, MapPin, Calendar, CreditCard, Package, Clock, CheckCircle, Pause, Play, FileText, LogOut, Loader2, UserPlus } from 'lucide-react';
import { formatDate } from '@/lib/format';

type Invoice = {
  id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
  due_date: string;
  created_at: string;
};

type Member = {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  map_link: string | null;
  status: string;
  joining_date: string;
  plan_expiry_date: string | null;
  monthly_fee: number;
  balance: number;
  plan_type: string;
};

export default function CustomerPortal() {
  const { ownerId, slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isRegisterMode = location.pathname.includes('/register');
  
  const [phone, setPhone] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [customer, setCustomer] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessSlug, setBusinessSlug] = useState('');
  const [ownerIdFromSlug, setOwnerIdFromSlug] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices'>('overview');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  // Registration form state
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerAddress, setRegisterAddress] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  useEffect(() => {
    const fetchBusinessInfo = async () => {
      if (ownerId) {
        const { data } = await supabase
          .from('profiles')
          .select('business_name')
          .eq('user_id', ownerId)
          .single();
        if (data) setBusinessName(data.business_name);
      } else if (slug) {
        // Try slug first, then user_id fallback
        let result = await supabase
          .from('profiles')
          .select('business_name, user_id')
          .eq('business_slug', slug)
          .maybeSingle();

        if (!result.data) {
          result = await supabase
            .from('profiles')
            .select('business_name, user_id')
            .eq('user_id', slug)
            .maybeSingle();
        }

        if (result.data) {
          setBusinessName(result.data.business_name);
          setBusinessSlug(slug);
          setOwnerIdFromSlug(result.data.user_id);
        }
      }
    };
    fetchBusinessInfo();
  }, [ownerId, slug]);

  const getOwnerId = () => ownerId || ownerIdFromSlug;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentOwnerId = getOwnerId();

    // Support both username/password and legacy phone login
    const hasCredentials = loginUsername.trim() && loginPassword.trim();
    const hasPhone = phone.trim();

    if (!hasCredentials && !hasPhone) {
      toast.error('Enter your username & password, or phone number');
      return;
    }
    if (!currentOwnerId) {
      toast.error('Portal not configured');
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('members')
        .select('*')
        .eq('owner_id', currentOwnerId);

      if (hasCredentials) {
        query = query
          .eq('portal_username', loginUsername.trim())
          .eq('portal_password', loginPassword.trim());
      } else {
        query = query.eq('phone', phone.trim());
      }

      const { data, error } = await query.single();

      if (error || !data) {
        toast.error(hasCredentials ? 'Invalid username or password' : 'Customer not found with this phone number');
        return;
      }

      setCustomer(data);
      setIsAuthenticated(true);
      toast.success(`Welcome, ${data.name}!`);
    } catch (error) {
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentOwnerId = getOwnerId();
    if (!registerName || !registerPhone || !currentOwnerId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setRegisterLoading(true);
    try {
      const { data: existingMember } = await supabase
        .from('members')
        .select('id')
        .eq('owner_id', currentOwnerId)
        .eq('phone', registerPhone)
        .single();

      if (existingMember) {
        toast.error('A customer with this phone number already exists');
        return;
      }

      const { data, error } = await supabase
        .from('members')
        .insert({
          owner_id: currentOwnerId,
          name: registerName,
          phone: registerPhone,
          address: registerAddress || null,
          status: 'active',
          balance: 0,
          monthly_fee: 0,
          plan_type: '3-time',
          joining_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) throw error;

      setCustomer(data);
      setIsAuthenticated(true);
      toast.success('Registration successful! Welcome to our service.');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCustomer(null);
    setPhone('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (isRegisterMode) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl border-0">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <UserPlus className="h-8 w-8 text-orange-500" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Register</CardTitle>
              <p className="text-gray-500 mt-2">Join {businessName || 'our service'}</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="registerName" className="text-gray-700">Full Name</Label>
                  <Input
                    id="registerName"
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="John Doe"
                    className="h-12 border-gray-200 focus:border-orange-400 focus:ring-orange-100"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registerPhone" className="text-gray-700">Phone Number</Label>
                  <Input
                    id="registerPhone"
                    type="tel"
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
                    placeholder="05X XXX XXXX"
                    className="h-12 border-gray-200 focus:border-orange-400 focus:ring-orange-100"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registerAddress" className="text-gray-700">Address (Optional)</Label>
                  <Input
                    id="registerAddress"
                    type="text"
                    value={registerAddress}
                    onChange={(e) => setRegisterAddress(e.target.value)}
                    placeholder="Your delivery address"
                    className="h-12 border-gray-200 focus:border-orange-400 focus:ring-orange-100"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
                  disabled={registerLoading}
                >
                  {registerLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Register'}
                </Button>
              </form>
              <p className="text-center text-sm text-gray-400 mt-4">
                Already registered? <button onClick={() => navigate(`/${slug || ownerId}/customer`)} className="text-orange-500 hover:underline">Login here</button>
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-orange-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">{businessName || 'MessFlow'}</CardTitle>
            <p className="text-gray-500 mt-2">Customer Portal</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-700">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Your username"
                  className="h-12 border-gray-200 focus:border-orange-400 focus:ring-orange-100"
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Your password"
                    className="h-12 border-gray-200 focus:border-orange-400 focus:ring-orange-100 pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              <div className="relative flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">or login with phone</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-700">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05X XXX XXXX"
                  className="h-12 border-gray-200 focus:border-orange-400 focus:ring-orange-100"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Login'}
              </Button>
            </form>
            <div className="flex justify-between mt-4">
              <p className="text-center text-sm text-gray-400">
                Enter the phone number you registered with
              </p>
              {slug && (
                <button onClick={() => navigate(`/${slug}/register`)} className="text-sm text-orange-500 hover:underline">
                  Register
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Package className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">{businessName}</h1>
              <p className="text-xs text-gray-500">Customer Portal</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-500">
            <LogOut className="h-4 w-4 mr-1" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome Card */}
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                {customer?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">{customer?.name}</h2>
                <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                  <Phone className="h-4 w-4" />
                  {customer?.phone}
                </div>
                {customer?.address && (
                  <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                    <MapPin className="h-4 w-4" />
                    {customer.address}
                  </div>
                )}
              </div>
              <Badge 
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  customer?.status === 'active' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {customer?.status === 'active' ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Monthly Fee</p>
                  <p className="text-2xl font-bold text-gray-900">AED {customer?.monthly_fee}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  (customer?.balance || 0) > 0 ? 'bg-red-100' : 'bg-green-100'
                }`}>
                  <Clock className={`h-6 w-6 ${(customer?.balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Balance</p>
                  <p className={`text-2xl font-bold ${(customer?.balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    AED {customer?.balance || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab as any} className="space-y-4">
          <TabsList className="w-full bg-white shadow-sm rounded-xl p-1 h-auto">
            <TabsTrigger 
              value="overview" 
              className="flex-1 rounded-lg data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="invoices" 
              className="flex-1 rounded-lg data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700"
            >
              Invoices
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-gray-700">Plan Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Meal Plan</span>
                  <span className="font-medium text-gray-900">{customer?.plan_type} times</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Join Date</span>
                  <span className="font-medium text-gray-900">
                    {customer?.joining_date ? formatDate(customer.joining_date) : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Expiry Date</span>
                  <span className="font-medium text-gray-900">
                    {customer?.plan_expiry_date ? formatDate(customer.plan_expiry_date) : '-'}
                  </span>
                </div>
                {customer?.map_link && (
                  <a 
                    href={customer.map_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 mt-4 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg transition-colors"
                  >
                    <MapPin className="h-5 w-5" />
                    View Delivery Location
                  </a>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-gray-700">Recent Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-400">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No invoices yet</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="h-12 border-gray-200 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700"
          >
            <Pause className="h-4 w-4 mr-2" />
            Pause Meals
          </Button>
          <Button 
            variant="outline" 
            className="h-12 border-gray-200 hover:bg-green-50 hover:border-green-200 hover:text-green-700"
          >
            <Play className="h-4 w-4 mr-2" />
            Resume Meals
          </Button>
        </div>
      </main>
    </div>
  );
}
