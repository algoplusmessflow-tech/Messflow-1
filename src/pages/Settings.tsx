import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProfile } from '@/hooks/useProfile';
import { useExpenses } from '@/hooks/useExpenses';
import { useStorageManager } from '@/hooks/useStorageManager';
import { formatDate } from '@/lib/format';
import { GCC_CURRENCIES, CurrencyCode } from '@/lib/currencies';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Building2, 
  Receipt, 
  HardDrive, 
  Trash2, 
  Download,
  AlertTriangle,
  Cloud,
  MessageCircle,
  Eye,
  EyeOff,
  Wallet,
  Globe,
  Link2,
  Truck,
  Copy,
  Check,
  Percent,
  FileCheck,
  BarChart3,
  Zap,
  KeyRound,
  Info,
  Users,
  MapPin,
  RefreshCw,
  UtensilsCrossed,
  Loader2
} from 'lucide-react';
import { generateSlug } from '@/lib/slug';
// Google Drive functions are dynamically imported in GoogleDriveCard
import { CompanyLogoUpload } from '@/components/CompanyLogoUpload';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { generateExpenseReport } from '@/lib/pdf-generator';

// Helper to format bytes
function fmtBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const s = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + s[i];
}

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

// Google Account + Drive connection card with real-time storage quota
function GoogleDriveCard({ userId }: { userId: string }) {
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [driveEnabled, setDriveEnabled] = useState(false);
  const [checking, setChecking] = useState(true);
  const [enabling, setEnabling] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [googleAvatar, setGoogleAvatar] = useState<string | null>(null);
  const [driveQuota, setDriveQuota] = useState<{ used: number; total: number; email: string } | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [lastBackupUrl, setLastBackupUrl] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) { setChecking(false); return; }
    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const hasToken = !!session?.provider_token;
        const isGoogleUser = session?.user?.app_metadata?.provider === 'google';
        setGoogleAvailable(hasToken || isGoogleUser);
        if (isGoogleUser || hasToken) {
          setGoogleEmail(session?.user?.email || null);
          setGoogleAvatar(session?.user?.user_metadata?.avatar_url || null);
        }
        const gd = await import('@/lib/google-drive');
        const connected = await gd.isGoogleDriveConnected(userId);
        // Auto-enable Drive for Google users
        if ((isGoogleUser || hasToken) && !connected) {
          await gd.enableGoogleDrive(userId);
          setDriveEnabled(true);
        } else {
          setDriveEnabled(connected);
        }
        // Fetch real-time Drive quota
        if (hasToken) {
          const quota = await gd.getGoogleDriveStorageInfo();
          if (quota) setDriveQuota(quota);
        }
      } catch {}
      setChecking(false);
    };
    check();
  }, [userId]);

  const handleEnable = async () => {
    setEnabling(true);
    try {
      const { enableGoogleDrive } = await import('@/lib/google-drive');
      await enableGoogleDrive(userId);
      setDriveEnabled(true);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Google Drive enabled!');
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    finally { setEnabling(false); }
  };

  const handleDisable = async () => {
    try {
      const { disconnectGoogleDrive } = await import('@/lib/google-drive');
      await disconnectGoogleDrive(userId);
      setDriveEnabled(false);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Switched to default storage.');
    } catch {}
  };

  const handleConnectGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: { access_type: 'offline', prompt: 'consent' },
        scopes: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets',
        redirectTo: `${window.location.origin}/settings`,
      },
    });
    if (error) toast.error(error.message);
  };

  const handleSwitchAccount = async () => {
    // Re-auth with Google, forcing account picker
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: { access_type: 'offline', prompt: 'select_account consent' },
        scopes: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets',
        redirectTo: `${window.location.origin}/settings`,
      },
    });
    if (error) toast.error(error.message);
  };

  const handleDisconnectGoogle = async () => {
    try {
      const { disconnectGoogleDrive } = await import('@/lib/google-drive');
      await disconnectGoogleDrive(userId);
    } catch {}
    setDriveEnabled(false);
    setGoogleAvailable(false);
    setGoogleEmail(null);
    setGoogleAvatar(null);
    setDriveQuota(null);
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    toast.success('Google account disconnected.');
  };

  // Check for existing backup sheet URL
  useEffect(() => {
    if (!userId || !driveEnabled) return;
    import('@/lib/google-sheets-backup').then((m) => m.getBackupSheetUrl(userId)).then(setLastBackupUrl).catch(() => {});
  }, [userId, driveEnabled]);

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const { backupMembersToSheets } = await import('@/lib/google-sheets-backup');
      const result = await backupMembersToSheets(userId);
      setLastBackupUrl(result.spreadsheetUrl);
      toast.success(`Backed up ${result.memberCount} members to Google Sheets!`);
    } catch (err: any) {
      toast.error(err.message || 'Backup failed');
    } finally { setBackingUp(false); }
  };

  if (checking) return null;

  // Not connected to Google
  if (!googleAvailable) {
    return (
      <GlassCard className="border-blue-500/20">
        <GlassCardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10"><GoogleIcon /></div>
              <div>
                <p className="font-medium text-sm">Connect Google Account</p>
                <p className="text-xs text-muted-foreground">Sign in with Google to enable Drive uploads (15GB free)</p>
              </div>
            </div>
            <Button size="sm" onClick={handleConnectGoogle} className="text-xs gap-1.5">
              <GoogleIcon /> Connect Google
            </Button>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  // Connected to Google
  const drivePercent = driveQuota ? Math.min((driveQuota.used / driveQuota.total) * 100, 100) : 0;
  const driveFull = drivePercent > 90;

  return (
    <GlassCard className={driveEnabled ? 'border-green-500/30' : 'border-primary/20'}>
      <GlassCardContent className="p-4 space-y-3">
        {/* Google Account Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {googleAvatar ? (
              <img src={googleAvatar} alt="" className="w-9 h-9 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="p-2 rounded-full bg-primary/10"><GoogleIcon /></div>
            )}
            <div>
              <p className="font-medium text-sm flex items-center gap-1.5">
                Google Connected
                <Check className="h-3.5 w-3.5 text-green-500" />
              </p>
              {googleEmail && <p className="text-xs text-muted-foreground">{googleEmail}</p>}
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={handleSwitchAccount} className="text-xs text-muted-foreground" title="Switch to a different Google account">
              Switch
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDisconnectGoogle} className="text-xs text-muted-foreground hover:text-destructive">
              Sign Out
            </Button>
          </div>
        </div>

        {/* Drive Storage Quota — real-time from Google API */}
        {driveQuota && driveEnabled && (
          <div className="space-y-2 p-3 rounded-lg bg-muted/30 border">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Google Drive Storage</span>
              <span className="font-mono font-medium">{fmtBytes(driveQuota.used)} / {fmtBytes(driveQuota.total)}</span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${driveFull ? 'bg-destructive' : drivePercent > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${drivePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{drivePercent.toFixed(1)}% used</span>
              <span>{fmtBytes(driveQuota.total - driveQuota.used)} free</span>
            </div>
            {driveFull && (
              <p className="text-[10px] text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Drive is almost full. Switch account or free up space.
              </p>
            )}
          </div>
        )}

        {/* Drive Status */}
        <div className="flex items-center gap-2 p-3 rounded-lg border border-green-500/30 bg-green-500/5">
          <Cloud className="h-4 w-4 text-green-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">Google Drive Active</p>
            <p className="text-[10px] text-muted-foreground">All uploads and backups go to your Google Drive</p>
          </div>
          <Check className="h-4 w-4 text-green-500" />
        </div>

        {/* Google Sheets Backup — only shown when Drive is active */}
        {driveEnabled && (
          <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <div>
                  <p className="text-sm font-medium">Data Backup to Sheets</p>
                  <p className="text-[10px] text-muted-foreground">Export members, menu & expenses to Google Sheets</p>
                </div>
              </div>
              <Button size="sm" onClick={handleBackup} disabled={backingUp} className="text-xs h-7">
                {backingUp ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Download className="h-3 w-3 mr-1" />}
                {backingUp ? 'Backing up...' : 'Backup Now'}
              </Button>
            </div>
            {lastBackupUrl && (
              <a
                href={lastBackupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-primary hover:underline flex items-center gap-1"
              >
                <Globe className="h-3 w-3" /> Open backup spreadsheet
              </a>
            )}
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { expenses } = useExpenses();
  const { storageUsed, storageLimit, formatBytes, deleteOldReceipts } = useStorageManager();
  const queryClient = useQueryClient();

  // Tax settings
  const [taxName, setTaxName] = useState('VAT');
  const [taxRate, setTaxRate] = useState('5');
  const [taxTrn, setTaxTrn] = useState('');
  const [saving, setSaving] = useState(false);

  // Company settings
  const [companyAddress, setCompanyAddress] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('AED');
  const [savingCompany, setSavingCompany] = useState(false);

  // Map API
  const [mapApiKey, setMapApiKey] = useState('');
  const [showMapApiKey, setShowMapApiKey] = useState(false);
  const [savingMapApi, setSavingMapApi] = useState(false);
  const [mapProvider, setMapProvider] = useState('');
  const [customMapBaseUrl, setCustomMapBaseUrl] = useState('');

  // WhatsApp API
  const [whatsappApiKey, setWhatsappApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);

  // Audit report
  const [reportFromDate, setReportFromDate] = useState('');
  const [reportToDate, setReportToDate] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);

  // Cleanup dialog
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [cleanupDate, setCleanupDate] = useState('');
  const [cleaning, setCleaning] = useState(false);

  // Customer Portal Link
  const [customerPortalLink, setCustomerPortalLink] = useState('');
  const [copiedCustomerLink, setCopiedCustomerLink] = useState(false);

  // Driver Access Link
  const [driverPortalLink, setDriverPortalLink] = useState('');
  const [copiedDriverLink, setCopiedDriverLink] = useState(false);

  // Sales Portal Link
  const [salesPortalLink, setSalesPortalLink] = useState('');
  const [copiedSalesLink, setCopiedSalesLink] = useState(false);

  // Kitchen Portal Link
  const [kitchenPortalLink, setKitchenPortalLink] = useState('');
  const [copiedKitchenLink, setCopiedKitchenLink] = useState(false);

  // Slug-based Links
  const [slugBasedCustomerLink, setSlugBasedCustomerLink] = useState('');
  const [slugBasedDriverLink, setSlugBasedDriverLink] = useState('');
  const [slugBasedRegisterLink, setSlugBasedRegisterLink] = useState('');
  const [slug, setSlug] = useState('');

  // Invoice Settings
  const [invoicePrefix, setInvoicePrefix] = useState('INV');
  const [invoiceCompanyAddress, setInvoiceCompanyAddress] = useState('');
  const [invoiceFooter, setInvoiceFooter] = useState('');
  const [savingInvoiceSettings, setSavingInvoiceSettings] = useState(false);

  // Initialize from profile
  useEffect(() => {
    if (profile) {
      setTaxName(profile.tax_name || 'VAT');
      setTaxRate(profile.tax_rate?.toString() || '5');
      setTaxTrn(profile.tax_trn || '');
      setWhatsappApiKey((profile as any).whatsapp_api_key || '');
      setMapApiKey((profile as any).map_api_key || ''); // load map key
      setMapProvider((profile as any).map_api_provider || ''); // load provider
      setCustomMapBaseUrl((profile as any).custom_map_base_url || ''); // load custom base url
      setCompanyAddress((profile as any).company_address || '');
      setCurrency(((profile as any).currency || 'AED') as CurrencyCode);
      
      const appUrl = window.location.origin;
      const businessSlug = (profile as any).business_slug || generateSlug(profile.business_name);
      
      // Auto-save slug to DB if not yet persisted
      if (!(profile as any).business_slug && businessSlug && profile.user_id) {
        supabase
          .from('profiles')
          .update({ business_slug: businessSlug } as any)
          .eq('user_id', profile.user_id)
          .then(() => {});
      }

      if (profile.user_id) {
        setCustomerPortalLink(`${appUrl}/customer/${profile.user_id}`);
        setDriverPortalLink(`${appUrl}/driver/${profile.user_id}`);
        setSlug(businessSlug);
        setSlugBasedCustomerLink(`${appUrl}/${businessSlug}/customer`);
        setSlugBasedDriverLink(`${appUrl}/${businessSlug}/driver`);
        setSlugBasedRegisterLink(`${appUrl}/${businessSlug}/register`);
        setSalesPortalLink(`${appUrl}/${businessSlug}/sales`);
        setKitchenPortalLink(`${appUrl}/${businessSlug}/kitchen`);
      }
    }
  }, [profile]);

  useEffect(() => {
    const fetchInvoiceSettings = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('invoice_settings')
        .select('*')
        .eq('owner_id', user.id)
        .single();
      
      if (data) {
        setInvoicePrefix(data.invoice_prefix || 'INV');
        setInvoiceCompanyAddress(data.company_address || '');
        setInvoiceFooter((profile as any)?.company_address || '');
      }
    };
    fetchInvoiceSettings();
  }, [user, profile]);

  const saveTaxSettings = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          tax_name: taxName,
          tax_rate: parseFloat(taxRate) || 5,
          tax_trn: taxTrn || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Tax settings saved!');
    } catch (error: any) {
      toast.error('Failed to save settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const saveCompanySettings = async () => {
    if (!user) return;
    setSavingCompany(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          company_address: companyAddress || null,
          currency: currency,
        } as any)
        .eq('user_id', user.id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Company settings saved!');
    } catch (error: any) {
      toast.error('Failed to save settings: ' + error.message);
    } finally {
      setSavingCompany(false);
    }
  };

  const saveMapSettings = async () => {
    if (!user) return;
    setSavingMapApi(true);
    try {
      const updates: Record<string, any> = {
        map_api_key: mapApiKey || null,
        map_api_provider: mapProvider || null,
        custom_map_base_url: mapProvider === 'custom' ? customMapBaseUrl || null : null,
      };
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        if (error.message?.includes('column') || error.code === 'PGRST204') {
          toast.error('Please run the migration: supabase/migrations/20260318_api_integration_columns.sql');
        } else {
          throw error;
        }
      } else {
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        toast.success('Map API settings saved!');
      }
    } catch (error: any) {
      toast.error('Failed to save settings: ' + error.message);
    } finally {
      setSavingMapApi(false);
    }
  };
  const saveWhatsappSettings = async () => {
    if (!user) return;
    setSavingWhatsapp(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          whatsapp_api_key: whatsappApiKey || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('WhatsApp API key saved!');
    } catch (error: any) {
      toast.error('Failed to save settings: ' + error.message);
    } finally {
      setSavingWhatsapp(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!reportFromDate || !reportToDate) {
      toast.error('Please select both From and To dates');
      return;
    }

    const fromDate = new Date(reportFromDate);
    const toDate = new Date(reportToDate);
    
    if (fromDate > toDate) {
      toast.error('From date must be before To date');
      return;
    }

    setGeneratingReport(true);
    try {
      const filteredExpenses = expenses.filter((e) => {
        const expDate = new Date(e.date);
        return expDate >= fromDate && expDate <= toDate;
      });

      if (filteredExpenses.length === 0) {
        toast.error('No expenses found in selected date range');
        return;
      }

      await generateExpenseReport(filteredExpenses, fromDate, toDate, profile?.business_name || 'MessFlow');
      toast.success('Expense report downloaded!');
    } catch (error: any) {
      toast.error('Failed to generate report: ' + error.message);
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleCleanup = async () => {
    if (!cleanupDate) {
      toast.error('Please select a date');
      return;
    }

    setCleaning(true);
    try {
      await deleteOldReceipts(new Date(cleanupDate));
      setCleanupOpen(false);
      setCleanupDate('');
      toast.success('Old receipts deleted successfully!');
    } catch (error: any) {
      toast.error('Failed to delete receipts: ' + error.message);
    } finally {
      setCleaning(false);
    }
  };

  const storagePercentage = storageLimit > 0 ? (storageUsed / storageLimit) * 100 : 0;

  const handleCopyCustomerLink = async () => {
    try {
      await navigator.clipboard.writeText(customerPortalLink);
      setCopiedCustomerLink(true);
      toast.success('Customer portal link copied!');
      setTimeout(() => setCopiedCustomerLink(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleCopyDriverLink = async () => {
    try {
      await navigator.clipboard.writeText(driverPortalLink);
      setCopiedDriverLink(true);
      toast.success('Driver access link copied!');
      setTimeout(() => setCopiedDriverLink(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleCopySlugCustomerLink = async () => {
    try {
      await navigator.clipboard.writeText(slugBasedCustomerLink);
      toast.success('Slug-based customer link copied!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleCopySlugDriverLink = async () => {
    try {
      await navigator.clipboard.writeText(slugBasedDriverLink);
      toast.success('Slug-based driver link copied!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleCopySlugRegisterLink = async () => {
    try {
      await navigator.clipboard.writeText(slugBasedRegisterLink);
      toast.success('Customer registration link copied!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleCopyKitchenLink = async () => {
    try {
      await navigator.clipboard.writeText(kitchenPortalLink);
      setCopiedKitchenLink(true);
      toast.success('Kitchen portal link copied!');
      setTimeout(() => setCopiedKitchenLink(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleCopySalesLink = async () => {
    try {
      await navigator.clipboard.writeText(salesPortalLink);
      toast.success('Sales portal link copied!');
      setTimeout(() => setCopiedSalesLink(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const saveInvoiceSettings = async () => {
    if (!user) return;
    setSavingInvoiceSettings(true);
    try {
      const { error } = await supabase
        .from('invoice_settings')
        .upsert({
          owner_id: user.id,
          invoice_prefix: invoicePrefix,
          company_address: invoiceCompanyAddress,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'owner_id' });

      if (error) throw error;
      toast.success('Invoice settings saved!');
    } catch (error: any) {
      toast.error('Failed to save settings: ' + error.message);
    } finally {
      setSavingInvoiceSettings(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your mess settings and data</p>
          </div>
        </div>

        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="backdrop-blur-xl bg-card/80 border border-border flex-wrap h-auto p-1">
            <TabsTrigger value="company" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Business</span>
            </TabsTrigger>
            <TabsTrigger value="portals" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Portals</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary gap-2">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Billing</span>
            </TabsTrigger>
            <TabsTrigger value="tax" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary gap-2">
              <Percent className="h-4 w-4" />
              <span className="hidden sm:inline">Tax</span>
            </TabsTrigger>
            <TabsTrigger value="storage" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary gap-2">
              <HardDrive className="h-4 w-4" />
              <span className="hidden sm:inline">Storage</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Connect</span>
            </TabsTrigger>
          </TabsList>

          {/* Company/Business Tab */}
          <TabsContent value="company" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <GlassCard className="md:col-span-2">
                <GlassCardHeader>
                  <GlassCardTitle className="text-lg flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    Business Profile
                  </GlassCardTitle>
                  <GlassCardDescription>
                    Your business identity displayed to customers
                  </GlassCardDescription>
                </GlassCardHeader>
                <GlassCardContent className="space-y-6">
                  <CompanyLogoUpload currentLogoUrl={(profile as any)?.company_logo_url} />
                  
                  <div className="space-y-2">
                    <Label>Business Name</Label>
                    <Input
                      value={profile?.business_name || ''}
                      disabled
                      className="bg-muted/50"
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Business name cannot be changed after signup
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Business Address</Label>
                    <Textarea
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      placeholder="Enter your business address for invoices..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GCC_CURRENCIES.map((curr) => (
                          <SelectItem key={curr.code} value={curr.code}>
                            <span className="font-medium">{curr.code}</span>
                            <span className="text-muted-foreground ml-2">- {curr.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={saveCompanySettings} disabled={savingCompany} className="w-full sm:w-auto">
                    {savingCompany ? 'Saving...' : 'Save Changes'}
                  </Button>
                </GlassCardContent>
              </GlassCard>
            </div>
          </TabsContent>

          {/* Portals Tab */}
          <TabsContent value="portals" className="space-y-4">
            {/* Portal Links */}
            <GlassCard className="border-primary/20">
              <GlassCardHeader>
                <GlassCardTitle className="text-lg flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Link2 className="h-5 w-5 text-primary" />
                  </div>
                  Portal Links
                </GlassCardTitle>
                <GlassCardDescription>
                  Share these links with your team and customers
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium">Your slug:</span>
                  <code className="px-2 py-1 bg-primary/10 rounded text-sm font-mono">{slug}</code>
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={() => {
                    navigator.clipboard.writeText(slug);
                    toast.success('Slug copied!');
                  }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Customer Portal (New)</Label>
                    <div className="flex gap-2">
                      <Input
                        value={slugBasedCustomerLink}
                        readOnly
                        className="bg-muted/50 font-mono text-sm"
                      />
                      <Button onClick={handleCopySlugCustomerLink} variant="outline" size="icon">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Driver Portal (New)</Label>
                    <div className="flex gap-2">
                      <Input
                        value={slugBasedDriverLink}
                        readOnly
                        className="bg-muted/50 font-mono text-sm"
                      />
                      <Button onClick={handleCopySlugDriverLink} variant="outline" size="icon">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Customer Registration Link</Label>
                    <div className="flex gap-2">
                      <Input
                        value={slugBasedRegisterLink}
                        readOnly
                        className="bg-muted/50 font-mono text-sm"
                      />
                      <Button onClick={handleCopySlugRegisterLink} variant="outline" size="icon">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Share this link with customers to register themselves
                    </p>
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>

            {/* Sales Portal Section */}
            <GlassCard className="border-blue-500/20">
              <GlassCardHeader>
                <GlassCardTitle className="text-lg flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  Sales Team Portal
                </GlassCardTitle>
                <GlassCardDescription>
                  Manage your sales team and their access
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sales Portal URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={salesPortalLink}
                      readOnly
                      className="bg-muted/50 font-mono text-sm"
                      placeholder="Sales portal link will appear here"
                    />
                    <Button onClick={handleCopySalesLink} variant="outline" size="icon">
                      {copiedSalesLink ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Sales team access:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-500" /> Add and manage their assigned customers
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-500" /> Cannot delete customers directly
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-500" /> Request deletion for owner approval
                    </li>
                  </ul>
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <a href={`/sales`}>
                    <Users className="h-4 w-4 mr-2" />
                    Manage Sales Team
                  </a>
                </Button>
              </GlassCardContent>
            </GlassCard>

            {/* Kitchen Team Portal */}
            <GlassCard className="border-emerald-500/20">
              <GlassCardHeader>
                <GlassCardTitle className="text-lg flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <UtensilsCrossed className="h-5 w-5 text-emerald-500" />
                  </div>
                  Kitchen Team Portal
                </GlassCardTitle>
                <GlassCardDescription>
                  Share with kitchen staff to manage prep and inventory
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Kitchen Portal URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={kitchenPortalLink}
                      readOnly
                      className="bg-muted/50 font-mono text-sm"
                      placeholder="Loading..."
                    />
                    <Button onClick={handleCopyKitchenLink} variant="outline" size="icon">
                      {copiedKitchenLink ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Kitchen team access:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-500" /> View daily kitchen prep summary
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-500" /> Download prep PDF by date
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-500" /> Print delivery sticker labels
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-500" /> Request inventory items
                    </li>
                  </ul>
                </div>
              </GlassCardContent>
            </GlassCard>
          </TabsContent>

          {/* Invoices/Billing Tab */}
          <TabsContent value="invoices" className="space-y-4">
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle className="text-lg flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Receipt className="h-5 w-5 text-blue-500" />
                  </div>
                  Invoice Configuration
                </GlassCardTitle>
                <GlassCardDescription>
                  Customize how your invoices look and are numbered
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Invoice Prefix</Label>
                    <Input
                      value={invoicePrefix}
                      onChange={(e) => setInvoicePrefix(e.target.value)}
                      placeholder="INV"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      e.g., INV-00001, BILL-00001
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Invoice Address</Label>
                  <Textarea
                    value={invoiceCompanyAddress}
                    onChange={(e) => setInvoiceCompanyAddress(e.target.value)}
                    placeholder="Address shown on invoices..."
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Footer Message</Label>
                  <Textarea
                    value={invoiceFooter}
                    onChange={(e) => setInvoiceFooter(e.target.value)}
                    placeholder="Thank you for your business! Payment within 7 days..."
                    rows={2}
                  />
                </div>

                <Button onClick={saveInvoiceSettings} disabled={savingInvoiceSettings}>
                  {savingInvoiceSettings ? 'Saving...' : 'Save Invoice Settings'}
                </Button>
              </GlassCardContent>
            </GlassCard>
          </TabsContent>

          {/* Tax Tab */}
          <TabsContent value="tax" className="space-y-4">
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle className="text-lg flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Percent className="h-5 w-5 text-purple-500" />
                  </div>
                  Tax Configuration
                </GlassCardTitle>
                <GlassCardDescription>
                  Configure VAT/GST settings for invoices and receipts
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tax Name</Label>
                    <Input
                      value={taxName}
                      onChange={(e) => setTaxName(e.target.value)}
                      placeholder="VAT, GST, TAX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      placeholder="5"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tax Registration Number</Label>
                  <Input
                    value={taxTrn}
                    onChange={(e) => setTaxTrn(e.target.value)}
                    placeholder="e.g., 100123456789003"
                  />
                  <p className="text-xs text-muted-foreground">
                    Appears on all generated invoices
                  </p>
                </div>
                <Button onClick={saveTaxSettings} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Tax Settings'}
                </Button>
              </GlassCardContent>
            </GlassCard>
          </TabsContent>

          {/* Storage Tab */}
          <TabsContent value="storage" className="space-y-4">
            {/* Google Drive Connection */}
            <GoogleDriveCard userId={user?.id || ''} />

            <div className="grid gap-4 md:grid-cols-2">
              {/* Cloudinary card — only show if user is NOT using Google Drive */}
              {(profile as any)?.storage_provider !== 'google_drive' && <GlassCard>
                <GlassCardHeader>
                  <GlassCardTitle className="text-lg flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10">
                      <HardDrive className="h-5 w-5 text-cyan-500" />
                    </div>
                    Platform Storage
                  </GlassCardTitle>
                  <GlassCardDescription>
                    Cloudinary storage for receipts and images
                  </GlassCardDescription>
                </GlassCardHeader>
                <GlassCardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Used</span>
                      <span className="font-medium">{formatBytes(storageUsed)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Available</span>
                      <span className="font-medium">{formatBytes(storageLimit)}</span>
                    </div>
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          storagePercentage > 90 ? 'bg-destructive' : 
                          storagePercentage > 70 ? 'bg-yellow-500' : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                      {storagePercentage.toFixed(1)}% used
                    </p>
                  </div>
                </GlassCardContent>
              </GlassCard>}

              <GlassCard>
                <GlassCardHeader>
                  <GlassCardTitle className="text-lg flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/10">
                      <BarChart3 className="h-5 w-5 text-indigo-500" />
                    </div>
                    Export Data
                  </GlassCardTitle>
                  <GlassCardDescription>
                    Download your expense reports
                  </GlassCardDescription>
                </GlassCardHeader>
                <GlassCardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">From</Label>
                      <Input
                        type="date"
                        value={reportFromDate}
                        onChange={(e) => setReportFromDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">To</Label>
                      <Input
                        type="date"
                        value={reportToDate}
                        onChange={(e) => setReportToDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button onClick={handleGenerateReport} disabled={generatingReport} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    {generatingReport ? 'Generating...' : 'Download Report'}
                  </Button>
                </GlassCardContent>
              </GlassCard>
            </div>

            <GlassCard className="border-destructive/20">
              <GlassCardHeader>
                <GlassCardTitle className="text-lg flex items-center gap-3 text-destructive">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  Cleanup
                </GlassCardTitle>
                <GlassCardDescription>
                  Permanently delete old receipt images
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <Button variant="destructive" onClick={() => setCleanupOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Old Receipts
                </Button>
              </GlassCardContent>
            </GlassCard>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-4">
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle className="text-lg flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <MessageCircle className="h-5 w-5 text-green-500" />
                  </div>
                  WhatsApp Business
                </GlassCardTitle>
                <GlassCardDescription>
                  Send automated WhatsApp messages to customers
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="relative">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      value={whatsappApiKey}
                      onChange={(e) => setWhatsappApiKey(e.target.value)}
                      placeholder="Enter your WhatsApp Business API key"
                      className="pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                  <p className="text-sm font-medium">Setup Instructions:</p>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Sign up for WhatsApp Business API (Meta Business Suite or provider)</li>
                    <li>Create an application and generate an API key</li>
                    <li>Copy and paste the key above</li>
                    <li>Save settings to enable messaging</li>
                  </ol>
                </div>

                <Button onClick={saveWhatsappSettings} disabled={savingWhatsapp} className="w-full sm:w-auto">
                  {savingWhatsapp ? 'Saving...' : 'Save WhatsApp Settings'}
                </Button>
              </GlassCardContent>
            </GlassCard>

            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle className="text-lg flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <MapPin className="h-5 w-5 text-blue-500" />
                  </div>
                  Map API
                </GlassCardTitle>
                <GlassCardDescription>
                  Provide a geocoding service API key for delivery zones
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={mapProvider} onValueChange={setMapProvider}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openstreetmap">OpenStreetMap (Nominatim)</SelectItem>
                      <SelectItem value="mapbox">Mapbox</SelectItem>
                      <SelectItem value="here">Here</SelectItem>
                      <SelectItem value="google">Google Maps</SelectItem>
                      <SelectItem value="locationiq">LocationIQ</SelectItem>
                      <SelectItem value="custom">Custom / Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {mapProvider === 'custom' && (
                  <div className="space-y-2">
                    <Label>Base URL</Label>
                    <Input
                      value={customMapBaseUrl}
                      onChange={(e) => setCustomMapBaseUrl(e.target.value)}
                      placeholder="https://api.example.com/geocode"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the base URL for your geocoding service (e.g., https://us1.locationiq.org/v1)
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>{mapProvider === 'custom' ? 'Token / API Key' : 'API Key'}</Label>
                  <div className="relative">
                    <Input
                      type={showMapApiKey ? 'text' : 'password'}
                      value={mapApiKey}
                      onChange={(e) => setMapApiKey(e.target.value)}
                      placeholder={mapProvider === 'custom' ? "Enter your API token" : "Enter your map/geocoding API key"}
                      className="pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowMapApiKey(!showMapApiKey)}
                    >
                      {showMapApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                  <p className="text-sm font-medium">Setup Instructions:</p>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    {mapProvider === 'custom' ? (
                      <>
                        <li>Enter your custom geocoding service base URL above</li>
                        <li>Enter your API token/key</li>
                        <li>Save settings to enable zone address lookup</li>
                      </>
                    ) : mapProvider === 'locationiq' ? (
                      <>
                        <li>Sign up at locationiq.com</li>
                        <li>Get your API token from the dashboard</li>
                        <li>Paste the token above</li>
                        <li>Save settings to enable zone address lookup</li>
                      </>
                    ) : (
                      <>
                        <li>Choose a geocoding provider (e.g., OpenStreetMap, Mapbox, Here)</li>
                        <li>Obtain an API key/token from the provider</li>
                        <li>Paste the key above</li>
                        <li>Save settings to enable zone address lookup</li>
                      </>
                    )}
                  </ol>
                </div>
                <Button onClick={saveMapSettings} disabled={savingMapApi} className="w-full sm:w-auto">
                  {savingMapApi ? 'Saving...' : 'Save Map Settings'}
                </Button>
              </GlassCardContent>
            </GlassCard>
          </TabsContent>

        {/* Cleanup Dialog */}
        <Dialog open={cleanupOpen} onOpenChange={setCleanupOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Delete Old Receipts
              </DialogTitle>
              <DialogDescription>
                This will permanently delete all receipt images uploaded before the selected date.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Warning
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Deleted receipts cannot be recovered. Download your audit report first!
                </p>
              </div>
              <div className="space-y-2">
                <Label>Delete receipts older than</Label>
                <Input
                  type="date"
                  value={cleanupDate}
                  onChange={(e) => setCleanupDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCleanupOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleCleanup} disabled={cleaning}>
                {cleaning ? 'Deleting...' : 'Delete Receipts'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </Tabs>
      </div>
    </AppLayout>
  );
}
