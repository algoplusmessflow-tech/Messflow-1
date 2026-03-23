import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useMembers } from '@/hooks/useMembers';
import { useTransactions } from '@/hooks/useTransactions';
import { useExpenses } from '@/hooks/useExpenses';
import { useProfile } from '@/hooks/useProfile';
import { useGenerationLimits } from '@/hooks/useGenerationLimits';
import { useRealtimeSheetsSync } from '@/hooks/useRealtimeSheetsSync';
import { formatCurrency, formatDate, getDaysUntilExpiry } from '@/lib/format';
import { Users, Clock, TrendingUp, TrendingDown, Receipt, AlertTriangle, CreditCard, AlertCircle, FileText, FileSpreadsheet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
  variant = 'default',
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  variant?: 'default' | 'success' | 'destructive';
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className={`text-2xl font-bold ${variant === 'success' ? 'text-green-500' :
            variant === 'destructive' ? 'text-destructive' : ''
            }`}>
            {value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { profile, isLoading: profileLoading } = useProfile();
  const { members, activeCount, totalBalance, isLoading: membersLoading } = useMembers();
  const { todayCollections, weeklyData, isLoading: transactionsLoading } = useTransactions();
  const { todayExpenses, weeklyExpenses, isLoading: expensesLoading } = useExpenses();
  const generationLimits = useGenerationLimits();
  const queryClient = useQueryClient();

  // Real-time Google Sheets backup sync (fires on member changes)
  useRealtimeSheetsSync();

  const isLoading = profileLoading || membersLoading || transactionsLoading || expensesLoading;

  // Real-time plan change detection
  useEffect(() => {
    // Listen for profile changes to detect plan upgrades
    const channel = supabase
      .channel('dashboard-profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profile?.id}`,
        },
        (payload) => {
          // Invalidate relevant queries when profile is updated
          queryClient.invalidateQueries({ queryKey: ['profile'] });
          queryClient.invalidateQueries({ queryKey: ['generation-limits'] });

          // Show success toast for plan upgrade
          if (payload.new.plan_type === 'pro' && payload.old.plan_type === 'free') {
            toast.success('🎉 Plan upgraded! Generation limits removed.');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);

  // Members expiring soon (within 7 days)
  const expiringMembers = members.filter((member) => {
    if (!member.plan_expiry_date) return false;
    const days = getDaysUntilExpiry(member.plan_expiry_date);
    return days >= 0 && days <= 7;
  });

  // Notify about expiring members
  useEffect(() => {
    if (expiringMembers.length > 0 && !isLoading) {
      toast('Member Renewals Due', {
        description: `${expiringMembers.length} members are expiring within 7 days.`,
        action: {
          label: 'View',
          onClick: () => document.getElementById('expiring-section')?.scrollIntoView({ behavior: 'smooth' }),
        },
        duration: 5000,
      });
    }
  }, [expiringMembers.length, isLoading]);

  // Members with overdue payments (expired plan + outstanding balance)
  const overdueMembers = members.filter((member) => {
    if (!member.plan_expiry_date) return false;
    const days = getDaysUntilExpiry(member.plan_expiry_date);
    return days < 0 && member.balance > 0;
  });

  const totalOverdueDues = overdueMembers.reduce((sum, m) => sum + Number(m.balance), 0);

  // Combine weekly income and expenses for profit/loss chart
  const weeklyProfitLoss = weeklyData.map((income, i) => ({
    day: income.day,
    income: income.amount,
    expenses: weeklyExpenses[i]?.amount || 0,
    profit: income.amount - (weeklyExpenses[i]?.amount || 0),
  }));

  const weeklyTotalIncome = weeklyData.reduce((sum, d) => sum + d.amount, 0);
  const weeklyTotalExpenses = weeklyExpenses.reduce((sum, d) => sum + d.amount, 0);
  const weeklyProfit = weeklyTotalIncome - weeklyTotalExpenses;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-xl border backdrop-blur-xl border-border bg-card/80 p-6 shadow-xl shadow-glass">
          <div className="relative z-10">
            {profileLoading ? (
              <Skeleton className="h-8 w-48" />
            ) : (
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                {profile?.business_name || 'Dashboard'}
              </h1>
            )}
            <p className="text-muted-foreground mt-1">Welcome back! Here's your comprehensive overview.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="backdrop-blur-xl border-border bg-card/80 hover:shadow-lg hover:shadow-glass transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-primary">Active Members</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold text-foreground">{activeCount}</p>
              )}
            </CardContent>
          </Card>
          <Card className="backdrop-blur-xl border-border bg-card/80 hover:shadow-lg hover:shadow-glass transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Today's Collection</CardTitle>
              <CreditCard className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold text-green-600">{formatCurrency(todayCollections)}</p>
              )}
            </CardContent>
          </Card>
          <Card className="backdrop-blur-xl border-border bg-card/80 hover:shadow-lg hover:shadow-glass transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-destructive">Pending Dues</CardTitle>
              <Clock className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold text-destructive">{formatCurrency(totalBalance)}</p>
              )}
            </CardContent>
          </Card>
          <Card className="backdrop-blur-xl border-border bg-card/80 hover:shadow-lg hover:shadow-glass transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-orange-600">Today's Expenses</CardTitle>
              <Receipt className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(todayExpenses)}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Outstanding Dues Widget */}
        {overdueMembers.length > 0 && (
          <Card className="backdrop-blur-xl border-destructive/30 bg-card/80 hover:shadow-lg hover:shadow-glass transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2 text-destructive font-semibold">
                  <AlertCircle className="h-5 w-5" />
                  Overdue Payments ({overdueMembers.length})
                </CardTitle>
                <Badge variant="destructive" className="text-base px-3 py-1 font-bold">
                  {formatCurrency(totalOverdueDues)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <div className="space-y-2">
                  {overdueMembers.slice(0, 5).map((member) => {
                    const daysOverdue = Math.abs(getDaysUntilExpiry(member.plan_expiry_date!));
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-destructive/20 hover:bg-destructive/10 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-foreground">{member.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Expired {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} ago
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-destructive">{formatCurrency(member.balance)}</p>
                          <p className="text-xs text-muted-foreground">outstanding</p>
                        </div>
                      </div>
                    );
                  })}
                  {overdueMembers.length > 5 && (
                    <Link to="/members" className="text-sm text-destructive hover:text-destructive/80 font-medium block text-center py-2">
                      View all {overdueMembers.length} overdue members
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Expiring Soon Widget */}
        {expiringMembers.length > 0 && (
          <Card id="expiring-section" className="backdrop-blur-xl border-amber-300/30 bg-card/80 hover:shadow-lg hover:shadow-glass transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-amber-600 font-semibold">
                <AlertTriangle className="h-5 w-5" />
                Expiring Soon ({expiringMembers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {expiringMembers.slice(0, 5).map((member) => {
                  const days = getDaysUntilExpiry(member.plan_expiry_date!);
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-amber-300/20 hover:bg-amber-500/10 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-foreground">{member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Expires: {formatDate(new Date(member.plan_expiry_date!))}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-amber-500/50 text-amber-600 bg-amber-500/10 font-semibold">
                        {days === 0 ? 'Today' : `${days} days`}
                      </Badge>
                    </div>
                  );
                })}
                {expiringMembers.length > 5 && (
                  <Link to="/members" className="text-sm text-amber-600 hover:text-amber-500 font-medium block text-center py-2">
                    View all {expiringMembers.length} expiring members
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generation Limits for Free Users */}
        {!generationLimits.isPro ? (
          <Card className="backdrop-blur-xl border-blue-300/30 bg-card/80 hover:shadow-lg hover:shadow-glass transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-blue-600 font-semibold">
                <FileText className="h-5 w-5" />
                Generation Limits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">PDF Generations</span>
                    <span className="text-sm text-muted-foreground">
                      {generationLimits.pdfCount} / {generationLimits.pdfLimit}
                    </span>
                  </div>
                  <div className="w-full bg-background rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((generationLimits.pdfCount / generationLimits.pdfLimit) * 100, 100)}%` }}
                    ></div>
                  </div>
                  {generationLimits.pdfCount >= 12 && (
                    <p className="text-xs text-orange-600 font-medium">⚠️ Limit approaching</p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Excel Generations</span>
                    <span className="text-sm text-muted-foreground">
                      {generationLimits.excelCount} / {generationLimits.excelLimit}
                    </span>
                  </div>
                  <div className="w-full bg-background rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((generationLimits.excelCount / generationLimits.excelLimit) * 100, 100)}%` }}
                    ></div>
                  </div>
                  {generationLimits.excelCount >= 12 && (
                    <p className="text-xs text-orange-600 font-medium">⚠️ Limit approaching</p>
                  )}
                </div>
              </div>
              <div className="mt-4 text-center">
                <Link
                  to="/pricing"
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium underline"
                >
                  Upgrade to Pro for unlimited generations
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Profit/Loss Summary */}
        <Card className="backdrop-blur-xl border-border bg-card/80 hover:shadow-lg hover:shadow-glass transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 font-semibold">
              {weeklyProfit >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-destructive" />
              )}
              Weekly Profit/Loss
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-sm text-green-600 font-medium">Income</p>
                  <p className="text-xl font-bold text-green-700">{formatCurrency(weeklyTotalIncome)}</p>
                </div>
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-sm text-destructive font-medium">Expenses</p>
                  <p className="text-xl font-bold text-destructive">{formatCurrency(weeklyTotalExpenses)}</p>
                </div>
                <div className={`bg-gradient-to-br ${weeklyProfit >= 0 ? 'from-green-500/10 to-emerald-500/10 border-green-500/30' : 'from-destructive/10 to-rose-500/10 border-destructive/30'} rounded-lg p-4 backdrop-blur-sm`}>
                  <p className="text-sm font-medium">Profit</p>
                  <p className={`text-xl font-bold ${weeklyProfit >= 0 ? 'text-green-700' : 'text-destructive'}`}>
                    {weeklyProfit >= 0 ? '+' : ''}{formatCurrency(weeklyProfit)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl border-border bg-card/80 hover:shadow-lg hover:shadow-glass transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyProfitLoss}>
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === 'income' ? 'Income' : 'Expenses'
                      ]}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0',
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="income"
                      name="Income"
                      fill="hsl(142 76% 36%)"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="expenses"
                      name="Expenses"
                      fill="hsl(var(--destructive))"
                      radius={[0, 0, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
