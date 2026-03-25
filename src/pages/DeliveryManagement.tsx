import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DeliveryZoneBox } from '@/components/DeliveryZoneBox';
import { useMembers } from '@/hooks/useMembers';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Search, X, Phone, MapPin, Map, Edit2, Copy, CheckCircle, Loader2, Truck, Users, CheckCircle2, AlertTriangle, Image, Calendar, Eye } from 'lucide-react';
import { generateAccessCode } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { extractCoordinatesFromInput, fetchLocationFromAddress, sanitizeMapLink } from '@/lib/geolocation';
import { useDeliveryCompletions, DeliveryCompletionWithDetails } from '@/hooks/useDeliveryCompletions';
import { formatDistance } from '@/lib/geolocation';
import { formatDate } from '@/lib/format';

type Driver = {
  id: string;
  name: string;
  phone: string;
  access_code: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type Member = {
  id: string;
  name: string;
  phone: string;
  address?: string | null;
  delivery_area_id?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  location_lat?: number | null;
  location_lng?: number | null;
  map_link?: string | null;
};

export default function DeliveryManagement() {
  const { user } = useAuth();
  const { members, isLoading: membersLoading } = useMembers();
  const queryClient = useQueryClient();

  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [isEditDriverOpen, setIsEditDriverOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editCustomerForm, setEditCustomerForm] = useState({
    address: '',
    map_link: '',
    location_lat: null as number | null,
    location_lng: null as number | null,
    delivery_area_id: '',
  });
  const [isUpdatingCustomerLocation, setIsUpdatingCustomerLocation] = useState(false);
  const [locationError, setLocationError] = useState('');

  const { data: areas = [] } = useQuery({
    queryKey: ['deliveryAreas', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('delivery_areas')
        .select('*')
        .eq('owner_id', user.id)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const { data: zonesWithDrivers = [] } = useQuery({
    queryKey: ['delivery-zones', user?.id],
    queryFn: async () => {
      if (!user) return [];
      let result = await supabase
        .from('delivery_areas')
        .select('*, driver:drivers(id, name, phone)')
        .eq('owner_id', user.id)
        .order('name');
      if (result.error) {
        result = await supabase.from('delivery_areas').select('*').eq('owner_id', user.id).order('name') as any;
        if (result.error) throw result.error;
        return (result.data || []).map((z: any) => ({ ...z, driver: null }));
      }
      return (result.data || []).map((z: any) => ({
        ...z,
        driver: Array.isArray(z.driver) ? z.driver[0] || null : z.driver || null,
      }));
    },
    enabled: !!user,
    staleTime: 30000,
  });

  useEffect(() => {
    const fetchDrivers = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('drivers')
          .select('*')
          .eq('owner_id', user.id)
          .order('name');
        if (error) throw error;
        setDrivers(data || []);
      } catch (err) {
        console.warn('Error fetching drivers:', err);
      }
    };
    fetchDrivers();
  }, [user?.id]);

  const createDriverMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string; access_code: string }) => {
      const { data: inserted, error } = await supabase
        .from('drivers')
        .insert({ ...data, owner_id: user?.id || '' })
        .select()
        .single();
      if (error) throw error;
      return inserted;
    },
    onSuccess: (data) => {
      setDrivers([...drivers, data]);
      toast.success('Driver created successfully!');
      setIsAddDriverOpen(false);
      setDriverName('');
      setDriverPhone('');
    },
    onError: (error) => {
      toast.error('Failed to create driver: ' + error.message);
    }
  });

  const updateDriverMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; phone: string; status: string }) => {
      const { data: updated, error } = await supabase
        .from('drivers')
        .update({ name: data.name, phone: data.phone, status: data.status, updated_at: new Date().toISOString() })
        .eq('id', data.id)
        .select()
        .single();
      if (error) throw error;
      return updated;
    },
    onSuccess: (data) => {
      setDrivers(drivers.map(d => d.id === data.id ? data : d));
      toast.success('Driver updated successfully!');
      setIsEditDriverOpen(false);
      setEditingDriver(null);
    },
    onError: (error) => {
      toast.error('Failed to update driver: ' + error.message);
    }
  });

  const assignDriverToZoneMutation = useMutation({
    mutationFn: async ({ zoneId, driverId }: { zoneId: string; driverId: string | null }) => {
      const { error } = await supabase
        .from('delivery_areas')
        .update({ driver_id: driverId, updated_at: new Date().toISOString() })
        .eq('id', zoneId)
        .eq('owner_id', user?.id || '');

      if (error) throw error;

      if (driverId) {
        const { data: existingMappings } = await supabase
          .from('driver_zone_mapping')
          .select('id')
          .eq('zone_id', zoneId)
          .eq('driver_id', driverId);

        if (!existingMappings || existingMappings.length === 0) {
          await supabase
            .from('driver_zone_mapping')
            .insert({ zone_id: zoneId, driver_id: driverId });
        }
      } else {
        await supabase
          .from('driver_zone_mapping')
          .delete()
          .eq('zone_id', zoneId);
      }
    },
    onSuccess: () => {
      toast.success('Driver assigned to zone successfully!');
      queryClient.invalidateQueries({ queryKey: ['delivery-zones', user?.id] });
    },
    onError: (error) => {
      toast.error('Failed to assign driver: ' + error.message);
    }
  });

  const handleAssignDriverToZone = async (zoneId: string, driverId: string | null) => {
    await assignDriverToZoneMutation.mutateAsync({ zoneId, driverId });
  };

  const updateMemberLocationMutation = useMutation({
    mutationFn: async ({ memberId, locationData }: { memberId: string; locationData: any }) => {
      const { error } = await supabase
        .from('members')
        .update({
          address: locationData.address || null,
          map_link: locationData.map_link || null,
          location_lat: locationData.location_lat,
          location_lng: locationData.location_lng,
          delivery_area_id: locationData.delivery_area_id || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', memberId)
        .eq('owner_id', user?.id || '');
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Customer location updated!');
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (error) => {
      toast.error('Failed to update customer location: ' + error.message);
    }
  });

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    const accessCode = generateAccessCode();
    await createDriverMutation.mutateAsync({
      name: driverName,
      phone: driverPhone,
      access_code: accessCode
    });
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setDriverName(driver.name);
    setDriverPhone(driver.phone);
    setIsEditDriverOpen(true);
  };

  const handleUpdateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;
    await updateDriverMutation.mutateAsync({
      id: editingDriver.id,
      name: driverName,
      phone: driverPhone,
      status: editingDriver.status
    });
  };

  const handleCopyAccessCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success('Access code copied!');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const openEditCustomer = (member: Member) => {
    setEditingMember(member);
    setEditCustomerForm({
      address: member.address || '',
      map_link: member.map_link || '',
      location_lat: member.location_lat || null,
      location_lng: member.location_lng || null,
      delivery_area_id: member.delivery_area_id || '',
    });
    setLocationError('');
    setIsEditCustomerOpen(true);
  };

  const handleFetchCustomerLocation = async (input: string) => {
    if (!input.trim()) {
      setLocationError('Please enter an address or map link');
      return;
    }

    setIsUpdatingCustomerLocation(true);
    setLocationError('');

    try {
      const parsed = extractCoordinatesFromInput(input);
      
      if (parsed && parsed.lat && parsed.lng) {
        setEditCustomerForm(prev => ({
          ...prev,
          address: parsed.address || prev.address,
          map_link: parsed.mapLink || prev.map_link,
          location_lat: parsed.lat,
          location_lng: parsed.lng,
        }));
      } else {
        const result = await fetchLocationFromAddress(input);
        setEditCustomerForm(prev => ({
          ...prev,
          address: result.address || prev.address,
          map_link: result.mapLink || prev.map_link,
          location_lat: result.lat || null,
          location_lng: result.lng || null,
        }));
      }
    } catch {
      setLocationError('Could not fetch location. Please enter manually.');
    } finally {
      setIsUpdatingCustomerLocation(false);
    }
  };

  const handleCustomerMapLinkChange = (link: string) => {
    const sanitized = sanitizeMapLink(link);
    setEditCustomerForm(prev => ({ ...prev, map_link: sanitized }));
    
    if (sanitized) {
      const parsed = extractCoordinatesFromInput(sanitized);
      if (parsed && parsed.lat && parsed.lng) {
        setEditCustomerForm(prev => ({
          ...prev,
          location_lat: parsed.lat,
          location_lng: parsed.lng,
        }));
      }
    }
  };

  const handleUpdateCustomerLocation = async () => {
    if (!editingMember || !user) return;
    
    setIsUpdatingCustomerLocation(true);
    
    try {
      const locationData = {
        address: editCustomerForm.address || null,
        map_link: editCustomerForm.map_link || null,
        location_lat: editCustomerForm.location_lat,
        location_lng: editCustomerForm.location_lng,
        delivery_area_id: editCustomerForm.delivery_area_id || null,
      };

      await updateMemberLocationMutation.mutateAsync({
        memberId: editingMember.id,
        locationData
      });

      setIsEditCustomerOpen(false);
      setEditingMember(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update customer location');
    } finally {
      setIsUpdatingCustomerLocation(false);
    }
  };

  const getAreaStats = (areaId: string) => {
    return (members || []).filter((m: any) => (m as any).delivery_area_id === areaId).length;
  };

  const filteredMembers = useMemo(() => {
    return (members || []).filter((member: any) => {
      const matchesArea = areaFilter === 'all' || (member as any).delivery_area_id === areaFilter;
      const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
      const matchesSearch = searchQuery === '' || 
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.phone.includes(searchQuery) ||
        ((member as any).address && (member as any).address.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesArea && matchesStatus && matchesSearch;
    });
  }, [members, areaFilter, statusFilter, searchQuery]);

  const getMemberData = (member: any): Member => ({
    id: member.id,
    name: member.name,
    phone: member.phone,
    address: member.address || null,
    delivery_area_id: member.delivery_area_id || null,
    status: member.status,
    created_at: member.created_at,
    updated_at: member.updated_at,
    location_lat: member.location_lat || null,
    location_lng: member.location_lng || null,
    map_link: member.map_link || null,
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Delivery Management</h1>
            <p className="text-muted-foreground">Manage delivery zones and drivers</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Zones</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{areas.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Drivers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{drivers.filter(d => d.status === 'active').length}</p>
            </CardContent>
          </Card>

        </div>

        <div className="space-y-6">
          <DeliveryZoneBox
            zones={zonesWithDrivers.map((zone: any) => ({
              id: zone.id,
              name: zone.name,
              description: zone.description,
              member_count: getAreaStats(zone.id),
              driver: zone.driver,
            }))}
            selectedZoneId={selectedArea}
            onSelectZone={setSelectedArea}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['delivery-zones', user?.id] })}
            drivers={drivers}
            onAssignDriver={handleAssignDriverToZone}
            isAssigningDriver={assignDriverToZoneMutation.isPending}
          />

        </div>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Drivers Management
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setIsAddDriverOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Driver
            </Button>
          </CardHeader>
          <CardContent>
            {drivers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No drivers yet. Add your first driver to get started.</p>
            ) : (
              <ScrollArea className="space-y-3" style={{ maxHeight: '300px' }}>
                {drivers.map((driver) => (
                  <Card key={driver.id} className="cursor-pointer hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-foreground">{driver.name}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {driver.phone}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            Code: {driver.access_code}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-4 w-4"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyAccessCode(driver.access_code);
                              }}
                            >
                              {copiedCode === driver.access_code ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={driver.status === 'active' ? 'default' : 'secondary'}>
                            {driver.status}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditDriver(driver);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <DeliveryCompletionsSection userId={user?.id} drivers={drivers} />

        <Dialog open={isAddDriverOpen} onOpenChange={setIsAddDriverOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Driver</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateDriver} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="driverName">Driver Name</Label>
                <Input
                  id="driverName"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driverPhone">Phone Number</Label>
                <Input
                  id="driverPhone"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="05X XXX XXXX"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={createDriverMutation.isPending}>
                {createDriverMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Driver
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDriverOpen} onOpenChange={setIsEditDriverOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Driver</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateDriver} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editDriverName">Driver Name</Label>
                <Input
                  id="editDriverName"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDriverPhone">Phone Number</Label>
                <Input
                  id="editDriverPhone"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="05X XXX XXXX"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDriverStatus">Status</Label>
                <Select 
                  value={editingDriver?.status || 'active'} 
                  onValueChange={(v) => editingDriver && setEditingDriver({...editingDriver, status: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={updateDriverMutation.isPending}>
                {updateDriverMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Driver
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditCustomerOpen} onOpenChange={setIsEditCustomerOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="h-5 w-5" />
                Edit Customer Location
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {editingMember && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{editingMember.name}</p>
                  <p className="text-sm text-muted-foreground">{editingMember.phone}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Address</Label>
                <div className="flex gap-2">
                  <Input
                    value={editCustomerForm.address}
                    onChange={(e) => setEditCustomerForm({ ...editCustomerForm, address: e.target.value })}
                    placeholder="Enter address"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleFetchCustomerLocation(editCustomerForm.address)}
                    disabled={isUpdatingCustomerLocation || !editCustomerForm.address}
                  >
                    {isUpdatingCustomerLocation ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MapPin className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {locationError && (
                <p className="text-xs text-destructive">{locationError}</p>
              )}

              <div className="space-y-2">
                <Label>Map Link (Google Maps URL)</Label>
                <Input
                  value={editCustomerForm.map_link}
                  onChange={(e) => handleCustomerMapLinkChange(e.target.value)}
                  placeholder="Paste Google Maps link or coordinates"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={editCustomerForm.location_lat || ''}
                    onChange={(e) => setEditCustomerForm({ ...editCustomerForm, location_lat: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="e.g., 25.2048"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={editCustomerForm.location_lng || ''}
                    onChange={(e) => setEditCustomerForm({ ...editCustomerForm, location_lng: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="e.g., 55.2708"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Delivery Area/Zone</Label>
                <Select
                  value={editCustomerForm.delivery_area_id}
                  onValueChange={(value) => setEditCustomerForm({ ...editCustomerForm, delivery_area_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Area</SelectItem>
                    {areas.map((area: any) => (
                      <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Assign customer to a delivery area
                </p>
              </div>

              {editCustomerForm.location_lat && editCustomerForm.location_lng && (
                <div className="space-y-2">
                  <Label>Location Preview</Label>
                  <iframe
                    title="Location Preview"
                    width="100%"
                    height="120"
                    style={{ border: 0, borderRadius: '8px' }}
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${editCustomerForm.location_lng - 0.01}%2C${editCustomerForm.location_lat - 0.01}%2C${editCustomerForm.location_lng + 0.01}%2C${editCustomerForm.location_lat + 0.01}&layer=mapnik&marker=${editCustomerForm.location_lat}%2C${editCustomerForm.location_lng}`}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsEditCustomerOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateCustomerLocation} 
                  disabled={isUpdatingCustomerLocation}
                  className="flex-1"
                >
                  {isUpdatingCustomerLocation ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Location'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

type DriverBasic = {
  id: string;
  name: string;
  phone: string;
};

function DeliveryCompletionsSection({ 
  userId, 
  drivers 
}: { 
  userId?: string; 
  drivers: DriverBasic[]; 
}) {
  const { completions, isLoading } = useDeliveryCompletions({ ownerId: userId });
  const [selectedCompletion, setSelectedCompletion] = useState<DeliveryCompletionWithDetails | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [driverFilter, setDriverFilter] = useState<string>('all');

  const filteredCompletions = useMemo(() => {
    let filtered = [...completions];
    
    if (dateFilter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(c => c.delivery_date === today);
    } else if (dateFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(c => new Date(c.completed_at) >= weekAgo);
    }

    if (driverFilter !== 'all') {
      filtered = filtered.filter(c => c.driver_id === driverFilter);
    }

    return filtered;
  }, [completions, dateFilter, driverFilter]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayCompletions = completions.filter(c => c.delivery_date === today);
    const flaggedCount = todayCompletions.filter(c => c.status === 'flagged').length;
    const matchedCount = todayCompletions.filter(c => c.location_matched === true).length;
    return {
      totalToday: todayCompletions.length,
      flagged: flaggedCount,
      matched: matchedCount,
    };
  }, [completions]);

  if (!userId) return null;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Delivery Completions
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {stats.totalToday} today
            </Badge>
            {stats.flagged > 0 && (
              <Badge variant="destructive">
                {stats.flagged} flagged
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>

            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Drivers</SelectItem>
                {drivers.map(driver => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredCompletions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No completed deliveries found</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {filteredCompletions.map(completion => (
                  <Card 
                    key={completion.id} 
                    className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                      completion.status === 'flagged' ? 'border-amber-200' : ''
                    }`}
                    onClick={() => setSelectedCompletion(completion)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{completion.member_name || 'Unknown Member'}</p>
                            {completion.status === 'flagged' && (
                              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                            )}
                            {completion.location_matched === true && (
                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Driver: {completion.driver_name || 'Unknown'}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(completion.completed_at)}
                            </span>
                            {completion.location_match_distance_km !== null && (
                              <span>
                                {formatDistance(completion.location_match_distance_km)} away
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {completion.proof_photo_url && (
                            <Image className="h-4 w-4 text-muted-foreground" />
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedCompletion} onOpenChange={() => setSelectedCompletion(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Delivery Completion Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedCompletion && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <p className="font-medium">{selectedCompletion.member_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedCompletion.member_phone}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Driver</Label>
                  <p className="font-medium">{selectedCompletion.driver_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedCompletion.driver_phone}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Delivery Date</Label>
                  <p className="font-medium">{formatDate(selectedCompletion.delivery_date)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Completed At</Label>
                  <p className="font-medium">{formatDate(selectedCompletion.completed_at)}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant={selectedCompletion.status === 'flagged' ? 'destructive' : 'default'}
                    className={selectedCompletion.status === 'completed' ? 'bg-green-500' : ''}
                  >
                    {selectedCompletion.status === 'flagged' ? 'Flagged' : 'Completed'}
                  </Badge>
                  {selectedCompletion.location_matched === true && (
                    <Badge variant="outline" className="border-green-500 text-green-600">
                      Location Matched
                    </Badge>
                  )}
                  {selectedCompletion.location_matched === false && (
                    <Badge variant="outline" className="border-amber-500 text-amber-600">
                      Location Mismatch
                    </Badge>
                  )}
                </div>
              </div>

              {selectedCompletion.location_lat && selectedCompletion.location_lng && (
                <div>
                  <Label className="text-muted-foreground">Driver Location</Label>
                  <p className="text-sm">
                    {selectedCompletion.location_lat.toFixed(6)}, {selectedCompletion.location_lng.toFixed(6)}
                  </p>
                  {selectedCompletion.location_match_distance_km !== null && (
                    <p className="text-sm text-muted-foreground">
                      Distance from customer: {formatDistance(selectedCompletion.location_match_distance_km)}
                    </p>
                  )}
                </div>
              )}

              {selectedCompletion.proof_photo_url && (
                <div>
                  <Label className="text-muted-foreground mb-2 block">Photo Proof</Label>
                  <a
                    href={selectedCompletion.proof_photo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={selectedCompletion.proof_photo_url}
                      alt="Proof"
                      className="max-h-48 rounded-lg border"
                    />
                  </a>
                </div>
              )}

              {selectedCompletion.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="text-sm mt-1 p-2 bg-muted rounded">
                    {selectedCompletion.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
