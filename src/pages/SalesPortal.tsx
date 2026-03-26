import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSalesPersonByToken, useDeletionRequests } from '@/hooks/useSalesPerson';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Phone, Loader2, Plus, Trash2, Search, Edit2, MapPin, Send, UtensilsCrossed, Truck, Calendar, UserPlus, KeyRound, Copy } from 'lucide-react';
import { extractCoordinatesFromInput, fetchLocationFromAddress } from '@/lib/geolocation';
import { generatePortalCredentials } from '@/lib/credentials';
import { createInvoiceRecord } from '@/lib/invoice-service';

type PlanType = '1-time' | '2-time' | '3-time' | 'custom';

type Member = {
  id: string;
  name: string;
  phone: string;
  address?: string;
  map_link?: string;
  location_lat?: number;
  location_lng?: number;
  balance: number;
  monthly_fee: number;
  status: string;
  plan_type: string;
  joining_date: string;
  plan_expiry_date: string | null;
  delivery_area_id?: string;
  special_notes?: string;
  meal_type?: string;
  roti_quantity?: number;
  rice_type?: string;
  dietary_preference?: string;
  pause_service?: boolean;
  skip_weekends?: boolean;
  free_trial?: boolean;
  trial_days?: number;
  isPaid?: boolean;
};

