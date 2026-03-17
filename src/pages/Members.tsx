import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMembers } from '@/hooks/useMembers';
import { useTransactions } from '@/hooks/useTransactions';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/hooks/useProfile';
import { useFreeTierLimits } from '@/hooks/useFreeTierLimits';
import { formatCurrency, formatDate, toDateInputValue, calculateExpiryDate, getDaysUntilExpiry } from '@/lib/format';
import { generateMemberInvoice } from '@/lib/pdf-generator';
import { shareInvoiceViaWhatsApp, createInvoicePDF } from '@/lib/whatsapp-pdf-share';
import { Plus, Phone, Loader2, CreditCard, AlertTriangle, FileText, MessageCircle, Trash2, Search, Filter, X, Calendar as CalendarIcon, RefreshCw, History, Send, Crown, Upload, Share2, Pencil, UserPlus, MapPin, UtensilsCrossed, Pause, SkipForward } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { UpgradePlanModal } from '@/components/UpgradePlanModal';
import { ShareDialog } from '@/components/ShareDialog';
import { MemberImportModal } from '@/components/MemberImportModal';
import { MemberRenewalModal } from '@/components/MemberRenewalModal';
import { TransactionHistoryModal } from '@/components/TransactionHistoryModal';
import { cn } from '@/lib/utils';
import { InlineAddSelect } from '@/components/InlineAddSelect';

type PlanType = Database['public']['Enums']['plan_type'];
type MemberStatus = Database['public']['Enums']['member_status'];

