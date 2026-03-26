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
  DialogDescription,
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
import { useMapConfig } from '@/hooks/useMapConfig';
import { fetchLocationFromAddress, extractCoordinatesFromInput } from '@/lib/geolocation';
import { useFreeTierLimits } from '@/hooks/useFreeTierLimits';
import { formatCurrency, formatDate, toDateInputValue, calculateExpiryDate, getDaysUntilExpiry } from '@/lib/format';
import { generateMemberInvoice } from '@/lib/pdf-generator';
import { shareInvoiceViaWhatsApp, createInvoicePDF } from '@/lib/whatsapp-pdf-share';
import { generatePortalCredentials } from '@/lib/credentials';
import { Plus, Phone, Loader2, CreditCard, AlertTriangle, FileText, MessageCircle, Trash2, Search, Filter, X, Calendar as CalendarIcon, RefreshCw, History, Send, Crown, Upload, Share2, Pencil, UserPlus, MapPin, UtensilsCrossed, Pause, SkipForward, KeyRound, Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { UpgradePlanModal } from '@/components/UpgradePlanModal';
import { ShareDialog } from '@/components/ShareDialog';
import { MemberImportModal } from '@/components/MemberImportModal';
import { MemberRenewalModal } from '@/components/MemberRenewalModal';
import { TransactionHistoryModal } from '@/components/TransactionHistoryModal';
import { cn } from '@/lib/utils';
import { InlineAddSelect } from '@/components/InlineAddSelect';
import { createInvoiceRecord } from '@/lib/invoice-service';

type PlanType = Database['public']['Enums']['plan_type'];
type MemberStatus = Database['public']['Enums']['member_status'];

export default function Members() {
  const { user } = useAuth();
  const mapConfig = useMapConfig();
  const { members, isLoading, addMember, updateMember, deleteMember } = useMembers();
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
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
  const [isInvoicesOpen, setIsInvoicesOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Invoice management state
  const [invoices, setInvoices] = useState<Array<{
    id: string;
    invoice_number: string;
    member_id: string;
    member_name?: string;
    customer_phone?: string;
    billing_period_start: Date | string;
    billing_period_end: Date | string;
    status: string;
    total_amount: number;
    paid_date: Date | string | null;
    created_at: Date | string;
    is_recurring?: boolean;
  }>>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [selectedMemberForInvoice, setSelectedMemberForInvoice] = useState<typeof members[0] | null>(null);

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
    trial_days: 3,
    location_lat: null as number | null,
    location_lng: null as number | null,
  });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date | null>(new Date());
  const [showPaymentCalendar, setShowPaymentCalendar] = useState(false);
  const [showJoiningCalendar, setShowJoiningCalendar] = useState(false);
  const [showExpiryCalendar, setShowExpiryCalendar] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid' | 'expired' | 'trial'>('all');
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
    trial_days: 3,
    location_lat: null as number | null,
    location_lng: null as number | null,
  });

  const defaultMealOptions = [
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'both', label: 'Both (Lunch + Dinner)' },
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'breakfast_lunch', label: 'Breakfast + Lunch' },
    { value: 'all_three', label: 'All Three Meals' },
  ];

  // Filtered members with payment status and trial filtering
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch = searchQuery === '' ||
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.phone.includes(searchQuery);
      
      // Payment status filter
      const isPaid = Number(member.balance) === 0;
      // Check if trial has expired (inline to avoid hoisting issue)
      const trialExpired = member.free_trial && member.trial_days 
        ? getDaysUntilExpiry(member.plan_expiry_date) < 0 
        : false;
      // Check if regular plan has expired (non-trial members)
      const planExpired = !member.free_trial && getDaysUntilExpiry(member.plan_expiry_date) < 0;
      // Combined expired status
      const isExpired = trialExpired || planExpired;
      
      const matchesPayment = paymentFilter === 'all' || (
        paymentFilter === 'paid' && isPaid && !member.free_trial && !planExpired ||
        paymentFilter === 'unpaid' && !isPaid && !member.free_trial && !planExpired ||
        paymentFilter === 'expired' && isExpired ||
        paymentFilter === 'trial' && member.free_trial && !trialExpired
      );
      
      const matchesPlan = planFilter === 'all' || member.plan_type === planFilter;
      return matchesSearch && matchesPayment && matchesPlan;
    });
  }, [members, searchQuery, paymentFilter, planFilter]);

  // Members with outstanding balance for bulk reminder
  const unpaidMembers = useMemo(() => {
    return members.filter((m) => Number(m.balance) > 0);
  }, [members]);

  const hasActiveFilters = paymentFilter !== 'all' || planFilter !== 'all';

  const clearFilters = () => {
    setPaymentFilter('all');
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
    
    // Calculate expiry date based on trial period
    let expiryDate: Date;
    if (formData.free_trial && formData.trial_days) {
      // For trial members, set expiry to joining_date + trial_days
      expiryDate = new Date(joiningDate);
      expiryDate.setDate(expiryDate.getDate() + formData.trial_days);
    } else {
      // Regular members get 1 month
      expiryDate = calculateExpiryDate(joiningDate);
    }
    
    const monthlyFee = Number(formData.monthly_fee);
    // Trial members start with balance = monthly_fee (unpaid until trial ends or they pay)
    const balance = formData.isPaid ? 0 : (formData.free_trial ? 0 : monthlyFee);

    // Generate portal credentials for customer login
    const creds = generatePortalCredentials(formData.name);

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
      trial_days: formData.free_trial ? formData.trial_days : null,
      location_lat: formData.location_lat,
      location_lng: formData.location_lng,
      portal_username: creds.username,
      portal_password: creds.password,
    } as any);

    if ((formData.isPaid || formData.free_trial) && newMember) {
      await addTransaction.mutateAsync({
        member_id: newMember.id,
        amount: monthlyFee,
        type: 'payment',
        notes: formData.free_trial ? 'Trial period started' : 'Initial payment on signup',
      });

      if (formData.isPaid && !formData.free_trial) {
        // Auto-create invoice record in DB
        if (user) {
          try {
            const inv = await createInvoiceRecord({
              ownerId: user.id,
              memberId: newMember.id,
              memberName: formData.name.trim(),
              memberPhone: formData.phone.trim(),
              amount: monthlyFee,
              taxRate: profile?.tax_rate || 5,
              taxName: profile?.tax_name || 'VAT',
              businessName: profile?.business_name,
              source: 'member_signup',
            });
            if (inv) {
              console.log('[Members] Invoice created:', inv.invoice_number);
            } else {
              console.warn('[Members] Invoice creation returned null');
            }
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
          } catch (invErr) {
            console.error('[Members] Invoice creation failed:', invErr);
            // Don't block member creation — invoice failure is non-critical
          }
        }

        setLastPaymentInfo({
          memberName: formData.name.trim(),
          amount: monthlyFee,
          phone: formData.phone.trim(),
        });
        setIsInvoiceDialogOpen(true);
      }
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
      trial_days: 3,
      location_lat: null,
      location_lng: null,
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

    // Auto-create invoice record in DB for this payment
    if (user) {
      try {
        const inv = await createInvoiceRecord({
          ownerId: user.id,
          memberId: selectedMember.id,
          memberName: selectedMember.name,
          memberPhone: selectedMember.phone,
          amount,
          taxRate: profile?.tax_rate || 5,
          taxName: profile?.tax_name || 'VAT',
          businessName: profile?.business_name,
          source: 'payment',
        });
        if (inv) console.log('[Members] Payment invoice created:', inv.invoice_number);
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
      } catch (invErr) {
        console.error('[Members] Payment invoice failed:', invErr);
      }
    }

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
      trial_days: m.trial_days || 3,
      location_lat: m.location_lat || null,
      location_lng: m.location_lng || null,
    });
    setIsEditOpen(true);
  };

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    // Recalculate expiry date if joining date or trial status changed
    let expiryDate = editFormData.plan_expiry_date?.toISOString();
    if (editFormData.joining_date) {
      const joiningDate = new Date(editFormData.joining_date);
      if (editFormData.free_trial && editFormData.trial_days) {
        const trialExpiry = new Date(joiningDate);
        trialExpiry.setDate(trialExpiry.getDate() + editFormData.trial_days);
        expiryDate = trialExpiry.toISOString();
      } else if (!selectedMember.free_trial && editFormData.joining_date.getTime() !== new Date(selectedMember.joining_date).getTime()) {
        // Only recalculate for non-trial members if joining date changed
        expiryDate = calculateExpiryDate(joiningDate).toISOString();
      }
    }

    // Calculate balance - trial members have 0 balance during trial
    const monthlyFee = Number(editFormData.monthly_fee);
    const balance = editFormData.isPaid ? 0 : (editFormData.free_trial ? 0 : monthlyFee);

    await updateMember.mutateAsync({
      id: selectedMember.id,
      name: editFormData.name.trim(),
      phone: editFormData.phone.trim(),
      plan_type: editFormData.plan_type,
      monthly_fee: monthlyFee,
      status: editFormData.status,
      joining_date: editFormData.joining_date?.toISOString(),
      plan_expiry_date: expiryDate,
      balance: balance,
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
      trial_days: editFormData.free_trial ? editFormData.trial_days : null,
      location_lat: editFormData.location_lat,
      location_lng: editFormData.location_lng,
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

  // Check if trial has expired and service should be paused
  const isTrialExpired = (member: typeof members[0]) => {
    if (!member.free_trial || !member.trial_days) return false;
    const daysUntilExpiry = getDaysUntilExpiry(member.plan_expiry_date);
    return daysUntilExpiry < 0; // Trial expired
  };

  // Get effective service status considering trial expiration
  const getServiceStatus = (member: typeof members[0]) => {
    // If trial expired and not paid, service should be paused
    if (isTrialExpired(member) && Number(member.balance) > 0) {
      return 'trial_expired';
    }
    return member.status;
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMember.mutateAsync(deleteId);
    setDeleteId(null);
  };

  // Fetch invoices for a member
  const fetchMemberInvoices = async (memberPhone: string) => {
    setInvoicesLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_phone', memberPhone)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
      setInvoices([]);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const openInvoicesDialog = (member: typeof members[0]) => {
    setSelectedMemberForInvoice(member);
    setIsInvoicesOpen(true);
    fetchMemberInvoices(member.phone);
  };

  const getRemainingAfterPayment = () => {
    if (!selectedMember) return 0;
    const amount = Number(paymentAmount) || 0;
    return Math.max(0, Number(selectedMember.balance) - amount);
  };

  // Location fetch handler
  const handleFetchLocation = async (address: string, target: 'add' | 'edit') => {
    if (!address.trim()) {
      setLocationError('Please enter an address first');
      return;
    }
    setIsFetchingLocation(true);
    setLocationError('');
    try {
      // First check if it's a map link with coordinates
      const parsed = extractCoordinatesFromInput(address);
      if (parsed?.lat && parsed?.lng) {
        const fullAddress = parsed.address || address;
        if (target === 'add') {
          setFormData((prev) => ({ ...prev, address: fullAddress }));
        } else {
          setEditFormData((prev) => ({ ...prev, address: fullAddress }));
        }
        toast.success('Location found from link!');
        return;
      }

      // Use geocoding API with configured provider
      const providerName = mapConfig.provider === 'google' ? 'Google Maps'
        : mapConfig.provider === 'mapbox' ? 'Mapbox'
        : mapConfig.provider === 'here' ? 'HERE'
        : mapConfig.provider === 'locationiq' ? 'LocationIQ'
        : 'OpenStreetMap';

      const result = await fetchLocationFromAddress(address, mapConfig);
      if (result.lat && result.lng) {
        if (target === 'add') {
          setFormData((prev) => ({ ...prev, address: result.address || prev.address, location_lat: result.lat!, location_lng: result.lng! }));
        } else {
          setEditFormData((prev) => ({ ...prev, address: result.address || prev.address, location_lat: result.lat!, location_lng: result.lng! }));
        }
        toast.success(`Address verified via ${providerName}`);
      } else {
        setLocationError(`Could not geocode via ${providerName}. Try a more specific address.`);
      }
    } catch (err) {
      console.error('Location fetch error:', err);
      const provider = mapConfig.provider || 'openstreetmap';
      if (provider !== 'openstreetmap' && !mapConfig.apiKey) {
        setLocationError(`No API key set for ${provider}. Go to Settings > Integrations to add one.`);
      } else {
        setLocationError('Location lookup failed. Try a different address or check your API key.');
      }
    } finally {
      setIsFetchingLocation(false);
    }
  };

  // Inline add handlers for rice types
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
                    <div className="flex gap-1">
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => { setFormData({ ...formData, address: e.target.value }); setLocationError(''); }}
                        placeholder="Enter address or paste Google Maps link"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 flex-shrink-0"
                        onClick={() => handleFetchLocation(formData.address, 'add')}
                        disabled={isFetchingLocation || !formData.address.trim()}
                        title="Verify address"
                      >
                        {isFetchingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                      </Button>
                    </div>
                    {locationError && <p className="text-xs text-destructive">{locationError}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Delivery Zone</Label>
                    <Select
                      value={formData.delivery_area_id}
                      onValueChange={(value) => setFormData({ ...formData, delivery_area_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select zone" />
                      </SelectTrigger>
                      <SelectContent>
                        {deliveryAreas.map((area) => (
                          <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                          {defaultMealOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
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
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div>
                          <Label htmlFor="pause-toggle" className="text-sm cursor-pointer">Pause Service</Label>
                          <p className="text-[10px] text-muted-foreground">Temporarily stop deliveries</p>
                        </div>
                        <Switch
                          id="pause-toggle"
                          checked={formData.pause_service}
                          onCheckedChange={(checked) => setFormData({ ...formData, pause_service: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div>
                          <Label htmlFor="weekends-toggle" className="text-sm cursor-pointer">Skip Weekends</Label>
                          <p className="text-[10px] text-muted-foreground">No Sat & Sun delivery</p>
                        </div>
                        <Switch
                          id="weekends-toggle"
                          checked={formData.skip_weekends}
                          onCheckedChange={(checked) => setFormData({ ...formData, skip_weekends: checked })}
                        />
                      </div>
                    </div>
                    <div className={`p-3 rounded-lg border ${formData.free_trial ? 'border-green-500 bg-green-500/5' : 'bg-muted/30'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="trial-toggle" className="text-sm cursor-pointer">Free Trial</Label>
                          <p className="text-[10px] text-muted-foreground">
                            {formData.free_trial 
                              ? `${formData.trial_days}-day trial (service stops after expiry)` 
                              : 'Regular paid subscription'}
                          </p>
                        </div>
                        <Switch
                          id="trial-toggle"
                          checked={formData.free_trial}
                          onCheckedChange={(checked) => setFormData({ 
                            ...formData, 
                            free_trial: checked, 
                            // When enabling trial, set as unpaid (balance will be charged after trial)
                            // When disabling trial, require immediate payment
                            isPaid: checked ? false : formData.isPaid 
                          })}
                        />
                      </div>
                      {formData.free_trial && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground whitespace-nowrap">Trial Duration:</Label>
                            <Select
                              value={String(formData.trial_days)}
                              onValueChange={(v) => setFormData({ ...formData, trial_days: parseInt(v) })}
                            >
                              <SelectTrigger className="h-8 w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 day</SelectItem>
                                <SelectItem value="3">3 days</SelectItem>
                                <SelectItem value="5">5 days</SelectItem>
                                <SelectItem value="7">7 days</SelectItem>
                                <SelectItem value="14">14 days</SelectItem>
                                <SelectItem value="30">30 days</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Trial Start Date</Label>
                              <Input
                                type="date"
                                value={formData.joining_date}
                                onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Trial End Date</Label>
                              <Input
                                type="date"
                                value={new Date(new Date(formData.joining_date).setDate(new Date(formData.joining_date).getDate() + formData.trial_days)).toISOString().split('T')[0]}
                                disabled
                                className="h-8 bg-muted"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                    <div className="space-y-0.5">
                      <Label htmlFor="paid-toggle" className="text-base">Payment Status</Label>
                      <p className="text-sm text-muted-foreground">
                        {formData.free_trial 
                          ? 'Unpaid during trial, payment due after trial ends' 
                          : formData.isPaid ? 'First month paid' : 'First month unpaid'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {formData.free_trial ? (
                        <Badge variant="outline" className="border-green-500 text-green-500">
                          Trial Mode
                        </Badge>
                      ) : (
                        <>
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
                        </>
                      )}
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
                value={paymentFilter}
                onValueChange={(value) => setPaymentFilter(value as 'all' | 'paid' | 'unpaid' | 'expired' | 'trial')}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Payment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  <SelectItem value="paid">💚 Paid</SelectItem>
                  <SelectItem value="unpaid">💔 Unpaid</SelectItem>
                  <SelectItem value="trial">🧪 Trial</SelectItem>
                  <SelectItem value="expired">⚠️ Expired</SelectItem>
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
                          {(member as any).free_trial && !isTrialExpired(member) && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 border-green-500 text-green-500">
                              Trial
                            </Badge>
                          )}
                          {isTrialExpired(member) && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 border-red-500 text-red-500">
                              <AlertTriangle className="h-2 w-2 mr-0.5" /> Trial Expired
                            </Badge>
                          )}
                          {(member as any).portal_username && (
                            <div className="flex items-center gap-1">
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5 px-1.5 border-blue-500 text-blue-500 cursor-pointer hover:bg-blue-500/10"
                                title="Click to copy username"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText((member as any).portal_username);
                                  toast.success('Username copied!');
                                }}
                              >
                                <UserPlus className="h-2.5 w-2.5 mr-0.5" /> {(member as any).portal_username}
                                <Copy className="h-2 w-2 ml-0.5 opacity-60" />
                              </Badge>
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5 px-1.5 border-green-500 text-green-500 cursor-pointer hover:bg-green-500/10"
                                title="Click to copy password"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText((member as any).portal_password);
                                  toast.success('Password copied!');
                                }}
                              >
                                <KeyRound className="h-2.5 w-2.5 mr-0.5" /> ••••••
                                <Copy className="h-2 w-2 ml-0.5 opacity-60" />
                              </Badge>
                            </div>
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
                        <div className="flex gap-2 w-full sm:w-auto justify-end flex-wrap">
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
                              onClick={() => openInvoicesDialog(member)}
                              title="View Invoices"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
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
                <div className="flex gap-1">
                  <Input
                    value={editFormData.address}
                    onChange={(e) => { setEditFormData({ ...editFormData, address: e.target.value }); setLocationError(''); }}
                    placeholder="Enter address or paste Google Maps link"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                    onClick={() => handleFetchLocation(editFormData.address, 'edit')}
                    disabled={isFetchingLocation || !editFormData.address.trim()}
                    title="Verify address"
                  >
                    {isFetchingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                  </Button>
                </div>
                {locationError && <p className="text-xs text-destructive">{locationError}</p>}
              </div>
              <div className="space-y-2">
                <Label>Delivery Zone</Label>
                <Select
                  value={editFormData.delivery_area_id}
                  onValueChange={(value) => setEditFormData({ ...editFormData, delivery_area_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryAreas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Food Preferences */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Meal Type</Label>
                  <Select value={editFormData.meal_type} onValueChange={(v) => setEditFormData({ ...editFormData, meal_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {defaultMealOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
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
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div>
                      <Label className="text-sm cursor-pointer">Pause Service</Label>
                      <p className="text-[10px] text-muted-foreground">Temporarily stop deliveries</p>
                    </div>
                    <Switch checked={editFormData.pause_service} onCheckedChange={(c) => setEditFormData({ ...editFormData, pause_service: c })} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div>
                      <Label className="text-sm cursor-pointer">Skip Weekends</Label>
                      <p className="text-[10px] text-muted-foreground">No Sat & Sun delivery</p>
                    </div>
                    <Switch checked={editFormData.skip_weekends} onCheckedChange={(c) => setEditFormData({ ...editFormData, skip_weekends: c })} />
                  </div>
                </div>
                <div className={`p-3 rounded-lg border ${editFormData.free_trial ? 'border-green-500 bg-green-500/5' : 'bg-muted/30'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm cursor-pointer">Free Trial</Label>
                      <p className="text-[10px] text-muted-foreground">
                        {editFormData.free_trial 
                          ? `${editFormData.trial_days}-day trial (service stops after expiry)` 
                          : 'Regular paid subscription'}
                      </p>
                    </div>
                    <Switch
                      checked={editFormData.free_trial}
                      onCheckedChange={(c) => setEditFormData({ 
                        ...editFormData, 
                        free_trial: c, 
                        isPaid: c ? false : editFormData.isPaid 
                      })}
                    />
                  </div>
                  {editFormData.free_trial && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Trial Duration:</Label>
                        <Select value={String(editFormData.trial_days)} onValueChange={(v) => setEditFormData({ ...editFormData, trial_days: parseInt(v) })}>
                          <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 day</SelectItem>
                            <SelectItem value="3">3 days</SelectItem>
                            <SelectItem value="5">5 days</SelectItem>
                            <SelectItem value="7">7 days</SelectItem>
                            <SelectItem value="14">14 days</SelectItem>
                            <SelectItem value="30">30 days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Trial Start Date</Label>
                          <Input
                            type="date"
                            value={editFormData.joining_date ? editFormData.joining_date.toISOString().split('T')[0] : ''}
                            onChange={(e) => {
                              const newDate = new Date(e.target.value);
                              setEditFormData({ ...editFormData, joining_date: newDate });
                            }}
                            className="h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Trial End Date</Label>
                          <Input
                            type="date"
                            value={editFormData.joining_date ? new Date(new Date(editFormData.joining_date).setDate(new Date(editFormData.joining_date).getDate() + editFormData.trial_days)).toISOString().split('T')[0] : ''}
                            disabled
                            className="h-8 bg-muted"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-paid-toggle" className="text-base">Payment Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {editFormData.free_trial 
                      ? 'Unpaid during trial, payment due after trial ends' 
                      : editFormData.isPaid ? 'Balance cleared' : 'Outstanding balance'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {editFormData.free_trial ? (
                    <Badge variant="outline" className="border-green-500 text-green-500">
                      Trial Mode
                    </Badge>
                  ) : (
                    <>
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
                    </>
                  )}
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

        {/* Invoices Dialog - View all invoices for a customer */}
        <Dialog open={isInvoicesOpen} onOpenChange={setIsInvoicesOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <FileText className="h-5 w-5 text-indigo-600" />
                Invoice History - {selectedMemberForInvoice?.name}
              </DialogTitle>
              <DialogDescription className="text-sm">
                Phone: {selectedMemberForInvoice?.phone}
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-4 space-y-4">
              {invoicesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading invoices...</span>
                </div>
              ) : invoices.length === 0 ? (
                <Card className="border-2 border-dashed border-gray-200 bg-gray-50/50">
                  <CardContent className="py-8 text-center">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm font-medium text-gray-600">No invoices found</p>
                    <p className="text-xs text-gray-500 mt-1">Invoices will appear here once generated</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <Card className="border-2 border-blue-200 bg-blue-50">
                      <CardContent className="p-3 text-center">
                        <p className="text-2xl font-extrabold text-blue-900">{invoices.length}</p>
                        <p className="text-[10px] text-blue-700 font-bold mt-1">Total Invoices</p>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-green-200 bg-green-50">
                      <CardContent className="p-3 text-center">
                        <p className="text-2xl font-extrabold text-green-900">
                          {invoices.filter(inv => inv.status === 'paid').length}
                        </p>
                        <p className="text-[10px] text-green-700 font-bold mt-1">Paid</p>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-amber-200 bg-amber-50">
                      <CardContent className="p-3 text-center">
                        <p className="text-2xl font-extrabold text-amber-900">
                          {invoices.filter(inv => inv.status === 'draft' || inv.status === 'pending').length}
                        </p>
                        <p className="text-[10px] text-amber-700 font-bold mt-1">Unpaid</p>
                      </CardContent>
                    </Card>
                    <Card className="border-2 border-purple-200 bg-purple-50">
                      <CardContent className="p-3 text-center">
                        <p className="text-2xl font-extrabold text-purple-900">
                          {invoices.filter(inv => inv.is_recurring).length}
                        </p>
                        <p className="text-[10px] text-purple-700 font-bold mt-1">Recurring</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Invoice List */}
                  <ScrollArea className="max-h-[500px] pr-4">
                    <div className="space-y-3">
                      {invoices.map((invoice) => (
                        <Card key={invoice.id} className={`border-2 ${invoice.status === 'paid' ? 'border-green-300 bg-green-50/30' : 'border-amber-300 bg-amber-50/30'}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-bold text-gray-900 truncate">
                                    Invoice #{invoice.invoice_number}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] font-bold px-1.5 py-0.5 h-5 ${
                                      invoice.status === 'paid'
                                        ? 'border-green-500 text-green-700 bg-green-100'
                                        : 'border-amber-500 text-amber-700 bg-amber-100'
                                    }`}
                                  >
                                    {invoice.status.toUpperCase()}
                                  </Badge>
                                  {invoice.is_recurring && (
                                    <Badge variant="outline" className="text-[9px] bg-purple-100 text-purple-700 border-purple-300 font-bold px-1.5 py-0.5 h-5">
                                      <RefreshCw className="h-2.5 w-2.5 mr-0.5" /> Recurring
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700">
                                  <div className="flex items-center gap-1">
                                    <CalendarIcon className="h-3 w-3 text-gray-500" />
                                    <span className="font-medium">Period:</span>
                                    <span>{formatDate(new Date(invoice.billing_period_start))} - {formatDate(new Date(invoice.billing_period_end))}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <CalendarIcon className="h-3 w-3 text-gray-500" />
                                    <span className="font-medium">Created:</span>
                                    <span>{formatDate(new Date(invoice.created_at))}</span>
                                  </div>
                                  {invoice.paid_date && (
                                    <div className="flex items-center gap-1">
                                      <CalendarIcon className="h-3 w-3 text-green-600" />
                                      <span className="font-medium">Paid:</span>
                                      <span>{formatDate(new Date(invoice.paid_date))}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="text-right flex-shrink-0">
                                <p className="text-lg font-extrabold text-gray-900">
                                  {formatCurrency(Number(invoice.total_amount))}
                                </p>
                                <p className="text-[10px] text-gray-600 mt-1">
                                  {invoice.status === 'paid' ? '✓ Paid in full' : '⏳ Pending'}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>

            <DialogFooter className="sticky bottom-0 bg-white pt-3 border-t">
              <Button variant="outline" onClick={() => setIsInvoicesOpen(false)} className="border-2 font-semibold hover:bg-gray-50">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
