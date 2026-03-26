import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReferralCodes, useReferralUses } from '@/hooks/useReferrals';
import { useMembers } from '@/hooks/useMembers';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Copy, Plus, Trash2, Gift, Users, TrendingUp, Phone, Check, Crown, DollarSign, Clock, CheckCircle, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';

export default function Referrals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { referralCodes, isLoading: codesLoading, createReferralCode, toggleReferralCode, deleteReferralCode } = useReferralCodes();
  const { referralUses, isLoading: usesLoading } = useReferralUses();
  const { members } = useMembers();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCode, setNewCode] = useState({ memberId: '', discountPercent: '5', maxUses: '50', expiresAt: '' });

  // Stats
  const totalReferrals = referralUses.length;
  const pendingRewards = referralUses.filter((u: any) => (u.reward_status || 'pending') === 'pending');
  const paidRewards = referralUses.filter((u: any) => u.reward_status === 'paid');
  const totalRewardAmount = referralUses.reduce((sum: number, u: any) => sum + (u.reward_amount || 0), 0);
  const pendingRewardAmount = pendingRewards.reduce((sum: number, u: any) => sum + (u.reward_amount || 0), 0);

  // Top referrers — group by referrer_member_id, count, sort
  const referrerMap = new Map<string, { name: string; count: number; totalReward: number }>();
  referralUses.forEach((u: any) => {
    const rid = u.referrer_member_id;
    if (!rid) return;
    const existing = referrerMap.get(rid);
    const name = u.referrer_members?.name || members?.find(m => m.id === rid)?.name || 'Unknown';
    if (existing) {
      existing.count++;
      existing.totalReward += u.reward_amount || 0;
    } else {
      referrerMap.set(rid, { name, count: 1, totalReward: u.reward_amount || 0 });
    }
  });
  const topReferrers = Array.from(referrerMap.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count);

  const getMemberName = (memberId: string | null) => {
    if (!memberId) return 'General';
    return members?.find(m => m.id === memberId)?.name || 'Unknown';
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  };

  const handleCreateCode = async () => {
    await createReferralCode.mutateAsync({
      memberId: newCode.memberId || undefined,
      discountPercent: parseFloat(newCode.discountPercent),
      maxUses: parseInt(newCode.maxUses),
      expiresAt: newCode.expiresAt || undefined,
    });
    setIsCreateOpen(false);
    setNewCode({ memberId: '', discountPercent: '5', maxUses: '50', expiresAt: '' });
  };

  const handleMarkRewardPaid = async (useId: string) => {
    const { error } = await supabase
      .from('referral_uses')
      .update({ reward_status: 'paid', reward_paid_at: new Date().toISOString() } as any)
      .eq('id', useId);
    if (error) { toast.error('Failed: ' + error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['referralUses', user?.id] });
    toast.success('Reward marked as paid');
  };

  const handlePrintPoster = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Refer & Earn</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff}
      .poster{width:600px;padding:60px;text-align:center;border:4px solid #e85d04;border-radius:24px}
      h1{font-size:48px;font-weight:900;color:#e85d04;margin-bottom:12px}
      h2{font-size:24px;color:#333;margin-bottom:32px}
      .reward{font-size:64px;font-weight:900;color:#e85d04;margin:24px 0}
      .desc{font-size:20px;color:#666;line-height:1.6;margin-bottom:32px}
      .footer{font-size:14px;color:#999;border-top:2px solid #eee;padding-top:16px;margin-top:16px}
      @media print{body{background:none}.poster{border:none;padding:40px}}</style></head><body>
      <div class="poster">
        <h1>Refer & Earn</h1>
        <h2>Know someone who needs a mess service?</h2>
        <div class="reward">AED 50</div>
        <p class="desc">Tell your friends to mention <strong>your name</strong> when they join.<br/>
        Once they sign up, you earn <strong>AED 50 off</strong> your next month!</p>
        <div class="footer">Ask the mess owner for details • Powered by MessFlow</div>
      </div></body></html>`);
    w.document.close();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Gift className="h-5 w-5 sm:h-6 sm:w-6" />
              Referral Program
            </h1>
            <p className="text-sm text-muted-foreground">Track referrals, manage rewards, grow your business</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={handlePrintPoster}>
              <Printer className="h-4 w-4 mr-1" /> Poster
            </Button>
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Create Code
            </Button>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Total Referrals</p>
              <p className="text-2xl font-bold">{totalReferrals}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Rewards to Give</p>
              <p className="text-2xl font-bold text-amber-500">{pendingRewards.length}</p>
              <p className="text-[10px] text-muted-foreground">{formatCurrency(pendingRewardAmount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Rewards Paid</p>
              <p className="text-2xl font-bold text-green-500">{paidRewards.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Total Rewards</p>
              <p className="text-2xl font-bold">{formatCurrency(totalRewardAmount)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Top Referrers */}
        {topReferrers.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" /> Top Referrers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topReferrers.slice(0, 5).map((r, i) => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                        i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>{i + 1}</span>
                      <span className="text-sm font-medium">{r.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[10px]">{r.count} referrals</Badge>
                      <span className="text-sm font-medium text-green-500">{formatCurrency(r.totalReward)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="codes" className="space-y-4">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="codes">Codes ({referralCodes.length})</TabsTrigger>
            <TabsTrigger value="rewards">Rewards ({pendingRewards.length} pending)</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Codes Tab */}
          <TabsContent value="codes" className="space-y-2">
            {codesLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : referralCodes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Gift className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-3">No referral codes yet</p>
                  <p className="text-xs text-muted-foreground mb-4">Codes are auto-generated when you add members. You can also create custom codes.</p>
                  <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Create Code
                  </Button>
                </CardContent>
              </Card>
            ) : (
              referralCodes.map((code: any) => (
                <Card key={code.id} className={!code.is_active ? 'opacity-50' : ''}>
                  <CardContent className="py-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-sm">{code.code}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyCode(code.code)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">{getMemberName(code.member_id)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{code.uses_count}/{code.max_uses} used</Badge>
                        <Badge variant={code.is_active ? 'default' : 'secondary'} className="text-[10px]">
                          {code.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleReferralCode.mutateAsync({ id: code.id, isActive: !code.is_active })}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteReferralCode.mutateAsync(code.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Rewards Tab — Pending rewards the owner needs to give */}
          <TabsContent value="rewards" className="space-y-2">
            {usesLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : pendingRewards.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <CheckCircle className="h-10 w-10 mx-auto text-green-500 mb-3" />
                  <p className="text-muted-foreground">All rewards are settled!</p>
                </CardContent>
              </Card>
            ) : (
              pendingRewards.map((use: any) => (
                <Card key={use.id}>
                  <CardContent className="py-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{use.referrer_members?.name || getMemberName(use.referrer_member_id)} earned a reward</p>
                        <p className="text-xs text-muted-foreground">
                          Referred: {use.referred_members?.name || 'Unknown'} • {use.used_at ? new Date(use.used_at).toLocaleDateString() : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-amber-500">{formatCurrency(use.reward_amount || 50)}</span>
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleMarkRewardPaid(use.id)}>
                          <DollarSign className="h-3 w-3 mr-1" /> Mark Paid
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-2">
            {referralUses.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Referral history will appear here</p>
                </CardContent>
              </Card>
            ) : (
              referralUses.map((use: any) => (
                <Card key={use.id}>
                  <CardContent className="py-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{use.referred_members?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          Referred by: {use.referrer_members?.name || 'Unknown'} • Code: {use.referral_codes?.code || 'N/A'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] ${
                          use.reward_status === 'paid' ? 'border-green-500 text-green-500' : 'border-amber-500 text-amber-500'
                        }`}>
                          {use.reward_status === 'paid' ? 'Paid' : 'Pending'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {use.used_at ? new Date(use.used_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Referral Code</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Assign to Customer (optional)</Label>
                <Select value={newCode.memberId || undefined} onValueChange={(v) => setNewCode({ ...newCode, memberId: v || '' })}>
                  <SelectTrigger><SelectValue placeholder="General code" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__general__">General Code</SelectItem>
                    {members?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name} — {m.phone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount %</Label>
                  <Input type="number" value={newCode.discountPercent} onChange={(e) => setNewCode({ ...newCode, discountPercent: e.target.value })} min="1" max="100" />
                </div>
                <div className="space-y-2">
                  <Label>Max Uses</Label>
                  <Input type="number" value={newCode.maxUses} onChange={(e) => setNewCode({ ...newCode, maxUses: e.target.value })} min="1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Expires At (optional)</Label>
                <Input type="date" value={newCode.expiresAt} onChange={(e) => setNewCode({ ...newCode, expiresAt: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateCode} disabled={createReferralCode.isPending}>
                {createReferralCode.isPending ? 'Creating...' : 'Create Code'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
