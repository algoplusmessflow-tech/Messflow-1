import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Truck, MapPin, Phone, CheckCircle, XCircle, Search, LogOut, 
  Camera, Loader2, AlertTriangle, MapPinOff, Image as ImageIcon 
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { getCurrentLocation, checkLocationWithinPerimeter, formatDistance } from '@/lib/geolocation';
import { useCompleteDelivery, useDriverDeliveryCompletions } from '@/hooks/useDeliveryCompletions';

type Driver = {
  id: string;
  name: string;
  phone: string;
  access_code: string;
  status: string;
  owner_id: string;
};

type ZoneMember = {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  map_link: string | null;
  delivery_status?: string;
  delivery_area_id?: string | null;
};

type DeliveryArea = {
  id: string;
  name: string;
  created_at: string;
  description: string | null;
  owner_id: string;
  updated_at: string;
  center_lat: number | null;
  center_lng: number | null;
  radius_km: number | null;
  boundary_polygon?: [number, number][] | null;
  zone_mode?: string | null;
  driver_id?: string | null;
};

type ZoneWithPerimeter = ZoneMember & {
  area?: DeliveryArea | null;
  delivery_completed_today?: boolean;
};

export default function DriverPortal() {
  const { ownerId, slug } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [accessCode, setAccessCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<ZoneWithPerimeter[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [resolvedOwnerId, setResolvedOwnerId] = useState<string | null>(ownerId || null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ZoneWithPerimeter | null>(null);
  const [proofPhoto, setProofPhoto] = useState<File | null>(null);
  const [proofPhotoPreview, setProofPhotoPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationMatched, setLocationMatched] = useState<boolean | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const completeDeliveryMutation = useCompleteDelivery();
  const { todayCompletions } = useDriverDeliveryCompletions(driver?.id, resolvedOwnerId || undefined);

  useEffect(() => {
    if (ownerId) { setResolvedOwnerId(ownerId); return; }
    if (!slug) return;
    const resolve = async () => {
      try {
        const profileQuery = supabase
          .from('profiles')
          .select('user_id')
          .eq('business_slug', slug)
          .maybeSingle();
        
        const { data: slugResult } = await profileQuery as any;
        
        if (slugResult?.user_id) {
          setResolvedOwnerId(slugResult.user_id);
          return;
        }

        const idQuery = supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', slug)
          .maybeSingle();
        
        const { data: idResult } = await idQuery as any;
        
        if (idResult?.user_id) {
          setResolvedOwnerId(idResult.user_id);
        }
      } catch (e) {
        console.warn('Failed to resolve owner:', e);
      }
    };
    resolve();
  }, [ownerId, slug]);

  useEffect(() => {
    if (todayCompletions.length > 0) {
      setMembers(prev => prev.map(m => ({
        ...m,
        delivery_completed_today: todayCompletions.some(c => c.member_id === m.id)
      })));
    }
  }, [todayCompletions]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode || !resolvedOwnerId) {
      toast.error('Please enter your access code');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('owner_id', resolvedOwnerId)
        .eq('access_code', accessCode)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        toast.error('Invalid access code');
        return;
      }

      setDriver(data);
      setIsAuthenticated(true);
      toast.success(`Welcome, ${data.name}!`);
    } catch (error) {
      toast.error('Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && driver && resolvedOwnerId) {
      const fetchAssignedMembers = async () => {
        setMembersLoading(true);
        try {
          const { data: mappings } = await supabase
            .from('driver_zone_mapping')
            .select('zone_id')
            .eq('driver_id', driver.id);

          const assignedZoneIds = mappings?.map(m => m.zone_id) || [];

          if (assignedZoneIds.length === 0) {
            setMembers([]);
            setMembersLoading(false);
            return;
          }

          const { data: membersData, error } = await supabase
            .from('members')
            .select('*')
            .eq('owner_id', resolvedOwnerId)
            .eq('status', 'active')
            .in('delivery_area_id', assignedZoneIds);

          if (error) throw error;

          const { data: areasData } = await supabase
            .from('delivery_areas')
            .select('*')
            .in('id', assignedZoneIds);

          const areasMap = new Map<string, DeliveryArea>();
          (areasData || []).forEach((area: any) => areasMap.set(area.id, area as DeliveryArea));

          const completedMemberIds = new Set(todayCompletions.map(c => c.member_id));

          const membersWithArea = (membersData || []).map((m: any) => ({
            ...m,
            area: areasMap.get(m.delivery_area_id) || null,
            delivery_completed_today: completedMemberIds.has(m.id)
          }));

          setMembers(membersWithArea);
        } catch (err) {
          console.error('Error fetching members:', err);
          toast.error('Failed to load deliveries');
        } finally {
          setMembersLoading(false);
        }
      };
      fetchAssignedMembers();
    }
  }, [isAuthenticated, driver, resolvedOwnerId]);

  const openCompleteDialog = (member: ZoneWithPerimeter) => {
    setSelectedMember(member);
    setProofPhoto(null);
    setProofPhotoPreview(null);
    setNotes('');
    setDriverLocation(null);
    setLocationError(null);
    setLocationMatched(null);
    setDistanceKm(null);
    setIsCompleteDialogOpen(true);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Photo must be less than 10MB');
        return;
      }
      setProofPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCaptureLocation = async () => {
    setIsCapturingLocation(true);
    setLocationError(null);
    
    try {
      const result = await getCurrentLocation();
      setDriverLocation(result.coords);

      if (selectedMember?.location_lat && selectedMember?.location_lng) {
        const memberCoords = {
          lat: selectedMember.location_lat,
          lng: selectedMember.location_lng
        };
        
        const validation = checkLocationWithinPerimeter(result.coords, memberCoords, 0.5);
        setLocationMatched(validation.isWithinPerimeter);
        setDistanceKm(validation.distanceKm);
        
        if (validation.isWithinPerimeter) {
          toast.success('Location verified! You are within the delivery area.');
        } else {
          toast.warning(`Location mismatch: ${formatDistance(validation.distanceKm)} from customer location`);
        }
      } else if (selectedMember?.area?.center_lat && selectedMember?.area?.center_lng) {
        const zoneCenter = {
          lat: selectedMember.area.center_lat,
          lng: selectedMember.area.center_lng
        };
        const thresholdKm = selectedMember.area.radius_km || 5;
        const validation = checkLocationWithinPerimeter(result.coords, zoneCenter, thresholdKm);
        setLocationMatched(validation.isWithinPerimeter);
        setDistanceKm(validation.distanceKm);
        
        if (validation.isWithinPerimeter) {
          toast.success('Location verified! You are within the delivery zone.');
        } else {
          toast.warning(`Location mismatch: ${formatDistance(validation.distanceKm)} from zone center`);
        }
      } else {
        toast.info('No location data available for this customer to validate against.');
        setLocationMatched(null);
      }
    } catch (error: any) {
      setLocationError(error.message);
      setDriverLocation(null);
      setLocationMatched(null);
    } finally {
      setIsCapturingLocation(false);
    }
  };

  const handleCompleteDelivery = async () => {
    if (!selectedMember || !driver || !resolvedOwnerId) return;

    setIsCompleting(true);
    try {
      await completeDeliveryMutation.mutateAsync({
        memberId: selectedMember.id,
        driverId: driver.id,
        ownerId: resolvedOwnerId,
        proofPhoto: proofPhoto || undefined,
        locationLat: driverLocation?.lat,
        locationLng: driverLocation?.lng,
        locationMatched: locationMatched,
        locationMatchDistanceKm: distanceKm || undefined,
        notes: notes || undefined,
        status: locationMatched === false ? 'flagged' : 'completed',
      });

      setMembers(prev => prev.map(m => 
        m.id === selectedMember.id 
          ? { ...m, delivery_completed_today: true } 
          : m
      ));
      
      setIsCompleteDialogOpen(false);
      setSelectedMember(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete delivery');
    } finally {
      setIsCompleting(false);
    }
  };

  const getStatusBadge = (member: ZoneWithPerimeter) => {
    if (member.delivery_completed_today) {
      return { variant: 'default' as const, text: 'Completed', className: 'bg-green-500' };
    }
    
    switch (member.delivery_status) {
      case 'out_for_delivery': return { variant: 'default' as const, text: 'Out for Delivery' };
      case 'delivered': return { variant: 'default' as const, text: 'Delivered' };
      case 'not_delivered': return { variant: 'destructive' as const, text: 'Not Delivered' };
      case 'skipped': return { variant: 'outline' as const, text: 'Skipped' };
      default: return { variant: 'secondary' as const, text: 'Pending' };
    }
  };

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.phone.includes(searchQuery) ||
    (m.address && m.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const completedCount = filteredMembers.filter(m => m.delivery_completed_today).length;
  const pendingCount = filteredMembers.length - completedCount;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Logo className="h-16 w-auto" showText={true} />
            </div>
            <CardTitle className="text-xl">Driver Portal</CardTitle>
            <p className="text-muted-foreground text-sm">
              Enter your access code to view your assigned deliveries
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accessCode">Access Code</Label>
                <Input
                  id="accessCode"
                  type="text"
                  placeholder="Enter your access code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  className="text-center text-2xl tracking-widest"
                  maxLength={8}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verifying...' : 'Access Deliveries'}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Get your access code from your mess owner
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <header className="bg-card/80 backdrop-blur-xl border-b sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="h-6 w-6" />
            <div>
              <h1 className="font-bold text-lg">Driver Portal</h1>
              <p className="text-xs text-muted-foreground">{driver?.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsAuthenticated(false)}>
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              My Assigned Deliveries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-muted-foreground">
                {completedCount} completed
              </span>
              <span className="text-muted-foreground">
                {pendingCount} pending
              </span>
            </div>
          </CardContent>
        </Card>

        {membersLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="h-20 bg-muted rounded-lg animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">
                {members.length === 0 
                  ? 'No deliveries assigned to you yet. Contact your mess owner to assign zones.'
                  : 'No deliveries match your search.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredMembers.map((member) => {
            const badge = getStatusBadge(member);
            return (
              <Card key={member.id} className={`hover:shadow-md transition-shadow ${member.delivery_completed_today ? 'border-green-200' : ''}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{member.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {member.phone}
                      </p>
                      {member.address && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {member.address}
                        </p>
                      )}
                    </div>
                    <Badge {...badge} className={badge.className}>
                      {badge.text}
                    </Badge>
                  </div>

                  {member.location_lat && member.location_lng && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${member.location_lat},${member.location_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-primary/10 hover:bg-primary/20 rounded-lg text-primary text-sm font-medium transition-colors"
                    >
                      <MapPin className="h-4 w-4" />
                      Navigate
                    </a>
                  )}

                  {member.map_link && !member.location_lat && (
                    <a
                      href={member.map_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
                    >
                      <MapPin className="h-4 w-4" />
                      View on Map
                    </a>
                  )}

                  {!member.delivery_completed_today && (
                    <Button 
                      onClick={() => openCompleteDialog(member)}
                      className="w-full"
                      variant="default"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Delivery
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </main>

      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Complete Delivery
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedMember && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedMember.name}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {selectedMember.phone}
                </p>
                {selectedMember.address && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {selectedMember.address}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Photo Proof (Required)</Label>
              <div 
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {proofPhotoPreview ? (
                  <div className="space-y-2">
                    <img 
                      src={proofPhotoPreview} 
                      alt="Proof" 
                      className="max-h-48 mx-auto rounded-lg object-contain"
                    />
                    <p className="text-sm text-muted-foreground">Tap to change photo</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Camera className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Tap to take or upload photo</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>

            <div className="space-y-2">
              <Label>Location Verification</Label>
              <div className="p-3 bg-muted rounded-lg space-y-2">
                {locationError ? (
                  <div className="flex items-start gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                    <p className="text-sm">{locationError}</p>
                  </div>
                ) : driverLocation ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Location captured</span>
                    </div>
                    {distanceKm !== null && (
                      <p className="text-xs text-muted-foreground">
                        Distance: {formatDistance(distanceKm)}
                        {locationMatched ? ' (Within perimeter)' : ' (Outside perimeter)'}
                      </p>
                    )}
                    {locationMatched === false && (
                      <div className="flex items-start gap-2 text-amber-600 bg-amber-50 p-2 rounded">
                        <AlertTriangle className="h-4 w-4 mt-0.5" />
                        <p className="text-xs">
                          Delivery will be flagged as location mismatch
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPinOff className="h-4 w-4 mt-0.5" />
                    <p className="text-sm">No location captured yet</p>
                  </div>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCaptureLocation}
                  disabled={isCapturingLocation}
                  className="w-full"
                >
                  {isCapturingLocation ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Getting location...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4 mr-2" />
                      {driverLocation ? 'Update Location' : 'Capture Current Location'}
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special notes about this delivery..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setIsCompleteDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCompleteDelivery}
                disabled={isCompleting || !proofPhoto}
                className="flex-1"
              >
                {isCompleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete
                  </>
                )}
              </Button>
            </div>
            
            {!proofPhoto && (
              <p className="text-xs text-center text-muted-foreground">
                Photo proof is required to complete delivery
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