export default function SalesPortal() {
  const navigate = useNavigate();
  const { slug, token } = useParams<{ slug?: string; token?: string }>();
  const [salesPersonSession, setSalesPersonSession] = useState<any>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const authenticateWithToken = async (accessToken: string) => {
      try {
        const { data, error } = await supabase
          .from('sales_persons')
          .select('*')
          .eq('access_token', accessToken)
          .single();

        if (error || !data) {
          toast.error('Invalid or inactive access code');
          navigate('/sales-login', { replace: true });
          return;
        }

        if (!data.is_active) {
          toast.error('Your account is inactive. Contact your manager.');
          navigate('/sales-login', { replace: true });
          return;
        }

        let businessName = 'Your Business';
        let businessSlug = '';

        const { data: profile } = await supabase
          .from('profiles')
          .select('business_name, business_slug')
          .eq('user_id', data.owner_id)
          .single();

        if (profile) {
          businessName = profile.business_name || 'Your Business';
          businessSlug = profile.business_slug || '';
        }

        const session = {
          id: data.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          owner_id: data.owner_id,
          access_token: data.access_token,
          business_name: businessName,
          business_slug: businessSlug,
          logged_in_at: new Date().toISOString(),
        };

        localStorage.setItem('sales_person_session', JSON.stringify(session));
        setSalesPersonSession(session);
        toast.success('Login successful!');
      } catch (err: any) {
        console.error('Token authentication error:', err);
        toast.error('Failed to authenticate. Please check your access code.');
        navigate('/sales-login', { replace: true });
      } finally {
        setIsCheckingSession(false);
      }
    };

    if (token) {
      const decodedToken = decodeURIComponent(token).toUpperCase();
      authenticateWithToken(decodedToken);
      return;
    }

    const session = localStorage.getItem('sales_person_session');
    if (!session) {
      toast.error('Please login to access the sales portal');
      navigate('/sales-login', { replace: true });
      return;
    }
    try {
      const parsed = JSON.parse(session);
      setSalesPersonSession(parsed);
    } catch (error) {
      localStorage.removeItem('sales_person_session');
      toast.error('Session expired. Please login again');
      navigate('/sales-login', { replace: true });
    } finally {
      setIsCheckingSession(false);
    }
  }, [token, navigate]);

  const salesPerson = salesPersonSession;
  const queryClient = useQueryClient();

  const { data: myMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ['members', 'sales', salesPerson?.id],
    queryFn: async () => {
      if (!salesPerson) return [];
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('sales_person_id', salesPerson.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching members:', error);
        return [];
      }
      return data as Member[];
    },
    enabled: !!salesPerson,
  });

  const { data: fullMenu = [] } = useQuery({
    queryKey: ['menu', 'sales', salesPerson?.owner_id],
    queryFn: async () => {
      if (!salesPerson) return [];
      const { data } = await supabase
        .from('menu')
        .select('day, lunch, dinner, breakfast, week_number')
        .eq('owner_id', salesPerson.owner_id)
        .order('week_number', { ascending: false })
        .order('day');
      return data || [];
    },
    enabled: !!salesPerson,
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['zones', 'sales', salesPerson?.owner_id],
    queryFn: async () => {
      if (!salesPerson) return [];
      const { data } = await supabase
        .from('delivery_areas')
        .select('id, name')
        .eq('owner_id', salesPerson.owner_id)
        .order('name');
      return data || [];
    },
    enabled: !!salesPerson,
  });

  const { data: driversWithZones = [] } = useQuery({
    queryKey: ['drivers-with-zones', salesPerson?.owner_id],
    queryFn: async () => {
      if (!salesPerson || !salesPerson.owner_id) return [];
      const { data } = await supabase
        .from('driver_zone_mapping')
        .select(`
          id,
          driver:drivers(id, name, phone),
          zone:delivery_areas(id, name)
        `)
        .eq('driver.owner_id', salesPerson.owner_id);
      return data || [];
    },
    enabled: !!salesPerson?.owner_id,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [bulkReason, setBulkReason] = useState('');
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');

  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    plan_type: PlanType;
    monthly_fee: string;
    joining_date: string;
    isPaid: boolean;
    address: string;
    map_link: string;
    location_lat: number | null;
    location_lng: number | null;
    delivery_area_id: string;
    special_notes: string;
    meal_type: string;
    roti_quantity: number;
    rice_type: string;
    dietary_preference: string;
    pause_service: boolean;
    skip_weekends: boolean;
    free_trial: boolean;
    trial_days: number;
  }>({
    name: '',
    phone: '',
    plan_type: '3-time',
    monthly_fee: '150',
    joining_date: new Date().toISOString().split('T')[0],
    isPaid: true,
    address: '',
    map_link: '',
    location_lat: null,
    location_lng: null,
    delivery_area_id: '',
    special_notes: '',
    meal_type: 'both',
    roti_quantity: 2,
    rice_type: 'white_rice',
    dietary_preference: 'both',
    pause_service: false,
    skip_weekends: false,
    free_trial: false,
    trial_days: 3,
  });

  const filteredMembers = myMembers.filter((m) =>
    searchQuery === '' ||
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.phone.includes(searchQuery)
  );

  const zoneMap: Record<string, string> = {};
  zones.forEach((z: any) => { zoneMap[z.id] = z.name; });

  const toggleBulkSelect = (id: string) => {
    const next = new Set(selectedForBulk);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedForBulk(next);
  };

  const handleFetchLocation = async (address: string) => {
    if (!address.trim()) {
      setLocationError('Please enter an address first');
      return;
    }

    setIsFetchingLocation(true);
    setLocationError('');

    try {
      const parsed = extractCoordinatesFromInput(address);

      if (parsed?.lat && parsed?.lng) {
        setFormData(prev => ({
          ...prev,
          location_lat: parsed.lat!,
          location_lng: parsed.lng!,
          map_link: parsed.mapLink || '',
        }));
        toast.success('Location found!');
      } else {
        const result = await fetchLocationFromAddress(address);
        if (result.lat && result.lng) {
          setFormData(prev => ({
            ...prev,
            location_lat: result.lat,
            location_lng: result.lng,
            map_link: result.mapLink || result.embedUrl || '',
          }));
          toast.success('Location found!');
        } else {
          setLocationError('Could not find location. Try a more specific address.');
        }
      }
    } catch (err: any) {
      console.error('Location fetch error:', err);
      setLocationError('Failed to fetch location');
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const handleAddMember = async () => {
    if (!formData.name || !formData.phone || !salesPerson) {
      toast.error('Please fill in required fields');
      return;
    }

    if (!salesPerson.id) {
      toast.error('Session error. Please logout and login again.');
      return;
    }

    if (!formData.monthly_fee || parseFloat(formData.monthly_fee) <= 0) {
      toast.error('Please enter a valid monthly fee');
      return;
    }

    setAddLoading(true);

    try {
      // Re-verify the sales person session by fetching fresh data
      const { data: freshSalesPerson, error: spError } = await supabase
        .from('sales_persons')
        .select('id, owner_id, name')
        .eq('id', salesPerson.id)
        .single();

      if (spError || !freshSalesPerson) {
        console.error('[SalesPortal] Sales person not found:', spError);
        toast.error('Session expired. Please logout and login again.');
        setAddLoading(false);
        return;
      }

      const joiningDate = new Date(formData.joining_date);
      const monthlyFee = parseFloat(formData.monthly_fee);
      
      let expiryDate: Date;
      let balance: number;
      
      if (formData.free_trial) {
        expiryDate = new Date(joiningDate);
        expiryDate.setDate(expiryDate.getDate() + formData.trial_days);
        balance = 0;
      } else {
        expiryDate = new Date(joiningDate);
        expiryDate.setMonth(expiryDate.getMonth() + 1);
        balance = formData.isPaid ? 0 : monthlyFee;
      }

      // Generate portal credentials for customer login
      const creds = generatePortalCredentials(formData.name);

      const insertData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        plan_type: formData.plan_type,
        monthly_fee: monthlyFee,
        balance: balance,
        status: 'active',
        joining_date: joiningDate.toISOString(),
        plan_expiry_date: expiryDate.toISOString(),
        address: formData.address.trim() || null,
        map_link: formData.map_link || null,
        location_lat: formData.location_lat,
        location_lng: formData.location_lng,
        delivery_area_id: formData.delivery_area_id || null,
        special_notes: formData.special_notes || null,
        meal_type: formData.meal_type,
        roti_quantity: formData.roti_quantity,
        rice_type: formData.rice_type,
        dietary_preference: formData.dietary_preference,
        pause_service: formData.pause_service,
        skip_weekends: formData.skip_weekends,
        free_trial: formData.free_trial,
        trial_days: formData.free_trial ? formData.trial_days : null,
        owner_id: freshSalesPerson.owner_id,
        sales_person_id: freshSalesPerson.id,
        portal_username: creds.username,
        portal_password: creds.password,
      };

      console.log('[SalesPortal] Inserting member:', insertData);
      console.log('[SalesPortal] freshSalesPerson.id:', freshSalesPerson.id, 'type:', typeof freshSalesPerson.id);
      console.log('[SalesPortal] owner_id:', freshSalesPerson.owner_id, 'type:', typeof freshSalesPerson.owner_id);

      // Try with sales_person_id first
      let result = await supabase.from('members').insert(insertData as any).select().single();

      // If FK error on sales_person_id, try without it
      if (result.error && result.error.message.includes('sales_person_id')) {
        console.log('[SalesPortal] FK error on sales_person_id, trying without it...');
        const insertWithoutSp = { ...insertData };
        delete (insertWithoutSp as any).sales_person_id;
        result = await supabase.from('members').insert(insertWithoutSp as any).select().single();
      }

      if (result.error) {
        console.error('[SalesPortal] Insert error:', result.error);
        toast.error('Database error: ' + result.error.message);
        throw result.error;
      }

      const newMember = result.data;

      // Create transaction + invoice for paid members (same as Admin Dashboard flow)
      if (formData.isPaid && !formData.free_trial && newMember) {
        // Record the payment transaction
        await supabase.from('transactions').insert({
          owner_id: freshSalesPerson.owner_id,
          member_id: newMember.id,
          amount: monthlyFee,
          type: 'payment',
          notes: `Initial payment on signup (via ${salesPerson.name})`,
        } as any);

        // Auto-create invoice record in DB
        await createInvoiceRecord({
          ownerId: freshSalesPerson.owner_id,
          memberId: newMember.id,
          memberName: formData.name.trim(),
          memberPhone: formData.phone.trim(),
          amount: monthlyFee,
          source: 'member_signup',
          notes: `Added by sales: ${salesPerson.name}`,
        });
      } else if (formData.free_trial && newMember) {
        // Record trial start transaction
        await supabase.from('transactions').insert({
          owner_id: freshSalesPerson.owner_id,
          member_id: newMember.id,
          amount: monthlyFee,
          type: 'payment',
          notes: `Trial period started (via ${salesPerson.name})`,
        } as any);
      }

      toast.success(`Customer added! Login: ${creds.username}`);
      setIsAddOpen(false);
      resetFormData();
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (err: any) {
      toast.error('Failed: ' + (err.message || 'Unknown error'));
    } finally {
      setAddLoading(false);
    }
  };

  const resetFormData = () => {
    setFormData({
      name: '',
      phone: '',
      plan_type: '3-time',
      monthly_fee: '150',
      joining_date: new Date().toISOString().split('T')[0],
      isPaid: true,
      address: '',
      map_link: '',
      location_lat: null,
      location_lng: null,
      delivery_area_id: '',
      special_notes: '',
      meal_type: 'both',
      roti_quantity: 2,
      rice_type: 'white_rice',
      dietary_preference: 'both',
      pause_service: false,
      skip_weekends: false,
      free_trial: false,
      trial_days: 3,
    });
    setLocationError('');
  };

  const handleEditMember = async () => {
    if (!selectedMember || !formData.name || !formData.phone || !salesPerson) return;

    try {
      const { error } = await supabase
        .from('members')
        .update({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim() || null,
          map_link: formData.map_link || null,
          location_lat: formData.location_lat,
          location_lng: formData.location_lng,
          monthly_fee: parseFloat(formData.monthly_fee) || 150,
          plan_type: formData.plan_type,
          delivery_area_id: formData.delivery_area_id || null,
          special_notes: formData.special_notes || null,
          meal_type: formData.meal_type,
          roti_quantity: formData.roti_quantity,
          rice_type: formData.rice_type,
          dietary_preference: formData.dietary_preference,
          pause_service: formData.pause_service,
          skip_weekends: formData.skip_weekends,
          free_trial: formData.free_trial,
          trial_days: formData.free_trial ? formData.trial_days : null,
        } as any)
        .eq('id', selectedMember.id)
        .eq('sales_person_id', salesPerson.id);

      if (error) throw error;
      toast.success('Customer updated!');
      setIsEditOpen(false);
      setSelectedMember(null);
      resetFormData();
      queryClient.invalidateQueries({ queryKey: ['members'] });
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    }
  };

  const handleRequestDelete = async (memberId: string) => {
    if (!salesPerson) return;
    try {
      const { error } = await supabase.from('deletion_requests').insert({
        sales_person_id: salesPerson.id,
        member_id: memberId,
        owner_id: salesPerson.owner_id,
        status: 'pending',
      });
      if (error) throw error;
      toast.success('Deletion request sent to owner');
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    }
  };

  const handleBulkDeleteRequest = async () => {
    if (!salesPerson || selectedForBulk.size === 0) return;
    setSubmittingBulk(true);
    try {
      const inserts = Array.from(selectedForBulk).map((memberId) => ({
        sales_person_id: salesPerson.id,
        member_id: memberId,
        owner_id: salesPerson.owner_id,
        status: 'pending',
        notes: bulkReason || `Bulk request (${selectedForBulk.size} members)`,
      }));
      const { error } = await supabase.from('deletion_requests').insert(inserts as any);
      if (error) throw error;
      toast.success(`Bulk deletion request sent for ${selectedForBulk.size} members`);
      setSelectedForBulk(new Set());
      setIsBulkDeleteOpen(false);
      setBulkReason('');
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    } finally {
      setSubmittingBulk(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sales_person_session');
    toast.success('Logged out successfully');
    navigate('/sales-login', { replace: true });
  };

  const openEditDialog = (member: Member) => {
    setSelectedMember(member);
    const extMember = member as any;
    setFormData({
      name: member.name || '',
      phone: member.phone || '',
      plan_type: (member.plan_type as PlanType) || '3-time',
      monthly_fee: member.monthly_fee?.toString() || '150',
      joining_date: member.joining_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      isPaid: extMember.isPaid ?? true,
      address: member.address || '',
      map_link: extMember.map_link || '',
      location_lat: extMember.location_lat || null,
      location_lng: extMember.location_lng || null,
      delivery_area_id: member.delivery_area_id || '',
      special_notes: member.special_notes || '',
      meal_type: member.meal_type || 'both',
      roti_quantity: member.roti_quantity || 2,
      rice_type: member.rice_type || 'white_rice',
      dietary_preference: member.dietary_preference || 'both',
      pause_service: extMember.pause_service || false,
      skip_weekends: extMember.skip_weekends || false,
      free_trial: extMember.free_trial || false,
      trial_days: extMember.trial_days || 3,
    });
    setIsEditOpen(true);
  };

  const openAddDialog = () => {
    resetFormData();
    setIsAddOpen(true);
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!salesPerson) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <header className="bg-card/80 backdrop-blur-xl border-b sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold">{salesPerson.business_name || 'Sales Portal'}</h1>
              <p className="text-xs text-muted-foreground">{salesPerson.name}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold">{myMembers.length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold text-green-600">{myMembers.filter((m) => m.status === 'active').length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold text-red-600">{myMembers.filter((m) => m.status === 'inactive').length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Inactive</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold">{myMembers.reduce((s, m) => s + (m.balance || 0), 0)}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Balance</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="customers" className="space-y-4">
          <TabsList className="w-full">
            <TabsTrigger value="customers" className="flex-1">
              <User className="h-4 w-4 mr-1" /> My Customers
            </TabsTrigger>
            <TabsTrigger value="menu" className="flex-1">
              <UtensilsCrossed className="h-4 w-4 mr-1" /> Menu
            </TabsTrigger>
            <TabsTrigger value="delivery" className="flex-1">
              <Truck className="h-4 w-4 mr-1" /> Drivers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customers" className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-1" /> Add Customer
              </Button>
              {selectedForBulk.size > 0 && (
                <Button size="sm" variant="destructive" onClick={() => setIsBulkDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Request Delete ({selectedForBulk.size})
                </Button>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers..."
                className="pl-10"
              />
            </div>

            {membersLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No customers found
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredMembers.map((member) => (
                  <Card key={member.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedForBulk.has(member.id)}
                          onCheckedChange={() => toggleBulkSelect(member.id)}
                        />
                        <div className="h-9 w-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{member.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />{member.phone}
                            {member.delivery_area_id && zoneMap[member.delivery_area_id] && (
                              <><span>·</span><MapPin className="h-3 w-3" />{zoneMap[member.delivery_area_id]}</>
                            )}
                          </div>
                          {(member as any).portal_username && (
                            <div className="flex items-center gap-1 mt-1">
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5 px-1.5 border-primary text-primary cursor-pointer hover:bg-primary/10"
                                title="Click to copy username"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText((member as any).portal_username);
                                  toast.success('Username copied!');
                                }}
                              >
                                <UserPlus className="h-2.5 w-2.5 mr-0.5" /> {(member as any).portal_username}
                                <Copy className="h-2 w-2 ml-0.5 opacity-60" />
                              </Badge>
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5 px-1.5 border-green-500 text-green-500 cursor-pointer hover:bg-green-500/10"
                                title="Click to copy password"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText((member as any).portal_password);
                                  toast.success('Password copied!');
                                }}
                              >
                                <KeyRound className="h-2.5 w-2.5 mr-0.5" /> ••••••
                                <Copy className="h-2 w-2 ml-0.5 opacity-60" />
                              </Badge>
                            </div>
                          )}
                        </div>
                        <Badge variant={member.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {member.status}
                        </Badge>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(member)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRequestDelete(member.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="menu" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Full Menu
                </CardTitle>
              </CardHeader>
              <CardContent>
                {fullMenu.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No menu configured yet</p>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      const groupedByWeek = fullMenu.reduce((acc: any, item: any) => {
                        const week = item.week_number || 1;
                        if (!acc[week]) acc[week] = [];
                        acc[week].push(item);
                        return acc;
                      }, {});

                      return Object.entries(groupedByWeek).map(([week, days]: [string, any]) => (
                        <div key={week}>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">Week {week}</Badge>
                          </div>
                          <div className="space-y-2">
                            {days.map((day: any) => (
                              <div key={`${week}-${day.day}`} className="p-3 rounded-lg border bg-muted/20">
                                <p className="text-sm font-semibold capitalize mb-2">{day.day}</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                  {day.breakfast && (
                                    <div className="flex gap-1">
                                      <Badge variant="outline" className="text-[10px]">B</Badge>
                                      <span>{day.breakfast}</span>
                                    </div>
                                  )}
                                  {day.lunch && (
                                    <div className="flex gap-1">
                                      <Badge variant="outline" className="text-[10px] bg-amber-500/10">L</Badge>
                                      <span>{day.lunch}</span>
                                    </div>
                                  )}
                                  {day.dinner && (
                                    <div className="flex gap-1">
                                      <Badge variant="outline" className="text-[10px] bg-violet-500/10">D</Badge>
                                      <span>{day.dinner}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="delivery" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="h-4 w-4" /> Drivers for My Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myMembers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Add customers to see assigned drivers</p>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground mb-4">
                      {myMembers.length} customers in {zones.length} zone(s)
                    </div>
                    {driversWithZones.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <Truck className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p>No drivers assigned to delivery zones yet</p>
                        <p className="text-xs mt-1">Contact your manager to assign drivers to zones</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {driversWithZones.map((mapping: any) => {
                          const driver = mapping.driver;
                          const zone = mapping.zone;
                          const zoneMembers = myMembers.filter((m) => m.delivery_area_id === zone?.id);

                          if (zoneMembers.length === 0) return null;

                          return (
                            <div key={mapping.id} className="p-3 rounded-lg border bg-muted/20">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                                    <Truck className="h-4 w-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{driver?.name || 'Unknown'}</p>
                                    <p className="text-xs text-muted-foreground">{driver?.phone}</p>
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {zone?.name}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-2">
                                <p className="font-medium mb-1">Delivering to {zoneMembers.length} customer(s):</p>
                                <div className="grid grid-cols-2 gap-1">
                                  {zoneMembers.slice(0, 4).map((m) => (
                                    <div key={m.id} className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      <span>{m.name}</span>
                                    </div>
                                  ))}
                                  {zoneMembers.length > 4 && (
                                    <p className="text-muted-foreground col-span-2">+{zoneMembers.length - 4} more</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Customer Dialog */}
        <Dialog open={isAddOpen} onOpenChange={(open) => { if (!open) resetFormData(); setIsAddOpen(open); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Customer name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone *</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="05X XXX XXXX"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Joining Date</Label>
                <Input
                  type="date"
                  value={formData.joining_date}
                  onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Monthly Fee (AED)</Label>
                  <Input
                    type="number"
                    value={formData.monthly_fee}
                    onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                    placeholder="150"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Meal Plan</Label>
                  <Select
                    value={formData.plan_type}
                    onValueChange={(value: PlanType) => setFormData({ ...formData, plan_type: value })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-time">1 Time</SelectItem>
                      <SelectItem value="2-time">2 Times</SelectItem>
                      <SelectItem value="3-time">3 Times</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Address / Google Maps Link</Label>
                <div className="flex gap-1">
                  <Input
                    value={formData.address}
                    onChange={(e) => { setFormData({ ...formData, address: e.target.value }); setLocationError(''); }}
                    placeholder="Enter address or paste Google Maps link"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleFetchLocation(formData.address)}
                    disabled={isFetchingLocation || !formData.address.trim()}
                    title="Verify location"
                  >
                    {isFetchingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                  </Button>
                </div>
                {locationError && <p className="text-xs text-destructive">{locationError}</p>}
                {formData.location_lat && formData.location_lng && (
                  <div className="space-y-2">
                    <p className="text-xs text-green-600">Location: {formData.location_lat.toFixed(6)}, {formData.location_lng.toFixed(6)}</p>
                    <iframe
                      title="Location Preview"
                      width="100%"
                      height="100"
                      style={{ border: 0, borderRadius: '8px' }}
                      loading="lazy"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${formData.location_lng - 0.005}%2C${formData.location_lat - 0.005}%2C${formData.location_lng + 0.005}%2C${formData.location_lat + 0.005}&layer=mapnik&marker=${formData.location_lat}%2C${formData.location_lng}`}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Delivery Zone</Label>
                <Select
                  value={formData.delivery_area_id}
                  onValueChange={(value) => setFormData({ ...formData, delivery_area_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select zone (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">No zones available</div>
                    ) : (
                      zones.map((zone: any) => (
                        <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Meal Type</Label>
                  <Select
                    value={formData.meal_type}
                    onValueChange={(value) => setFormData({ ...formData, meal_type: value })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Both</SelectItem>
                      <SelectItem value="lunch">Lunch Only</SelectItem>
                      <SelectItem value="dinner">Dinner Only</SelectItem>
                      <SelectItem value="breakfast">Breakfast Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Rice Type</Label>
                  <Select
                    value={formData.rice_type}
                    onValueChange={(value) => setFormData({ ...formData, rice_type: value })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="white_rice">White Rice</SelectItem>
                      <SelectItem value="brown_rice">Brown Rice</SelectItem>
                      <SelectItem value="jeera_rice">Jeera Rice</SelectItem>
                      <SelectItem value="biryani">Biryani</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Special Notes</Label>
                <Input
                  value={formData.special_notes}
                  onChange={(e) => setFormData({ ...formData, special_notes: e.target.value })}
                  placeholder="Any special instructions..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-3 rounded-lg border">
                  <Checkbox
                    id="pause_service_add"
                    checked={formData.pause_service}
                    onCheckedChange={(checked) => setFormData({ ...formData, pause_service: !!checked })}
                  />
                  <Label htmlFor="pause_service_add" className="text-xs cursor-pointer">Pause Service</Label>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg border">
                  <Checkbox
                    id="skip_weekends_add"
                    checked={formData.skip_weekends}
                    onCheckedChange={(checked) => setFormData({ ...formData, skip_weekends: !!checked })}
                  />
                  <Label htmlFor="skip_weekends_add" className="text-xs cursor-pointer">Skip Weekends</Label>
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${formData.free_trial ? 'border-green-500 bg-green-500/10' : 'bg-muted/30'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium cursor-pointer">Free Trial</Label>
                    <p className="text-[10px] text-muted-foreground">
                      {formData.free_trial 
                        ? `${formData.trial_days}-day trial (service stops after expiry)` 
                        : 'Regular paid subscription'}
                    </p>
                  </div>
                  <Checkbox
                    id="free_trial_add"
                    checked={formData.free_trial}
                    onCheckedChange={(checked) => setFormData({ 
                      ...formData, 
                      free_trial: !!checked, 
                      isPaid: !!checked ? false : formData.isPaid 
                    })}
                  />
                </div>
                {formData.free_trial && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">Trial Duration:</Label>
                      <Select
                        value={String(formData.trial_days)}
                        onValueChange={(v) => setFormData({ ...formData, trial_days: parseInt(v) })}
                      >
                        <SelectTrigger className="h-8 w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 day</SelectItem>
                          <SelectItem value="3">3 days</SelectItem>
                          <SelectItem value="5">5 days</SelectItem>
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="14">14 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Trial Start</Label>
                        <Input
                          type="date"
                          value={formData.joining_date}
                          onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Trial End</Label>
                        <Input
                          type="date"
                          value={new Date(new Date(formData.joining_date).setDate(new Date(formData.joining_date).getDate() + formData.trial_days)).toISOString().split('T')[0]}
                          disabled
                          className="h-8 bg-muted"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Payment Status</Label>
                  <p className="text-[10px] text-muted-foreground">
                    {formData.free_trial 
                      ? 'Unpaid during trial, payment due after trial ends' 
                      : formData.isPaid ? 'First month paid' : 'First month unpaid'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {formData.free_trial ? (
                    <Badge variant="outline" className="border-green-500 text-green-600">
                      Trial Mode
                    </Badge>
                  ) : (
                    <>
                      <span className={`text-sm ${!formData.isPaid ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                        Unpaid
                      </span>
                      <Checkbox
                        id="ispaid_add"
                        checked={formData.isPaid}
                        onCheckedChange={(checked) => setFormData({ ...formData, isPaid: !!checked })}
                      />
                      <span className={`text-sm ${formData.isPaid ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                        Paid
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsAddOpen(false); resetFormData(); }}>Cancel</Button>
              <Button onClick={handleAddMember} disabled={addLoading}>
                {addLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Add Customer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Customer Dialog */}
        <Dialog open={isEditOpen} onOpenChange={(open) => { if (!open) { setSelectedMember(null); resetFormData(); } setIsEditOpen(open); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone *</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Monthly Fee (AED)</Label>
                  <Input
                    type="number"
                    value={formData.monthly_fee}
                    onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Meal Plan</Label>
                  <Select
                    value={formData.plan_type}
                    onValueChange={(value: PlanType) => setFormData({ ...formData, plan_type: value })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-time">1 Time</SelectItem>
                      <SelectItem value="2-time">2 Times</SelectItem>
                      <SelectItem value="3-time">3 Times</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Address / Google Maps Link</Label>
                <div className="flex gap-1">
                  <Input
                    value={formData.address}
                    onChange={(e) => { setFormData({ ...formData, address: e.target.value }); setLocationError(''); }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleFetchLocation(formData.address)}
                    disabled={isFetchingLocation || !formData.address.trim()}
                  >
                    {isFetchingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                  </Button>
                </div>
                {locationError && <p className="text-xs text-destructive">{locationError}</p>}
                {formData.location_lat && formData.location_lng && (
                  <div className="space-y-2">
                    <p className="text-xs text-green-600">Location: {formData.location_lat.toFixed(6)}, {formData.location_lng.toFixed(6)}</p>
                    <iframe
                      title="Location Preview"
                      width="100%"
                      height="100"
                      style={{ border: 0, borderRadius: '8px' }}
                      loading="lazy"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${formData.location_lng - 0.005}%2C${formData.location_lat - 0.005}%2C${formData.location_lng + 0.005}%2C${formData.location_lat + 0.005}&layer=mapnik&marker=${formData.location_lat}%2C${formData.location_lng}`}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Delivery Zone</Label>
                <Select
                  value={formData.delivery_area_id}
                  onValueChange={(value) => setFormData({ ...formData, delivery_area_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {zones.map((zone: any) => (
                      <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Meal Type</Label>
                  <Select
                    value={formData.meal_type}
                    onValueChange={(value) => setFormData({ ...formData, meal_type: value })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Both</SelectItem>
                      <SelectItem value="lunch">Lunch Only</SelectItem>
                      <SelectItem value="dinner">Dinner Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Rice Type</Label>
                  <Select
                    value={formData.rice_type}
                    onValueChange={(value) => setFormData({ ...formData, rice_type: value })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="white_rice">White Rice</SelectItem>
                      <SelectItem value="brown_rice">Brown Rice</SelectItem>
                      <SelectItem value="jeera_rice">Jeera Rice</SelectItem>
                      <SelectItem value="biryani">Biryani</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Special Notes</Label>
                <Input
                  value={formData.special_notes}
                  onChange={(e) => setFormData({ ...formData, special_notes: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-3 rounded-lg border">
                  <Checkbox
                    id="pause_service_edit"
                    checked={formData.pause_service}
                    onCheckedChange={(checked) => setFormData({ ...formData, pause_service: !!checked })}
                  />
                  <Label htmlFor="pause_service_edit" className="text-xs cursor-pointer">Pause Service</Label>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg border">
                  <Checkbox
                    id="skip_weekends_edit"
                    checked={formData.skip_weekends}
                    onCheckedChange={(checked) => setFormData({ ...formData, skip_weekends: !!checked })}
                  />
                  <Label htmlFor="skip_weekends_edit" className="text-xs cursor-pointer">Skip Weekends</Label>
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${formData.free_trial ? 'border-green-500 bg-green-500/10' : 'bg-muted/30'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium cursor-pointer">Free Trial</Label>
                    <p className="text-[10px] text-muted-foreground">
                      {formData.free_trial 
                        ? `${formData.trial_days}-day trial (service stops after expiry)` 
                        : 'Regular paid subscription'}
                    </p>
                  </div>
                  <Checkbox
                    id="free_trial_edit"
                    checked={formData.free_trial}
                    onCheckedChange={(checked) => setFormData({ 
                      ...formData, 
                      free_trial: !!checked, 
                      isPaid: !!checked ? false : formData.isPaid 
                    })}
                  />
                </div>
                {formData.free_trial && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">Duration:</Label>
                      <Select
                        value={String(formData.trial_days)}
                        onValueChange={(v) => setFormData({ ...formData, trial_days: parseInt(v) })}
                      >
                        <SelectTrigger className="h-8 w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 day</SelectItem>
                          <SelectItem value="3">3 days</SelectItem>
                          <SelectItem value="5">5 days</SelectItem>
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="14">14 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Payment Status</Label>
                  <p className="text-[10px] text-muted-foreground">
                    {formData.free_trial 
                      ? 'Unpaid during trial' 
                      : formData.isPaid ? 'Paid' : 'Unpaid'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {formData.free_trial ? (
                    <Badge variant="outline" className="border-green-500 text-green-600">
                      Trial Mode
                    </Badge>
                  ) : (
                    <>
                      <span className={`text-sm ${!formData.isPaid ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                        Unpaid
                      </span>
                      <Checkbox
                        id="ispaid_edit"
                        checked={formData.isPaid}
                        onCheckedChange={(checked) => setFormData({ ...formData, isPaid: !!checked })}
                      />
                      <span className={`text-sm ${formData.isPaid ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                        Paid
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsEditOpen(false); setSelectedMember(null); resetFormData(); }}>Cancel</Button>
              <Button onClick={handleEditMember}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Delete Request Dialog */}
        <Dialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" /> Bulk Deletion Request
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You are requesting deletion of <span className="font-bold text-foreground">{selectedForBulk.size}</span> members. This will be sent to the owner for approval.
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1 p-2 rounded border bg-muted/20">
                {Array.from(selectedForBulk).map((id) => {
                  const m = myMembers.find((mem) => mem.id === id);
                  return m ? <p key={id} className="text-xs">{m.name} — {m.phone}</p> : null;
                })}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reason (optional)</Label>
                <Input
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  placeholder="e.g., Group terminated, left company..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBulkDeleteOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleBulkDeleteRequest} disabled={submittingBulk}>
                {submittingBulk && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Send Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
