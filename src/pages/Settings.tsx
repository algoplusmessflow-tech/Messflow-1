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
  RefreshCw
} from 'lucide-react';
import { generateSlug } from '@/lib/slug';
import { CompanyLogoUpload } from '@/components/CompanyLogoUpload';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { generateExpenseReport } from '@/lib/pdf-generator';

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
      setWhatsappApiKey(profile.whatsapp_api_key || '');
      setCompanyAddress((profile as any).company_address || '');
      setCurrency(((profile as any).currency || 'AED') as CurrencyCode);
      
      const appUrl = import.meta.env.VITE_APP_URL || 'https://messflow.app';
      const businessSlug = (profile as any).business_slug || generateSlug(profile.business_name);
      
      if (profile.user_id) {
        setCustomerPortalLink(`${appUrl}/customer/${profile.user_id}`);
        setDriverPortalLink(`${appUrl}/driver/${profile.user_id}`);
        setSlug(businessSlug);
        setSlugBasedCustomerLink(`${appUrl}/${businessSlug}/customer`);
        setSlugBasedDriverLink(`${appUrl}/${businessSlug}/driver`);
        setSlugBasedRegisterLink(`${appUrl}/${businessSlug}/register`);
        setSalesPortalLink(`${appUrl}/${businessSlug}/sales`);
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
            <div className="grid gap-4 md:grid-cols-2">
              <GlassCard>
                <GlassCardHeader>
                  <GlassCardTitle className="text-lg flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Globe className="h-5 w-5 text-green-500" />
                    </div>
                    Customer Portal
                  </GlassCardTitle>
                  <GlassCardDescription>
                    Share with customers to manage their subscriptions
                  </GlassCardDescription>
                </GlassCardHeader>
                <GlassCardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Registration & Portal URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={customerPortalLink}
                        readOnly
                        className="bg-muted/50 font-mono text-sm"
                        placeholder="Loading..."
                      />
                      <Button onClick={handleCopyCustomerLink} variant="outline" size="icon">
                        {copiedCustomerLink ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">What customers can do:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-green-500" /> View subscription status
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-green-500" /> Track delivery history
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-green-500" /> Access invoices
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-green-500" /> Pause/resume meals
                      </li>
                    </ul>
                  </div>
                </GlassCardContent>
              </GlassCard>

              <GlassCard>
                <GlassCardHeader>
                  <GlassCardTitle className="text-lg flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <Truck className="h-5 w-5 text-orange-500" />
                    </div>
                    Driver Portal
                  </GlassCardTitle>
                  <GlassCardDescription>
                    Drivers access their delivery assignments
                  </GlassCardDescription>
                </GlassCardHeader>
                <GlassCardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Driver Access URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={driverPortalLink}
                        readOnly
                        className="bg-muted/50 font-mono text-sm"
                        placeholder="Loading..."
                      />
                      <Button onClick={handleCopyDriverLink} variant="outline" size="icon">
                        {copiedDriverLink ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">How drivers use it:</p>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Share link with your drivers</li>
                      <li>Driver enters unique access code</li>
                      <li>Access assigned deliveries</li>
                      <li>Update delivery status</li>
                    </ol>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Get access codes from <span className="font-medium">Delivery → Drivers</span>
                  </p>
                </GlassCardContent>
              </GlassCard>
            </div>

            {/* Slug-based Links Section */}
            <GlassCard className="border-primary/20">
              <GlassCardHeader>
                <GlassCardTitle className="text-lg flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Link2 className="h-5 w-5 text-primary" />
                  </div>
                  Owner-Scoped Portal Links
                </GlassCardTitle>
                <GlassCardDescription>
                  New URL format with your business name - more shareable and memorable
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
            <div className="grid gap-4 md:grid-cols-2">
              <GlassCard>
                <GlassCardHeader>
                  <GlassCardTitle className="text-lg flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10">
                      <HardDrive className="h-5 w-5 text-cyan-500" />
                    </div>
                    Storage Overview
                  </GlassCardTitle>
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
              </GlassCard>

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
          </TabsContent>
        </Tabs>

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
      </div>
    </AppLayout>
  );
}
