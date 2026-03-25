import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays, subDays } from 'date-fns';
import {
  ChefHat, UtensilsCrossed, Leaf, Beef, ChevronLeft, ChevronRight,
  MapPin, Users, Loader2, Wheat, Printer, Download, Package, User, Calendar, Clock, Eye, ArrowRight, RefreshCw, Smartphone, Monitor, AlertTriangle, Plus, Trash2, CheckCircle
} from 'lucide-react';

type PrepMember = {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  meal_type: string;
  roti_quantity: number;
  rice_type: string;
  dietary_preference: string;
  delivery_area_name: string | null;
  pause_service: boolean;
  skip_weekends: boolean;
  free_trial: boolean;
  plan_type: string;
  monthly_fee: number;
  menu_items?: string[]; // From daily menu
  special_notes?: string | null; // Special instructions
};

type LabelFormat = 'a4' | '4x6' | '4x3' | '3x5' | 'a6' | '3x2' | '4x2' | '2x4' | 'a7' | '2x1.5' | '3.5x1';

export default function KitchenPortal() {
  const { slug } = useParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState('');
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [members, setMembers] = useState<PrepMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printSize, setPrintSize] = useState<LabelFormat>('4x2');
  const [nextDayMenu, setNextDayMenu] = useState<{ breakfast?: string; lunch?: string; dinner?: string } | null>(null);
  const [inventoryItems, setInventoryItems] = useState<{ id: string; name: string; unit: string; available_qty: number }[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [myRequests, setMyRequests] = useState<{ id: string; notes: string; quantity_used: number; inventory_id: string | null; created_at: string; date: string }[]>([]);
  
  // Label content filters
  const [showNameOnLabel, setShowNameOnLabel] = useState(true);
  const [showPhoneOnLabel, setShowPhoneOnLabel] = useState(true);
  const [showMealTypeOnLabel, setShowMealTypeOnLabel] = useState(true);
  const [showRotiOnLabel, setShowRotiOnLabel] = useState(true);
  const [showRiceOnLabel, setShowRiceOnLabel] = useState(true);
  const [showDietOnLabel, setShowDietOnLabel] = useState(true);
  const [showAreaOnLabel, setShowAreaOnLabel] = useState(true);
  const [showTrialOnLabel, setShowTrialOnLabel] = useState(true);
  const [showAddressOnLabel, setShowAddressOnLabel] = useState(false);
  const [showNotesOnLabel, setShowNotesOnLabel] = useState(false);

  // Resolve slug to owner — try business_slug first, then user_id
  useEffect(() => {
    const fetchBusiness = async () => {
      if (!slug) { setLoading(false); return; }
      let result = await supabase.from('profiles').select('business_name, user_id').eq('business_slug', slug).maybeSingle();
      if (!result.data) {
        result = await supabase.from('profiles').select('business_name, user_id').eq('user_id', slug).maybeSingle();
      }
      if (result.data) {
        setBusinessName(result.data.business_name);
        setOwnerId(result.data.user_id);
        setIsAuthenticated(true);
      }
      setLoading(false);
    };
    fetchBusiness();
  }, [slug]);

  // Fetch & subscribe to today's requests for live approval status
  useEffect(() => {
    if (!ownerId) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const fetchRequests = async () => {
      const { data } = await supabase
        .from('inventory_consumption')
        .select('id, notes, quantity_used, inventory_id, created_at, date')
        .eq('owner_id', ownerId)
        .eq('date', dateStr)
        .order('created_at', { ascending: false });
      setMyRequests((data || []).filter((r: any) =>
        r.notes?.includes('Kitchen request') || r.notes?.includes('SPECIAL REQUEST')
      ));
    };

    fetchRequests();

    const channel = supabase
      .channel('requests-status')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'inventory_consumption',
        filter: `owner_id=eq.${ownerId}`,
      }, () => fetchRequests())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [ownerId, selectedDate]);

  // Fetch inventory with real-time updates
  useEffect(() => {
    if (!ownerId) return;
    
    const fetchInventory = async () => {
      setInventoryLoading(true);
      try {
        const { data, error } = await supabase
          .from('inventory')
          .select('id, item_name, unit, quantity')
          .eq('owner_id', ownerId)
          .order('item_name');
        
        if (error) {
          console.error('Inventory fetch error:', error.message, error.code);
          // If table doesn't exist or RLS blocks, show empty state
        } else {
          setInventoryItems((data || []).map((d: any) => ({ 
            id: d.id, 
            name: d.item_name, 
            unit: d.unit || 'pcs', 
            available_qty: d.quantity || 0 
          })));
        }
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Failed to fetch inventory:', error);
      } finally {
        setInventoryLoading(false);
      }
    };

    fetchInventory();

    // Subscribe to real-time inventory changes
    const channel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
          filter: `owner_id=eq.${ownerId}`
        },
        (payload) => {
          console.log('Real-time inventory update:', payload);
          // Refresh inventory on any change
          fetchInventory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ownerId]);

  // Fetch active members for prep
  useEffect(() => {
    if (!ownerId) return;
    const fetchMembers = async () => {
      setMembersLoading(true);
      try {
        const { data, error } = await supabase
          .from('members')
          .select('id, name, phone, address, meal_type, roti_quantity, rice_type, dietary_preference, delivery_area_id, pause_service, skip_weekends, free_trial, plan_type, monthly_fee, special_notes')
          .eq('owner_id', ownerId)
          .eq('status', 'active');
        if (error) throw error;

        const { data: zones } = await supabase.from('delivery_areas').select('id, name').eq('owner_id', ownerId);
        const zoneMap: Record<string, string> = {};
        (zones || []).forEach((z: any) => { zoneMap[z.id] = z.name; });

        // Fetch next day menu preview
        const nextDate = addDays(selectedDate, 1);
        const nextDateStr = format(nextDate, 'yyyy-MM-dd');
        const { data: nextDayData } = await supabase
          .from('menu')
          .select('breakfast, lunch, dinner')
          .eq('owner_id', ownerId)
          .eq('date', nextDateStr)
          .maybeSingle();
        
        setNextDayMenu(nextDayData || null);

        const dayOfWeek = selectedDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        const prepMembers: PrepMember[] = ((data || []) as any[])
          .filter((m) => {
            if (m.pause_service) return false;
            if (m.skip_weekends && isWeekend) return false;
            if (!m.free_trial && (m.monthly_fee || 0) <= 0) return false;
            return true;
          })
          .map((m) => ({
            ...m,
            meal_type: m.meal_type || 'both',
            roti_quantity: m.roti_quantity || 2,
            rice_type: m.rice_type || 'white_rice',
            dietary_preference: m.dietary_preference || 'both',
            delivery_area_name: m.delivery_area_id ? zoneMap[m.delivery_area_id] || null : null,
          }));
        setMembers(prepMembers);
      } catch {
        toast.error('Failed to load prep data');
      } finally {
        setMembersLoading(false);
      }
    };
    fetchMembers();
  }, [ownerId, selectedDate]);

  const mealLabel = (t: string) => {
    const map: Record<string, string> = { lunch: 'L', dinner: 'D', both: 'L+D', breakfast: 'B', breakfast_lunch: 'B+L', all_three: 'B+L+D' };
    return map[t] || t;
  };
  const dietLabel = (d: string) => d === 'veg' ? 'VEG' : d === 'non_veg' ? 'NV' : 'BOTH';

  const summary = {
    total: members.length,
    lunch: members.filter((m) => ['lunch', 'both', 'breakfast_lunch', 'all_three'].includes(m.meal_type)).length,
    dinner: members.filter((m) => ['dinner', 'both', 'all_three'].includes(m.meal_type)).length,
    breakfast: members.filter((m) => ['breakfast', 'breakfast_lunch', 'all_three'].includes(m.meal_type)).length,
    totalRotis: members.reduce((s, m) => s + (m.roti_quantity || 0), 0),
    veg: members.filter((m) => m.dietary_preference === 'veg').length,
    nonVeg: members.filter((m) => m.dietary_preference === 'non_veg').length,
    trial: members.filter((m) => m.free_trial).length,
  };

  // Sticker size configs (width x height in mm)
  const LABEL_SIZES: Record<LabelFormat, { w: string; h: string; cols: number; name: string }> = {
    'a4': { w: '63mm', h: '38mm', cols: 3, name: 'A4 Sheet (3-col)' },
    '4x6': { w: '101mm', h: '152mm', cols: 2, name: '4" × 6" (Standard)' },
    '4x3': { w: '101mm', h: '76mm', cols: 2, name: '4" × 3" (Medium)' },
    '3x5': { w: '76mm', h: '127mm', cols: 2, name: '3" × 5" (Index)' },
    'a6': { w: '105mm', h: '148mm', cols: 2, name: 'A6 (105×148mm)' },
    '3x2': { w: '76mm', h: '50mm', cols: 3, name: '3" × 2" (Badge)' },
    '4x2': { w: '101mm', h: '50mm', cols: 2, name: '4" × 2" (Lg Address)' },
    '2x4': { w: '50mm', h: '101mm', cols: 4, name: '2" × 4" (Small)' },
    'a7': { w: '74mm', h: '105mm', cols: 3, name: 'A7 (74×105mm)' },
    '2x1.5': { w: '50mm', h: '38mm', cols: 4, name: '2" × 1.5" (Sticker)' },
    '3.5x1': { w: '88mm', h: '25mm', cols: 3, name: '3.5" × 1" (Sm Address)' },
  };

  const getLabelStyles = (fmt: LabelFormat) => {
    const sz = LABEL_SIZES[fmt];
    // 3 tiers: large (2-col), medium (3-col), small (4-col stickers)
    const isSmall = sz.cols >= 4;
    const isMed = sz.cols === 3;
    const nameSz = isSmall ? '12px' : isMed ? '15px' : '18px';
    const badgeSz = isSmall ? '10px' : isMed ? '12px' : '14px';
    const infoSz = isSmall ? '10px' : isMed ? '12px' : '13px';
    // App brand: warm orange #e85d04 (hsl 20 90% 48%)
    return `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;700;800&display=swap');
      * { font-family: 'DM Sans', -apple-system, sans-serif; }
      .labels { display: grid; grid-template-columns: repeat(${sz.cols}, 1fr); gap: 8px; }
      .label { border: 2.5px solid #e85d04; border-radius: 8px; padding: 10px 12px; page-break-inside: avoid; width: ${sz.w}; background: #fff; position: relative; overflow: hidden; }
      .label::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #e85d04, #f59e0b); }
      .label-line1 { font-weight: 800; font-size: ${nameSz}; color: #1a1a1a; padding-bottom: 5px; margin-bottom: 6px; border-bottom: 1.5px solid #fed7aa; letter-spacing: -0.3px; }
      .label-line2 { display: flex; gap: 5px; font-size: ${badgeSz}; flex-wrap: wrap; margin-bottom: 5px; }
      .label-line2 span { background: #e85d04; color: #fff; padding: 2px 10px; border-radius: 20px; font-weight: 700; }
      .label-zone { font-size: ${infoSz}; color: #78350f; margin-top: 4px; font-weight: 600; line-height: 1.4; }
    `;
  };

  const handlePrintLabels = () => {
    setShowPrintDialog(true);
  };

  const confirmPrintLabels = () => {
    setShowPrintDialog(false);
    const w = window.open('', '_blank');
    if (!w) { toast.error('Popup blocked'); return; }

    const labelsHtml = members.map((m, i) => {
      const lines = [];
      
      // Line 1: Name (if enabled)
      if (showNameOnLabel && m.name) {
        lines.push(`<div class="label-line1">#${i + 1} — ${m.name}</div>`);
      } else {
        lines.push(`<div class="label-line1">#${i + 1}</div>`);
      }
      
      // Line 2: Details badges
      const badges = [];
      if (showMealTypeOnLabel) badges.push(`<span>${mealLabel(m.meal_type)}</span>`);
      if (showRotiOnLabel) badges.push(`<span>Roti: ${m.roti_quantity}</span>`);
      if (showRiceOnLabel) badges.push(`<span>${m.rice_type?.replace(/_/g, ' ')}</span>`);
      if (showDietOnLabel) badges.push(`<span>${dietLabel(m.dietary_preference)}</span>`);
      if (showTrialOnLabel && m.free_trial) badges.push(`<span>TRIAL</span>`);
      
      if (badges.length > 0) {
        lines.push(`<div class="label-line2">${badges.join('')}</div>`);
      }
      
      // Additional info lines
      if (showAreaOnLabel && m.delivery_area_name) {
        lines.push(`<div class="label-zone">📍 ${m.delivery_area_name}</div>`);
      }
      if (showPhoneOnLabel && m.phone) {
        lines.push(`<div class="label-zone">📞 ${m.phone}</div>`);
      }
      if (showAddressOnLabel && m.address) {
        lines.push(`<div class="label-zone">🏠 ${m.address}</div>`);
      }
      if (showNotesOnLabel && m.special_notes) {
        lines.push(`<div class="label-zone">📝 ${m.special_notes}</div>`);
      }
      
      return `<div class="label">${lines.join('')}</div>`;
    }).join('');

    w.document.write(`<!DOCTYPE html><html><head><title>Labels — ${format(selectedDate, 'dd MMM yyyy')}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 8px; }
        ${getLabelStyles(printSize)}
        .no-print { text-align: center; margin: 10px 0; }
        @media print { .no-print { display: none; } body { padding: 0; } }
      </style></head><body>
      <div class="no-print">
        <button onclick="window.print()" style="padding:8px 20px;font-size:14px;cursor:pointer;">Print</button>
        <p style="font-size:12px;color:#666;margin-top:4px;">${members.length} labels · ${LABEL_SIZES[printSize].name}</p>
      </div>
      <div class="labels">${labelsHtml}</div></body></html>`);
    w.document.close();
  };

  const handleDownloadPDF = () => {
    const w = window.open('', '_blank');
    if (!w) { toast.error('Popup blocked'); return; }

    // Zone breakdown for the prep sheet
    const zoneData: Record<string, { total: number; veg: number; nv: number; rotis: number; lunch: number; dinner: number }> = {};
    members.forEach((m) => {
      const zone = m.delivery_area_name || 'Unassigned';
      if (!zoneData[zone]) zoneData[zone] = { total: 0, veg: 0, nv: 0, rotis: 0, lunch: 0, dinner: 0 };
      zoneData[zone].total++;
      if (m.dietary_preference === 'veg') zoneData[zone].veg++;
      else if (m.dietary_preference === 'non_veg') zoneData[zone].nv++;
      zoneData[zone].rotis += m.roti_quantity || 0;
      if (['lunch', 'both', 'breakfast_lunch', 'all_three'].includes(m.meal_type)) zoneData[zone].lunch++;
      if (['dinner', 'both', 'all_three'].includes(m.meal_type)) zoneData[zone].dinner++;
    });

    const zoneRows = Object.entries(zoneData).map(([zone, d]) =>
      `<tr><td>${zone}</td><td>${d.total}</td><td>${d.lunch}</td><td>${d.dinner}</td><td>${d.veg}</td><td>${d.nv}</td><td>${d.rotis}</td></tr>`
    ).join('');

    // Rice type breakdown
    const riceCount: Record<string, number> = {};
    members.forEach((m) => { const r = m.rice_type?.replace(/_/g, ' ') || 'None'; riceCount[r] = (riceCount[r] || 0) + 1; });
    const riceHtml = Object.entries(riceCount).map(([r, c]) => `<div class="stat"><div class="stat-val">${c}</div><div class="stat-label">${r}</div></div>`).join('');

    // Special notes (no customer names)
    const notesMembers = members.filter(m => m.special_notes);
    const notesHtml = notesMembers.length > 0
      ? `<h3 style="margin-top:20px;font-size:14px;">Special Instructions (${notesMembers.length})</h3>
         <table><thead><tr><th>#</th><th>Meal</th><th>Diet</th><th>Zone</th><th>Note</th></tr></thead><tbody>
         ${notesMembers.map((m, i) => `<tr><td>${i+1}</td><td>${mealLabel(m.meal_type)}</td><td>${dietLabel(m.dietary_preference)}</td><td>${m.delivery_area_name || '-'}</td><td style="color:#b45309;font-weight:600">${m.special_notes}</td></tr>`).join('')}
         </tbody></table>` : '';

    w.document.write(`<!DOCTYPE html><html><head><title>Kitchen Prep — ${format(selectedDate, 'dd MMM yyyy')}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,system-ui,sans-serif;padding:24px;font-size:12px;color:#1a1a1a}
        h1{font-size:20px;margin-bottom:4px}h2{font-size:13px;color:#666;margin-bottom:16px}h3{font-size:13px;margin-bottom:8px}
        .stats{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap}
        .stat{background:#f5f5f5;padding:8px 14px;border-radius:6px;text-align:center;min-width:70px}
        .stat-val{font-size:20px;font-weight:700}.stat-label{font-size:10px;color:#888;margin-top:2px}
        table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border:1px solid #ddd;padding:6px 10px;text-align:left;font-size:11px}
        th{background:#f0f0f0;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:0.5px}
        .no-print{text-align:center;margin-bottom:16px}@media print{.no-print{display:none}body{padding:12px}}
      </style></head><body>
      <div class="no-print"><button onclick="window.print()" style="padding:10px 24px;font-size:14px;cursor:pointer;border:1px solid #ddd;border-radius:6px;background:#fff">Print / Save as PDF</button></div>
      <h1>${businessName} — Kitchen Prep Sheet</h1>
      <h2>${format(selectedDate, 'EEEE, dd MMMM yyyy')}</h2>
      <div class="stats">
        <div class="stat"><div class="stat-val">${summary.total}</div><div class="stat-label">Total Meals</div></div>
        <div class="stat"><div class="stat-val">${summary.lunch}</div><div class="stat-label">Lunch</div></div>
        <div class="stat"><div class="stat-val">${summary.dinner}</div><div class="stat-label">Dinner</div></div>
        <div class="stat"><div class="stat-val">${summary.totalRotis}</div><div class="stat-label">Rotis</div></div>
        <div class="stat"><div class="stat-val">${summary.veg}</div><div class="stat-label">Veg</div></div>
        <div class="stat"><div class="stat-val">${summary.nonVeg}</div><div class="stat-label">Non-Veg</div></div>
      </div>
      <h3>Rice Breakdown</h3>
      <div class="stats">${riceHtml}</div>
      <h3>Prep by Zone</h3>
      <table>
        <thead><tr><th>Zone</th><th>Total</th><th>Lunch</th><th>Dinner</th><th>Veg</th><th>NV</th><th>Rotis</th></tr></thead>
        <tbody>${zoneRows}</tbody>
      </table>
      ${notesHtml}
    </body></html>`);
    w.document.close();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-xl border-b sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-sm transform hover:scale-105 transition-transform">
              <ChefHat className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-lg tracking-tight">{businessName}</h1>
              <p className="text-xs text-foreground font-semibold">Kitchen Management Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 hover:bg-primary/5 transition-colors hidden sm:flex" 
              onClick={() => setSelectedDate((d) => subDays(d, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="relative">
              <Input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="h-9 w-full sm:w-40 text-xs border border-border text-center font-semibold bg-card focus:border-primary"
              />
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 hover:bg-primary/5 transition-colors hidden sm:flex" 
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {/* Mobile date navigation */}
            <div className="flex sm:hidden gap-1">
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSelectedDate((d) => subDays(d, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSelectedDate((d) => addDays(d, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 py-6 space-y-6">
        {/* Next Day Menu Preview */}
        {nextDayMenu && (
          <Card className="border border-border bg-primary/5 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Eye className="h-4 w-4" />
                Tomorrow's Menu Preview — {format(addDays(selectedDate, 1), 'EEEE, MMM dd')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {nextDayMenu.breakfast && (
                  <div className="bg-card backdrop-blur rounded-xl p-3 border border-border shadow-md">
                    <p className="text-[10px] font-bold text-primary mb-1.5">🌅 BREAKFAST</p>
                    <p className="text-xs font-bold text-foreground leading-snug">{nextDayMenu.breakfast}</p>
                  </div>
                )}
                {nextDayMenu.lunch && (
                  <div className="bg-card backdrop-blur rounded-xl p-3 border border-border shadow-md">
                    <p className="text-[10px] font-bold text-orange-600 mb-1.5">☀️ LUNCH</p>
                    <p className="text-xs font-bold text-foreground leading-snug">{nextDayMenu.lunch}</p>
                  </div>
                )}
                {nextDayMenu.dinner && (
                  <div className="bg-card backdrop-blur rounded-xl p-3 border border-border shadow-md">
                    <p className="text-[10px] font-bold text-violet-500 mb-1.5">🌙 DINNER</p>
                    <p className="text-xs font-bold text-foreground leading-snug">{nextDayMenu.dinner}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        {/* Summary Stats — single clean grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{summary.total}</p>
            <p className="text-[10px] text-muted-foreground">Total Meals</p>
          </CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-amber-600">{summary.lunch}</p>
            <p className="text-[10px] text-muted-foreground">Lunch</p>
          </CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-violet-500">{summary.dinner}</p>
            <p className="text-[10px] text-muted-foreground">Dinner</p>
          </CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-foreground">{summary.totalRotis}</p>
            <p className="text-[10px] text-muted-foreground">Rotis</p>
          </CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-green-600">{summary.veg}</p>
            <p className="text-[10px] text-muted-foreground">Veg</p>
          </CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-red-600">{summary.nonVeg}</p>
            <p className="text-[10px] text-muted-foreground">Non-Veg</p>
          </CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-blue-600">{summary.breakfast}</p>
            <p className="text-[10px] text-muted-foreground">Breakfast</p>
          </CardContent></Card>
        </div>


        {/* Today's Prep Overview — NO customer names, zone-wise + special notes */}
        {membersLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : members.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No meals to prepare for this date</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Zone-wise meal count breakdown */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Prep by Zone — {format(selectedDate, 'dd MMM')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {(() => {
                  const zoneGroups: Record<string, { total: number; veg: number; nv: number; rotis: number }> = {};
                  members.forEach((m) => {
                    const zone = m.delivery_area_name || 'Unassigned';
                    if (!zoneGroups[zone]) zoneGroups[zone] = { total: 0, veg: 0, nv: 0, rotis: 0 };
                    zoneGroups[zone].total++;
                    if (m.dietary_preference === 'veg') zoneGroups[zone].veg++;
                    else if (m.dietary_preference === 'non_veg') zoneGroups[zone].nv++;
                    zoneGroups[zone].rotis += m.roti_quantity || 0;
                  });
                  return Object.entries(zoneGroups).map(([zone, data]) => (
                    <div key={zone} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-sm flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {zone}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{data.total} meals</Badge>
                        <Badge variant="outline" className="text-[10px] text-green-600">{data.veg} V</Badge>
                        <Badge variant="outline" className="text-[10px] text-red-600">{data.nv} NV</Badge>
                        <Badge variant="outline" className="text-[10px]">{data.rotis} rotis</Badge>
                      </div>
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>

            {/* Special Notes — only if any customer has notes */}
            {members.some(m => m.special_notes) && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Special Instructions ({members.filter(m => m.special_notes).length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {members.filter(m => m.special_notes).map((m, i) => (
                    <div key={m.id} className="flex items-start gap-2 py-1.5 border-b border-border last:border-0">
                      <Badge variant="outline" className="text-[10px] flex-shrink-0">#{i + 1}</Badge>
                      <div className="text-xs">
                        <span className="text-muted-foreground">
                          {mealLabel(m.meal_type)} · {dietLabel(m.dietary_preference)} · {m.delivery_area_name || 'No zone'}
                        </span>
                        <p className="text-foreground font-medium mt-0.5">{m.special_notes}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Today's Request Status */}
        {myRequests.length > 0 && (() => {
          // Group by batch (created_at minute)
          const batches: Record<string, typeof myRequests> = {};
          myRequests.forEach(r => {
            const key = r.created_at?.slice(0, 16);
            if (!batches[key]) batches[key] = [];
            batches[key].push(r);
          });
          return (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Today's Requests — {format(selectedDate, 'dd MMM')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(batches).map(([key, rows]) => {
                  const allApproved = rows.every(r => r.notes?.includes('[APPROVED]'));
                  return (
                    <div key={key} className={`rounded-lg border p-3 ${
                      allApproved ? 'border-green-500/40 bg-green-500/5' : 'border-amber-400/40 bg-amber-50/30'
                    }`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-muted-foreground">
                          {new Date(rows[0].created_at).toLocaleTimeString()} · {rows.length} item{rows.length > 1 ? 's' : ''}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${
                            allApproved
                              ? 'border-green-500 text-green-600 bg-green-50'
                              : 'border-amber-400 text-amber-600 bg-amber-50'
                          }`}
                        >
                          {allApproved ? (
                            <><CheckCircle className="h-3 w-3 mr-1" />Approved</>
                          ) : (
                            <><Clock className="h-3 w-3 mr-1" />Pending</>  
                          )}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {rows.map((r, i) => {
                          const name = r.inventory_id
                            ? inventoryItems.find(it => it.id === r.inventory_id)?.name
                              ?? r.notes?.replace('Kitchen request', '').trim() ?? 'Item'
                            : r.notes?.replace('SPECIAL REQUEST:', '').replace(/\s*\([^)]*\)/, '').replace('[APPROVED]', '').trim() ?? 'Item';
                          return (
                            <span key={i} className="text-[10px] bg-background border border-border px-2 py-0.5 rounded-full">
                              {name} ({r.quantity_used})
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })()}

        {/* Inventory */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Inventory Stock
              </CardTitle>
              <div className="flex items-center gap-2">
                {lastUpdated && (
                  <p className="text-[10px] text-muted-foreground font-medium hidden sm:block">
                    {format(lastUpdated, 'HH:mm:ss')}
                  </p>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-primary/10"
                  onClick={() => {
                    setInventoryLoading(true);
                    supabase
                      .from('inventory')
                      .select('id, item_name, unit, quantity')
                      .eq('owner_id', ownerId)
                      .order('item_name')
                      .then(({ data }) => {
                        setInventoryItems((data || []).map((d: any) => ({ 
                          id: d.id, 
                          name: d.item_name, 
                          unit: d.unit || 'pcs', 
                          available_qty: d.quantity || 0 
                        })));
                        setLastUpdated(new Date());
                        setInventoryLoading(false);
                        toast.success('Stock refreshed!');
                      });
                  }}
                  disabled={inventoryLoading}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${inventoryLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* All 3 actions in one compact row */}
            <div className="flex items-center gap-1.5 mb-3">
              <Button onClick={handlePrintLabels} size="sm" className="h-8 text-xs font-semibold px-3">
                <Printer className="h-3.5 w-3.5 mr-1.5" />Labels
              </Button>
              <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="h-8 text-xs font-semibold px-3">
                <Download className="h-3.5 w-3.5 mr-1.5" />Prep Sheet
              </Button>
              <InventoryRequestForm 
                ownerId={ownerId} 
                date={format(selectedDate, 'yyyy-MM-dd')} 
                inventoryItems={inventoryItems}
                inventoryLoading={inventoryLoading}
              />
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Print Label Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <Printer className="h-4 w-4 text-primary" />
              Print Labels ({members.length})
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Size Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Sticker Size</Label>
              <Select value={printSize} onValueChange={(v) => setPrintSize(v as LabelFormat)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LABEL_SIZES).map(([key, sz]) => (
                    <SelectItem key={key} value={key}>{sz.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Label Content Toggles */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Include on Label</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Name', checked: showNameOnLabel, set: setShowNameOnLabel },
                  { label: 'Phone', checked: showPhoneOnLabel, set: setShowPhoneOnLabel },
                  { label: 'Meal Type', checked: showMealTypeOnLabel, set: setShowMealTypeOnLabel },
                  { label: 'Roti Count', checked: showRotiOnLabel, set: setShowRotiOnLabel },
                  { label: 'Rice Type', checked: showRiceOnLabel, set: setShowRiceOnLabel },
                  { label: 'Diet', checked: showDietOnLabel, set: setShowDietOnLabel },
                  { label: 'Zone', checked: showAreaOnLabel, set: setShowAreaOnLabel },
                  { label: 'Trial Badge', checked: showTrialOnLabel, set: setShowTrialOnLabel },
                  { label: 'Address', checked: showAddressOnLabel, set: setShowAddressOnLabel },
                  { label: 'Notes', checked: showNotesOnLabel, set: setShowNotesOnLabel },
                ].map(({ label, checked, set }) => (
                  <div key={label} className="flex items-center justify-between py-1.5 px-3 rounded-lg border border-border">
                    <span className="text-xs font-medium">{label}</span>
                    <Switch checked={checked} onCheckedChange={set} className="data-[state=checked]:bg-primary scale-75" />
                  </div>
                ))}
              </div>
            </div>
            {/* Summary */}
            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              {members.length} labels · {LABEL_SIZES[printSize].name} · {LABEL_SIZES[printSize].w} × {LABEL_SIZES[printSize].h}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowPrintDialog(false)} className="flex-1">Cancel</Button>
            <Button onClick={confirmPrintLabels} className="flex-1">
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Inventory Request inline component ---
type CustomRequestRow = { name: string; qty: string; unit: string };
type InventoryRequest = {
  id: string;
  date: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  items: { name: string; qty: number; unit: string; item_id?: string }[];
  notes?: string;
};

function InventoryRequestForm({ 
  ownerId, 
  date,
  inventoryItems,
  inventoryLoading
}: { 
  ownerId: string; 
  date: string;
  inventoryItems: { id: string; name: string; unit: string; available_qty: number }[];
  inventoryLoading: boolean;
}) {
  const [requests, setRequests] = useState<Record<string, number>>({});
  const [customRows, setCustomRows] = useState<CustomRequestRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [history, setHistory] = useState<InventoryRequest[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<InventoryRequest | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const addCustomRow = () => setCustomRows([...customRows, { name: '', qty: '', unit: 'kg' }]);
  const removeCustomRow = (i: number) => setCustomRows(customRows.filter((_, idx) => idx !== i));
  const updateCustomRow = (i: number, field: keyof CustomRequestRow, val: string) => {
    const rows = [...customRows]; rows[i] = { ...rows[i], [field]: val }; setCustomRows(rows);
  };

  const isDuplicate = (name: string) => 
    name.trim() && inventoryItems.some(item => item.name.toLowerCase() === name.trim().toLowerCase());

  const activeRequests = Object.entries(requests).filter(([, qty]) => qty > 0);
  const validCustom = customRows.filter(r => r.name.trim() && !isDuplicate(r.name));
  const totalItems = activeRequests.length + validCustom.length;

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data } = await supabase
        .from('inventory_consumption')
        .select('id, date, created_at, notes, quantity_used, inventory_id')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(50);

      // Group by created_at minute (batch requests)
      const grouped: Record<string, InventoryRequest> = {};
      for (const row of (data || [])) {
        const key = row.created_at?.slice(0, 16) + '_' + row.date;
        if (!grouped[key]) {
          grouped[key] = {
            id: key,
            date: row.date,
            created_at: row.created_at,
            status: 'pending',
            items: [],
          };
        }
        const itemName = row.inventory_id
          ? inventoryItems.find(i => i.id === row.inventory_id)?.name || row.inventory_id
          : row.notes?.replace('SPECIAL REQUEST: ', '').replace(/\s*\(.*\)$/, '') || 'Unknown';
        const unit = row.inventory_id
          ? inventoryItems.find(i => i.id === row.inventory_id)?.unit || 'pcs'
          : row.notes?.match(/\(([^)]+)\)/)?.[1]?.split(' ').pop() || 'pcs';
        grouped[key].items.push({ name: itemName, qty: row.quantity_used, unit, item_id: row.inventory_id });
      }
      setHistory(Object.values(grouped).sort((a, b) => b.created_at.localeCompare(a.created_at)));
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (totalItems === 0) { toast.error('Add at least one item'); return; }
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      if (activeRequests.length > 0) {
        await supabase.from('inventory_consumption').insert(activeRequests.map(([itemId, qty]) => ({
          owner_id: ownerId, inventory_id: itemId, quantity_used: qty, date, notes: 'Kitchen request', created_at: now,
        })) as any);
      }
      for (const row of validCustom) {
        await supabase.from('inventory_consumption').insert({
          owner_id: ownerId, inventory_id: null, quantity_used: parseFloat(row.qty) || 0, date,
          notes: `SPECIAL REQUEST: ${row.name.trim()} (${row.qty} ${row.unit})`, created_at: now,
        } as any);
      }
      toast.success('Request submitted!');
      setRequests({}); setCustomRows([]);
      setShowRequestDialog(false);
      // Show the submitted request detail
      const submitted: InventoryRequest = {
        id: now.slice(0, 16) + '_' + date,
        date,
        created_at: now,
        status: 'pending',
        items: [
          ...activeRequests.map(([itemId, qty]) => ({
            name: inventoryItems.find(i => i.id === itemId)?.name || itemId,
            qty,
            unit: inventoryItems.find(i => i.id === itemId)?.unit || 'pcs',
            item_id: itemId,
          })),
          ...validCustom.map(r => ({ name: r.name.trim(), qty: parseFloat(r.qty) || 0, unit: r.unit })),
        ],
      };
      setSelectedRequest(submitted);
      setShowDetailDialog(true);
    } catch (err: any) { toast.error('Failed: ' + err.message); }
    finally { setSubmitting(false); }
  };

  const handlePrintRequest = (req: InventoryRequest) => {
    const w = window.open('', '_blank');
    if (!w) { toast.error('Popup blocked'); return; }
    w.document.write(`<!DOCTYPE html><html><head><title>Inventory Request — ${req.date}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;padding:24px;font-size:13px}
      h1{font-size:18px;margin-bottom:4px}p.sub{color:#666;font-size:12px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}
      th{background:#f5f5f5;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
      .status{display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;background:#fef3c7;color:#92400e}
      .footer{margin-top:24px;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:12px}
      @media print{.no-print{display:none}}</style></head><body>
      <div class="no-print" style="margin-bottom:16px">
        <button onclick="window.print()" style="padding:8px 20px;cursor:pointer;border:1px solid #ddd;border-radius:6px">Print</button>
      </div>
      <h1>Inventory Request</h1>
      <p class="sub">Date: ${req.date} &nbsp;|&nbsp; Submitted: ${new Date(req.created_at).toLocaleString()} &nbsp;|&nbsp; <span class="status">PENDING</span></p>
      <table><thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Unit</th></tr></thead><tbody>
      ${req.items.map((item, i) => `<tr><td>${i + 1}</td><td>${item.name}</td><td>${item.qty}</td><td>${item.unit}</td></tr>`).join('')}
      </tbody></table>
      <div class="footer">Total items: ${req.items.length} &nbsp;|&nbsp; Generated by MessFlow Kitchen Portal</div>
      </body></html>`);
    w.document.close();
  };

  if (inventoryLoading) return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <>
      {/* Single compact action row: New Request only (History moved to Inventory tab) */}
      <Button
        onClick={() => setShowRequestDialog(true)}
        size="sm"
        className="h-8 text-xs font-semibold px-3"
      >
        <Package className="h-3.5 w-3.5 mr-1.5" />
        New Request
      </Button>

      {/* New Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Inventory Request — {date}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select quantities from stock or add custom items
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* From stock */}
            {inventoryItems.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">From Stock</p>
                <div className="rounded-lg border border-border divide-y divide-border">
                  {inventoryItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">{item.available_qty} {item.unit} available</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Input type="number" min={0} placeholder="0"
                          className="w-16 h-8 text-sm text-center"
                          value={requests[item.id] || ''}
                          onChange={(e) => setRequests({ ...requests, [item.id]: parseFloat(e.target.value) || 0 })}
                        />
                        <span className="text-xs text-muted-foreground w-8">{item.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Custom Items</p>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addCustomRow}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {customRows.length === 0 ? (
                <button
                  onClick={addCustomRow}
                  className="w-full h-9 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Add item not in stock
                </button>
              ) : (
                <div className="space-y-2">
                  {customRows.map((row, i) => (
                    <div key={i} className="p-3 rounded-lg border border-border space-y-2 bg-muted/20">
                      <div className="flex items-center gap-2">
                        <Input placeholder="Item name" value={row.name}
                          onChange={(e) => updateCustomRow(i, 'name', e.target.value)}
                          className={`h-8 text-sm flex-1 ${isDuplicate(row.name) ? 'border-amber-500' : ''}`}
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeCustomRow(i)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="number" placeholder="Qty" value={row.qty}
                          onChange={(e) => updateCustomRow(i, 'qty', e.target.value)}
                          className="w-24 h-8 text-sm"
                        />
                        <select value={row.unit}
                          onChange={(e) => updateCustomRow(i, 'unit', e.target.value)}
                          className="h-8 text-xs rounded-md border border-border bg-background px-2 flex-1"
                        >
                          {['kg','pcs','liters','grams','boxes','packets'].map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                      {isDuplicate(row.name) && (
                        <p className="text-[10px] text-amber-500">⚠ "{row.name.trim()}" exists in stock — use the stock section above</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {totalItems > 0 && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary font-medium">
                {totalItems} item{totalItems > 1 ? 's' : ''} ready to request
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowRequestDialog(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={submitting || totalItems === 0}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Package className="h-4 w-4 mr-1.5" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Request Submitted
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedRequest?.date} · {selectedRequest && new Date(selectedRequest.created_at).toLocaleTimeString()}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border divide-y divide-border">
                {selectedRequest.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-sm text-muted-foreground">{item.qty} {item.unit}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50">
                  Pending Approval
                </Badge>
                <span className="text-xs text-muted-foreground">{selectedRequest.items.length} items</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDetailDialog(false)} className="flex-1">Close</Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => selectedRequest && handlePrintRequest(selectedRequest)}
            >
              <Printer className="h-4 w-4 mr-1.5" /> Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Request History
            </DialogTitle>
            <DialogDescription className="text-xs">All past inventory requests</DialogDescription>
          </DialogHeader>

          {historyLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No requests yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((req) => (
                <div
                  key={req.id}
                  className="rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => { setSelectedRequest(req); setShowDetailDialog(true); }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-semibold">{req.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-600 bg-amber-50">
                        Pending
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); handlePrintRequest(req); }}
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {req.items.length} item{req.items.length > 1 ? 's' : ''} · {new Date(req.created_at).toLocaleString()}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {req.items.slice(0, 3).map((item, i) => (
                      <span key={i} className="text-[10px] bg-muted px-2 py-0.5 rounded-full">
                        {item.name} ({item.qty} {item.unit})
                      </span>
                    ))}
                    {req.items.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{req.items.length - 3} more</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)} className="w-full">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}