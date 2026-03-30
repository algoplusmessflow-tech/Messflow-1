import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Receipt, QrCode, Loader2, Plus } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { useNavigate } from 'react-router-dom';

export default function Tokens() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['token-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, members(name)')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const totalToday = transactions
    .filter((t: any) => {
      const today = new Date();
      const txDate = new Date(t.created_at);
      return (
        txDate.getFullYear() === today.getFullYear() &&
        txDate.getMonth() === today.getMonth() &&
        txDate.getDate() === today.getDate()
      );
    })
    .reduce((sum: number, t: any) => sum + Number(t.amount ?? 0), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl border backdrop-blur-xl border-border bg-card/80 p-6 shadow-xl">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Tokens
              </h1>
              <p className="text-muted-foreground mt-1">
                Canteen token & meal coupon transactions.
              </p>
            </div>
            <Button onClick={() => navigate('/members')} className="gap-2">
              <Plus className="h-4 w-4" />
              Manage Members
            </Button>
          </div>
        </div>

        {/* Summary stat */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="backdrop-blur-xl border-border bg-card/80">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-primary">Today's Tokens</CardTitle>
              <QrCode className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totalToday)}</p>
            </CardContent>
          </Card>
          <Card className="backdrop-blur-xl border-border bg-card/80">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-green-600">Total Records</CardTitle>
              <Receipt className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{transactions.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions list */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <Card className="backdrop-blur-xl border-border bg-card/80">
            <CardContent className="py-16 text-center">
              <QrCode className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-foreground">No token transactions yet</h3>
              <p className="text-muted-foreground mt-2 mb-6">
                Token transactions will appear here as members use their meal coupons.
              </p>
              <Button variant="outline" onClick={() => navigate('/members')}>
                View Members
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="backdrop-blur-xl border-border bg-card/80">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
              {transactions.map((tx: any) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50 hover:bg-accent/30 transition-colors"
                >
                  <div>
                    <p className="font-medium text-foreground">{tx.members?.name ?? 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(new Date(tx.created_at))}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <Badge variant={tx.transaction_type === 'credit' ? 'default' : 'secondary'}>
                      {tx.transaction_type ?? 'debit'}
                    </Badge>
                    <span className="font-bold text-foreground">{formatCurrency(tx.amount ?? 0)}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