export default function Members() {
  const { user } = useAuth();
  const { members, isLoading, addMember, updateMember, deleteMember } = useMembers();
  const { addTransaction, getMemberTransactions } = useTransactions();
  const { profile, incrementInvoiceNumber, getNextInvoiceNumber } = useProfile();
  const freeTierLimits = useFreeTierLimits();
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [upgradeLimitType, setUpgradeLimitType] = useState<'members' | 'invoices' | 'receipts'>('members');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isSmartRenewalOpen, setIsSmartRenewalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isBulkReminderOpen, setIsBulkReminderOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Sharing state
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareFile, setShareFile] = useState<{ blob: Blob; filename: string; message: string; whatsapp: string; title?: string } | null>(null);
  const [lastPaymentInfo, setLastPaymentInfo] = useState<{ memberName: string; amount: number; phone: string } | null>(null);
  const [selectedMember, setSelectedMember] = useState<typeof members[0] | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    plan_type: '3-time' as PlanType,
    monthly_fee: '',
    status: 'active' as MemberStatus,
    joining_date: null as Date | null,
    plan_expiry_date: null as Date | null,
    isPaid: true,
    address: '',
    delivery_area_id: '',
    special_notes: '',
    meal_type: 'both',
    roti_quantity: 2,
    rice_type: 'white_rice',
    dietary_preference: 'both',
    pause_service: false,
    skip_weekends: false,
    free_trial: false,
  });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date | null>(new Date());
  const [showPaymentCalendar, setShowPaymentCalendar] = useState(false);
  const [showJoiningCalendar, setShowJoiningCalendar] = useState(false);
  const [showExpiryCalendar, setShowExpiryCalendar] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<MemberStatus | 'all'>('all');
  const [planFilter, setPlanFilter] = useState<PlanType | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const [deliveryAreas, setDeliveryAreas] = useState<{ id: string; name: string }[]>([]);
  const [riceOptions, setRiceOptions] = useState<{ value: string; label: string }[]>([]);

  const defaultRiceOptions = [
    { value: 'none', label: 'None' },
    { value: 'white_rice', label: 'White Rice' },
    { value: 'brown_rice', label: 'Brown Rice' },
    { value: 'jeera_rice', label: 'Jeera Rice' },
    { value: 'biryani', label: 'Biryani' },
  ];

  // Fetch delivery areas and rice options
  useEffect(() => {
    const fetchAreas = async () => {
      const { data } = await supabase.from('delivery_areas').select('id, name').order('name');
      if (data) setDeliveryAreas(data);
    };
    const fetchRice = async () => {
      try {
        const { data } = await supabase
          .from('rice_options')
          .select('name, label')
          .order('sort_order');
        if (data && data.length > 0) {
          setRiceOptions(data.map((r: any) => ({ value: r.name, label: r.label })));
        } else {
          setRiceOptions(defaultRiceOptions);
        }
      } catch {
        setRiceOptions(defaultRiceOptions);
      }
    };
    fetchAreas();
    fetchRice();
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    plan_type: '3-time' as PlanType,
    monthly_fee: '',
    joining_date: toDateInputValue(new Date()),
    isPaid: true,
    address: '',
    delivery_area_id: '',
    special_notes: '',
    meal_type: 'both',
    roti_quantity: 2,
    rice_type: 'white_rice',
    dietary_preference: 'both',
    pause_service: false,
    skip_weekends: false,
    free_trial: false,
  });

  // Filtered members
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch = searchQuery === '' ||
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.phone.includes(searchQuery);
      const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
      const matchesPlan = planFilter === 'all' || member.plan_type === planFilter;
      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [members, searchQuery, statusFilter, planFilter]);

  // Members with outstanding balance for bulk reminder
  const unpaidMembers = useMemo(() => {
    return members.filter((m) => Number(m.balance) > 0);
  }, [members]);

  const hasActiveFilters = statusFilter !== 'all' || planFilter !== 'all';

  const clearFilters = () => {
    setStatusFilter('all');
    setPlanFilter('all');
    setSearchQuery('');
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check free tier limit
    if (!freeTierLimits.canAddMember) {
      setUpgradeLimitType('members');
      setIsUpgradeOpen(true);
      return;
    }

    const joiningDate = new Date(formData.joining_date);
    const expiryDate = calculateExpiryDate(joiningDate);
    const monthlyFee = Number(formData.monthly_fee);
    const balance = formData.isPaid ? 0 : monthlyFee;

    const newMember = await addMember.mutateAsync({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      plan_type: formData.plan_type,
      monthly_fee: monthlyFee,
      balance: balance,
      status: 'active',
      joining_date: joiningDate.toISOString(),
      plan_expiry_date: expiryDate.toISOString(),
      address: formData.address || null,
      delivery_area_id: formData.delivery_area_id || null,
      special_notes: formData.special_notes || null,
      meal_type: formData.meal_type,
      roti_quantity: formData.roti_quantity,
      rice_type: formData.rice_type,
      dietary_preference: formData.dietary_preference,
      pause_service: formData.pause_service,
      skip_weekends: formData.skip_weekends,
      free_trial: formData.free_trial,
    } as any);

    if (formData.isPaid && newMember) {
      await addTransaction.mutateAsync({
        member_id: newMember.id,
        amount: monthlyFee,
        type: 'payment',
        notes: 'Initial payment on signup',
      });

      setLastPaymentInfo({
        memberName: formData.name.trim(),
        amount: monthlyFee,
        phone: formData.phone.trim(),
      });
      setIsInvoiceDialogOpen(true);
    }

    setFormData({
      name: '',
      phone: '',
      plan_type: '3-time',
      monthly_fee: '',
      joining_date: toDateInputValue(new Date()),
      isPaid: true,
      address: '',
      delivery_area_id: '',
      special_notes: '',
      meal_type: 'both',
      roti_quantity: 2,
      rice_type: 'white_rice',
      dietary_preference: 'both',
      pause_service: false,
      skip_weekends: false,
      free_trial: false,
    });
    setIsAddOpen(false);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    const amount = Number(paymentAmount);
    if (amount <= 0) return;

    await addTransaction.mutateAsync({
      member_id: selectedMember.id,
      amount,
      type: 'payment',
      date: paymentDate ? paymentDate.toISOString() : new Date().toISOString(),
    });

    const newBalance = Number(selectedMember.balance) - amount;
    await updateMember.mutateAsync({
      id: selectedMember.id,
      balance: newBalance,
    });

    setLastPaymentInfo({
      memberName: selectedMember.name,
      amount,
      phone: selectedMember.phone,
    });

    setPaymentAmount('');
    setPaymentDate(new Date());
    setSelectedMember(null);
    setIsPaymentOpen(false);
    setIsInvoiceDialogOpen(true);
  };

  // Removed: handleRenewal - now using MemberRenewalModal component

  const handlePayFull = () => {
    if (selectedMember) {
      setPaymentAmount(String(selectedMember.balance));
    }
  };

  const handleDownloadInvoice = async () => {
    if (!lastPaymentInfo || !profile) return;

    // Check free tier limit for invoices
    if (!freeTierLimits.canGenerateInvoice) {
      setUpgradeLimitType('invoices');
      setIsUpgradeOpen(true);
      return;
    }

    try {
      const invoiceNumber = getNextInvoiceNumber();

      await generateMemberInvoice(
        lastPaymentInfo.memberName,
        lastPaymentInfo.amount,
        profile.business_name,
        profile.tax_trn,
        profile.tax_rate || 5,
        profile.tax_name || 'VAT',
        invoiceNumber,
        profile.company_address,
        profile.company_logo_url
      );

      // Increment invoice number for next time
      await incrementInvoiceNumber.mutateAsync();

      toast.success('Invoice downloaded!');
    } catch (error) {
      toast.error('Failed to generate invoice');
      console.error(error);
    }
  };

  const handleShareWhatsApp = () => {
    if (!lastPaymentInfo || !profile) return;

    const taxRate = profile.tax_rate || 5;
    const taxName = profile.tax_name || 'VAT';
    const subtotal = lastPaymentInfo.amount / (1 + taxRate / 100);
    const taxAmount = lastPaymentInfo.amount - subtotal;

    const message = `\u{1F9FE} *Payment Receipt*

*${profile.business_name}*
${profile.tax_trn ? `TRN: ${profile.tax_trn}` : ''}

Dear ${lastPaymentInfo.memberName},

Thank you for your payment!

Subscription: AED ${subtotal.toFixed(2)}
${taxName} (${taxRate}%): AED ${taxAmount.toFixed(2)}
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
*Total Paid: AED ${lastPaymentInfo.amount.toFixed(2)}*

Date: ${formatDate(new Date())}

Thank you for your business! \u{1F64F}`;

    const cleanPhone = lastPaymentInfo.phone.replace(/[\s-]/g, '');
    const phoneWithCode = cleanPhone.startsWith('+') ? cleanPhone.slice(1) :
      cleanPhone.startsWith('00') ? cleanPhone.slice(2) :
        cleanPhone.startsWith('971') ? cleanPhone :
          `971${cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone}`;

    const whatsappUrl = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast.success('Opening WhatsApp...');
  };

  const handleShareWhatsAppPDF = async () => {
    if (!lastPaymentInfo || !profile) return;

    // Check free tier limit for invoices
    if (!freeTierLimits.canGenerateInvoice) {
      setUpgradeLimitType('invoices');
      setIsUpgradeOpen(true);
      return;
    }

    try {
      const invoiceNumber = getNextInvoiceNumber();

      const result = await shareInvoiceViaWhatsApp(
        lastPaymentInfo.memberName,
        lastPaymentInfo.phone,
        lastPaymentInfo.amount,
        profile.business_name,
        invoiceNumber,
        profile.tax_trn,
        profile.tax_rate || 5,
        profile.tax_name || 'VAT',
        profile.company_address
      );

      // Increment invoice number for next time
      await incrementInvoiceNumber.mutateAsync();

      if (result instanceof Blob) {
        // Fallback to Share Dialog
        const cleanPhone = lastPaymentInfo.phone.replace(/[\s-]/g, '');
        const phoneWithCode = cleanPhone.startsWith('+') ? cleanPhone.slice(1) :
          cleanPhone.startsWith('00') ? cleanPhone.slice(2) :
            cleanPhone.startsWith('971') ? cleanPhone :
              `971${cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone}`;

        const message = `\u{1F9FE} *Invoice ${invoiceNumber}* - ${profile.business_name}\nAmount: AED ${lastPaymentInfo.amount.toFixed(2)}`;

        setShareFile({
          blob: result,
          filename: `invoice-${invoiceNumber}.pdf`,
          message,
          whatsapp: phoneWithCode
        });
        setIsShareDialogOpen(true);
      }

      setIsInvoiceDialogOpen(false);
    } catch (error) {
      console.error('Failed to share PDF via WhatsApp:', error);
    }
  };

  const handleBulkReminder = () => {
    if (!profile) return;

    unpaidMembers.forEach((member, index) => {
      const message = `\u{1F4E2} *Payment Reminder*

*${profile.business_name}*

Dear ${member.name},

This is a friendly reminder that you have an outstanding balance of *AED ${Number(member.balance).toFixed(2)}*.

${member.plan_expiry_date ? `Due Date: ${formatDate(new Date(member.plan_expiry_date))}` : ''}

${profile.payment_link ? `Pay online: ${profile.payment_link}` : ''}

Thank you for your prompt attention! \u{1F64F}`;

      const cleanPhone = member.phone.replace(/[\s-]/g, '');
      const phoneWithCode = cleanPhone.startsWith('+') ? cleanPhone.slice(1) :
        cleanPhone.startsWith('00') ? cleanPhone.slice(2) :
          cleanPhone.startsWith('971') ? cleanPhone :
            `971${cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone}`;

      // Open WhatsApp links with delay to prevent browser blocking
      setTimeout(() => {
        const whatsappUrl = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
      }, index * 500);
    });

    toast.success(`Opening WhatsApp for ${unpaidMembers.length} members...`);
    setIsBulkReminderOpen(false);
  };

  const handleSingleReminder = (member: typeof members[0]) => {
    if (!profile) return;

    const message = `\u{1F4E2} *Payment Reminder*

*${profile.business_name}*

Dear ${member.name},

This is a friendly reminder that you have an outstanding balance of *AED ${Number(member.balance).toFixed(2)}*.

${member.plan_expiry_date ? `Due Date: ${formatDate(new Date(member.plan_expiry_date))}` : ''}

${profile.payment_link ? `Pay online: ${profile.payment_link}` : ''}

Thank you for your prompt attention! \u{1F64F}`;

    const cleanPhone = member.phone.replace(/[\s-]/g, '');
    const phoneWithCode = cleanPhone.startsWith('+') ? cleanPhone.slice(1) :
      cleanPhone.startsWith('00') ? cleanPhone.slice(2) :
        cleanPhone.startsWith('971') ? cleanPhone :
          `971${cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone}`;

    const whatsappUrl = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const openPayment = (member: typeof members[0]) => {
    setSelectedMember(member);
    setPaymentAmount('');
    setPaymentDate(new Date());
    setIsPaymentOpen(true);
  };

  const openRenewal = (member: typeof members[0]) => {
    setSelectedMember(member);
    setIsSmartRenewalOpen(true);
  };

  const openHistory = (member: typeof members[0]) => {
    setSelectedMember(member);
    setIsHistoryOpen(true);
  };

  const openEdit = (member: typeof members[0]) => {
    const m = member as any;
    setSelectedMember(member);
    setEditFormData({
      name: m.name,
      phone: m.phone,
      plan_type: m.plan_type,
      monthly_fee: String(m.monthly_fee),
      status: m.status,
      joining_date: m.joining_date ? new Date(m.joining_date) : null,
      plan_expiry_date: m.plan_expiry_date ? new Date(m.plan_expiry_date) : null,
      isPaid: Number(m.balance) === 0,
      address: m.address || '',
      delivery_area_id: m.delivery_area_id || '',
      special_notes: m.special_notes || '',
      meal_type: m.meal_type || 'both',
      roti_quantity: m.roti_quantity ?? 2,
      rice_type: m.rice_type || 'white_rice',
      dietary_preference: m.dietary_preference || 'both',
      pause_service: m.pause_service || false,
      skip_weekends: m.skip_weekends || false,
      free_trial: m.free_trial || false,
    });
    setIsEditOpen(true);
  };

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    await updateMember.mutateAsync({
      id: selectedMember.id,
      name: editFormData.name.trim(),
      phone: editFormData.phone.trim(),
      plan_type: editFormData.plan_type,
      monthly_fee: Number(editFormData.monthly_fee),
      status: editFormData.status,
      joining_date: editFormData.joining_date?.toISOString(),
      plan_expiry_date: editFormData.plan_expiry_date?.toISOString(),
      balance: editFormData.isPaid ? 0 : (Number(selectedMember.balance) > 0 ? Number(selectedMember.balance) : Number(editFormData.monthly_fee)),
      address: editFormData.address || null,
      delivery_area_id: editFormData.delivery_area_id || null,
      special_notes: editFormData.special_notes || null,
      meal_type: editFormData.meal_type,
      roti_quantity: editFormData.roti_quantity,
      rice_type: editFormData.rice_type,
      dietary_preference: editFormData.dietary_preference,
      pause_service: editFormData.pause_service,
      skip_weekends: editFormData.skip_weekends,
      free_trial: editFormData.free_trial,
    } as any);

    setIsEditOpen(false);
    setSelectedMember(null);
  };

  const getMemberExpiryStatus = (member: typeof members[0]) => {
    if (!member.plan_expiry_date) return null;
    const days = getDaysUntilExpiry(member.plan_expiry_date);
    if (days < 0) return { status: 'expired', days: Math.abs(days) };
    if (days <= 4) return { status: 'expiring', days };
    return null;
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMember.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const getRemainingAfterPayment = () => {
    if (!selectedMember) return 0;
    const amount = Number(paymentAmount) || 0;
    return Math.max(0, Number(selectedMember.balance) - amount);
  };

  // Inline add handlers for zones and rice types
  const handleAddZone = async (name: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('delivery_areas')
        .insert({ owner_id: user?.id || '', name })
        .select()
        .single();
      if (error) throw error;
      setDeliveryAreas((prev) => [...prev, { id: data.id, name: data.name }].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success(`Zone "${name}" created!`);
      return data.id;
    } catch (err: any) {
      toast.error('Failed to create zone: ' + err.message);
      return null;
    }
  };

  const handleAddRiceOption = async (name: string): Promise<string | null> => {
    try {
      const value = name.toLowerCase().replace(/\s+/g, '_');
      const { error } = await supabase
        .from('rice_options')
        .insert({ owner_id: user?.id || '', name: value, label: name, sort_order: riceOptions.length });
      if (error) throw error;
      setRiceOptions((prev) => [...prev, { value, label: name }]);
      toast.success(`Rice type "${name}" added!`);
      return value;
    } catch (err: any) {
      toast.error('Failed to add rice type: ' + err.message);
      return null;
    }
  };

  const handleEditRiceOption = async (oldValue: string, newName: string): Promise<boolean> => {
    try {
      const newValue = newName.toLowerCase().replace(/\s+/g, '_');
      const { error } = await supabase
        .from('rice_options')
        .update({ name: newValue, label: newName })
        .eq('name', oldValue);
      if (error) throw error;
      setRiceOptions((prev) => prev.map((r) => r.value === oldValue ? { value: newValue, label: newName } : r));
      toast.success(`Rice type updated!`);
      return true;
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
      return false;
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'payment': return { label: 'Payment', color: 'text-primary' };
      case 'charge': return { label: 'Charge', color: 'text-destructive' };
      case 'adjustment': return { label: 'Adjustment', color: 'text-muted-foreground' };
      default: return { label: type, color: 'text-foreground' };
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Members</h1>
            <p className="text-muted-foreground">{filteredMembers.length} of {members.length} members</p>
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {unpaidMembers.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBulkReminderOpen(true)}
              >
                <Send className="h-4 w-4 mr-1" />
                Remind ({unpaidMembers.length})
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportOpen(true)}
            >
              <Upload className="h-4 w-4 mr-1" />
              Import
            </Button>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Member</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddMember} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="05X XXX XXXX"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="joining_date">Joining Date</Label>
                    <Input
                      id="joining_date"
                      type="date"
                      value={formData.joining_date}
                      onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plan">Meal Plan</Label>
                    <Select
                      value={formData.plan_type}
                      onValueChange={(value: PlanType) => setFormData({ ...formData, plan_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-time">1 Time</SelectItem>
                        <SelectItem value="2-time">2 Times</SelectItem>
                        <SelectItem value="3-time">3 Times</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fee">Monthly Fee (AED)</Label>
                    <Input
                      id="fee"
                      type="number"
                      value={formData.monthly_fee}
                      onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                      placeholder="1500"
                      required
                    />
                  </div>

                  {/* Address & Delivery Area */}
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Delivery address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Delivery Area / Zone</Label>
                    <InlineAddSelect
                      value={formData.delivery_area_id}
                      onValueChange={(value) => setFormData({ ...formData, delivery_area_id: value })}
                      options={deliveryAreas.map((a) => ({ value: a.id, label: a.name }))}
                      placeholder="Select delivery area"
                      onAdd={handleAddZone}
                      addLabel="Add new zone"
                    />
                  </div>

                  {/* Food Preferences */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Meal Type</Label>
                      <Select
                        value={formData.meal_type}
                        onValueChange={(value) => setFormData({ ...formData, meal_type: value })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lunch">Lunch</SelectItem>
                          <SelectItem value="dinner">Dinner</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Roti Quantity</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.roti_quantity}
                        onChange={(e) => setFormData({ ...formData, roti_quantity: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Rice Type</Label>
                      <InlineAddSelect
                        value={formData.rice_type}
                        onValueChange={(value) => setFormData({ ...formData, rice_type: value })}
                        options={riceOptions}
                        placeholder="Select rice type"
                        onAdd={handleAddRiceOption}
                        onEdit={handleEditRiceOption}
                        addLabel="Add rice type"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Dietary Preference</Label>
                      <Select
                        value={formData.dietary_preference}
                        onValueChange={(value) => setFormData({ ...formData, dietary_preference: value })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="veg">Veg</SelectItem>
                          <SelectItem value="non_veg">Non-Veg</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Special Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="special_notes">Special Notes</Label>
                    <Textarea
                      id="special_notes"
                      value={formData.special_notes}
                      onChange={(e) => setFormData({ ...formData, special_notes: e.target.value })}
                      placeholder="Dietary requirements, allergies, preferences..."
                      rows={2}
                    />
                  </div>

                  {/* Service Toggles */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <Label htmlFor="pause-toggle" className="text-sm cursor-pointer">Pause Service</Label>
                      <Switch
                        id="pause-toggle"
                        checked={formData.pause_service}
                        onCheckedChange={(checked) => setFormData({ ...formData, pause_service: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <Label htmlFor="weekends-toggle" className="text-sm cursor-pointer">Skip Weekends</Label>
                      <Switch
                        id="weekends-toggle"
                        checked={formData.skip_weekends}
                        onCheckedChange={(checked) => setFormData({ ...formData, skip_weekends: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <Label htmlFor="trial-toggle" className="text-sm cursor-pointer">Free Trial</Label>
                      <Switch
                        id="trial-toggle"
                        checked={formData.free_trial}
                        onCheckedChange={(checked) => setFormData({ ...formData, free_trial: checked })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                    <div className="space-y-0.5">
                      <Label htmlFor="paid-toggle" className="text-base">Payment Status</Label>
                      <p className="text-sm text-muted-foreground">
                        {formData.isPaid ? 'First month paid' : 'First month unpaid'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${!formData.isPaid ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                        Unpaid
                      </span>
                      <Switch
                        id="paid-toggle"
                        checked={formData.isPaid}
                        onCheckedChange={(checked) => setFormData({ ...formData, isPaid: checked })}
                      />
                      <span className={`text-sm ${formData.isPaid ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                        Paid
                      </span>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={addMember.isPending}>
                    {addMember.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Member
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Button
              variant={showFilters || hasActiveFilters ? 'secondary' : 'outline'}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <Filter className="h-4 w-4" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full" />
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-2 p-3 rounded-lg border bg-muted/30">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as MemberStatus | 'all')}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={planFilter}
                onValueChange={(value) => setPlanFilter(value as PlanType | 'all')}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="1-time">1 Time</SelectItem>
                  <SelectItem value="2-time">2 Times</SelectItem>
                  <SelectItem value="3-time">3 Times</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))
          ) : filteredMembers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {members.length === 0
                  ? 'No members yet. Add your first member to get started.'
                  : 'No members match your search or filters.'}
              </CardContent>
            </Card>
          ) : (
            filteredMembers.map((member) => {
              const expiryStatus = getMemberExpiryStatus(member);
              const isPaid = Number(member.balance) === 0;
              const isExpiredOrExpiring = expiryStatus?.status === 'expired' || expiryStatus?.status === 'expiring';

              return (
                <Card
                  key={member.id}
                  className={`overflow-hidden ${expiryStatus?.status === 'expiring' ? 'border-amber-500' : expiryStatus?.status === 'expired' ? 'border-destructive' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex-1 w-full sm:w-auto min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium truncate text-lg sm:text-base">{member.name}</h3>
                          <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                            {member.status}
                          </Badge>
                          <Badge variant={isPaid ? 'outline' : 'destructive'} className={isPaid ? 'border-primary text-primary' : ''}>
                            {isPaid ? 'Paid' : 'Unpaid'}
                          </Badge>
                          {expiryStatus && (
                            <Badge
                              variant="outline"
                              className={expiryStatus.status === 'expiring' ? 'border-amber-500 text-amber-500' : 'border-destructive text-destructive'}
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {expiryStatus.status === 'expired'
                                ? `Exp ${expiryStatus.days}d ago`
                                : `Exp in ${expiryStatus.days}d`
                              }
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-x-4 gap-y-2 mt-2 sm:mt-1 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {member.phone}
                          </span>
                          <span>{member.plan_type}</span>
                          <span className="flex items-center gap-1">
                            <UserPlus className="h-3 w-3" />
                            Joined: {formatDate(new Date(member.joining_date))}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                          {member.plan_expiry_date && (
                            <span>
                              Expires: {formatDate(new Date(member.plan_expiry_date))}
                            </span>
                          )}
                          {(member as any).address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {(member as any).address}
                            </span>
                          )}
                          {(member as any).meal_type && (member as any).meal_type !== 'both' && (
                            <span className="flex items-center gap-1">
                              <UtensilsCrossed className="h-3 w-3" />
                              {(member as any).meal_type === 'lunch' ? 'Lunch' : 'Dinner'}
                            </span>
                          )}
                          {(member as any).roti_quantity > 0 && (
                            <span>Roti: {(member as any).roti_quantity}</span>
                          )}
                          {(member as any).dietary_preference && (member as any).dietary_preference !== 'both' && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1">
                              {(member as any).dietary_preference === 'veg' ? 'Veg' : 'Non-Veg'}
                            </Badge>
                          )}
                          {(member as any).pause_service && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 border-amber-500 text-amber-500">
                              <Pause className="h-2 w-2 mr-0.5" /> Paused
                            </Badge>
                          )}
                          {(member as any).free_trial && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 border-green-500 text-green-500">
                              Trial
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="w-full sm:w-auto flex flex-col items-end gap-3 sm:gap-2">
                        <div className="w-full sm:w-auto flex justify-between sm:block text-right">
                          <p className="text-sm text-muted-foreground">Balance</p>
                          <p className={`font-semibold text-lg sm:text-base ${Number(member.balance) > 0 ? 'text-destructive' : 'text-foreground'}`}>
                            {formatCurrency(Number(member.balance))}
                          </p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto justify-end flex-wrap sm:flex-nowrap">
                          {Number(member.balance) > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPayment(member)}
                              className="flex-1 sm:flex-none"
                            >
                              <CreditCard className="h-3 w-3 mr-1" />
                              Pay
                            </Button>
                          )}
                          {isExpiredOrExpiring && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-primary text-primary hover:bg-primary/10 flex-1 sm:flex-none"
                              onClick={() => openRenewal(member)}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Renew
                            </Button>
                          )}
                          {Number(member.balance) > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-amber-500 text-amber-600 hover:bg-amber-500/10 flex-1 sm:flex-none"
                              onClick={() => handleSingleReminder(member)}
                              title="Send Reminder"
                            >
                              <MessageCircle className="h-3 w-3" />
                            </Button>
                          )}
                          <div className="flex gap-1 ml-auto">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => openEdit(member)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => openHistory(member)}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(member.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Payment Dialog */}
        <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            {selectedMember && (
              <form onSubmit={handlePayment} className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <p className="font-medium">{selectedMember.name}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Outstanding Balance:</span>
                    <span className="font-semibold text-destructive">
                      {formatCurrency(Number(selectedMember.balance))}
                    </span>
                  </div>
                  {selectedMember.plan_expiry_date && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        Due Date:
                      </span>
                      <span className="font-medium">
                        {formatDate(new Date(selectedMember.plan_expiry_date))}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handlePayFull}
                  >
                    Pay Full Amount
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Payment Date</Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPaymentCalendar(!showPaymentCalendar)}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !paymentDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {paymentDate ? format(paymentDate, "PPP") : "Pick a date"}
                  </Button>
                  {showPaymentCalendar && (
                    <div className="rounded-md border bg-background p-0 shadow-sm">
                      <Calendar
                        mode="single"
                        selected={paymentDate || undefined}
                        onSelect={(date) => {
                          setPaymentDate(date || null);
                          setShowPaymentCalendar(false);
                        }}
                        initialFocus
                        className="p-3"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Or Enter Custom Amount (AED)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount"
                    max={Number(selectedMember.balance)}
                    required
                  />
                </div>

                {paymentAmount && Number(paymentAmount) > 0 && (
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">After this payment:</span>
                      <span className={`font-semibold ${getRemainingAfterPayment() > 0 ? 'text-destructive' : 'text-primary'}`}>
                        {getRemainingAfterPayment() > 0
                          ? `${formatCurrency(getRemainingAfterPayment())} remaining`
                          : 'Fully Paid \u2713'
                        }
                      </span>
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={addTransaction.isPending}>
                  {addTransaction.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Record Payment
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Member Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditMember} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  placeholder="05X XXX XXXX"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-plan">Meal Plan</Label>
                <Select
                  value={editFormData.plan_type}
                  onValueChange={(value: PlanType) => setEditFormData({ ...editFormData, plan_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-time">1 Time</SelectItem>
                    <SelectItem value="2-time">2 Times</SelectItem>
                    <SelectItem value="3-time">3 Times</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-fee">Monthly Fee (AED)</Label>
                <Input
                  id="edit-fee"
                  type="number"
                  value={editFormData.monthly_fee}
                  onChange={(e) => setEditFormData({ ...editFormData, monthly_fee: e.target.value })}
                  placeholder="1500"
                  required
                />
              </div>

              {/* Address & Delivery Area */}
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  placeholder="Delivery address"
                />
              </div>
              <div className="space-y-2">
                <Label>Delivery Area / Zone</Label>
                <InlineAddSelect
                  value={editFormData.delivery_area_id}
                  onValueChange={(value) => setEditFormData({ ...editFormData, delivery_area_id: value })}
                  options={deliveryAreas.map((a) => ({ value: a.id, label: a.name }))}
                  placeholder="Select delivery area"
                  onAdd={handleAddZone}
                  addLabel="Add new zone"
                />
              </div>

              {/* Food Preferences */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Meal Type</Label>
                  <Select value={editFormData.meal_type} onValueChange={(v) => setEditFormData({ ...editFormData, meal_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="dinner">Dinner</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Roti Quantity</Label>
                  <Input type="number" min="0" value={editFormData.roti_quantity} onChange={(e) => setEditFormData({ ...editFormData, roti_quantity: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rice Type</Label>
                  <InlineAddSelect
                    value={editFormData.rice_type}
                    onValueChange={(v) => setEditFormData({ ...editFormData, rice_type: v })}
                    options={riceOptions}
                    placeholder="Select rice type"
                    onAdd={handleAddRiceOption}
                    onEdit={handleEditRiceOption}
                    addLabel="Add rice type"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dietary Preference</Label>
                  <Select value={editFormData.dietary_preference} onValueChange={(v) => setEditFormData({ ...editFormData, dietary_preference: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="veg">Veg</SelectItem>
                      <SelectItem value="non_veg">Non-Veg</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Special Notes */}
              <div className="space-y-2">
                <Label>Special Notes</Label>
                <Textarea
                  value={editFormData.special_notes}
                  onChange={(e) => setEditFormData({ ...editFormData, special_notes: e.target.value })}
                  placeholder="Dietary requirements, allergies, preferences..."
                  rows={2}
                />
              </div>

              {/* Service Toggles */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <Label className="text-sm cursor-pointer">Pause Service</Label>
                  <Switch checked={editFormData.pause_service} onCheckedChange={(c) => setEditFormData({ ...editFormData, pause_service: c })} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <Label className="text-sm cursor-pointer">Skip Weekends</Label>
                  <Switch checked={editFormData.skip_weekends} onCheckedChange={(c) => setEditFormData({ ...editFormData, skip_weekends: c })} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <Label className="text-sm cursor-pointer">Free Trial</Label>
                  <Switch checked={editFormData.free_trial} onCheckedChange={(c) => setEditFormData({ ...editFormData, free_trial: c })} />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-paid-toggle" className="text-base">Payment Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {editFormData.isPaid ? 'Balance cleared' : 'Outstanding balance'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${!editFormData.isPaid ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                    Unpaid
                  </span>
                  <Switch
                    id="edit-paid-toggle"
                    checked={editFormData.isPaid}
                    onCheckedChange={(checked) => setEditFormData({ ...editFormData, isPaid: checked })}
                  />
                  <span className={`text-sm ${editFormData.isPaid ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    Paid
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Joining Date</Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowJoiningCalendar(!showJoiningCalendar)}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editFormData.joining_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editFormData.joining_date ? format(editFormData.joining_date, "PPP") : "Pick a date"}
                  </Button>
                  {showJoiningCalendar && (
                    <div className="rounded-md border bg-background p-0 shadow-sm">
                      <Calendar
                        mode="single"
                        selected={editFormData.joining_date || undefined}
                        onSelect={(date) => {
                          setEditFormData({ ...editFormData, joining_date: date || null });
                          setShowJoiningCalendar(false);
                        }}
                        initialFocus
                        className="p-3"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Subscription Expiry</Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowExpiryCalendar(!showExpiryCalendar)}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editFormData.plan_expiry_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editFormData.plan_expiry_date ? format(editFormData.plan_expiry_date, "PPP") : "Pick a date"}
                  </Button>
                  {showExpiryCalendar && (
                    <div className="rounded-md border bg-background p-0 shadow-sm">
                      <Calendar
                        mode="single"
                        selected={editFormData.plan_expiry_date || undefined}
                        onSelect={(date) => {
                          setEditFormData({ ...editFormData, plan_expiry_date: date || null });
                          setShowExpiryCalendar(false);
                        }}
                        initialFocus
                        className="p-3"
                      />
                    </div>
                  )}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={updateMember.isPending}>
                {updateMember.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Smart Renewal Modal */}
        <MemberRenewalModal
          open={isSmartRenewalOpen}
          onOpenChange={setIsSmartRenewalOpen}
          member={selectedMember ? {
            id: selectedMember.id,
            name: selectedMember.name,
            monthly_fee: Number(selectedMember.monthly_fee),
            plan_expiry_date: selectedMember.plan_expiry_date,
          } : null}
        />

        {/* History Dialog */}
        <TransactionHistoryModal
          open={isHistoryOpen}
          onOpenChange={setIsHistoryOpen}
          member={selectedMember ? {
            id: selectedMember.id,
            name: selectedMember.name,
            balance: Number(selectedMember.balance),
            phone: selectedMember.phone,
          } : null}
        />

        {/* Bulk Reminder Dialog */}
        <AlertDialog open={isBulkReminderOpen} onOpenChange={setIsBulkReminderOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Send Payment Reminders</AlertDialogTitle>
              <AlertDialogDescription>
                This will open WhatsApp for {unpaidMembers.length} members with outstanding balances.
                Each reminder will include their name, balance amount, and due date.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="max-h-[200px] overflow-y-auto space-y-2 my-4">
              {unpaidMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                  <span>{member.name}</span>
                  <span className="text-destructive font-medium">{formatCurrency(Number(member.balance))}</span>
                </div>
              ))}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              {unpaidMembers.length > 0 && (
                <AlertDialogAction onClick={handleBulkReminder}>
                  Send Reminders
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Share Dialog */}
        {shareFile && (
          <ShareDialog
            isOpen={isShareDialogOpen}
            onClose={() => setIsShareDialogOpen(false)}
            fileBlob={shareFile.blob}
            fileName={shareFile.filename}
            messageBody={shareFile.message}
            whatsappNumber={shareFile.whatsapp}
            title="Share Invoice"
          />
        )}

        {/* Invoice Actions Dialog */}
        <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invoice Ready! {'\u{1F389}'}</DialogTitle>
            </DialogHeader>
            {lastPaymentInfo && (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Invoice for <strong>{formatCurrency(lastPaymentInfo.amount)}</strong> created for <strong>{lastPaymentInfo.memberName}</strong>.
                </p>
                <p className="text-sm text-muted-foreground">
                  What would you like to do?
                </p>
                <div className="grid gap-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleDownloadInvoice}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Download Invoice (PDF)
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-primary hover:text-primary/80 hover:bg-primary/10"
                    onClick={handleShareWhatsAppPDF}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share PDF via WhatsApp
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground"
                    onClick={handleShareWhatsApp}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Share Text Message
                  </Button>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsInvoiceDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Member?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The member and their transaction history will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Upgrade Plan Modal */}
        <UpgradePlanModal
          open={isUpgradeOpen}
          onOpenChange={setIsUpgradeOpen}
          limitType={upgradeLimitType}
          currentCount={
            upgradeLimitType === 'members' ? freeTierLimits.memberCount :
              upgradeLimitType === 'invoices' ? freeTierLimits.invoiceCount :
                freeTierLimits.receiptCount
          }
          limit={
            upgradeLimitType === 'members' ? freeTierLimits.memberLimit :
              upgradeLimitType === 'invoices' ? freeTierLimits.invoiceLimit :
                freeTierLimits.receiptLimit
          }
        />

        {/* Member Import Modal */}
        <MemberImportModal
          open={isImportOpen}
          onOpenChange={setIsImportOpen}
          memberLimit={freeTierLimits.memberLimit}
          currentMemberCount={freeTierLimits.memberCount}
        />
      </div>
    </AppLayout>
  );
}
