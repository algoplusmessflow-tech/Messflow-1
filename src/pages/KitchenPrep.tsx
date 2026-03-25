import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useKitchenPrep } from '@/hooks/useKitchenPrep';
import { useAuth } from '@/lib/auth';
import { fetchLocationFromAddress, haversineDistance } from '@/lib/geolocation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, subDays } from 'date-fns';
import { toast } from 'sonner';
import { 
  ChefHat, 
  UtensilsCrossed, 
  Soup, 
  Beef, 
  Leaf, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  Wheat,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Loader2,
  Building2,
  Navigation
} from 'lucide-react';

function StatCard({
  title,
  value,
  icon: Icon,
  variant = 'default',
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  subtitle?: string;
}) {
  const variantClasses = {
    default: 'text-foreground',
    success: 'text-green-500',
    warning: 'text-amber-500',
    destructive: 'text-red-500',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${variantClasses[variant]}`}>{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export default function KitchenPrep() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mealFilter, setMealFilter] = useState<'all' | 'lunch' | 'dinner'>('all');
  
  const { 
    prepSummary, 
    prepByArea, 
    prepList, 
    summaryLoading, 
    areaLoading, 
    listLoading 
  } = useKitchenPrep(selectedDate.toISOString().split('T')[0]);

  const handlePrevDay = () => setSelectedDate(prev => subDays(prev, 1));
  const handleNextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const handleToday = () => setSelectedDate(new Date());

  const filteredList = prepList.filter(item => {
    if (mealFilter === 'all') return true;
    if (mealFilter === 'lunch') return item.mealType === 'lunch' || item.mealType === 'both';
    if (mealFilter === 'dinner') return item.mealType === 'dinner' || item.mealType === 'both';
    return true;
  });

  const getMealTypeBadge = (type: string) => {
    switch (type) {
      case 'lunch': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Lunch</Badge>;
      case 'dinner': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Dinner</Badge>;
      case 'both': return <Badge className="bg-blue-500">Both</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getDietBadge = (diet: string) => {
    switch (diet) {
      case 'veg': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><Leaf className="h-3 w-3 mr-1" />Veg</Badge>;
      case 'non_veg': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><Beef className="h-3 w-3 mr-1" />Non-Veg</Badge>;
      case 'both': return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Both</Badge>;
      default: return <Badge variant="outline">{diet}</Badge>;
    }
  };

  const getRiceLabel = (rice: string) => {
    switch (rice) {
      case 'white_rice': return 'White Rice';
      case 'brown_rice': return 'Brown Rice';
      case 'jeeraga_sala': return 'Jeeraga Sala';
      case 'none': return 'No Rice';
      default: return rice;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ChefHat className="h-6 w-6" />
              Kitchen Prep
            </h1>
            <p className="text-muted-foreground">Daily meal preparation overview</p>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="border-0 h-8 w-32"
              />
            </div>
            <Button variant="outline" size="icon" onClick={handleNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={handleToday}>
              Today
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4">
          <StatCard
            title="Total Deliveries"
            value={prepSummary.totalMeals}
            icon={UtensilsCrossed}
          />
          <StatCard
            title="Lunch"
            value={prepSummary.lunchCount + prepSummary.bothCount}
            icon={UtensilsCrossed}
            variant="warning"
            subtitle="meals"
          />
          <StatCard
            title="Dinner"
            value={prepSummary.dinnerCount + prepSummary.bothCount}
            icon={UtensilsCrossed}
            variant="destructive"
            subtitle="meals"
          />
          <StatCard
            title="Total Rotis"
            value={prepSummary.totalRotis}
            icon={Wheat}
            subtitle="pieces"
          />
          <StatCard
            title="Veg"
            value={prepSummary.vegCount}
            icon={Leaf}
            variant="success"
          />
          <StatCard
            title="Non-Veg"
            value={prepSummary.nonVegCount}
            icon={Beef}
            variant="destructive"
          />
        </div>

        {/* Rice & Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Soup className="h-4 w-4" />
                Rice Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">White Rice</span>
                <span className="font-medium">{prepSummary.whiteRiceCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Brown Rice</span>
                <span className="font-medium">{prepSummary.brownRiceCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Jeeraga Sala</span>
                <span className="font-medium">{prepSummary.jeeragaSalaCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">No Rice</span>
                <span className="font-medium">{prepSummary.noRiceCount}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Service Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paused</span>
                <span className="font-medium">{prepSummary.pausedCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Skip Weekends</span>
                <span className="font-medium">{prepSummary.weekendSkipCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Free Trial</span>
                <span className="font-medium">{prepSummary.trialCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Custom Diet</span>
                <span className="font-medium">{prepSummary.customDietCount}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Dietary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Vegetarian</span>
                <span className="font-medium">{prepSummary.vegCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-600">Non-Veg</span>
                <span className="font-medium">{prepSummary.nonVegCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-orange-600">Both</span>
                <span className="font-medium">{prepSummary.bothDietCount}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Prep Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {prepSummary.totalMeals > 0 
                  ? Math.round((prepSummary.totalMeals / (prepSummary.totalMeals + prepSummary.pausedCount)) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">active of total</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="queue" className="space-y-4">
          <TabsList>
            <TabsTrigger value="queue">Prep Queue</TabsTrigger>
            <TabsTrigger value="areas">By Area</TabsTrigger>
            <TabsTrigger value="kitchens"><Building2 className="h-3.5 w-3.5 mr-1" />Kitchens</TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-4">
              <Label className="text-sm text-muted-foreground">Filter:</Label>
              <div className="flex gap-2">
                <Button
                  variant={mealFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMealFilter('all')}
                >
                  All Meals
                </Button>
                <Button
                  variant={mealFilter === 'lunch' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMealFilter('lunch')}
                >
                  Lunch
                </Button>
                <Button
                  variant={mealFilter === 'dinner' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMealFilter('dinner')}
                >
                  Dinner
                </Button>
              </div>
              <span className="text-sm text-muted-foreground ml-auto">
                {filteredList.length} meals
              </span>
            </div>

            {/* Prep Queue */}
            {listLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredList.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No meals to prepare</h3>
                  <p className="text-muted-foreground">
                    {prepSummary.pausedCount > 0 
                      ? `${prepSummary.pausedCount} customers have paused service`
                      : 'No active deliveries for this date'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredList.map((member) => (
                  <Card key={member.id} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="py-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-sm truncate">{member.name}</span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{member.phone}</span>
                              {member.deliveryAreaName && (
                                <><span>·</span><MapPin className="h-3 w-3 flex-shrink-0" /><span className="truncate">{member.deliveryAreaName}</span></>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {getMealTypeBadge(member.mealType)}
                          {getDietBadge(member.dietaryPreference)}
                          <div className="flex items-center gap-1 text-sm">
                            <span className="font-medium">{member.rotiQuantity}</span>
                            <Wheat className="h-3.5 w-3.5 text-amber-500" />
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {getRiceLabel(member.riceType)}
                          </Badge>
                          {member.freeTrial && (
                            <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                              Trial
                            </Badge>
                          )}
                        </div>
                      </div>
                      {member.address && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {member.address}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="areas" className="space-y-4">
            {areaLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : prepByArea.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No delivery areas</h3>
                  <p className="text-muted-foreground">Add delivery areas to see breakdown by area</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {prepByArea.filter(a => a.totalMeals > 0).map((area) => (
                  <Card key={area.areaId}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {area.areaName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Meals</span>
                        <span className="font-medium">{area.totalMeals}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Lunch</span>
                        <span className="font-medium">{area.lunchCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Dinner</span>
                        <span className="font-medium">{area.dinnerCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Rotis</span>
                        <span className="font-medium">{area.totalRotis}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Veg</span>
                        <span className="font-medium text-green-600">{area.vegCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Non-Veg</span>
                        <span className="font-medium text-red-600">{area.nonVegCount}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Kitchens Management Tab */}
          <TabsContent value="kitchens" className="space-y-4">
            <KitchensManager />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// ═══ KITCHENS MANAGEMENT COMPONENT ═══
function KitchensManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editKitchen, setEditKitchen] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [openZoneSelect, setOpenZoneSelect] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState('+971');
  const [form, setForm] = useState({
    name: '', manager_name: '', address: '', phone: '', tiffin_capacity: '100', nearby_zones: '',
  });

  const { data: kitchens = [], isLoading } = useQuery({
    queryKey: ['kitchens', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from('kitchens').select('*').eq('owner_id', user.id).order('name');
      if (error) return [];
      return data || [];
    },
    enabled: !!user,
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['delivery-areas-names', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('delivery_areas').select('name, center_lat, center_lng').eq('owner_id', user.id);
      return (data || []).map((z: any) => ({ name: z.name, lat: z.center_lat, lng: z.center_lng }));
    },
    enabled: !!user,
  });

  // Get kitchen location for distance calculation (when editing)
  const { data: kitchenLocation } = useQuery({
    queryKey: ['kitchen-location', editKitchen?.id],
    queryFn: async () => {
      if (!editKitchen?.address) return null;
      const result = await fetchLocationFromAddress(editKitchen.address);
      return result.lat && result.lng ? { lat: result.lat, lng: result.lng } : null;
    },
    enabled: !!editKitchen?.address,
  });

  const addKitchen = useMutation({
    mutationFn: async () => {
      if (!user || !form.name.trim()) throw new Error('Name is required');
      
      // Validate phone number before saving
      if (form.phone && !validatePhoneNumber(form.phone, selectedCountryCode)) {
        throw new Error('Invalid phone number. Please check the number and country code.');
      }
      
      const fullPhone = form.phone ? `${selectedCountryCode}${form.phone}` : null;
      
      const { error } = await supabase.from('kitchens').insert({
        owner_id: user.id, name: form.name.trim(), manager_name: form.manager_name.trim() || null,
        address: form.address.trim() || null, phone: fullPhone,
        tiffin_capacity: parseInt(form.tiffin_capacity) || 100,
        nearby_zones: form.nearby_zones ? form.nearby_zones.split(',').map((s: string) => s.trim()).filter(Boolean) : null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['kitchens'] }); toast.success('Kitchen added!'); resetForm(); setIsAddOpen(false); },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const updateKitchen = useMutation({
    mutationFn: async () => {
      if (!editKitchen) return;
      
      // Validate phone number before saving
      if (form.phone && !validatePhoneNumber(form.phone, selectedCountryCode)) {
        throw new Error('Invalid phone number. Please check the number and country code.');
      }
      
      const fullPhone = form.phone ? `${selectedCountryCode}${form.phone}` : null;
      
      const { error } = await supabase.from('kitchens').update({
        name: form.name.trim(), manager_name: form.manager_name.trim() || null,
        address: form.address.trim() || null, phone: fullPhone,
        tiffin_capacity: parseInt(form.tiffin_capacity) || 100,
        nearby_zones: form.nearby_zones ? form.nearby_zones.split(',').map((s: string) => s.trim()).filter(Boolean) : null,
        updated_at: new Date().toISOString(),
      } as any).eq('id', editKitchen.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['kitchens'] }); toast.success('Kitchen updated!'); resetForm(); setEditKitchen(null); },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const deleteKitchen = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kitchens').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['kitchens'] }); toast.success('Kitchen deleted'); setDeleteId(null); },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const resetForm = () => {
    setForm({ name: '', manager_name: '', address: '', phone: '', tiffin_capacity: '100', nearby_zones: '' });
    setLocationError('');
    setOpenZoneSelect(false);
    setPhoneError('');
    setSelectedCountryCode('+971');
  };

  const handleFetchLocation = async (address: string) => {
    if (!address.trim()) {
      setLocationError('Enter an address first');
      return;
    }
    
    setIsFetchingLocation(true);
    setLocationError('');
    
    try {
      const result = await fetchLocationFromAddress(address);
      if (result.lat && result.lng) {
        setForm(prev => ({ ...prev, address: result.address || address }));
        toast.success('Location fetched successfully!');
      } else {
        setLocationError('Could not geocode. Try a more specific address.');
      }
    } catch (err) {
      console.error('Location fetch error:', err);
      setLocationError('Location lookup failed. Check your internet connection.');
    } finally {
      setIsFetchingLocation(false);
    }
  };

  // Sort zones by distance from kitchen location
  const getSortedZones = () => {
    if (!zones.length || !kitchenLocation) return zones.map(z => z.name);
    
    return zones
      .filter(z => z.lat && z.lng)
      .map(z => ({
        name: z.name,
        distance: haversineDistance(kitchenLocation.lat, kitchenLocation.lng, z.lat, z.lng)
      }))
      .sort((a, b) => a.distance - b.distance)
      .map(z => z.name);
  };

  const openEdit = (k: any) => {
    setEditKitchen(k);
    // Parse phone number to extract country code
    let phoneNumber = k.phone || '';
    let countryCode = '+971';
    
    // Extract country code if present
    const phoneMatch = phoneNumber.match(/^(\+\d{1,3})?(.*)/);
    if (phoneMatch && phoneMatch[1]) {
      countryCode = phoneMatch[1];
      phoneNumber = phoneMatch[2];
    }
    
    setForm({
      name: k.name || '', manager_name: k.manager_name || '', address: k.address || '',
      phone: phoneNumber.replace(/\s/g, ''), tiffin_capacity: String(k.tiffin_capacity || 100),
      nearby_zones: Array.isArray(k.nearby_zones) ? k.nearby_zones.join(', ') : (k.nearby_zones || ''),
    });
    setSelectedCountryCode(countryCode);
    setOpenZoneSelect(false);
    setPhoneError('');
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Access code copied!');
  };

  // Phone validation function
  const validatePhoneNumber = (number: string, code: string): boolean => {
    // Remove all non-digit characters
    const digits = number.replace(/\D/g, '');
    
    // Common country codes and their expected lengths
    const phoneLengths: Record<string, number[]> = {
      '+971': [7, 8, 9], // UAE
      '+91': [10],       // India
      '+1': [10],        // USA/Canada
      '+44': [10, 11],   // UK
      '+966': [9],       // Saudi Arabia
      '+968': [8],       // Oman
      '+974': [8],       // Qatar
      '+965': [8],       // Kuwait
      '+973': [8],       // Bahrain
      '+20': [10],       // Egypt
      '+961': [7, 8],    // Lebanon
      '+962': [9],       // Jordan
    };
    
    const validLengths = phoneLengths[code] || [7, 8, 9, 10]; // Default fallback
    return validLengths.includes(digits.length);
  };

  const handlePhoneChange = (value: string) => {
    // Only allow digits
    const cleaned = value.replace(/\D/g, '');
    setForm({ ...form, phone: cleaned });
    
    // Validate on change
    if (cleaned.length > 0) {
      if (!validatePhoneNumber(cleaned, selectedCountryCode)) {
        setPhoneError('Invalid phone number for selected country');
      } else {
        setPhoneError('');
      }
    } else {
      setPhoneError('');
    }
  };

  const handleCountryCodeChange = (code: string) => {
    setSelectedCountryCode(code);
    // Re-validate with new country code
    if (form.phone.length > 0 && !validatePhoneNumber(form.phone, code)) {
      setPhoneError('Invalid phone number for selected country');
    } else {
      setPhoneError('');
    }
  };

  const formFields = (
    <div className="space-y-3">
      <div className="space-y-1"><Label className="text-xs">Kitchen Name *</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Main Kitchen" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Manager Name</Label>
          <Input value={form.manager_name} onChange={(e) => setForm({ ...form, manager_name: e.target.value })} placeholder="Manager name" /></div>
        <div className="space-y-1">
          <Label className="text-xs">Phone Number</Label>
          <div className="flex gap-1">
            <Select value={selectedCountryCode} onValueChange={handleCountryCodeChange}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="+971">🇦🇪 +971 (UAE)</SelectItem>
                <SelectItem value="+91">🇮🇳 +91 (India)</SelectItem>
                <SelectItem value="+1">🇺🇸 +1 (USA)</SelectItem>
                <SelectItem value="+44">🇬🇧 +44 (UK)</SelectItem>
                <SelectItem value="+966">🇸🇦 +966 (Saudi Arabia)</SelectItem>
                <SelectItem value="+968">🇴🇲 +968 (Oman)</SelectItem>
                <SelectItem value="+974">🇶🇦 +974 (Qatar)</SelectItem>
                <SelectItem value="+965">🇰🇼 +965 (Kuwait)</SelectItem>
                <SelectItem value="+973">🇧🇭 +973 (Bahrain)</SelectItem>
                <SelectItem value="+20">🇪🇬 +20 (Egypt)</SelectItem>
                <SelectItem value="+961">🇱🇧 +961 (Lebanon)</SelectItem>
                <SelectItem value="+962">🇯🇴 +962 (Jordan)</SelectItem>
              </SelectContent>
            </Select>
            <Input 
              value={form.phone} 
              onChange={(e) => handlePhoneChange(e.target.value)} 
              placeholder="5XXXXXXXX" 
              className="flex-1"
              type="tel"
              inputMode="tel"
            />
          </div>
          {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
          <p className="text-[10px] text-muted-foreground">Format: {selectedCountryCode} {form.phone || 'XXXXXXXXX'}</p>
        </div>
      </div>
      <div className="space-y-1"><Label className="text-xs">Address / Location</Label>
        <div className="flex gap-1">
          <Textarea 
            value={form.address} 
            onChange={(e) => { 
              setForm({ ...form, address: e.target.value }); 
              setLocationError(''); 
            }} 
            placeholder="Kitchen address" 
            rows={2} 
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 flex-shrink-0 mt-auto"
            onClick={() => handleFetchLocation(form.address)}
            disabled={isFetchingLocation || !form.address.trim()}
            title="Fetch location coordinates"
          >
            {isFetchingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
          </Button>
        </div>
        {locationError && <p className="text-xs text-destructive">{locationError}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Tiffin Capacity</Label>
          <Input type="number" value={form.tiffin_capacity} onChange={(e) => setForm({ ...form, tiffin_capacity: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Nearby Zones (Multiple Select)</Label>
          <Select 
            value={form.nearby_zones} 
            onValueChange={(value) => {
              // Add zone to existing list or remove if already selected
              const currentZones = form.nearby_zones ? form.nearby_zones.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
              if (currentZones.includes(value)) {
                // Remove if already selected
                const newZones = currentZones.filter((z: string) => z !== value);
                setForm({ ...form, nearby_zones: newZones.join(', ') });
              } else {
                // Add if not selected
                setForm({ ...form, nearby_zones: [...currentZones, value].join(', ') });
              }
            }}
            open={openZoneSelect}
            onOpenChange={setOpenZoneSelect}
          >
            <SelectTrigger className="h-auto min-h-[38px]">
              <SelectValue placeholder="Select zones" />
            </SelectTrigger>
            <SelectContent>
              {getSortedZones().length > 0 ? (
                getSortedZones().map((zone, idx) => {
                  const isSelected = form.nearby_zones.split(',').map((s: string) => s.trim()).includes(zone);
                  return (
                    <SelectItem key={zone} value={zone}>
                      <div className="flex items-center gap-2">
                        <span className={`flex-1 ${isSelected ? 'font-medium' : ''}`}>{zone}</span>
                        {kitchenLocation && idx < 3 && <span className="text-xs text-muted-foreground">(Near)</span>}
                        {isSelected && <span className="text-xs text-primary">✓</span>}
                      </div>
                    </SelectItem>
                  );
                })
              ) : (
                zones.map(z => (
                  <SelectItem key={z.name} value={z.name}>{z.name}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {form.nearby_zones && (
            <div className="flex flex-wrap gap-1 mt-2">
              {form.nearby_zones.split(',').map((s: string) => s.trim()).filter(Boolean).map((zone: string) => (
                <Badge 
                  key={zone} 
                  variant="secondary"
                  className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => {
                    const newZones = form.nearby_zones.split(',').map((s: string) => s.trim()).filter((z: string) => z !== zone);
                    setForm({ ...form, nearby_zones: newZones.join(', ') });
                  }}
                >
                  {zone} ×
                </Badge>
              ))}
            </div>
          )}
          {zones.length === 0 && (
            <p className="text-[10px] text-muted-foreground">No delivery areas found. Create zones first.</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Manage Kitchens</h3>
          <p className="text-sm text-muted-foreground">Add kitchens with managers, capacity and access codes</p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setIsAddOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Kitchen
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : kitchens.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No kitchens added yet</p>
            <Button className="mt-4" size="sm" onClick={() => { resetForm(); setIsAddOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add First Kitchen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {kitchens.map((k: any) => (
            <Card key={k.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{k.name}</h4>
                      <Badge variant={k.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{k.status}</Badge>
                    </div>
                    {k.manager_name && <p className="text-sm text-muted-foreground">{k.manager_name}</p>}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      {k.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{k.phone}</span>}
                      {k.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{k.address}</span>}
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{k.tiffin_capacity} capacity</span>
                    </div>
                    {k.nearby_zones?.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {k.nearby_zones.map((z: string) => <Badge key={z} variant="outline" className="text-[10px]">{z}</Badge>)}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">Access Code:</span>
                      <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono">{k.access_code}</code>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyCode(k.access_code)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(k)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(k.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Kitchen Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Kitchen</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); addKitchen.mutate(); }} className="space-y-4">
            {formFields}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1" disabled={addKitchen.isPending || !form.name.trim()}>
                {addKitchen.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Add Kitchen
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Kitchen Dialog */}
      <Dialog open={!!editKitchen} onOpenChange={(o) => { if (!o) { setEditKitchen(null); resetForm(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Kitchen</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateKitchen.mutate(); }} className="space-y-4">
            {formFields}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => { setEditKitchen(null); resetForm(); }} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1" disabled={updateKitchen.isPending || !form.name.trim()}>
                {updateKitchen.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      {deleteId && (
        <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Delete Kitchen?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">This cannot be undone.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">Cancel</Button>
              <Button variant="destructive" onClick={() => deleteKitchen.mutate(deleteId)} className="flex-1"
                disabled={deleteKitchen.isPending}>
                {deleteKitchen.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
