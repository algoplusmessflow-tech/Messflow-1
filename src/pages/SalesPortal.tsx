import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSalesPersonByToken, useDeletionRequests } from '@/hooks/useSalesPerson';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Phone, Loader2, Plus, Trash2, Search, Edit2, MapPin, Send, Check, X, UtensilsCrossed, Truck, Calendar } from 'lucide-react';
import { format } from 'date-fns';

type Member = {
  id: string;
  name: string;
  phone: string;
  address?: string;
  balance: number;
  monthly_fee: number;
  status: string;
  plan_type: string;
  joining_date: string;
  plan_expiry_date: string | null;
  delivery_area_id?: string;
};

type MenuDay = {
  day: string;
  lunch: string | null;
  dinner: string | null;
  breakfast: string | null;
};

export default function SalesPortal() {
  const { slug, token } = useParams();
  const navigate = useNavigate();
  const { salesPerson, isLoading: salesLoading } = useSalesPersonByToken(token || null);
  const queryClient = useQueryClient();

  const { data: myMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ['members', 'sales', salesPerson?.id],
    queryFn: async () => {
      if (!salesPerson) return [];
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('sales_person_id', salesPerson.id)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data as Member[];
    },
    enabled: !!salesPerson,
  });

  // Fetch menu for this week
  const { data: weeklyMenu = [] } = useQuery({
    queryKey: ['menu', 'sales', salesPerson?.owner_id],
    queryFn: async () => {
      if (!salesPerson) return [];
      const weekNum = Math.ceil((new Date().getDate()) / 7);
      const { data } = await supabase
        .from('menu')
        .select('day, lunch, dinner, breakfast')
        .eq('owner_id', salesPerson.owner_id)
        .eq('week_number', weekNum)
        .order('day');
      return (data || []) as MenuDay[];
    },
    enabled: !!salesPerson,
  });

  // Fetch delivery zones and drivers for member's zone
  const { data: zones = [] } = useQuery({
    queryKey: ['zones', 'sales', salesPerson?.owner_id],
    queryFn: async () => {
      if (!salesPerson) return [];
      const { data } = await supabase
        .from('delivery_areas')
        .select('id, name')
        .eq('owner_id', salesPerson.owner_id);
      return data || [];
    },
    enabled: !!salesPerson,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers', 'sales', salesPerson?.owner_id],
    queryFn: async () => {
      if (!salesPerson) return [];
      const { data } = await supabase
        .from('drivers')
        .select('id, name, phone')
        .eq('owner_id', salesPerson.owner_id);
      return data || [];
    },
    enabled: !!salesPerson,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [bulkReason, setBulkReason] = useState('');
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [formData, setFormData] = useState({
    name: '', phone: '', address: '', monthly_fee: '150', plan_type: '3-time',
  });

  const filteredMembers = myMembers.filter((m) =>
    searchQuery === '' || m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.phone.includes(searchQuery)
  );

  const zoneMap: Record<string, string> = {};
  zones.forEach((z: any) => { zoneMap[z.id] = z.name; });

  const toggleBulkSelect = (id: string) => {
    const next = new Set(selectedForBulk);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedForBulk(next);
  };

  const handleAddMember = async () => {
    if (!formData.name || !formData.phone || !salesPerson) return;
    try {
      const { error } = await supabase.from('members').insert({
        name: formData.name, phone: formData.phone, address: formData.address || null,
        monthly_fee: parseFloat(formData.monthly_fee) || 150, plan_type: formData.plan_type,
        owner_id: salesPerson.owner_id, sales_person_id: salesPerson.id,
      });
      if (error) throw error;
      toast.success('Customer added!');
      setIsAddOpen(false);
      setFormData({ name: '', phone: '', address: '', monthly_fee: '150', plan_type: '3-time' });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    } catch (err: any) { toast.error('Failed: ' + err.message); }
  };

  const handleEditMember = async () => {
    if (!selectedMember || !formData.name || !formData.phone || !salesPerson) return;
    try {
      const { error } = await supabase.from('members').update({
        name: formData.name, phone: formData.phone, address: formData.address || null,
        monthly_fee: parseFloat(formData.monthly_fee) || 150, plan_type: formData.plan_type,
      }).eq('id', selectedMember.id).eq('sales_person_id', salesPerson.id);
      if (error) throw error;
      toast.success('Updated!');
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ['members'] });
    } catch (err: any) { toast.error('Failed: ' + err.message); }
  };

  const handleRequestDelete = async (memberId: string) => {
    if (!salesPerson) return;
    try {
      const { error } = await supabase.from('deletion_requests').insert({
        sales_person_id: salesPerson.id, member_id: memberId,
        owner_id: salesPerson.owner_id, status: 'pending',
      });
      if (error) throw error;
      toast.success('Deletion request sent to owner');
    } catch (err: any) { toast.error('Failed: ' + err.message); }
  };

  const handleBulkDeleteRequest = async () => {
    if (!salesPerson || selectedForBulk.size === 0) return;
    setSubmittingBulk(true);
    try {
      const inserts = Array.from(selectedForBulk).map((memberId) => ({
        sales_person_id: salesPerson.id, member_id: memberId,
        owner_id: salesPerson.owner_id, status: 'pending',
        notes: bulkReason || `Bulk request (${selectedForBulk.size} members)`,
      }));
      const { error } = await supabase.from('deletion_requests').insert(inserts as any);
      if (error) throw error;
      toast.success(`Bulk deletion request sent for ${selectedForBulk.size} members`);
      setSelectedForBulk(new Set());
      setIsBulkDeleteOpen(false);
      setBulkReason('');
    } catch (err: any) { toast.error('Failed: ' + err.message); }
    finally { setSubmittingBulk(false); }
  };

  if (salesLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!salesPerson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center"><CardTitle>Invalid Access</CardTitle></CardHeader>
          <CardContent className="text-center text-muted-foreground">This sales portal link is invalid or has expired.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Sales Portal</h1>
            <p className="text-xs text-muted-foreground">Logged in as {salesPerson.name}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>Logout</Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{myMembers.length}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{myMembers.filter((m) => m.status === 'active').length}</p><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{myMembers.filter((m) => m.status === 'inactive').length}</p><p className="text-xs text-muted-foreground">Inactive</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{myMembers.reduce((s, m) => s + (m.balance || 0), 0)}</p><p className="text-xs text-muted-foreground">Total Balance</p></CardContent></Card>
        </div>

        <Tabs defaultValue="customers" className="space-y-4">
          <TabsList className="w-full">
            <TabsTrigger value="customers" className="flex-1"><User className="h-4 w-4 mr-1" /> My Customers</TabsTrigger>
            <TabsTrigger value="menu" className="flex-1"><UtensilsCrossed className="h-4 w-4 mr-1" /> Menu</TabsTrigger>
            <TabsTrigger value="delivery" className="flex-1"><Truck className="h-4 w-4 mr-1" /> Delivery</TabsTrigger>
          </TabsList>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={() => setIsAddOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Customer</Button>
              {selectedForBulk.size > 0 && (
                <Button size="sm" variant="destructive" onClick={() => setIsBulkDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Request Delete ({selectedForBulk.size})
                </Button>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search customers..." className="pl-10" />
            </div>

            {membersLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : filteredMembers.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No customers found</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {filteredMembers.map((member) => (
                  <Card key={member.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedForBulk.has(member.id)}
                          onCheckedChange={() => toggleBulkSelect(member.id)}
                        />
                        <div className="h-9 w-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{member.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />{member.phone}
                            {member.delivery_area_id && zoneMap[member.delivery_area_id] && (
                              <><span>·</span><MapPin className="h-3 w-3" />{zoneMap[member.delivery_area_id]}</>
                            )}
                          </div>
                        </div>
                        <Badge variant={member.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {member.status}
                        </Badge>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                            setSelectedMember(member);
                            setFormData({ name: member.name, phone: member.phone, address: member.address || '', monthly_fee: member.monthly_fee.toString(), plan_type: member.plan_type });
                            setIsEditOpen(true);
                          }}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRequestDelete(member.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Menu Tab */}
          <TabsContent value="menu" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> This Week's Menu
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weeklyMenu.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No menu set for this week</p>
                ) : (
                  <div className="space-y-3">
                    {weeklyMenu.map((day: MenuDay) => (
                      <div key={day.day} className="p-3 rounded-lg border bg-muted/20">
                        <p className="text-sm font-semibold capitalize mb-2">{day.day}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          {day.breakfast && (
                            <div className="flex gap-1"><Badge variant="outline" className="text-[10px]">B</Badge><span>{day.breakfast}</span></div>
                          )}
                          {day.lunch && (
                            <div className="flex gap-1"><Badge variant="outline" className="text-[10px] bg-amber-50">L</Badge><span>{day.lunch}</span></div>
                          )}
                          {day.dinner && (
                            <div className="flex gap-1"><Badge variant="outline" className="text-[10px] bg-purple-50">D</Badge><span>{day.dinner}</span></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Delivery Tab */}
          <TabsContent value="delivery" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="h-4 w-4" /> Delivery Zones & Drivers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {zones.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No delivery zones configured</p>
                ) : (
                  <div className="space-y-3">
                    {zones.map((zone: any) => {
                      const membersInZone = myMembers.filter((m) => m.delivery_area_id === zone.id);
                      return (
                        <div key={zone.id} className="p-3 rounded-lg border bg-muted/20">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {zone.name}</p>
                            <Badge variant="outline" className="text-xs">{membersInZone.length} customers</Badge>
                          </div>
                          {membersInZone.length > 0 && (
                            <div className="text-xs text-muted-foreground space-y-1">
                              {membersInZone.slice(0, 5).map((m) => (
                                <div key={m.id} className="flex justify-between">
                                  <span>{m.name}</span>
                                  <span>{m.phone}</span>
                                </div>
                              ))}
                              {membersInZone.length > 5 && <p className="text-muted-foreground">+{membersInZone.length - 5} more</p>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {drivers.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Drivers</p>
                    <div className="space-y-2">
                      {drivers.map((d: any) => (
                        <div key={d.id} className="flex items-center gap-2 text-sm p-2 rounded border bg-muted/20">
                          <Truck className="h-3.5 w-3.5 text-primary" />
                          <span className="font-medium">{d.name}</span>
                          <span className="text-muted-foreground">{d.phone}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Customer Dialog */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Customer</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label className="text-xs">Name *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Customer name" /></div>
              <div className="space-y-1"><Label className="text-xs">Phone *</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Phone" /></div>
              <div className="space-y-1"><Label className="text-xs">Address</Label><Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Address" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Monthly Fee</Label><Input type="number" value={formData.monthly_fee} onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })} /></div>
                <div className="space-y-1"><Label className="text-xs">Plan</Label>
                  <select value={formData.plan_type} onChange={(e) => setFormData({ ...formData, plan_type: e.target.value })} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                    <option value="1-time">1 Time</option><option value="2-time">2 Times</option><option value="3-time">3 Times</option>
                  </select>
                </div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button><Button onClick={handleAddMember}>Add</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Customer Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Customer</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label className="text-xs">Name *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Phone *</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Address</Label><Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Monthly Fee</Label><Input type="number" value={formData.monthly_fee} onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })} /></div>
                <div className="space-y-1"><Label className="text-xs">Plan</Label>
                  <select value={formData.plan_type} onChange={(e) => setFormData({ ...formData, plan_type: e.target.value })} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                    <option value="1-time">1 Time</option><option value="2-time">2 Times</option><option value="3-time">3 Times</option>
                  </select>
                </div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button><Button onClick={handleEditMember}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Delete Request Dialog */}
        <Dialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" /> Bulk Deletion Request
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You are requesting deletion of <span className="font-bold text-foreground">{selectedForBulk.size}</span> members. This will be sent to the owner for approval.
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1 p-2 rounded border bg-muted/20">
                {Array.from(selectedForBulk).map((id) => {
                  const m = myMembers.find((mem) => mem.id === id);
                  return m ? <p key={id} className="text-xs">{m.name} — {m.phone}</p> : null;
                })}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reason (optional)</Label>
                <Input value={bulkReason} onChange={(e) => setBulkReason(e.target.value)} placeholder="e.g., Group terminated, left company..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBulkDeleteOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleBulkDeleteRequest} disabled={submittingBulk}>
                {submittingBulk ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                Send Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
