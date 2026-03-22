import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useMapConfig } from '@/hooks/useMapConfig';
import { fetchLocationFromAddress, haversineDistance, generateEmbedUrl } from '@/lib/geolocation';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, MapPin, Loader2, Users, Search, X, Navigation, Radius, UserCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type DeliveryZone = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  center_lat: number | null;
  center_lng: number | null;
  radius_km: number | null;
  created_at: string;
  updated_at: string;
  member_count?: number;
  members_in_radius?: number;
};

type MemberGeo = {
  id: string;
  name: string;
  phone: string;
  delivery_area_id: string | null;
  location_lat: number | null;
  location_lng: number | null;
  status: string;
};

export default function DeliveryZones() {
  const { user } = useAuth();
  const mapConfig = useMapConfig();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [formData, setFormData] = useState({
    name: '', description: '', locationQuery: '',
    center_lat: null as number | null, center_lng: null as number | null,
    radius_km: 5,
  });
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationResult, setLocationResult] = useState<string | null>(null);
  const [locationError, setLocationError] = useState('');
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);

  // Fetch zones
  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['delivery-zones', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const areasResult = await supabase.from('delivery_areas').select('*').eq('owner_id', user.id).order('name');
      if (areasResult.error) throw areasResult.error;
      return (areasResult.data || []) as DeliveryZone[];
    },
    enabled: !!user,
    staleTime: 30000,
  });

  // Fetch all members with geo data
  const { data: allMembers = [] } = useQuery({
    queryKey: ['members-geo', user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const { data } = await supabase
          .from('members')
          .select('id, name, phone, delivery_area_id, location_lat, location_lng, status')
          .eq('owner_id', user.id)
          .eq('status', 'active');
        return (data || []) as MemberGeo[];
      } catch { return []; }
    },
    enabled: !!user,
    staleTime: 30000,
  });

  // Compute member counts per zone (assigned + in-radius)
  const zonesWithCounts = useMemo(() => {
    return zones.map((zone) => {
      const assigned = allMembers.filter((m) => m.delivery_area_id === zone.id).length;
      let inRadius = 0;
      if (zone.center_lat && zone.center_lng && zone.radius_km) {
        inRadius = allMembers.filter((m) => {
          if (!m.location_lat || !m.location_lng) return false;
          return haversineDistance(m.location_lat, m.location_lng, zone.center_lat!, zone.center_lng!) <= zone.radius_km!;
        }).length;
      }
      return { ...zone, member_count: assigned, members_in_radius: inRadius };
    });
  }, [zones, allMembers]);

  const handleFetchLocation = async () => {
    const query = formData.locationQuery.trim();
    if (!query) { setLocationError('Enter a location name or address'); return; }
    setIsFetchingLocation(true);
    setLocationError('');
    setLocationResult(null);
    try {
      const result = await fetchLocationFromAddress(query, mapConfig);
      if (result.lat && result.lng) {
        setFormData((prev) => ({
          ...prev,
          center_lat: result.lat!,
          center_lng: result.lng!,
          description: prev.description
            ? `${prev.description}\nCenter: ${result.address || query}`
            : `Center: ${result.address || query}`,
        }));
        setLocationResult(`${result.address || query} (${result.lat.toFixed(4)}, ${result.lng.toFixed(4)})`);
        toast.success('Zone center set!');
      } else {
        setLocationError('Could not geocode. Try a more specific address.');
      }
    } catch {
      setLocationError('Geocoding failed. Check API key in Settings.');
    } finally {
      setIsFetchingLocation(false);
    }
  };

  // Members within the current form's radius (preview)
  const previewMembersInRadius = useMemo(() => {
    if (!formData.center_lat || !formData.center_lng) return [];
    return allMembers.filter((m) => {
      if (!m.location_lat || !m.location_lng) return false;
      return haversineDistance(m.location_lat, m.location_lng, formData.center_lat!, formData.center_lng!) <= formData.radius_km;
    });
  }, [allMembers, formData.center_lat, formData.center_lng, formData.radius_km]);

  const addZone = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user) throw new Error('Not authenticated');
      const { data: zone, error } = await supabase
        .from('delivery_areas')
        .insert({
          owner_id: user.id,
          name: data.name.trim(),
          description: data.description.trim() || null,
          center_lat: data.center_lat,
          center_lng: data.center_lng,
          radius_km: data.radius_km,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return zone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones', user?.id] });
      toast.success('Zone added!');
      resetForm();
      setIsAddOpen(false);
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const updateZone = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase
        .from('delivery_areas')
        .update({
          name: data.name.trim(),
          description: data.description.trim() || null,
          center_lat: data.center_lat,
          center_lng: data.center_lng,
          radius_km: data.radius_km,
        } as any)
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones', user?.id] });
      toast.success('Zone updated!');
      setIsEditOpen(false);
      setSelectedZone(null);
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const deleteZone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('delivery_areas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones', user?.id] });
      toast.success('Zone deleted!');
      setDeleteId(null);
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  // Auto-assign members within radius to this zone
  const handleAutoAssign = async (zone: DeliveryZone) => {
    if (!zone.center_lat || !zone.center_lng || !zone.radius_km) {
      toast.error('Set zone center and radius first');
      return;
    }
    setIsAutoAssigning(true);
    try {
      const membersInRadius = allMembers.filter((m) => {
        if (!m.location_lat || !m.location_lng) return false;
        if (m.delivery_area_id === zone.id) return false; // already assigned
        return haversineDistance(m.location_lat, m.location_lng, zone.center_lat!, zone.center_lng!) <= zone.radius_km!;
      });

      if (membersInRadius.length === 0) {
        toast.info('No unassigned members found within this zone radius');
        return;
      }

      const ids = membersInRadius.map((m) => m.id);
      const { error } = await supabase
        .from('members')
        .update({ delivery_area_id: zone.id } as any)
        .in('id', ids);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['members-geo', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['delivery-zones', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['members', user?.id] });
      toast.success(`${membersInRadius.length} members auto-assigned to "${zone.name}"`);
    } catch (err: any) {
      toast.error('Auto-assign failed: ' + err.message);
    } finally {
      setIsAutoAssigning(false);
    }
  };

  const openEdit = (zone: DeliveryZone) => {
    setSelectedZone(zone);
    const z = zone as any;
    setFormData({
      name: z.name,
      description: z.description || '',
      locationQuery: '',
      center_lat: z.center_lat || null,
      center_lng: z.center_lng || null,
      radius_km: z.radius_km || 5,
    });
    setLocationResult(z.center_lat ? `(${z.center_lat.toFixed(4)}, ${z.center_lng.toFixed(4)})` : null);
    setLocationError('');
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', locationQuery: '', center_lat: null, center_lng: null, radius_km: 5 });
    setLocationResult(null);
    setLocationError('');
  };

  const filteredZones = zonesWithCounts.filter((z) =>
    searchQuery === '' || z.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAssigned = zonesWithCounts.reduce((sum, z) => sum + (z.member_count || 0), 0);

  // Zone form fields rendered inline (NOT as a sub-component to prevent remount on state change)
  const zoneFormFieldsJsx = (
    <>
      <div className="space-y-2">
        <Label>Zone Name *</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Downtown, Muwaileh, Al Nahda"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Zone Center (Location Lookup)</Label>
        <div className="flex gap-1">
          <Input
            value={formData.locationQuery}
            onChange={(e) => { setFormData({ ...formData, locationQuery: e.target.value }); setLocationError(''); setLocationResult(null); }}
            placeholder="Enter area name or address"
            className="flex-1"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFetchLocation(); } }}
          />
          <Button type="button" variant="outline" onClick={handleFetchLocation}
            disabled={isFetchingLocation || !formData.locationQuery.trim()} className="flex-shrink-0">
            {isFetchingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
            <span className="ml-1 hidden sm:inline">Fetch</span>
          </Button>
        </div>
        {locationError && <p className="text-xs text-destructive">{locationError}</p>}
        {locationResult && (
          <p className="text-xs text-primary flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {locationResult}
          </p>
        )}
      </div>

      {formData.center_lat && formData.center_lng && (
        <>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Delivery Radius</Label>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0.5}
                  max={50}
                  step={0.5}
                  value={formData.radius_km}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v) && v >= 0.5 && v <= 50) setFormData({ ...formData, radius_km: v });
                    else if (e.target.value === '') setFormData({ ...formData, radius_km: 0.5 });
                  }}
                  className="w-20 h-7 text-center text-sm font-mono px-1"
                />
                <span className="text-xs text-muted-foreground">km</span>
              </div>
            </div>
            <Slider
              value={[formData.radius_km]}
              onValueChange={([v]) => setFormData({ ...formData, radius_km: v })}
              min={0.5}
              max={50}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0.5 km</span>
              <span>25 km</span>
              <span>50 km</span>
            </div>
          </div>

          {/* Preview: members in radius */}
          <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> Members in radius
              </span>
              <Badge variant={previewMembersInRadius.length > 0 ? 'default' : 'secondary'}>
                {previewMembersInRadius.length}
              </Badge>
            </div>
            {previewMembersInRadius.length > 0 && (
              <div className="text-xs text-muted-foreground max-h-24 overflow-y-auto space-y-1">
                {previewMembersInRadius.slice(0, 10).map((m) => (
                  <div key={m.id} className="flex justify-between">
                    <span>{m.name}</span>
                    <span className="font-mono">
                      {haversineDistance(m.location_lat!, m.location_lng!, formData.center_lat!, formData.center_lng!).toFixed(1)} km
                    </span>
                  </div>
                ))}
                {previewMembersInRadius.length > 10 && (
                  <p className="text-muted-foreground">+{previewMembersInRadius.length - 10} more</p>
                )}
              </div>
            )}
            {previewMembersInRadius.length === 0 && (
              <p className="text-xs text-muted-foreground">No members with location data found within this radius</p>
            )}
          </div>

          {/* Map embed */}
          <div className="rounded-lg overflow-hidden border h-40">
            <iframe
              src={generateEmbedUrl(formData.center_lat, formData.center_lng, mapConfig)}
              width="100%" height="100%" style={{ border: 0 }}
              loading="lazy" title="Zone center"
            />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Area boundaries, landmarks, notes..."
          rows={2}
        />
      </div>
    </>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MapPin className="h-6 w-6 text-primary" />
              Delivery Zones
            </h1>
            <p className="text-muted-foreground">
              {zones.length} zones · {totalAssigned} members assigned
            </p>
          </div>
          <Button onClick={() => { resetForm(); setIsAddOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Add Zone
          </Button>
        </div>

        {/* Search */}
        {zones.length > 3 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search zones..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            {searchQuery && (
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}><X className="h-3 w-3" /></Button>
            )}
          </div>
        )}

        {/* Zone List */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
          ) : filteredZones.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">
                  {zones.length === 0 ? 'No delivery zones yet. Create your first zone with a coverage radius.' : 'No zones match your search.'}
                </p>
                {zones.length === 0 && (
                  <Button className="mt-4" onClick={() => { resetForm(); setIsAddOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1" /> Create First Zone
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredZones.map((zone) => (
              <Card key={zone.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium truncate">{zone.name}</h3>
                        {zone.description && (
                          <p className="text-sm text-muted-foreground truncate">{zone.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {zone.radius_km && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <Radius className="h-3 w-3" />
                              {zone.radius_km} km radius
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {zone.member_count} assigned
                          </Badge>
                          {zone.members_in_radius !== undefined && zone.members_in_radius > 0 && zone.center_lat && (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <UserCheck className="h-3 w-3" />
                              {zone.members_in_radius} in range
                            </Badge>
                          )}
                          {zone.center_lat && !zone.center_lat && (
                            <Badge variant="destructive" className="text-xs">No center set</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {zone.center_lat && zone.radius_km && (
                        <Button
                          size="sm" variant="outline"
                          className="text-xs"
                          onClick={() => handleAutoAssign(zone)}
                          disabled={isAutoAssigning}
                          title="Auto-assign members within radius"
                        >
                          {isAutoAssigning ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <UserCheck className="h-3 w-3 mr-1" />}
                          Auto-assign
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(zone)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(zone.id)}
                        disabled={(zone.member_count || 0) > 0}
                        title={(zone.member_count || 0) > 0 ? 'Remove members first' : 'Delete zone'}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Add Zone Dialog */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Delivery Zone</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addZone.mutate(formData); }} className="space-y-4">
              {zoneFormFieldsJsx}
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => { resetForm(); setIsAddOpen(false); }} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1" disabled={addZone.isPending || !formData.name.trim()}>
                  {addZone.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Zone
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Zone Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Zone</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); if (selectedZone) updateZone.mutate({ ...formData, id: selectedZone.id }); }} className="space-y-4">
              {zoneFormFieldsJsx}
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => { setIsEditOpen(false); resetForm(); }} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1" disabled={updateZone.isPending || !formData.name.trim()}>
                  {updateZone.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Zone?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this delivery zone. Members assigned to this zone will be unassigned.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteId && deleteZone.mutate(deleteId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
