import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useSalesPersons, useDeletionRequests } from '@/hooks/useSalesPerson';
import { useProfile } from '@/hooks/useProfile';
import { generateSlug } from '@/lib/slug';
import { toast } from 'sonner';
import { Plus, Users, Trash2, Edit2, Copy, RefreshCw, Check, X, AlertTriangle, Loader2, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function SalesManagement() {
  const { salesPersons, isLoading, addSalesPerson, updateSalesPerson, deleteSalesPerson, toggleSalesPersonStatus, regenerateAccessToken } = useSalesPersons();
  const { deletionRequests, pendingRequests, approveDeletion, rejectDeletion } = useDeletionRequests();
  const { profile } = useProfile();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSalesPerson, setEditingSalesPerson] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [showTokens, setShowTokens] = useState<Record<string, string>>({});
  const [isDeleteRequestOpen, setIsDeleteRequestOpen] = useState(false);
  const [salesCustomerCounts, setSalesCustomerCounts] = useState<Record<string, number>>({});

  const handleAdd = async () => {
    if (!formData.name) {
      toast.error('Name is required');
      return;
    }
    
    // Validate phone format if provided
    if (formData.phone && !/^\+?[0-9]{7,15}$/.test(formData.phone.replace(/[\s\-()]/g, ''))) {
      toast.error('Please enter a valid phone number (7-15 digits)');
      return;
    }
    
    // Validate email format if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    try {
      await addSalesPerson.mutateAsync(formData);
      setIsAddOpen(false);
      setFormData({ name: '', email: '', phone: '' });
    } catch (error: any) {
      console.error('Error adding sales person:', error);
      // Don't show duplicate toast since hook already shows error
    }
  };

  const handleEdit = async () => {
    if (!editingSalesPerson || !formData.name) return;
    await updateSalesPerson.mutateAsync({ id: editingSalesPerson.id, ...formData });
    setIsEditOpen(false);
    setEditingSalesPerson(null);
    setFormData({ name: '', email: '', phone: '' });
  };

  const handleCopyToken = async (id: string, token: string) => {
    await navigator.clipboard.writeText(token);
    setCopiedToken(id);
    toast.success('Access token copied!');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleGetToken = async (id: string) => {
    const { newToken } = await regenerateAccessToken.mutateAsync(id);
    setShowTokens(prev => ({ ...prev, [id]: newToken }));
  };

  // Fetch customer counts for each sales person
  useEffect(() => {
    const fetchCustomerCounts = async () => {
      if (salesPersons.length === 0) return;
      
      const counts: Record<string, number> = {};
      for (const sp of salesPersons) {
        const { count } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('sales_person_id', sp.id);
        counts[sp.id] = count || 0;
      }
      setSalesCustomerCounts(counts);
    };

    fetchCustomerCounts();
  }, [salesPersons]);

  const businessSlug = profile?.business_slug || profile?.business_name || 'mess';
  
  const getSalesPersonLink = (token: string) => {
    const appUrl = import.meta.env.VITE_APP_URL || 'https://messflow.app';
    return `${appUrl}/${businessSlug}/sales/${token}`;
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Sales Team</h1>
            <p className="text-muted-foreground">Manage your sales team and their access</p>
          </div>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Sales Person
          </Button>
        </div>

        {/* Pending Deletion Requests */}
        {pendingRequests.length > 0 && (
          <GlassCard className="border-amber-500/30">
            <GlassCardHeader>
              <GlassCardTitle className="text-lg flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                Pending Deletion Requests ({pendingRequests.length})
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="space-y-3">
                {pendingRequests.map((request: any) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium">{request.members?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Requested by {request.sales_persons?.name}
                      </p>
                      {request.reason && (
                        <p className="text-xs text-muted-foreground mt-1">Reason: {request.reason}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => approveDeletion.mutate({ requestId: request.id, memberId: request.member_id })}
                      >
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => rejectDeletion.mutate(request.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCardContent>
          </GlassCard>
        )}

        {/* Sales Persons List */}
        {salesPersons.length === 0 ? (
          <GlassCard>
            <GlassCardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No sales team yet</h3>
              <p className="text-muted-foreground mb-4">Add your first sales person to start managing customers</p>
              <Button onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Sales Person
              </Button>
            </GlassCardContent>
          </GlassCard>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {salesPersons.map((sp) => (
              <GlassCard key={sp.id} className={!sp.is_active ? 'opacity-60' : ''}>
                <GlassCardHeader>
                  <div className="flex items-center justify-between">
                    <GlassCardTitle className="text-lg">{sp.name}</GlassCardTitle>
                    <Badge variant={sp.is_active ? 'default' : 'secondary'}>
                      {sp.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <GlassCardDescription>
                    {sp.email || sp.phone || 'No contact info'}
                  </GlassCardDescription>
                </GlassCardHeader>
                <GlassCardContent className="space-y-4">
                  {/* Access Code Section */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                      <KeyRound className="h-3 w-3" />
                      Access Code
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={showTokens[sp.id] || sp.access_token}
                        className="bg-gradient-to-r from-indigo-50 to-purple-50 font-mono text-sm border-2 border-primary/30 font-semibold tracking-wide"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => handleCopyToken(sp.id, showTokens[sp.id] || sp.access_token)}
                        className="border-2 border-primary/30 hover:bg-primary/10"
                      >
                        {copiedToken === sp.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Share this 6-character code with the sales person for login
                    </p>
                  </div>
                
                  {/* Customer Count Badge */}
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-bold text-foreground">Customers Added</span>
                    </div>
                    <Badge className="bg-blue-600 text-white font-bold px-3 py-1">
                      {salesCustomerCounts[sp.id] || 0}
                    </Badge>
                  </div>
                          
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={sp.is_active}
                        onCheckedChange={(checked) => toggleSalesPersonStatus.mutate({ id: sp.id, isActive: checked })}
                      />
                      <Label className="text-sm font-semibold">Active</Label>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setEditingSalesPerson(sp);
                          setFormData({ name: sp.name, email: sp.email || '', phone: sp.phone || '' });
                          setIsEditOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => deleteSalesPerson.mutate(sp.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </GlassCardContent>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Add Sales Person Dialog */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Sales Person</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone (optional)"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={addSalesPerson.isPending}>
                {addSalesPerson.isPending ? 'Adding...' : 'Add Sales Person'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Sales Person Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Sales Person</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone (optional)"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button onClick={handleEdit} disabled={updateSalesPerson.isPending}>
                {updateSalesPerson.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
