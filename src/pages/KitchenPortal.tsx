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

        {/* Actions */}
        <Card className="border border-border bg-card shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Printer className="h-4 w-4 text-primary" />
                Print Labels
              </h3>
              <Badge variant="outline" className="text-xs font-bold border-primary/30 text-primary bg-primary/5">
                {members.length} labels ready
              </Badge>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handlePrintLabels} 
                className="flex-1 h-12 text-base font-bold bg-primary hover:bg-primary/90 shadow-sm border-0"
              >
                <Printer className="h-5 w-5 mr-2" /> 
                Print Labels
              </Button>
              <Button 
                onClick={handleDownloadPDF} 
                variant="outline" 
                className="flex-1 h-12 text-base font-bold border-2 border-primary/30 hover:bg-primary/5 shadow-md"
              >
                <Download className="h-5 w-5 mr-2" /> 
                Download Prep Sheet
              </Button>
            </div>
          </CardContent>
        </Card>


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
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Updated: {format(lastUpdated, 'HH:mm:ss')}
                  </p>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-primary/10"
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
                  <RefreshCw className={`h-4 w-4 ${inventoryLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <InventoryRequestForm 
              ownerId={ownerId} 
              date={format(selectedDate, 'yyyy-MM-dd')} 
              inventoryItems={inventoryItems}
              inventoryLoading={inventoryLoading}
            />
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
  const [submitted, setSubmitted] = useState(false);

  const addCustomRow = () => setCustomRows([...customRows, { name: '', qty: '', unit: 'kg' }]);
  const removeCustomRow = (i: number) => setCustomRows(customRows.filter((_, idx) => idx !== i));
  const updateCustomRow = (i: number, field: keyof CustomRequestRow, val: string) => {
    const rows = [...customRows]; rows[i] = { ...rows[i], [field]: val }; setCustomRows(rows);
  };

  // Check if custom item already exists in inventory
  const isDuplicate = (name: string) => 
    name.trim() && inventoryItems.some(item => item.name.toLowerCase() === name.trim().toLowerCase());

  const handleSubmit = async () => {
    const activeRequests = Object.entries(requests).filter(([, qty]) => qty > 0);
    const validCustom = customRows.filter(r => r.name.trim() && !isDuplicate(r.name));
    if (activeRequests.length === 0 && validCustom.length === 0) {
      toast.error('Add at least one request'); return;
    }

    setSubmitting(true);
    try {
      if (activeRequests.length > 0) {
        await supabase.from('inventory_consumption').insert(activeRequests.map(([itemId, qty]) => ({
          owner_id: ownerId, inventory_id: itemId, quantity_used: qty, date, notes: 'Kitchen request',
        })) as any);
      }
      for (const row of validCustom) {
        await supabase.from('inventory_consumption').insert({
          owner_id: ownerId, inventory_id: null, quantity_used: parseFloat(row.qty) || 0, date,
          notes: `SPECIAL REQUEST: ${row.name.trim()} (${row.qty} ${row.unit})`,
        } as any);
      }
      toast.success('Request submitted!');
      setSubmitted(true); setRequests({}); setCustomRows([]);
    } catch (err: any) { toast.error('Failed: ' + err.message); }
    finally { setSubmitting(false); }
  };

  if (inventoryLoading) return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  if (submitted) return (
    <div className="text-center py-6 rounded-lg border border-border">
      <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
      <p className="text-sm font-medium mb-2">Request submitted!</p>
      <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>New request</Button>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* From stock */}
      {inventoryItems.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">From Stock</p>
          {inventoryItems.map((item) => (
            <div key={item.id} className="flex items-center gap-2 py-1.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{item.name}</p>
                <p className="text-[10px] text-muted-foreground">{item.available_qty} {item.unit}</p>
              </div>
              <Input type="number" min={0} placeholder="0"
                className="w-16 h-8 text-sm text-center"
                value={requests[item.id] || ''}
                onChange={(e) => setRequests({ ...requests, [item.id]: parseFloat(e.target.value) || 0 })}
              />
            </div>
          ))}
        </div>
      )}

      {/* Custom items (bulk template) */}
      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">Custom Items (not in stock)</p>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addCustomRow}>
            <Plus className="h-3 w-3 mr-1" /> Add Row
          </Button>
        </div>
        {customRows.length === 0 ? (
          <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={addCustomRow}>
            <Plus className="h-3 w-3 mr-1" /> Request item not in inventory
          </Button>
        ) : (
          <div className="space-y-2">
            {customRows.map((row, i) => (
              <div key={i} className="space-y-1">
                <div className="flex gap-1.5 items-center">
                  <Input placeholder="Item name" value={row.name}
                    onChange={(e) => updateCustomRow(i, 'name', e.target.value)}
                    className={`h-8 text-sm flex-1 ${isDuplicate(row.name) ? 'border-amber-500' : ''}`}
                  />
                  <Input type="number" placeholder="Qty" value={row.qty}
                    onChange={(e) => updateCustomRow(i, 'qty', e.target.value)}
                    className="w-16 h-8 text-sm text-center"
                  />
                  <select value={row.unit}
                    onChange={(e) => updateCustomRow(i, 'unit', e.target.value)}
                    className="h-8 text-xs rounded border border-border bg-background px-1"
                  >
                    {['kg','pcs','liters','grams','boxes','packets'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => removeCustomRow(i)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {isDuplicate(row.name) && (
                  <p className="text-[10px] text-amber-500 pl-1">⚠ "{row.name.trim()}" exists in inventory — use stock request above</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Button onClick={handleSubmit} className="w-full h-9 text-sm" disabled={submitting}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Package className="h-4 w-4 mr-1" />}
        Submit Request
      </Button>
    </div>
  );
}