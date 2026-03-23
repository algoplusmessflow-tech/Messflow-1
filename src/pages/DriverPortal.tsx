import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Truck, MapPin, Phone, CheckCircle, XCircle, Search, LogIn } from 'lucide-react';
import { Logo } from '@/components/Logo';

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
};

export default function DriverPortal() {
  const { ownerId, slug } = useParams();
  
  const [accessCode, setAccessCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<ZoneMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [resolvedOwnerId, setResolvedOwnerId] = useState<string | null>(ownerId || null);
  const [searchQuery, setSearchQuery] = useState('');

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
          const { data, error } = await supabase
            .from('members')
            .select('id, name, phone, address, location_lat, location_lng, map_link, delivery_area_id' as any)
            .eq('owner_id', resolvedOwnerId)
            .eq('status', 'active');

          if (error) throw error;

          const { data: mappings } = await supabase
            .from('driver_zone_mapping')
            .select('zone_id')
            .eq('driver_id', driver.id);

          const assignedZoneIds = mappings?.map(m => m.zone_id) || [];

          const assignedMembers = (data || []).filter((m: any) => 
            m.delivery_area_id && assignedZoneIds.includes(m.delivery_area_id)
          );

          const membersWithStatus = assignedMembers.map((m: any) => ({
            ...m,
            delivery_status: m.delivery_status || 'pending'
          }));

          setMembers(membersWithStatus);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return { variant: 'secondary' as const, text: 'Pending' };
      case 'out_for_delivery': return { variant: 'default' as const, text: 'Out for Delivery' };
      case 'delivered': return { variant: 'default' as const, text: 'Delivered' };
      case 'not_delivered': return { variant: 'destructive' as const, text: 'Not Delivered' };
      case 'skipped': return { variant: 'outline' as const, text: 'Skipped' };
      default: return { variant: 'secondary' as const, text: status };
    }
  };

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.phone.includes(searchQuery) ||
    (m.address && m.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
            <div className="text-sm text-muted-foreground">
              {filteredMembers.length} of {members.length} deliveries
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
          filteredMembers.map((member) => (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
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
                  <Badge {...getStatusBadge(member.delivery_status || 'pending')}>
                    {member.delivery_status || 'pending'}
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

                {member.map_link && (
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
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
