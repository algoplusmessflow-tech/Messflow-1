import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Truck, MapPin, Phone, CheckCircle, XCircle, Clock, Search, LogIn, Package } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { Logo } from '@/components/Logo';

type Driver = {
  id: string;
  name: string;
  phone: string;
  access_code: string;
  status: string;
  owner_id: string;
};

type DeliveryBatch = {
  id: string;
  date: string;
  area_id: string;
  driver_id: string;
  status: string;
  area?: {
    name: string;
  };
};

type BatchDelivery = {
  id: string;
  batch_id: string;
  member_id: string;
  status: string;
  delivery_time?: string;
  remarks?: string;
  member?: {
    id: string;
    name: string;
    phone: string;
    address: string;
  };
};

export default function DriverPortal() {
  const { ownerId } = useParams();
  const navigate = useNavigate();
  
  const [accessCode, setAccessCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState<DeliveryBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<BatchDelivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode || !ownerId) {
      toast.error('Please enter your access code');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('owner_id', ownerId)
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
    if (isAuthenticated && driver) {
      const fetchBatches = async () => {
        const { data, error } = await supabase
          .from('delivery_batches')
          .select('*, area (name)')
          .eq('driver_id', driver.id)
          .order('date', { ascending: false })
          .limit(10);

        if (!error && data) {
          setBatches(data);
        }
      };
      fetchBatches();
    }
  }, [isAuthenticated, driver]);

  useEffect(() => {
    if (selectedBatch) {
      const fetchDeliveries = async () => {
        setDeliveriesLoading(true);
        const { data, error } = await supabase
          .from('batch_deliveries')
          .select('*, member (id, name, phone, address)')
          .eq('batch_id', selectedBatch)
          .order('created_at', { ascending: true });

        if (!error && data) {
          setDeliveries(data);
        }
        setDeliveriesLoading(false);
      };
      fetchDeliveries();
    }
  }, [selectedBatch]);

  const handleUpdateStatus = async (deliveryId: string, status: string, remarks?: string) => {
    try {
      const { error } = await supabase
        .from('batch_deliveries')
        .update({
          status,
          remarks: remarks || null,
          delivery_time: status === 'delivered' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryId);

      if (error) throw error;

      setDeliveries(deliveries.map(d => 
        d.id === deliveryId ? { ...d, status, remarks: remarks || null } : d
      ));
      toast.success('Delivery status updated!');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

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

  // Login Screen
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
              Enter your access code to view your deliveries
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
      {/* Header */}
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
        {/* Batch Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Today's Deliveries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {batches.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No deliveries assigned yet
              </p>
            ) : (
              batches.map((batch) => (
                <div
                  key={batch.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedBatch === batch.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedBatch(batch.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{batch.area?.name || 'No area'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(new Date(batch.date))}
                      </p>
                    </div>
                    <Badge {...getStatusBadge(batch.status)}>
                      {batch.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Delivery List */}
        {selectedBatch && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Delivery Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {deliveriesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : deliveries.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No deliveries in this batch
                </p>
              ) : (
                deliveries.map((delivery) => (
                  <div key={delivery.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{delivery.member?.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {delivery.member?.phone}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {delivery.member?.address}
                        </p>
                      </div>
                      <Badge {...getStatusBadge(delivery.status)}>
                        {delivery.status}
                      </Badge>
                    </div>
                    
                    {/* Action Buttons */}
                    {delivery.status === 'pending' || delivery.status === 'out_for_delivery' ? (
                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm" 
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleUpdateStatus(delivery.id, 'delivered')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Delivered
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleUpdateStatus(delivery.id, 'not_delivered')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Not Delivered
                        </Button>
                      </div>
                    ) : delivery.status === 'delivered' ? (
                      <p className="text-xs text-green-600 pt-1">
                        Delivered at: {delivery.delivery_time ? formatDate(new Date(delivery.delivery_time)) : 'N/A'}
                      </p>
                    ) : null}
                    
                    {delivery.remarks && (
                      <p className="text-xs text-muted-foreground pt-1 border-t">
                        Note: {delivery.remarks}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
