import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMembers } from '@/hooks/useMembers';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Search, FileText, Download, Eye, Trash2, CheckCircle, XCircle, Clock, Loader2, Calendar, DollarSign } from 'lucide-react';
import { formatDate, toDateInputValue } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/hooks/useProfile';

type Invoice = {
  id: string;
  invoice_number: string;
  member_id: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
  status: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  notes: string | null;
  due_date: string | null;
  paid_date: string | null;
  created_at: string;
  member?: {
    id: string;
    name: string;
    phone: string;
  };
};

type InvoiceItem = {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export default function Invoices() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { members, isLoading: membersLoading } = useMembers();
  const queryClient = useQueryClient();

  // State for invoices
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);

  // Create form state
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [billingStart, setBillingStart] = useState(toDateInputValue(new Date()));
  const [billingEnd, setBillingEnd] = useState(toDateInputValue(new Date()));
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [lineItems, setLineItems] = useState([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [creating, setCreating] = useState(false);

  // Invoice settings
  const [invoiceSettings, setInvoiceSettings] = useState<any>(null);

  const fetchInvoices = async () => {
    if (!user?.id) return [];
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, members:member_id (id, name, phone)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Invoice fetch error:', error);
        // Table might not exist yet
        if (error.code === '42P01' || error.message?.includes('relation') || error.code === 'PGRST204') {
          return [];
        }
        throw error;
      }
      // Map 'members' back to 'member' for backward compatibility
      return (data || []).map((inv: any) => ({ ...inv, member: inv.members }));
    } catch (err) {
      console.error('Invoice fetch failed:', err);
      return [];
    }
  };

  const fetchInvoiceItems = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId);

      if (error) {
        console.error('Invoice items fetch error:', error);
        return [];
      }
      return data || [];
    } catch {
      return [];
    }
  };

  const fetchInvoiceSettings = async () => {
    if (!user?.id) return null;
    try {
      const { data, error } = await supabase
        .from('invoice_settings')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Invoice settings fetch error:', error);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  };

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices', user?.id],
    queryFn: fetchInvoices,
    enabled: !!user,
    retry: 1,
    staleTime: 30000,
  });

  const { data: settingsData } = useQuery({
    queryKey: ['invoice-settings', user?.id],
    queryFn: fetchInvoiceSettings,
    enabled: !!user,
    retry: 1,
    staleTime: 60000,
  });

  useEffect(() => {
    if (invoicesData) {
      setInvoices(invoicesData);
    }
  }, [invoicesData]);

  useEffect(() => {
    if (settingsData) {
      setInvoiceSettings(settingsData);
    }
  }, [settingsData]);

  useEffect(() => {
    if (selectedInvoice) {
      fetchInvoiceItems(selectedInvoice.id).then(setInvoiceItems);
    }
  }, [selectedInvoice]);

  const getNextInvoiceNumber = () => {
    const prefix = invoiceSettings?.invoice_prefix || 'INV';
    const nextNumber = invoiceSettings?.next_invoice_number || 1;
    return `${prefix}-${String(nextNumber).padStart(5, '0')}`;
  };

  const generateInvoiceNumber = async () => {
    const newNumber = (invoiceSettings?.next_invoice_number || 1) + 1;
    await supabase
      .from('invoice_settings')
      .update({ next_invoice_number: newNumber })
      .eq('owner_id', user?.id || '');
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || lineItems.length === 0) {
      toast.error('Please select a member and add at least one line item');
      return;
    }

    setCreating(true);
    try {
      const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const taxRate = invoiceSettings?.tax_rate || profile?.tax_rate || 5;
      const taxAmount = subtotal * (taxRate / 100);
      const totalAmount = subtotal + taxAmount;

      const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
          owner_id: user?.id || '',
          invoice_number: getNextInvoiceNumber(),
          member_id: selectedMember,
          billing_period_start: billingStart,
          billing_period_end: billingEnd,
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          notes: invoiceNotes || null,
          status: 'draft',
          due_date: billingEnd,
        })
        .select('*, members:member_id (id, name, phone)')
        .single();

      if (error) throw error;
      // Map for backward compat
      if (invoice) (invoice as any).member = (invoice as any).members;

      // Create invoice items
      const itemsToInsert = lineItems.map(item => ({
        owner_id: user?.id || '',
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.quantity * item.unitPrice,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Update invoice number
      await generateInvoiceNumber();

      toast.success('Invoice created successfully!');
      setIsCreateOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['invoices', user?.id] });
    } catch (error: any) {
      toast.error('Failed to create invoice: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setSelectedMember('');
    setBillingStart(toDateInputValue(new Date()));
    setBillingEnd(toDateInputValue(new Date()));
    setInvoiceNotes('');
    setLineItems([{ description: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'paid') {
        updateData.paid_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId);

      if (error) throw error;
      toast.success('Invoice status updated!');
      queryClient.invalidateQueries({ queryKey: ['invoices', user?.id] });
    } catch (error: any) {
      toast.error('Failed to update status: ' + error.message);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;
      toast.success('Invoice deleted!');
      queryClient.invalidateQueries({ queryKey: ['invoices', user?.id] });
    } catch (error: any) {
      toast.error('Failed to delete invoice: ' + error.message);
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;
    setLineItems(updated);
  };

  const getSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const getTaxAmount = () => {
    const taxRate = invoiceSettings?.tax_rate || profile?.tax_rate || 5;
    return getSubtotal() * (taxRate / 100);
  };

  const getTotalAmount = () => {
    return getSubtotal() + getTaxAmount();
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = searchQuery === '' || 
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.member?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return { variant: 'secondary' as const, text: 'Draft' };
      case 'sent': return { variant: 'default' as const, text: 'Sent' };
      case 'paid': return { variant: 'default' as const, text: 'Paid' };
      case 'overdue': return { variant: 'destructive' as const, text: 'Overdue' };
      case 'cancelled': return { variant: 'outline' as const, text: 'Cancelled' };
      default: return { variant: 'secondary' as const, text: status };
    }
  };

  const getCurrency = () => {
    return profile?.currency || 'AED';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: getCurrency() }).format(amount);
  };

  // Calculate totals
  const totalDraft = invoices.filter(i => i.status === 'draft').reduce((sum, i) => sum + i.total_amount, 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total_amount, 0);
  const totalPending = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((sum, i) => sum + i.total_amount, 0);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Invoices</h1>
            <p className="text-muted-foreground">Manage customer invoices and billing</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="member">Customer</Label>
                    <Select value={selectedMember} onValueChange={setSelectedMember}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {members?.map(member => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">Invoice Number</Label>
                    <Input id="invoiceNumber" value={getNextInvoiceNumber()} disabled className="bg-muted" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="billingStart">Billing Period Start</Label>
                    <Input
                      id="billingStart"
                      type="date"
                      value={billingStart}
                      onChange={(e) => setBillingStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billingEnd">Billing Period End</Label>
                    <Input
                      id="billingEnd"
                      type="date"
                      value={billingEnd}
                      onChange={(e) => setBillingEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Line Items</Label>
                  {lineItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        />
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="w-28">
                        <Input
                          type="number"
                          placeholder="Price"
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      {lineItems.length > 1 && (
                        <Button type="button" variant="destructive" size="icon" onClick={() => removeLineItem(index)}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Subtotal</p>
                    <p className="text-lg font-semibold">{formatCurrency(getSubtotal())}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tax ({invoiceSettings?.tax_rate || profile?.tax_rate || 5}%)</p>
                    <p className="text-lg font-semibold">{formatCurrency(getTaxAmount())}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-lg font-semibold">{formatCurrency(getTotalAmount())}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    placeholder="Additional notes..."
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {creating ? 'Creating...' : 'Create Invoice'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Draft</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalDraft)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalPending)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search invoices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredInvoices.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {searchQuery || statusFilter !== 'all' 
                  ? 'No invoices match your filters' 
                  : 'No invoices yet. Create your first invoice!'}
              </p>
            ) : (
              <ScrollArea className="w-full">
                <div className="space-y-2">
                  {filteredInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{invoice.invoice_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {invoice.member?.name || 'No customer'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {invoice.billing_period_start && invoice.billing_period_end && (
                            <span>
                              {formatDate(new Date(invoice.billing_period_start))} - {formatDate(new Date(invoice.billing_period_end))}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(invoice.total_amount)}</p>
                          <Badge {...getStatusBadge(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setIsViewOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {invoice.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStatusChange(invoice.id, 'sent')}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStatusChange(invoice.id, 'paid')}
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          )}
                          {invoice.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteInvoice(invoice.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* View Invoice Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Invoice {selectedInvoice?.invoice_number}</DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{selectedInvoice.member?.name || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">{selectedInvoice.member?.phone || ''}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge {...getStatusBadge(selectedInvoice.status)}>
                      {selectedInvoice.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Billing Period</p>
                    <p className="font-medium">
                      {selectedInvoice.billing_period_start && selectedInvoice.billing_period_end 
                        ? `${formatDate(new Date(selectedInvoice.billing_period_start))} - ${formatDate(new Date(selectedInvoice.billing_period_end))}`
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <p className="font-medium">
                      {selectedInvoice.due_date ? formatDate(new Date(selectedInvoice.due_date)) : 'N/A'}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Items</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3">Description</th>
                          <th className="text-right p-3">Qty</th>
                          <th className="text-right p-3">Unit Price</th>
                          <th className="text-right p-3">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceItems.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="p-3">{item.description}</td>
                            <td className="text-right p-3">{item.quantity}</td>
                            <td className="text-right p-3">{formatCurrency(item.unit_price)}</td>
                            <td className="text-right p-3">{formatCurrency(item.total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax ({selectedInvoice.tax_rate}%):</span>
                      <span>{formatCurrency(selectedInvoice.tax_amount)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(selectedInvoice.total_amount)}</span>
                    </div>
                  </div>
                </div>

                {selectedInvoice.notes && (
                  <div>
                    <h4 className="font-medium mb-1">Notes</h4>
                    <p className="text-muted-foreground">{selectedInvoice.notes}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {selectedInvoice.status === 'draft' && (
                    <Button onClick={() => handleStatusChange(selectedInvoice.id, 'sent')}>
                      Mark as Sent
                    </Button>
                  )}
                  {(selectedInvoice.status === 'sent' || selectedInvoice.status === 'overdue') && (
                    <Button onClick={() => handleStatusChange(selectedInvoice.id, 'paid')}>
                      Mark as Paid
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => window.print()}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
