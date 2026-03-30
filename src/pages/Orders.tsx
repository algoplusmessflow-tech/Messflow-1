import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Receipt, Clock, CheckCircle2, ChefHat, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { useNavigate } from 'react-router-dom';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ComponentType<{ className?: string }> }> = {
  open:     { label: 'Open',     variant: 'default',     icon: Receipt },
  pending:  { label: 'Pending',  variant: 'secondary',   icon: Clock },
  served:   { label: 'Served',   variant: 'outline',     icon: CheckCircle2 },
  paid:     { label: 'Paid',     variant: 'outline',     icon: CheckCircle2 },
  kitchen:  { label: 'Kitchen',  variant: 'secondary',   icon: ChefHat },
};

export default function Orders() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('owner_id', user!.id)
        .not('status', 'eq', 'paid')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 30_000,
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-xl border backdrop-blur-xl border-border bg-card/80 p-6 shadow-xl">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Orders
              </h1>
              <p className="text-muted-foreground mt-1">Track and manage all active orders.</p>
            </div>
            <Button onClick={() => navigate('/tables')} className="gap-2">
              <Receipt className="h-4 w-4" />
              New Order
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <Card className="backdrop-blur-xl border-border bg-card/80">
            <CardContent className="py-16 text-center">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-foreground">No active orders</h3>
              <p className="text-muted-foreground mt-2 mb-6">
                Head to Tables to start taking new orders.
              </p>
              <Button onClick={() => navigate('/tables')}>Go to Tables</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orders.map((order: any) => {
              const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['open'];
              const StatusIcon = cfg.icon;
              return (
                <Card
                  key={order.id}
                  className="backdrop-blur-xl border-border bg-card/80 hover:shadow-lg transition-all duration-300 cursor-pointer"
                  onClick={() => navigate(`/tables`)}
                >
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-semibold">
                      Order #{order.order_number}
                    </CardTitle>
                    <Badge variant={cfg.variant} className="gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {cfg.label}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-medium capitalize">{order.order_type?.replace('_', ' ') ?? '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-bold text-primary">{formatCurrency(order.total ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Time</span>
                      <span className="text-muted-foreground">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
