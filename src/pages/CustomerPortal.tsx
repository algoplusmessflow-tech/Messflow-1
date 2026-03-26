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
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (isRegisterMode) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl border-0">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <UserPlus className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">Register</CardTitle>
              <p className="text-muted-foreground mt-2">Join {businessName || 'our service'}</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="registerName" className="text-foreground">Full Name</Label>
                  <Input
                    id="registerName"
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="John Doe"
                    className="h-12 border-border focus:border-orange-400 focus:ring-orange-100"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registerPhone" className="text-foreground">Phone Number</Label>
                  <Input
                    id="registerPhone"
                    type="tel"
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
                    placeholder="05X XXX XXXX"
                    className="h-12 border-border focus:border-orange-400 focus:ring-orange-100"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registerAddress" className="text-foreground">Address (Optional)</Label>
                  <Input
                    id="registerAddress"
                    type="text"
                    value={registerAddress}
                    onChange={(e) => setRegisterAddress(e.target.value)}
                    placeholder="Your delivery address"
                    className="h-12 border-border focus:border-orange-400 focus:ring-orange-100"
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
              <p className="text-center text-sm text-muted-foreground mt-4">
                Already registered? <button onClick={() => navigate(`/${slug || ownerId}/customer`)} className="text-primary hover:underline">Login here</button>
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">{businessName || 'MessFlow'}</CardTitle>
            <p className="text-muted-foreground mt-2">Customer Portal</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-foreground">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Your username"
                  className="h-12 border-border focus:border-orange-400 focus:ring-orange-100"
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Your password"
                    className="h-12 border-border focus:border-orange-400 focus:ring-orange-100 pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              <div className="relative flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-muted" />
                <span className="text-xs text-muted-foreground">or login with phone</span>
                <div className="flex-1 h-px bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05X XXX XXXX"
                  className="h-12 border-border focus:border-orange-400 focus:ring-orange-100"
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
              <p className="text-center text-sm text-muted-foreground">
                Enter the phone number you registered with
              </p>
              {slug && (
                <button onClick={() => navigate(`/${slug}/register`)} className="text-sm text-primary hover:underline">
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
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-xl border-b sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">{businessName}</h1>
              <p className="text-xs text-muted-foreground">Customer Portal</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
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
                <h2 className="text-xl font-bold text-foreground">{customer?.name}</h2>
                <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
                  <Phone className="h-4 w-4" />
                  {customer?.phone}
                </div>
                {customer?.address && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
                    <MapPin className="h-4 w-4" />
                    {customer.address}
                  </div>
                )}
              </div>
              <Badge 
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  customer?.status === 'active' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-muted text-foreground'
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
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Fee</p>
                  <p className="text-2xl font-bold text-foreground">AED {customer?.monthly_fee}</p>
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
                  <p className="text-sm text-muted-foreground">Balance</p>
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
          <TabsList className="w-full bg-card shadow-sm rounded-xl p-1 h-auto">
            <TabsTrigger 
              value="overview" 
              className="flex-1 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-orange-700"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="invoices" 
              className="flex-1 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-orange-700"
            >
              Invoices
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-foreground">Plan Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Meal Plan</span>
                  <span className="font-medium text-foreground">{customer?.plan_type} times</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Join Date</span>
                  <span className="font-medium text-foreground">
                    {customer?.joining_date ? formatDate(customer.joining_date) : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Expiry Date</span>
                  <span className="font-medium text-foreground">
                    {customer?.plan_expiry_date ? formatDate(customer.plan_expiry_date) : '-'}
                  </span>
                </div>
                {customer?.map_link && (
                  <a 
                    href={customer.map_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 mt-4 bg-orange-50 hover:bg-primary/10 text-orange-700 rounded-lg transition-colors"
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
                <CardTitle className="text-lg text-foreground">Recent Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
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
            className="h-12 border-border hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700"
          >
            <Pause className="h-4 w-4 mr-2" />
            Pause Meals
          </Button>
          <Button 
            variant="outline" 
            className="h-12 border-border hover:bg-green-500/10 hover:border-green-500/30 hover:text-green-700"
          >
            <Play className="h-4 w-4 mr-2" />
            Resume Meals
          </Button>
        </div>
      </main>
    </div>
  );
}
