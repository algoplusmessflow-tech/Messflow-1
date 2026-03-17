import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useSalesPersonByToken, useDeletionRequests } from '@/hooks/useSalesPerson';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Phone, Loader2, Plus, Trash2, Search, Edit2, MapPin, Send, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Member = {
  id: string;
  name: string;
  phone: string;
  address?: string;
  location_lat?: number;
  location_lng?: number;
  map_link?: string;
  balance: number;
  monthly_fee: number;
  status: string;
  plan_type: string;
  joining_date: string;
  plan_expiry_date: string | null;
};

export default function SalesPortal() {
  const { slug, token } = useParams();
  const navigate = useNavigate();
  const { salesPerson, isLoading: salesLoading } = useSalesPersonByToken(token || null);
  const { deletionRequests, approveDeletion, rejectDeletion } = useDeletionRequests();
  const queryClient = useQueryClient();

  // Fetch members specifically for this sales person from server
  const { data: myMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ['members', 'sales', salesPerson?.id],
    queryFn: async () => {
      if (!salesPerson) return [];
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('sales_person_id', salesPerson.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching sales person members:', error);
        return [];
      }
      return data as Member[];
    },
    enabled: !!salesPerson,
  });
  
  const [phone, setPhone] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    monthly_fee: '150',
    plan_type: '3-time' as string,
  });

  const filteredMembers = myMembers.filter((m: Member) => 
    searchQuery === '' ||
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.phone.includes(searchQuery)
  );

  useEffect(() => {
    if (salesPerson) {
      setIsAuthenticated(true);
    }
  }, [salesPerson]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !token) {
      toast.error('Please enter your access code');
      return;
    }

    if (!salesPerson) {
      toast.error('Invalid access code');
      return;
    }

    setIsAuthenticated(true);
    toast.success(`Welcome, ${salesPerson.name}!`);
  };

  const handleAddMember = async () => {
    if (!formData.name || !formData.phone) {
      toast.error('Name and phone are required');
      return;
    }

    if (!salesPerson) return;

    try {
      const { data, error } = await supabase
        .from('members')
        .insert({
          name: formData.name,
          phone: formData.phone,
          address: formData.address || null,
          monthly_fee: parseFloat(formData.monthly_fee) || 150,
          plan_type: formData.plan_type,
          owner_id: salesPerson.owner_id,
          sales_person_id: salesPerson.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Customer added successfully!');
      setIsAddOpen(false);
      setFormData({ name: '', phone: '', address: '', monthly_fee: '150', plan_type: '3-time' });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    } catch (error: any) {
      toast.error('Failed to add customer: ' + error.message);
    }
  };

  const handleEditMember = async () => {
    if (!selectedMember || !formData.name || !formData.phone) {
      toast.error('Name and phone are required');
      return;
    }

    if (!salesPerson || selectedMember.sales_person_id !== salesPerson.id) {
      toast.error('You can only edit customers you created');
      return;
    }

    try {
      const { error } = await supabase
        .from('members')
        .update({
          name: formData.name,
          phone: formData.phone,
          address: formData.address || null,
          monthly_fee: parseFloat(formData.monthly_fee) || 150,
          plan_type: formData.plan_type,
        })
        .eq('id', selectedMember.id)
        .eq('sales_person_id', salesPerson.id);

      if (error) throw error;
      
      toast.success('Customer updated successfully!');
      setIsEditOpen(false);
      setSelectedMember(null);
      setFormData({ name: '', phone: '', address: '', monthly_fee: '150', plan_type: '3-time' });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    } catch (error: any) {
      toast.error('Failed to update customer: ' + error.message);
    }
  };

  const handleRequestDelete = async (member: Member) => {
    if (!salesPerson) return;

    try {
      const { error } = await supabase
        .from('deletion_requests')
        .insert({
          sales_person_id: salesPerson.id,
          member_id: member.id,
          owner_id: salesPerson.owner_id,
          status: 'pending',
        });

      if (error) throw error;
      
      toast.success('Deletion request sent to owner for approval');
    } catch (error: any) {
      toast.error('Failed to request deletion: ' + error.message);
    }
  };

  if (salesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!salesPerson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Invalid Access</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            This sales portal link is invalid or has expired.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Sales Portal</CardTitle>
            <p className="text-muted-foreground">
              Enter your access code to continue
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>Access Code</Label>
                <Input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your access code"
                />
              </div>
              <Button type="submit" className="w-full">
                Access Portal
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Sales Portal</h1>
            <p className="text-sm text-muted-foreground">Logged in as {salesPerson.name}</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{myMembers.length}</div>
              <p className="text-sm text-muted-foreground">Total Customers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {myMembers.filter((m: Member) => m.status === 'active').length}
              </div>
              <p className="text-sm text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {myMembers.filter((m: Member) => m.status === 'inactive').length}
              </div>
              <p className="text-sm text-muted-foreground">Inactive</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {myMembers.reduce((sum: number, m: Member) => sum + (m.balance || 0), 0)}
              </div>
              <p className="text-sm text-muted-foreground">Total Balance</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers..."
            className="pl-10"
          />
        </div>

        {/* Customer List */}
        <Card>
          <CardHeader>
            <CardTitle>My Customers</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No customers found
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMembers.map((member: Member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {member.phone}
                          {member.address && (
                            <>
                              <span>•</span>
                              <MapPin className="h-3 w-3" />
                              {member.address}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                        {member.status}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedMember(member);
                            setFormData({
                              name: member.name,
                              phone: member.phone,
                              address: member.address || '',
                              monthly_fee: member.monthly_fee.toString(),
                              plan_type: member.plan_type,
                            });
                            setIsEditOpen(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRequestDelete(member)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Customer Dialog */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Customer name"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Delivery address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monthly Fee</Label>
                  <Input
                    type="number"
                    value={formData.monthly_fee}
                    onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Plan Type</Label>
                  <select
                    value={formData.plan_type}
                    onChange={(e) => setFormData({ ...formData, plan_type: e.target.value })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3"
                  >
                    <option value="1-time">1 Time</option>
                    <option value="2-time">2 Times</option>
                    <option value="3-time">3 Times</option>
                  </select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAddMember}>Add Customer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Customer Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Customer name"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Delivery address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monthly Fee</Label>
                  <Input
                    type="number"
                    value={formData.monthly_fee}
                    onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Plan Type</Label>
                  <select
                    value={formData.plan_type}
                    onChange={(e) => setFormData({ ...formData, plan_type: e.target.value })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3"
                  >
                    <option value="1-time">1 Time</option>
                    <option value="2-time">2 Times</option>
                    <option value="3-time">3 Times</option>
                  </select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button onClick={handleEditMember}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
