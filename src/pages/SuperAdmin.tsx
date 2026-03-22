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
import { Users, Megaphone, Gift, Loader2, Plus, Trash2, CheckCircle, XCircle, Link as LinkIcon, UserPlus, AlertTriangle, HardDrive, Shield, CreditCard, UserCheck, ShieldAlert, Download, Edit2, UsersRound, FileSpreadsheet, Search, BarChart3, Activity, Cloud, Database, Image as ImageIcon, Zap, MapPin, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

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
      // Load platform API config
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

  // ===== ANALYTICS DATA =====
  // Supabase free tier limits
  const SUPABASE_FREE = {
    database: 500 * 1024 * 1024,       // 500MB
    fileStorage: 1024 * 1024 * 1024,    // 1GB  
    bandwidth: 2 * 1024 * 1024 * 1024,  // 2GB
    authUsers: 50000,                    // 50K MAU
    realtimeConnections: 200,            // 200 concurrent
    edgeFunctionInvocations: 500000,     // 500K/month
  };

  // Cloudinary free tier limits  
  const CLOUDINARY_FREE = {
    totalCredits: 25,                    // 25 credits/month
    storage: 25 * 1024 * 1024 * 1024,   // 25GB managed storage
    transformations: 25000,              // ~25K transformations
    bandwidth: 25 * 1024 * 1024 * 1024, // 25GB bandwidth
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

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Member Details with Menu Week Summary
      const memberData = members.map((m, index) => {
        // Format menu summary for this member
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

      // Sheet 2: Detailed Menu by Member
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

      // Generate filename with current month
      const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
      const fileName = `${profile.business_name.replace(/[^a-zA-Z0-9]/g, '_')}_members_menu_${currentMonth.replace(' ', '_')}.xlsx`;

      // Write and download
      XLSX.writeFile(workbook, fileName);

      toast.success(`Exported ${members.length} members with menu details to Excel`);
    } catch (error: any) {
      toast.error('Failed to export: ' + error.message);
    } finally {
      setExportingOwner(null);
    }
  };

  // Calculate total members across all tenants
  const totalMembers = allProfiles.reduce((sum, p) => sum + (p.member_count || 0), 0);

  // Filter and apply search filter
  const tenantProfiles = allProfiles
    .filter(p => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        p.business_name.toLowerCase().includes(query) ||
        p.owner_email.toLowerCase().includes(query)
      );
    });

  // Calculate recent signups (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentSignups = tenantProfiles.filter(p => new Date(p.created_at) >= sevenDaysAgo);

  // Calculate expiring soon (next 7 days)
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
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-xl border backdrop-blur-xl border-border bg-card/80 p-6 shadow-xl shadow-glass">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Tenant Management
              </h1>
              <p className="text-muted-foreground mt-1">Manage subscriptions and view all registered mess owners</p>
            </div>
            <Link to="/super-admin/security">
              <Button variant="outline" className="border-border hover:bg-accent/50 transition-all duration-300">
                <ShieldAlert className="h-4 w-4 mr-2" />
                Security
              </Button>
            </Link>
          </div>
        </div>

        {/* Summary Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="backdrop-blur-xl border-border bg-card/80 hover:shadow-lg hover:shadow-glass transition-all duration-300">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Tenants</p>
                <p className="text-2xl font-bold text-foreground">{profilesLoading ? '—' : tenantProfiles.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl border-border bg-card/80 hover:shadow-lg hover:shadow-glass transition-all duration-300">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">New This Week</p>
                <p className="text-2xl font-bold text-foreground">{profilesLoading ? '—' : recentSignups.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl border-border bg-card/80 hover:shadow-lg hover:shadow-glass transition-all duration-300">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Expiring Soon</p>
                <p className="text-2xl font-bold text-foreground">{profilesLoading ? '—' : expiringSoon.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl border-border bg-card/80 hover:shadow-lg hover:shadow-glass transition-all duration-300">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Gift className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Active Promos</p>
                <p className="text-2xl font-bold text-foreground">{promoLoading ? '—' : promoCodes.filter(p => !p.is_used).length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl border-border bg-card/80 hover:shadow-lg hover:shadow-glass transition-all duration-300">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <UsersRound className="h-6 w-6 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Members</p>
                <p className="text-2xl font-bold text-foreground">{profilesLoading ? '—' : totalMembers}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Signups Alert */}
        {recentSignups.length > 0 && (
          <Card className="backdrop-blur-xl border-green-500/30 bg-card/80 hover:shadow-lg hover:shadow-glass transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-green-600 font-semibold">
                <UserPlus className="h-5 w-5" />
                Recent Signups (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentSignups.map((profile) => (
                  <div key={profile.id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-green-500/20 hover:bg-green-500/10 transition-colors">
                    <div>
                      <p className="font-medium text-foreground">{profile.business_name}</p>
                      <p className="text-sm text-muted-foreground">{profile.owner_email}</p>
                    </div>
                    <Badge variant="outline" className="border-green-500/50 text-green-600 bg-green-500/10 font-medium">
                      {formatDate(new Date(profile.created_at))}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expiring Soon Alert */}
        {expiringSoon.length > 0 && (
          <Card className="backdrop-blur-xl border-orange-500/30 bg-card/80 hover:shadow-lg hover:shadow-glass transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-orange-600 font-semibold">
                <AlertTriangle className="h-5 w-5" />
                Subscriptions Expiring Soon (Next 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {expiringSoon.map((profile) => (
                  <div key={profile.id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-orange-500/20 hover:bg-orange-500/10 transition-colors">
                    <div>
                      <p className="font-medium text-foreground">{profile.business_name}</p>
                      <p className="text-sm text-muted-foreground">{profile.owner_email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="font-medium">
                        Expires {formatDate(new Date(profile.subscription_expiry!))}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleActivatePlan(profile.id)}
                        disabled={updateSubscription.isPending}
                        className="border-orange-500/50 text-orange-600 hover:bg-orange-500 hover:text-white transition-colors"
                      >
                        +30 Days
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="tenants" className="w-full">
          <TabsList className="flex flex-wrap h-auto w-full justify-start overflow-x-auto gap-1 pb-1">
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="tenants">
              <Users className="h-4 w-4 mr-2" />
              Tenants
            </TabsTrigger>
            <TabsTrigger value="payment-integration">
              <CreditCard className="h-4 w-4 mr-2" />
              Payment Integration
            </TabsTrigger>
            <TabsTrigger value="promos">
              <Gift className="h-4 w-4 mr-2" />
              Promo Codes
            </TabsTrigger>
            <TabsTrigger value="broadcasts">
              <Megaphone className="h-4 w-4 mr-2" />
              Broadcasts
            </TabsTrigger>
            <TabsTrigger value="admins">
              <Shield className="h-4 w-4 mr-2" />
              Admins
            </TabsTrigger>
            <TabsTrigger value="api-services">
              <Zap className="h-4 w-4 mr-2" />
              API & Services
            </TabsTrigger>
          </TabsList>

          {/* ===== ANALYTICS TAB ===== */}
          <TabsContent value="analytics" className="mt-4 space-y-6">
            {!analytics ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Overview Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="backdrop-blur-xl border-border bg-card/80">
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-primary">{analytics.totalTenants}</p>
                      <p className="text-xs text-muted-foreground mt-1">Total Tenants</p>
                    </CardContent>
                  </Card>
                  <Card className="backdrop-blur-xl border-border bg-card/80">
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-emerald-400">{analytics.activeTenants}</p>
                      <p className="text-xs text-muted-foreground mt-1">Active</p>
                    </CardContent>
                  </Card>
                  <Card className="backdrop-blur-xl border-border bg-card/80">
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-blue-400">{analytics.totalMembers}</p>
                      <p className="text-xs text-muted-foreground mt-1">Total Members</p>
                    </CardContent>
                  </Card>
                  <Card className="backdrop-blur-xl border-border bg-card/80">
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-amber-400">{analytics.recentSignups}</p>
                      <p className="text-xs text-muted-foreground mt-1">Signups (7d)</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Free Tier Usage */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Supabase Usage */}
                  <Card className="backdrop-blur-xl border-border bg-card/80">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Database className="h-5 w-5 text-emerald-400" />
                        Supabase Free Tier
                        <span className="text-xs font-normal text-muted-foreground ml-auto">Free Plan</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <UsageBar
                        used={analytics.totalStorageUsed}
                        limit={SUPABASE_FREE.fileStorage}
                        label="File Storage"
                        icon={HardDrive}
                      />
                      <UsageBar
                        used={analytics.totalTenants}
                        limit={SUPABASE_FREE.authUsers}
                        label="Auth Users"
                        icon={Users}
                        unit="count"
                      />
                      <UsageBar
                        used={analytics.totalMembers + analytics.totalTenants}
                        limit={500000}
                        label="Est. Database Rows"
                        icon={Database}
                        unit="count"
                      />
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Free Tier Limits:</span>{' '}
                          500MB DB • 1GB Storage • 50K Auth Users • 2GB Bandwidth
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Cloudinary Usage */}
                  <Card className="backdrop-blur-xl border-border bg-card/80">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Cloud className="h-5 w-5 text-blue-400" />
                        Cloudinary Free Tier
                        <span className="text-xs font-normal text-muted-foreground ml-auto">Free Plan</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <UsageBar
                        used={analytics.totalStorageUsed}
                        limit={CLOUDINARY_FREE.storage}
                        label="Managed Storage"
                        icon={ImageIcon}
                      />
                      <UsageBar
                        used={analytics.totalTenants * 50}
                        limit={CLOUDINARY_FREE.transformations}
                        label="Est. Transformations"
                        icon={Zap}
                        unit="count"
                      />
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Free Tier Limits:</span>{' '}
                          25 Credits/mo • 25GB Storage • 25K Transforms • 25GB Bandwidth
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Plan Distribution & Top Tenants */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Plan Distribution */}
                  <Card className="backdrop-blur-xl border-border bg-card/80">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-5 w-5 text-purple-400" />
                        Plan Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        { label: 'Free', count: analytics.freePlanCount, color: 'bg-gray-400', pct: (analytics.freePlanCount / analytics.totalTenants * 100) },
                        { label: 'Pro', count: analytics.proPlanCount, color: 'bg-blue-500', pct: (analytics.proPlanCount / analytics.totalTenants * 100) },
                        { label: 'Enterprise', count: analytics.enterprisePlanCount, color: 'bg-purple-500', pct: (analytics.enterprisePlanCount / analytics.totalTenants * 100) },
                      ].map(plan => (
                        <div key={plan.label} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{plan.label}</span>
                            <span className="font-medium">{plan.count} ({plan.pct.toFixed(0)}%)</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${plan.color}`} style={{ width: `${plan.pct}%` }} />
                          </div>
                        </div>
                      ))}

                      <div className="pt-3 border-t border-border space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Status Breakdown</span>
                        </div>
                        <div className="flex gap-4 text-xs">
                          <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-emerald-400" /> Active: {analytics.activeTenants}</span>
                          <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-400" /> Expired: {analytics.expiredTenants}</span>
                          <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-400" /> Trial: {analytics.trialTenants}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Tenants */}
                  <Card className="backdrop-blur-xl border-border bg-card/80">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <UsersRound className="h-5 w-5 text-amber-400" />
                        Top Tenants
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="by-members">
                        <TabsList className="w-full mb-3">
                          <TabsTrigger value="by-members" className="flex-1 text-xs">By Members</TabsTrigger>
                          <TabsTrigger value="by-storage" className="flex-1 text-xs">By Storage</TabsTrigger>
                        </TabsList>
                        <TabsContent value="by-members">
                          <div className="space-y-2">
                            {analytics.topByMembers.map((p, i) => (
                              <div key={p.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30">
                                <span className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">{i + 1}</span>
                                  <span className="truncate max-w-[150px]">{p.business_name || p.owner_email}</span>
                                </span>
                                <span className="font-mono text-muted-foreground">{p.member_count} members</span>
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                        <TabsContent value="by-storage">
                          <div className="space-y-2">
                            {analytics.topByStorage.map((p, i) => (
                              <div key={p.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30">
                                <span className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">{i + 1}</span>
                                  <span className="truncate max-w-[150px]">{p.business_name || p.owner_email}</span>
                                </span>
                                <span className="font-mono text-muted-foreground">{formatBytes(p.storage_used || 0)}</span>
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="tenants" className="mt-4">
            <Card className="backdrop-blur-xl border-border bg-card/80 hover:shadow-lg hover:shadow-glass transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg font-semibold">All Mess Owners</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 border-border focus:border-border focus:ring-border"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {profilesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : tenantProfiles.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No registered tenants yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-semibold text-muted-foreground">Mess Name</TableHead>
                          <TableHead className="font-semibold text-muted-foreground">Owner Email</TableHead>
                          <TableHead className="font-semibold text-muted-foreground">Plan</TableHead>
                          <TableHead className="font-semibold text-muted-foreground">Members</TableHead>
                          <TableHead className="font-semibold text-muted-foreground">Signup Date</TableHead>
                          <TableHead className="font-semibold text-muted-foreground">Payment</TableHead>
                          <TableHead className="font-semibold text-muted-foreground">Status</TableHead>
                          <TableHead className="font-semibold text-muted-foreground">Expiry Date</TableHead>
                          <TableHead className="font-semibold text-muted-foreground">Storage</TableHead>
                          <TableHead className="text-right font-semibold text-muted-foreground">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tenantProfiles.map((profile) => (
                          <TableRow key={profile.id} className="hover:bg-background/50 transition-colors">
                            <TableCell className="font-medium text-foreground">
                              <div className="flex items-center gap-2">
                                {profile.business_name}
                                <Dialog
                                  open={editingBusinessName === profile.id}
                                  onOpenChange={(open) => {
                                    if (!open) setEditingBusinessName(null);
                                    else {
                                      setEditingBusinessName(profile.id);
                                      setNewBusinessName(profile.business_name);
                                    }
                                  }}
                                >
                                  <DialogTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-background/50">
                                      <Edit2 className="h-3 w-3 text-muted-foreground" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Edit Business Name</DialogTitle>
                                      <DialogDescription>Update the business name for this tenant.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <Input
                                        value={newBusinessName}
                                        onChange={(e) => setNewBusinessName(e.target.value)}
                                        placeholder="Business Name"
                                        className="border-border focus:border-border focus:ring-border"
                                      />
                                      <Button
                                        className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold"
                                        onClick={() => handleSaveBusinessName(profile.id)}
                                        disabled={updateBusinessName.isPending}
                                      >
                                        {updateBusinessName.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{profile.owner_email}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="uppercase text-xs font-bold">
                                {profile.plan_type || 'free'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-mono bg-background/50 text-foreground border-border">
                                {profile.member_count || 0}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{formatDate(new Date(profile.created_at))}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant={profile.is_paid ? 'default' : 'outline'}
                                className={`${profile.is_paid ? 'bg-green-500 hover:bg-green-600 text-white' : 'border-border text-foreground hover:bg-background/50'} font-medium`}
                                onClick={() => togglePaymentStatus.mutate({
                                  profileId: profile.id,
                                  isPaid: !profile.is_paid
                                })}
                                disabled={togglePaymentStatus.isPending}
                              >
                                <CreditCard className="h-4 w-4 mr-1" />
                                {profile.is_paid ? 'Paid' : 'Unpaid'}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  profile.subscription_status === 'active' ? 'default' :
                                    profile.subscription_status === 'trial' ? 'secondary' : 'destructive'
                                }
                                className={`${profile.subscription_status === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                                  profile.subscription_status === 'trial' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                    'bg-red-100 text-red-800 border-red-200'} font-medium`}
                              >
                                {profile.subscription_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {profile.subscription_expiry
                                ? formatDate(new Date(profile.subscription_expiry))
                                : '—'}
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-muted-foreground">
                                <span className={profile.storage_used > (profile.storage_limit * 0.9) ? 'text-destructive font-medium' : ''}>
                                  {formatBytes(profile.storage_used || 0)}
                                </span>
                                <span className="text-muted-foreground/70"> / {formatBytes(profile.storage_limit || 104857600)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditSubscription(profile)}
                                  title="Edit Subscription"
                                  className="hover:bg-background/50"
                                >
                                  <Edit2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleActivatePlan(profile.id)}
                                  disabled={updateSubscription.isPending}
                                  className="border-green-500/50 text-green-600 hover:bg-green-500 hover:text-white font-medium transition-colors"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Activate
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeactivatePlan(profile.id)}
                                  disabled={updateSubscription.isPending}
                                  className="border-destructive/50 text-destructive hover:bg-destructive hover:text-white font-medium transition-colors"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Deactivate
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleExportMembers(profile)}
                                  disabled={exportingOwner === profile.id}
                                  title="Export members as Excel"
                                  className="hover:bg-background/50"
                                >
                                  {exportingOwner === profile.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                  ) : (
                                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                                  )}
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
            <Dialog open={!!editingSubscription} onOpenChange={(open) => !open && setEditingSubscription(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Subscription</DialogTitle>
                  <DialogDescription>Update plan details for this tenant.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Plan Type</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={editSubForm.planType}
                      onChange={(e) => setEditSubForm({ ...editSubForm, planType: e.target.value as any })}
                    >
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={editSubForm.status}
                      onChange={(e) => setEditSubForm({ ...editSubForm, status: e.target.value as any })}
                    >
                      <option value="active">Active</option>
                      <option value="trial">Trial</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSaveSubscription}
                    disabled={updateSubscription.isPending}
                  >
                    {updateSubscription.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="promos" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Dialog open={isPromoOpen} onOpenChange={setIsPromoOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold">
                    <Plus className="h-4 w-4 mr-1" />
                    Create Promo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Promo Code</DialogTitle>
                    <DialogDescription>Create a new promo code to extend subscription periods.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreatePromo} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="code" className="text-muted-foreground font-medium">Code</Label>
                      <Input
                        id="code"
                        value={promoForm.code}
                        onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                        placeholder="e.g., WELCOME30"
                        required
                        className="border-border focus:border-border focus:ring-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="days" className="text-muted-foreground font-medium">Days to Add</Label>
                      <Input
                        id="days"
                        type="number"
                        value={promoForm.days}
                        onChange={(e) => setPromoForm({ ...promoForm, days: e.target.value })}
                        placeholder="30"
                        required
                        className="border-border focus:border-border focus:ring-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground font-medium">Assign To (Optional)</Label>
                      <div className="max-h-[150px] overflow-y-auto space-y-2 border border-border rounded-md p-2 bg-background/50">
                        {tenantProfiles.length === 0 ? (
                          <p className="text-center text-xs text-muted-foreground py-2">No tenants found</p>
                        ) : (
                          tenantProfiles.map((profile) => (
                            <div
                              key={profile.id}
                              className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${promoForm.assignToProfileIds.includes(profile.id)
                                ? 'bg-primary/10 border border-primary/30'
                                : 'hover:bg-background/50'
                                }`}
                              onClick={() => {
                                setPromoForm(prev => ({
                                  ...prev,
                                  assignToProfileIds: prev.assignToProfileIds.includes(profile.id)
                                    ? prev.assignToProfileIds.filter(id => id !== profile.id)
                                    : [...prev.assignToProfileIds, profile.id]
                                }));
                              }}
                            >
                              <div>
                                <p className="font-medium text-sm text-foreground">{profile.business_name}</p>
                                <p className="text-xs text-muted-foreground">{profile.owner_email}</p>
                              </div>
                              {promoForm.assignToProfileIds.includes(profile.id) && (
                                <CheckCircle className="h-4 w-4 text-primary" />
                              )}
                            </div>
                          ))
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {promoForm.assignToProfileIds.length === 0
                            ? 'Public (all users can use)'
                            : `${promoForm.assignToProfileIds.length} user(s) selected`}
                        </span>
                        {promoForm.assignToProfileIds.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => setPromoForm(prev => ({ ...prev, assignToProfileIds: [] }))}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                    <Button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold" disabled={createPromoCode.isPending}>
                      {createPromoCode.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Code
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="backdrop-blur-xl border-border bg-card/80 hover:shadow-lg hover:shadow-glass transition-all duration-300">
              <CardContent className="p-0">
                {promoLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : promoCodes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No promo codes created yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-semibold text-muted-foreground">Code</TableHead>
                          <TableHead className="font-semibold text-muted-foreground">Days</TableHead>
                          <TableHead className="font-semibold text-muted-foreground">Assigned To</TableHead>
                          <TableHead className="font-semibold text-muted-foreground">Status</TableHead>
                          <TableHead className="font-semibold text-muted-foreground">Created</TableHead>
                          <TableHead className="text-right font-semibold text-muted-foreground">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {promoCodes.map((promo) => {
                          const assignmentCount = getPromoAssignmentCount(promo.id);
                          const assignments = promoAssignments.filter(a => a.promo_code_id === promo.id);
                          return (
                            <TableRow key={promo.id} className="hover:bg-background/50 transition-colors">
                              <TableCell className="font-mono font-bold text-foreground">{promo.code}</TableCell>
                              <TableCell className="text-muted-foreground">+{promo.days_to_add} days</TableCell>
                              <TableCell>
                                {assignmentCount === 0 ? (
                                  <Badge variant="outline" className="text-muted-foreground border-border bg-background/50">
                                    Public (All Users)
                                  </Badge>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    {assignments.slice(0, 2).map((a) => (
                                      <Badge key={a.id} variant="secondary" className="text-xs bg-background/50 text-foreground border-border">
                                        {a.profile?.business_name || 'Unknown'}
                                      </Badge>
                                    ))}
                                    {assignmentCount > 2 && (
                                      <Badge variant="secondary" className="text-xs bg-background/50 text-foreground border-border">
                                        +{assignmentCount - 2} more
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={promo.is_used ? 'secondary' : 'default'} className={`${promo.is_used ? 'bg-background/50 text-foreground border-border' : 'bg-green-100 text-green-800 border-green-200'} font-medium`}>
                                  {promo.is_used ? 'Used' : 'Active'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{formatDate(new Date(promo.created_at))}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleOpenAssignDialog(promo.id)}
                                    disabled={promo.is_used}
                                    title="Assign to users"
                                    className="hover:bg-background/50"
                                  >
                                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setDeletePromoId(promo.id)}
                                    disabled={deletePromoCode.isPending}
                                    className="hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assignment Dialog */}
            <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
              <DialogContent className="max-w-md max-h-[80vh] backdrop-blur-xl border-border bg-card/80">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold">Assign Promo Code to Users</DialogTitle>
                  <DialogDescription>Select users who can redeem this promo code.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Select users who can use this promo code. Leave empty for public access.
                  </p>
                  <div className="max-h-[300px] overflow-y-auto space-y-2 border border-border rounded-md p-2 bg-background/50">
                    {tenantProfiles.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No tenants found</p>
                    ) : (
                      tenantProfiles.map((profile) => (
                        <div
                          key={profile.id}
                          className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${selectedProfileIds.includes(profile.id)
                            ? 'bg-primary/10 border border-primary/30'
                            : 'hover:bg-background/50'
                            }`}
                          onClick={() => toggleProfileSelection(profile.id)}
                        >
                          <div>
                            <p className="font-medium text-sm text-foreground">{profile.business_name}</p>
                            <p className="text-xs text-muted-foreground">{profile.owner_email}</p>
                          </div>
                          {selectedProfileIds.includes(profile.id) && (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {selectedProfileIds.length === 0
                        ? 'Public (all users can use)'
                        : `${selectedProfileIds.length} user(s) selected`}
                    </span>
                    {selectedProfileIds.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedProfileIds([])}
                        className="text-muted-foreground hover:text-foreground hover:bg-background/50"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                  <Button
                    className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold"
                    onClick={handleSaveAssignments}
                    disabled={assignPromoCode.isPending}
                  >
                    {assignPromoCode.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Assignment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="broadcasts" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Dialog open={isBroadcastOpen} onOpenChange={setIsBroadcastOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold">
                    <Megaphone className="h-4 w-4 mr-1" />
                    Send Broadcast
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Send System Update</DialogTitle>
                    <DialogDescription>Broadcast an announcement to all mess owners.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSendBroadcast} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-muted-foreground font-medium">Title</Label>
                      <Input
                        id="title"
                        value={broadcastForm.title}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                        placeholder="e.g., New Feature Released!"
                        required
                        className="border-border focus:border-border focus:ring-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-muted-foreground font-medium">Message</Label>
                      <Textarea
                        id="message"
                        value={broadcastForm.message}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                        placeholder="Write your announcement..."
                        rows={4}
                        required
                        className="border-border focus:border-border focus:ring-border"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold" disabled={createBroadcast.isPending}>
                      {createBroadcast.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Send to All Owners
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="backdrop-blur-xl border-border bg-card/80 hover:shadow-lg hover:shadow-glass transition-all duration-300">
              <CardContent className="p-0">
                {allBroadcasts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No broadcasts sent yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-semibold text-muted-foreground">Title</TableHead>
                          <TableHead className="font-semibold text-muted-foreground">Message</TableHead>
                          <TableHead className="font-semibold text-muted-foreground">Sent On</TableHead>
                          <TableHead className="font-semibold text-muted-foreground text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allBroadcasts.map((broadcast) => (
                          <TableRow key={broadcast.id} className="hover:bg-background/50 transition-colors">
                            <TableCell className="font-medium text-foreground">{broadcast.title}</TableCell>
                            <TableCell className="text-muted-foreground max-w-md truncate">
                              {broadcast.message}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{formatDate(new Date(broadcast.created_at))}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to delete this broadcast?')) {
                                    deleteBroadcast.mutate(broadcast.id);
                                  }
                                }}
                                disabled={deleteBroadcast.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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

          <TabsContent value="payment-integration" className="mt-4 space-y-4">
            <Card className="backdrop-blur-xl border-border bg-card/80 hover:shadow-lg hover:shadow-glass transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 font-semibold text-foreground">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Payment Integration Management
                </CardTitle>
                <p className="text-sm text-muted-foreground">Configure payment gateway settings and manage payment integrations for tenants.</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Payment Gateway Configuration */}
                  <Card className="border-border bg-background/50">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">Payment Gateway Settings</CardTitle>
                      <p className="text-sm text-muted-foreground">Configure your preferred payment gateway for tenant subscriptions.</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Payment Gateway</Label>
                        <select
                          className="w-full p-2 border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                          value={gatewayConfig.provider}
                          onChange={(e) => setGatewayConfig({ ...gatewayConfig, provider: e.target.value })}
                        >
                          <option value="razorpay">Razorpay</option>
                          <option value="stripe">Stripe</option>
                          <option value="paypal">PayPal</option>
                          <option value="manual">Manual Payment</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">API Key</Label>
                        <Input
                          type="password"
                          placeholder="Enter your API key"
                          className="border-border focus:border-border focus:ring-border"
                          value={gatewayConfig.apiKey}
                          onChange={(e) => setGatewayConfig({ ...gatewayConfig, apiKey: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Secret Key</Label>
                        <Input
                          type="password"
                          placeholder="Enter your secret key"
                          className="border-border focus:border-border focus:ring-border"
                          value={gatewayConfig.secretKey}
                          onChange={(e) => setGatewayConfig({ ...gatewayConfig, secretKey: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Webhook URL</Label>
                        <Input
                          type="text"
                          value={gatewayConfig.webhookUrl}
                          onChange={(e) => setGatewayConfig({ ...gatewayConfig, webhookUrl: e.target.value })}
                          placeholder="https://api.yourdomain.com/webhook"
                          className="border-border focus:border-border focus:ring-border"
                        />
                      </div>
                      <div className="flex items-center space-x-2 py-2">
                        <Checkbox
                          id="defaultGateway"
                          checked={isGatewayEnabled}
                          onCheckedChange={(checked) => setIsGatewayEnabled(checked as boolean)}
                        />
                        <Label htmlFor="defaultGateway" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Use as Default Gateway for All Tenants
                        </Label>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold"
                          onClick={handleSaveGatewayConfig}
                          disabled={updateGatewaySettings.isPending}
                        >
                          {updateGatewaySettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Configuration
                        </Button>
                        <Button variant="outline" className="border-border text-foreground hover:bg-background/50">
                          Test Connection
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tenant Payment Status */}
                  <Card className="border-border bg-background/50">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">Tenant Payment Overview</CardTitle>
                      <p className="text-sm text-muted-foreground">Monitor payment status and integration setup for all tenants.</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                          <div>
                            <p className="font-medium text-foreground">Active Integrations</p>
                            <p className="text-sm text-muted-foreground">Tenants with working payment setup</p>
                          </div>
                          <Badge variant="default" className="bg-green-500/20 text-green-700 border-green-500/50 font-medium">
                            {tenantProfiles.filter(p => p.payment_link).length}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                          <div>
                            <p className="font-medium text-foreground">Pending Setup</p>
                            <p className="text-sm text-muted-foreground">Tenants without payment integration</p>
                          </div>
                          <Badge variant="default" className="bg-orange-500/20 text-orange-700 border-orange-500/50 font-medium">
                            {tenantProfiles.filter(p => !p.payment_link).length}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                          <div>
                            <p className="font-medium text-foreground">Manual Payments</p>
                            <p className="text-sm text-muted-foreground">Tenants using manual payment method</p>
                          </div>
                          <Badge variant="default" className="bg-blue-500/20 text-blue-700 border-blue-500/50 font-medium">
                            {tenantProfiles.filter(p => p.is_paid && !p.payment_link).length}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Tenant Payment Details */}
                <div className="mt-6">
                  <Card className="border-border bg-background/50">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">Tenant Payment Details</CardTitle>
                      <p className="text-sm text-muted-foreground">Detailed view of payment integration status for each tenant.</p>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="font-semibold text-muted-foreground">Business Name</TableHead>
                              <TableHead className="font-semibold text-muted-foreground">Payment Gateway</TableHead>
                              <TableHead className="font-semibold text-muted-foreground">Integration Status</TableHead>
                              <TableHead className="font-semibold text-muted-foreground">Last Payment</TableHead>
                              <TableHead className="font-semibold text-muted-foreground">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tenantProfiles.map((profile) => (
                              <TableRow key={profile.id} className="hover:bg-background/50 transition-colors">
                                <TableCell className="font-medium text-foreground">{profile.business_name}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="bg-background/50 text-foreground border-border">
                                    {profile.payment_link ? 'Razorpay' : 'Manual'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={profile.payment_link ? 'default' : 'destructive'}
                                    className={`${profile.payment_link ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'} font-medium`}
                                  >
                                    {profile.payment_link ? 'Active' : 'Not Configured'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {profile.subscription_expiry ? formatDate(new Date(profile.subscription_expiry)) : '—'}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Dialog
                                      open={editingPaymentLink === profile.id}
                                      onOpenChange={(open) => {
                                        if (!open) setEditingPaymentLink(null);
                                        else {
                                          setEditingPaymentLink(profile.id);
                                          setNewPaymentLink(profile.payment_link || '');
                                        }
                                      }}
                                    >
                                      <DialogTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="border-blue-500/50 text-blue-600 hover:bg-blue-500/10"
                                        >
                                          Configure
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Configure Payment Link</DialogTitle>
                                          <DialogDescription>Set a payment link for {profile.business_name} to enable subscription payments.</DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <div className="space-y-2">
                                            <Label htmlFor="paymentLink" className="text-sm font-medium">Payment Link</Label>
                                            <Input
                                              id="paymentLink"
                                              value={newPaymentLink}
                                              onChange={(e) => setNewPaymentLink(e.target.value)}
                                              placeholder="https://razorpay.me/your-link"
                                              className="border-border focus:border-border focus:ring-border"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                              This link will be used when users click "Subscribe Now" in the Pricing page
                                            </p>
                                          </div>
                                          <div className="flex gap-2">
                                            <Button
                                              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold"
                                              onClick={() => handleSavePaymentLink(profile.id)}
                                              disabled={updatePaymentLink.isPending}
                                            >
                                              {updatePaymentLink.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                              Save Payment Link
                                            </Button>
                                            <Button
                                              variant="outline"
                                              onClick={() => {
                                                setNewPaymentLink('https://wa.me/971501234567?text=I%20want%20to%20subscribe%20to%20MessFlow');
                                              }}
                                              className="border-border text-foreground hover:bg-background/50"
                                            >
                                              Use Default WhatsApp
                                            </Button>
                                          </div>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        if (profile.payment_link) {
                                          window.open(profile.payment_link, '_blank');
                                        } else {
                                          toast.error('No payment link configured for this tenant');
                                        }
                                      }}
                                      className="border-green-500/50 text-green-600 hover:bg-green-500/10"
                                    >
                                      Test Payment Link
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admins" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Super Admin
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Assistant Super Admin</DialogTitle>
                    <DialogDescription>Grant super admin privileges to another user.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddSuperAdmin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="adminEmail" className="text-muted-foreground font-medium">User Email</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="user@example.com"
                        required
                        className="border-border focus:border-border focus:ring-border"
                      />
                      <p className="text-xs text-muted-foreground">
                        The user must have already signed up to be added as a super admin.
                      </p>
                    </div>
                    <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold" disabled={addSuperAdmin.isPending}>
                      {addSuperAdmin.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Add Super Admin
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="backdrop-blur-xl border-border bg-card/80 hover:shadow-lg hover:shadow-glass transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 font-semibold text-foreground">
                  <Shield className="h-5 w-5 text-primary" />
                  Super Administrators
                </CardTitle>
              </CardHeader>
              <CardContent>
                {superAdminsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : superAdmins.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No super admins found.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold text-muted-foreground">Email</TableHead>
                        <TableHead className="font-semibold text-muted-foreground">Added On</TableHead>
                        <TableHead className="text-right font-semibold text-muted-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {superAdmins.map((admin) => (
                        <TableRow key={admin.id} className="hover:bg-background/50 transition-colors">
                          <TableCell className="font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-primary" />
                              {admin.email}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(new Date(admin.created_at))}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setRemoveAdminId(admin.id)}
                              disabled={removeSuperAdmin.isPending}
                              className="hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== API & SERVICES TAB ===== */}
          <TabsContent value="api-services" className="mt-4 space-y-4">
            <Card className="backdrop-blur-xl border-border bg-card/80">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Platform API Configuration
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure API keys that are shared across all tenants. Users won't need to set these up individually.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Google OAuth (for Google Drive) */}
                  <Card className="border-border bg-background/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Cloud className="h-4 w-4 text-blue-500" />
                        Google OAuth (Drive)
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">Enables Google Drive storage for tenant uploads</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Client ID</Label>
                        <Input
                          type={showSecrets['google_client_id'] ? 'text' : 'password'}
                          value={apiConfig.google_client_id}
                          onChange={(e) => setApiConfig({ ...apiConfig, google_client_id: e.target.value })}
                          placeholder="xxxx.apps.googleusercontent.com"
                          className="text-sm h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Client Secret</Label>
                        <Input
                          type={showSecrets['google_client_secret'] ? 'text' : 'password'}
                          value={apiConfig.google_client_secret}
                          onChange={(e) => setApiConfig({ ...apiConfig, google_client_secret: e.target.value })}
                          placeholder="GOCSPX-xxxx"
                          className="text-sm h-9"
                        />
                      </div>
                      <div className="p-2 bg-muted/30 rounded text-[10px] text-muted-foreground">
                        <p className="font-medium mb-1">Setup:</p>
                        <ol className="list-decimal list-inside space-y-0.5">
                          <li>Go to console.cloud.google.com</li>
                          <li>Create project → Enable Drive API</li>
                          <li>OAuth consent screen → External</li>
                          <li>Credentials → OAuth Client ID → Web app</li>
                          <li>Add redirect URI: {typeof window !== 'undefined' ? window.location.origin : ''}/auth/google/callback</li>
                        </ol>
                      </div>
                      <Badge variant={apiConfig.google_client_id ? 'default' : 'secondary'} className="text-xs">
                        {apiConfig.google_client_id ? 'Configured' : 'Not configured'}
                      </Badge>
                    </CardContent>
                  </Card>

                  {/* Google Maps */}
                  <Card className="border-border bg-background/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-green-500" />
                        Google Maps
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">Enables zone polygon drawing + geocoding for all tenants</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">API Key</Label>
                        <Input
                          type={showSecrets['google_maps_key'] ? 'text' : 'password'}
                          value={apiConfig.google_maps_key}
                          onChange={(e) => setApiConfig({ ...apiConfig, google_maps_key: e.target.value })}
                          placeholder="AIzaSy..."
                          className="text-sm h-9"
                        />
                      </div>
                      <div className="p-2 bg-muted/30 rounded text-[10px] text-muted-foreground">
                        <p className="font-medium mb-1">Required APIs (enable in Google Cloud Console):</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          <li>Maps JavaScript API</li>
                          <li>Geocoding API</li>
                          <li>Maps Embed API</li>
                          <li>Drawing Library (for polygon zones)</li>
                        </ul>
                      </div>
                      <Badge variant={apiConfig.google_maps_key ? 'default' : 'secondary'} className="text-xs">
                        {apiConfig.google_maps_key ? 'Configured' : 'Not configured'}
                      </Badge>
                    </CardContent>
                  </Card>

                  {/* Cloudinary */}
                  <Card className="border-border bg-background/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-purple-500" />
                        Cloudinary
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">Image/receipt upload storage (current default)</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Cloud Name</Label>
                        <Input
                          value={apiConfig.cloudinary_cloud_name}
                          onChange={(e) => setApiConfig({ ...apiConfig, cloudinary_cloud_name: e.target.value })}
                          placeholder="your-cloud-name"
                          className="text-sm h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Upload Preset (Unsigned)</Label>
                        <Input
                          value={apiConfig.cloudinary_upload_preset}
                          onChange={(e) => setApiConfig({ ...apiConfig, cloudinary_upload_preset: e.target.value })}
                          placeholder="your-preset-name"
                          className="text-sm h-9"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">Falls back to .env values if empty</p>
                      <Badge variant={apiConfig.cloudinary_cloud_name ? 'default' : 'secondary'} className="text-xs">
                        {apiConfig.cloudinary_cloud_name ? 'Configured' : 'Using .env defaults'}
                      </Badge>
                    </CardContent>
                  </Card>

                  {/* WhatsApp Business */}
                  <Card className="border-border bg-background/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-green-600" />
                        WhatsApp Business API
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">Platform-wide WhatsApp messaging token</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Permanent Token</Label>
                        <Input
                          type={showSecrets['whatsapp_api_token'] ? 'text' : 'password'}
                          value={apiConfig.whatsapp_api_token}
                          onChange={(e) => setApiConfig({ ...apiConfig, whatsapp_api_token: e.target.value })}
                          placeholder="EAAxxxxxxx..."
                          className="text-sm h-9"
                        />
                      </div>
                      <div className="p-2 bg-muted/30 rounded text-[10px] text-muted-foreground">
                        <p className="font-medium mb-1">Setup:</p>
                        <ol className="list-decimal list-inside space-y-0.5">
                          <li>Go to developers.facebook.com</li>
                          <li>Create app → WhatsApp Business</li>
                          <li>Generate permanent token</li>
                        </ol>
                      </div>
                      <Badge variant={apiConfig.whatsapp_api_token ? 'default' : 'secondary'} className="text-xs">
                        {apiConfig.whatsapp_api_token ? 'Configured' : 'Not configured'}
                      </Badge>
                    </CardContent>
                  </Card>

                </div>

                {/* Storage Provider Toggle */}
                <div className="mt-6 p-4 border border-border rounded-lg bg-background/50">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium">Default Storage Provider</p>
                      <p className="text-xs text-muted-foreground">Choose where tenant uploads are stored</p>
                    </div>
                    <select
                      className="p-2 border border-border rounded-md bg-card text-sm"
                      value={apiConfig.storage_provider}
                      onChange={(e) => setApiConfig({ ...apiConfig, storage_provider: e.target.value })}
                    >
                      <option value="cloudinary">Cloudinary (Default)</option>
                      <option value="google_drive">Google Drive (per-user)</option>
                    </select>
                  </div>
                  {apiConfig.storage_provider === 'google_drive' && !apiConfig.google_client_id && (
                    <p className="text-xs text-amber-500 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Configure Google OAuth above before enabling Google Drive
                    </p>
                  )}
                </div>

                {/* Save Button */}
                <div className="mt-6 flex gap-3">
                  <Button
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold"
                    onClick={() => updatePlatformApiConfig.mutateAsync(apiConfig)}
                    disabled={updatePlatformApiConfig.isPending}
                  >
                    {updatePlatformApiConfig.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save All API Configuration
                  </Button>
                </div>

                {/* Connection Status Summary */}
                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Service Status</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className={`h-2 w-2 rounded-full ${apiConfig.google_client_id ? 'bg-green-500' : 'bg-gray-300'}`} />
                      Google Drive
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className={`h-2 w-2 rounded-full ${apiConfig.google_maps_key ? 'bg-green-500' : 'bg-gray-300'}`} />
                      Google Maps
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className={`h-2 w-2 rounded-full ${apiConfig.cloudinary_cloud_name ? 'bg-green-500' : 'bg-amber-500'}`} />
                      Cloudinary {!apiConfig.cloudinary_cloud_name && '(.env)'}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className={`h-2 w-2 rounded-full ${apiConfig.whatsapp_api_token ? 'bg-green-500' : 'bg-gray-300'}`} />
                      WhatsApp
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>

      {/* Delete Promo Code Confirmation */}
      <AlertDialog open={!!deletePromoId} onOpenChange={() => setDeletePromoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Promo Code?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this promo code and all its assignments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletePromoId) deletePromoCode.mutate(deletePromoId);
                setDeletePromoId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Super Admin Confirmation */}
      <AlertDialog open={!!removeAdminId} onOpenChange={() => setRemoveAdminId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Super Admin?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove super admin privileges from this user. They will no longer be able to access the admin panel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeAdminId) removeSuperAdmin.mutate(removeAdminId);
                setRemoveAdminId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SuperAdminLayout>
  );
}
