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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useReferralCodes, useReferralUses } from '@/hooks/useReferrals';
import { useMembers } from '@/hooks/useMembers';
import { Copy, Plus, Trash2, ToggleLeft, Gift, Users, TrendingUp, Calendar, Phone, Check, X } from 'lucide-react';
import { toast } from 'sonner';

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export default function Referrals() {
  const { referralCodes, isLoading: codesLoading, createReferralCode, toggleReferralCode, deleteReferralCode } = useReferralCodes();
  const { referralUses, isLoading: usesLoading } = useReferralUses();
  const { members } = useMembers();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCode, setNewCode] = useState({
    memberId: '',
    discountPercent: '5',
    maxUses: '10',
    expiresAt: '',
  });

  const activeCodes = referralCodes.filter(c => c.is_active);
  const totalUses = referralUses.length;
  const totalDiscount = referralUses.reduce((sum, u) => sum + (u.discount_applied || 0), 0);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard!');
  };

  const handleCreateCode = async () => {
    await createReferralCode.mutateAsync({
      memberId: newCode.memberId || undefined,
      discountPercent: parseFloat(newCode.discountPercent),
      maxUses: parseInt(newCode.maxUses),
      expiresAt: newCode.expiresAt || undefined,
    });
    setIsCreateOpen(false);
    setNewCode({
      memberId: '',
      discountPercent: '5',
      maxUses: '10',
      expiresAt: '',
    });
  };

  const handleToggleCode = async (id: string, currentStatus: boolean) => {
    await toggleReferralCode.mutateAsync({
      id,
      isActive: !currentStatus,
    });
  };

  const handleDeleteCode = async (id: string) => {
    await deleteReferralCode.mutateAsync(id);
  };

  const getMemberName = (memberId: string | null) => {
    if (!memberId) return 'General';
    const member = members?.find(m => m.id === memberId);
    return member?.name || 'Unknown';
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Gift className="h-6 w-6" />
              Referral Program
            </h1>
            <p className="text-muted-foreground">Manage referral codes and track referrals</p>
          </div>

          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Code
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Codes"
            value={referralCodes.length}
            icon={Gift}
          />
          <StatCard
            title="Active Codes"
            value={activeCodes.length}
            icon={Check}
          />
          <StatCard
            title="Total Referrals"
            value={totalUses}
            icon={Users}
            subtitle="times used"
          />
          <StatCard
            title="Discount Given"
            value={`AED ${totalDiscount.toFixed(0)}`}
            icon={TrendingUp}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="codes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="codes">Active Codes</TabsTrigger>
            <TabsTrigger value="history">Referral History</TabsTrigger>
          </TabsList>

          <TabsContent value="codes" className="space-y-4">
            {codesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : referralCodes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No referral codes yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first referral code to start the program</p>
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Code
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {referralCodes.map((code) => (
                  <Card key={code.id} className={!code.is_active ? 'opacity-60' : ''}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-lg">{code.code}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleCopyCode(code.code)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Users className="h-3 w-3" />
                              {getMemberName(code.member_id)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Discount</p>
                            <p className="font-medium">{code.discount_percent}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Uses</p>
                            <p className="font-medium">{code.uses_count}/{code.max_uses}</p>
                          </div>
                          {code.expires_at && (
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground">Expires</p>
                              <p className="font-medium text-xs">
                                {new Date(code.expires_at).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                          <Badge variant={code.is_active ? 'default' : 'secondary'}>
                            {code.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleCode(code.id, code.is_active)}
                          >
                            <ToggleLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteCode(code.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {usesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : referralUses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No referrals yet</h3>
                  <p className="text-muted-foreground">Referral history will appear here when customers use codes</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {referralUses.map((use) => (
                  <Card key={use.id}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {use.referred_members?.name || 'Unknown'}
                            </span>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {use.referred_members?.phone || 'N/A'}
                            </div>
                          </div>
                          {use.referrer_members?.name && (
                            <div className="text-sm text-muted-foreground">
                              Referred by: {use.referrer_members.name}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="font-mono">
                            {use.referral_codes?.code}
                          </Badge>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Discount</p>
                            <p className="font-medium text-green-600">AED {use.discount_applied}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Used</p>
                            <p className="font-medium text-xs">
                              {new Date(use.used_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
                <Label>Assign to Customer (Optional)</Label>
                <Select
                  value={newCode.memberId || undefined}
                  onValueChange={(value) => setNewCode({ ...newCode, memberId: value || '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="General code (anyone can use)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__general__">General Code</SelectItem>
                    {members?.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} - {member.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount %</Label>
                  <Input
                    type="number"
                    value={newCode.discountPercent}
                    onChange={(e) => setNewCode({ ...newCode, discountPercent: e.target.value })}
                    min="1"
                    max="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Uses</Label>
                  <Input
                    type="number"
                    value={newCode.maxUses}
                    onChange={(e) => setNewCode({ ...newCode, maxUses: e.target.value })}
                    min="1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Expires At (Optional)</Label>
                <Input
                  type="date"
                  value={newCode.expiresAt}
                  onChange={(e) => setNewCode({ ...newCode, expiresAt: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
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
