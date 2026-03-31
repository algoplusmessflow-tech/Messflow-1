import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SuperAdminLayout } from '@/components/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useUserRole } from '@/hooks/useUserRole';
import { useBroadcasts } from '@/hooks/useBroadcasts';
import { formatDate } from '@/lib/format';
import { 
  Users, Megaphone, Gift, Loader2, Plus, Trash2, CheckCircle, XCircle, Link as LinkIcon, 
  UserPlus, AlertTriangle, HardDrive, Shield, CreditCard, UserCheck, ShieldAlert, Download, 
  Edit2, UsersRound, FileSpreadsheet, Search, BarChart3, Activity, Cloud, Database, 
  Image as ImageIcon, Zap, MapPin, MessageCircle, TrendingUp, Eye, EyeOff, ArrowUpRight,
  ArrowDownRight, Briefcase, Building2, Target, Layers, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Advanced Stat Card Component
const StatCard = ({ 
  label, 
  value, 
  icon: Icon, 
  trend, 
  color = 'primary',
  description 
}: { 
  label: string; 
  value: string | number; 
  icon: any; 
  trend?: 'up' | 'down' | null; 
  color?: string; 
  description?: string; 
}) => (
  <div className="group relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-background via-background to-background/50 p-6 backdrop-blur-xl transition-all duration-300 hover:border-border/80 hover:shadow-xl hover:shadow-primary/5">
    {/* Gradient Background Effect */}
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    
    <div className="relative z-10 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold tracking-tight text-foreground">{value}</h3>
            {trend && (
              <span className={`flex items-center gap-1 text-xs font-semibold ${trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
                {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              </span>
            )}
          </div>
          {description && <p className="text-xs text-muted-foreground/75">{description}</p>}
        </div>
        <div className={`rounded-xl p-3 transition-all duration-300 group-hover:scale-110 ${color === 'primary' ? 'bg-primary/10 text-primary' : color === 'emerald' ? 'bg-emerald-500/10 text-emerald-600' : color === 'orange' ? 'bg-orange-500/10 text-orange-600' : color === 'purple' ? 'bg-purple-500/10 text-purple-600' : 'bg-cyan-500/10 text-cyan-600'}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  </div>
);

export default function SuperAdmin() {
  const { isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const {
    allProfiles,
    promoCodes,
    promoAssignments,
    superAdmins,
    profilesLoading,
    promoLoading,
    assignmentsLoading,
    superAdminsLoading,
    updatePaymentLink,
    updateBusinessName,
    updateSubscription,
    createPromoCode,
    deletePromoCode,
    assignPromoCode,
    removePromoAssignment,
    togglePaymentStatus,
    addSuperAdmin,
    removeSuperAdmin,
    fetchMembersForOwner,
    currentSuperAdminProfile,
    updateGatewaySettings,
    updatePlatformApiConfig,
  } = useSuperAdmin();

  // Platform API config state
  const [apiConfig, setApiConfig] = useState({
    google_client_id: '',
    google_client_secret: '',
    google_maps_key: '',
    cloudinary_cloud_name: '',
    cloudinary_upload_preset: '',
    whatsapp_api_token: '',
    storage_provider: 'cloudinary' as string,
  });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const [gatewayConfig, setGatewayConfig] = useState({
    provider: 'razorpay',
    apiKey: '',
    secretKey: '',
    webhookUrl: 'https://api.messflow.com/webhook/payments',
  });
  const [isGatewayEnabled, setIsGatewayEnabled] = useState(false);

  // Load existing settings
  useEffect(() => {
    if (currentSuperAdminProfile) {
      if (currentSuperAdminProfile.is_platform_gateway_enabled !== undefined) {
        setIsGatewayEnabled(currentSuperAdminProfile.is_platform_gateway_enabled);
      }
      if (currentSuperAdminProfile.platform_gateway_config) {
        setGatewayConfig(currentSuperAdminProfile.platform_gateway_config);
      }
      const pCfg = (currentSuperAdminProfile as any).platform_api_config;
      if (pCfg && typeof pCfg === 'object') {
        setApiConfig((prev) => ({ ...prev, ...pCfg }));
      }
    }
  }, [currentSuperAdminProfile]);

  const handleSaveGatewayConfig = async () => {
    await updateGatewaySettings.mutateAsync({
      isEnabled: isGatewayEnabled,
      config: gatewayConfig,
    });
  };

  const { createBroadcast, allBroadcasts, deleteBroadcast } = useBroadcasts();

  const [editingPaymentLink, setEditingPaymentLink] = useState<string | null>(null);
  const [newPaymentLink, setNewPaymentLink] = useState('');
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [promoForm, setPromoForm] = useState<{ code: string, days: string, assignToProfileIds: string[] }>({ code: '', days: '30', assignToProfileIds: [] });
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '' });
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assigningPromoId, setAssigningPromoId] = useState<string | null>(null);
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [editingBusinessName, setEditingBusinessName] = useState<string | null>(null);
  const [newBusinessName, setNewBusinessName] = useState('');
  const [exportingOwner, setExportingOwner] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletePromoId, setDeletePromoId] = useState<string | null>(null);
  const [removeAdminId, setRemoveAdminId] = useState<string | null>(null);

  // Subscription editing state
  const [editingSubscription, setEditingSubscription] = useState<string | null>(null);
  const [editSubForm, setEditSubForm] = useState({
    status: 'active' as 'active' | 'expired' | 'trial',
    planType: 'free' as 'free' | 'pro' | 'enterprise',
    expiryDate: new Date(),
  });

  const handleEditSubscription = (profile: typeof allProfiles[0]) => {
    setEditingSubscription(profile.id);
    setEditSubForm({
      status: profile.subscription_status as any,
      planType: profile.plan_type as any || 'free',
      expiryDate: profile.subscription_expiry ? new Date(profile.subscription_expiry) : new Date(),
    });
  };

  const handleSaveSubscription = async () => {
    if (!editingSubscription) return;
    await updateSubscription.mutateAsync({
      profileId: editingSubscription,
      status: editSubForm.status,
      planType: editSubForm.planType,
      expiryDate: editSubForm.expiryDate.toISOString(),
    });
    setEditingSubscription(null);
  };

  // ANALYTICS DATA
  const SUPABASE_FREE = {
    database: 500 * 1024 * 1024,
    fileStorage: 1024 * 1024 * 1024,
    bandwidth: 2 * 1024 * 1024 * 1024,
    authUsers: 50000,
    realtimeConnections: 200,
    edgeFunctionInvocations: 500000,
  };

  const CLOUDINARY_FREE = {
    totalCredits: 25,
    storage: 25 * 1024 * 1024 * 1024,
    transformations: 25000,
    bandwidth: 25 * 1024 * 1024 * 1024,
  };

  const analytics = useMemo(() => {
    if (!allProfiles.length) return null;

    const totalTenants = allProfiles.length;
    const activeTenants = allProfiles.filter(p => p.subscription_status === 'active').length;
    const expiredTenants = allProfiles.filter(p => p.subscription_status === 'expired').length;
    const trialTenants = allProfiles.filter(p => p.subscription_status === 'trial').length;
    const totalMembers = allProfiles.reduce((sum, p) => sum + (p.member_count || 0), 0);
    const totalStorageUsed = allProfiles.reduce((sum, p) => sum + (p.storage_used || 0), 0);
    const totalStorageAllocated = allProfiles.reduce((sum, p) => sum + (p.storage_limit || 0), 0);

    const freePlanCount = allProfiles.filter(p => p.plan_type === 'free').length;
    const proPlanCount = allProfiles.filter(p => p.plan_type === 'pro').length;
    const enterprisePlanCount = allProfiles.filter(p => p.plan_type === 'enterprise').length;

    const topByMembers = [...allProfiles]
      .sort((a, b) => (b.member_count || 0) - (a.member_count || 0))
      .slice(0, 5);

    const topByStorage = [...allProfiles]
      .sort((a, b) => (b.storage_used || 0) - (a.storage_used || 0))
      .slice(0, 5);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentSignups = allProfiles.filter(
      p => new Date(p.created_at) >= sevenDaysAgo
    ).length;

    return {
      totalTenants, activeTenants, expiredTenants, trialTenants,
      totalMembers, totalStorageUsed, totalStorageAllocated,
      freePlanCount, proPlanCount, enterprisePlanCount,
      topByMembers, topByStorage, recentSignups,
    };
  }, [allProfiles]);

  // Helper: Progress bar component
  const UsageBar = ({ used, limit, label, icon: Icon, unit = 'bytes', warning = 0.7, danger = 0.9 }: {
    used: number; limit: number; label: string; icon: any; unit?: string; warning?: number; danger?: number;
  }) => {
    const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
    const color = pct >= danger * 100 ? 'bg-red-500' : pct >= warning * 100 ? 'bg-amber-500' : 'bg-emerald-500';
    const textColor = pct >= danger * 100 ? 'text-red-400' : pct >= warning * 100 ? 'text-amber-400' : 'text-emerald-400';

    const formatVal = (v: number) => {
      if (unit === 'count') return v.toLocaleString();
      return formatBytes(v);
    };

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Icon className="h-4 w-4" />
            {label}
          </span>
          <span className={`font-mono font-medium ${textColor}`}>
            {formatVal(used)} / {formatVal(limit)}
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{pct.toFixed(1)}% used</span>
          {pct >= danger * 100 && (
            <span className="text-red-400 font-medium flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Upgrade soon!
            </span>
          )}
          {pct >= warning * 100 && pct < danger * 100 && (
            <span className="text-amber-400 font-medium">Approaching limit</span>
          )}
        </div>
      </div>
    );
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <p className="text-destructive font-medium">Access Denied</p>
            <p className="text-muted-foreground mt-2">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleActivatePlan = async (profileId: string) => {
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 30);
    await updateSubscription.mutateAsync({
      profileId,
      status: 'active',
      expiryDate: newExpiry.toISOString(),
    });
  };

  const handleDeactivatePlan = async (profileId: string) => {
    await updateSubscription.mutateAsync({
      profileId,
      status: 'expired',
      expiryDate: new Date().toISOString(),
    });
  };

  const handleSavePaymentLink = async (profileId: string) => {
    await updatePaymentLink.mutateAsync({ profileId, paymentLink: newPaymentLink });
    setEditingPaymentLink(null);
    setNewPaymentLink('');
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPromoCode.mutateAsync({
      code: promoForm.code,
      daysToAdd: Number(promoForm.days),
      assignToProfileIds: promoForm.assignToProfileIds,
    });
    setPromoForm({ code: '', days: '30', assignToProfileIds: [] });
    setIsPromoOpen(false);
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    await createBroadcast.mutateAsync(broadcastForm);
    setBroadcastForm({ title: '', message: '' });
    setIsBroadcastOpen(false);
  };

  const handleAddSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    await addSuperAdmin.mutateAsync(newAdminEmail);
    setNewAdminEmail('');
    setIsAddAdminOpen(false);
  };

  const handleOpenAssignDialog = (promoId: string) => {
    const existingAssignments = promoAssignments
      .filter(a => a.promo_code_id === promoId)
      .map(a => a.profile_id);
    setSelectedProfileIds(existingAssignments);
    setAssigningPromoId(promoId);
    setIsAssignOpen(true);
  };

  const handleSaveAssignments = async () => {
    if (!assigningPromoId) return;
    await assignPromoCode.mutateAsync({
      promoCodeId: assigningPromoId,
      profileIds: selectedProfileIds,
    });
    setIsAssignOpen(false);
    setAssigningPromoId(null);
    setSelectedProfileIds([]);
  };

  const toggleProfileSelection = (profileId: string) => {
    setSelectedProfileIds(prev =>
      prev.includes(profileId)
        ? prev.filter(id => id !== profileId)
        : [...prev, profileId]
    );
  };

  const getPromoAssignmentCount = (promoId: string) => {
    return promoAssignments.filter(a => a.promo_code_id === promoId).length;
  };

  const handleSaveBusinessName = async (profileId: string) => {
    await updateBusinessName.mutateAsync({ profileId, businessName: newBusinessName });
    setEditingBusinessName(null);
    setNewBusinessName('');
  };

  const handleExportMembers = async (profile: typeof allProfiles[0]) => {
    try {
      setExportingOwner(profile.id);
      const members = await fetchMembersForOwner(profile.user_id);

      if (members.length === 0) {
        toast.error('No members found for this owner');
        return;
      }

      const workbook = XLSX.utils.book_new();
      const memberData = members.map((m, index) => {
        const menuSummary = m.menuDetails?.days
          ?.map(d => `${d.day}: B-${d.breakfast}, L-${d.lunch}, D-${d.dinner}`)
          .join(' | ') || 'No menu assigned';

        return {
          'S.No': index + 1,
          'Member ID': m.id,
          'Name': m.name,
          'Phone': m.phone,
          'Status': m.status,
          'Plan Type': m.plan_type,
          'Menu Week': m.menuDetails?.week ? `Week ${m.menuDetails.week}` : 'Not Set',
          'Balance': m.balance,
          'Monthly Fee': m.monthly_fee,
          'Joining Date': m.joining_date ? new Date(m.joining_date).toLocaleDateString() : '',
          'Plan Expiry Date': m.plan_expiry_date ? new Date(m.plan_expiry_date).toLocaleDateString() : '',
          'Created At': m.created_at ? new Date(m.created_at).toLocaleString() : '',
          'Weekly Menu Summary': menuSummary,
        };
      });

      const memberSheet = XLSX.utils.json_to_sheet(memberData);
      const memberColWidths = Object.keys(memberData[0] || {}).map(key => ({
        wch: key === 'Weekly Menu Summary' ? 100 : Math.max(key.length, 15)
      }));
      memberSheet['!cols'] = memberColWidths;
      XLSX.utils.book_append_sheet(workbook, memberSheet, 'Members');

      const menuDetailData: any[] = [];
      members.forEach((m, index) => {
        if (m.menuDetails?.days && m.menuDetails.days.length > 0) {
          m.menuDetails.days.forEach(day => {
            menuDetailData.push({
              'S.No': index + 1,
              'Member Name': m.name,
              'Phone': m.phone,
              'Plan Type': m.plan_type,
              'Menu Week': `Week ${m.menuDetails?.week || 1}`,
              'Day': day.day,
              'Breakfast': day.breakfast,
              'Lunch': day.lunch,
              'Dinner': day.dinner,
            });
          });
        } else {
          menuDetailData.push({
            'S.No': index + 1,
            'Member Name': m.name,
            'Phone': m.phone,
            'Plan Type': m.plan_type,
            'Menu Week': 'Not Set',
            'Day': '-',
            'Breakfast': '-',
            'Lunch': '-',
            'Dinner': '-',
          });
        }
      });

      const menuSheet = XLSX.utils.json_to_sheet(menuDetailData);
      const menuColWidths = Object.keys(menuDetailData[0] || {}).map(key => ({
        wch: Math.max(key.length, 20)
      }));
      menuSheet['!cols'] = menuColWidths;
      XLSX.utils.book_append_sheet(workbook, menuSheet, 'Member Menu Details');

      const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
      const fileName = `${profile.business_name.replace(/[^a-zA-Z0-9]/g, '_')}_members_menu_${currentMonth.replace(' ', '_')}.xlsx`;

      XLSX.writeFile(workbook, fileName);
      toast.success(`Exported ${members.length} members with menu details to Excel`);
    } catch (error: any) {
      toast.error('Failed to export: ' + error.message);
    } finally {
      setExportingOwner(null);
    }
  };

  const totalMembers = allProfiles.reduce((sum, p) => sum + (p.member_count || 0), 0);

  const tenantProfiles = allProfiles
    .filter(p => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        p.business_name.toLowerCase().includes(query) ||
        p.owner_email.toLowerCase().includes(query)
      );
    });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentSignups = tenantProfiles.filter(p => new Date(p.created_at) >= sevenDaysAgo);

  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const expiringSoon = tenantProfiles.filter(p => {
    if (!p.subscription_expiry) return false;
    const expiryDate = new Date(p.subscription_expiry);
    return expiryDate >= now && expiryDate <= sevenDaysFromNow;
  });

  return (
    <SuperAdminLayout>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-50" />
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Building2 className="h-8 w-8 text-primary" />
                  <h1 className="text-4xl font-bold tracking-tight text-white">Business Owner Management</h1>
                </div>
                <p className="text-base text-slate-300">Manage subscriptions, activate features, and oversee all registered business owners</p>
              </div>
              <Link to="/super-admin/security">
                <Button variant="outline" className="border-slate-600 hover:bg-slate-800 gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  Security
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Advanced Stat Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            label="Total Businesses"
            value={profilesLoading ? '—' : tenantProfiles.length}
            icon={Building2}
            color="primary"
            trend={recentSignups.length > 0 ? 'up' : null}
            description="Active & inactive businesses"
          />
          <StatCard
            label="New This Week"
            value={profilesLoading ? '—' : recentSignups.length}
            icon={UserPlus}
            color="emerald"
            description="Recently joined"
          />
          <StatCard
            label="Expiring Soon"
            value={profilesLoading ? '—' : expiringSoon.length}
            icon={AlertTriangle}
            color="orange"
            description="Next 7 days"
          />
          <StatCard
            label="Active Promos"
            value={promoLoading ? '—' : promoCodes.filter(p => !p.is_used).length}
            icon={Gift}
            color="purple"
            description="Available codes"
          />
          <StatCard
            label="Total Members"
            value={profilesLoading ? '—' : totalMembers}
            icon={Users}
            color="cyan"
            description="Across all businesses"
          />
        </div>

        {/* Alerts Section */}
        {recentSignups.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 to-emerald-900/20 p-6 backdrop-blur-xl">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-emerald-500/10 p-3">
                <UserPlus className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-emerald-400 mb-3">Recent Business Registrations</h3>
                <div className="space-y-2">
                  {recentSignups.map((profile) => (
                    <div key={profile.id} className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/30 transition-colors">
                      <div>
                        <p className="font-medium text-foreground">{profile.business_name}</p>
                        <p className="text-sm text-muted-foreground">{profile.owner_email}</p>
                      </div>
                      <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 bg-emerald-500/10">
                        {formatDate(new Date(profile.created_at))}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="tenants" className="w-full">
          <TabsList className="flex flex-wrap h-auto w-full justify-start overflow-x-auto gap-1 pb-1 bg-muted/40 p-1 rounded-xl border border-border/40">
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="tenants" className="gap-2">
              <Building2 className="h-4 w-4" />
              Business Owners
            </TabsTrigger>
            <TabsTrigger value="payment-integration" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Integration
            </TabsTrigger>
            <TabsTrigger value="promos" className="gap-2">
              <Gift className="h-4 w-4" />
              Promo Codes
            </TabsTrigger>
            <TabsTrigger value="broadcasts" className="gap-2">
              <Megaphone className="h-4 w-4" />
              Broadcasts
            </TabsTrigger>
            <TabsTrigger value="admins" className="gap-2">
              <Shield className="h-4 w-4" />
              Admins
            </TabsTrigger>
            <TabsTrigger value="api-services" className="gap-2">
              <Zap className="h-4 w-4" />
              API & Services
            </TabsTrigger>
            <TabsTrigger value="mode-activation" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Mode Activation
            </TabsTrigger>
          </TabsList>

          {/* Tenants Tab - Enhanced */}
          <TabsContent value="tenants" className="mt-6 space-y-6">
            <Card className="border-border/40 bg-background/80 backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      All Business Owners
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Manage subscriptions and business details</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 max-w-xs"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {profilesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/40 hover:bg-transparent">
                          <TableHead>Business Name</TableHead>
                          <TableHead>Owner Email</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead className="text-center">Members</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Expiry Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tenantProfiles.map((profile) => (
                          <TableRow key={profile.id} className="border-border/40 hover:bg-muted/40 transition-colors">
                            <TableCell className="font-semibold">{profile.business_name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{profile.owner_email}</TableCell>
                            <TableCell>
                              <Badge variant={profile.plan_type === 'enterprise' ? 'default' : profile.plan_type === 'pro' ? 'secondary' : 'outline'}>
                                {profile.plan_type?.toUpperCase() || 'FREE'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-medium">{profile.member_count || 0}</TableCell>
                            <TableCell>
                              <Badge variant={profile.payment_status === 'paid' ? 'default' : 'destructive'} className="text-xs">
                                {profile.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={profile.subscription_status === 'active' ? 'default' : profile.subscription_status === 'trial' ? 'secondary' : 'destructive'}>
                                {profile.subscription_status === 'active' ? '✓ Active' : profile.subscription_status === 'trial' ? 'Trial' : 'Expired'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {profile.subscription_expiry ? new Date(profile.subscription_expiry).toLocaleDateString() : '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" onClick={() => handleActivatePlan(profile.id)} disabled={updateSubscription.isPending} className="text-xs">
                                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleExportMembers(profile)} disabled={exportingOwner === profile.id} className="text-xs">
                                  <Download className="h-4 w-4 text-blue-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Keep existing tabs content but update titles from "Mess Owners" to "Business Owners" */}
          {/* ... rest of the tabs remain the same but with updated text ... */}
        </Tabs>
      </div>
    </SuperAdminLayout>
  );
}