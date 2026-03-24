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
  MapPin, Users, Loader2, Wheat, Printer, Download, Package, User, Calendar, Clock, Eye, ArrowRight, RefreshCw, Smartphone, Monitor
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
        const { data } = await supabase
          .from('inventory')
          .select('id, name, unit, quantity')
          .eq('owner_id', ownerId)
          .order('name');
        
        setInventoryItems((data || []).map((d: any) => ({ 
          id: d.id, 
          name: d.name, 
          unit: d.unit || 'pcs', 
          available_qty: d.quantity || 0 
        })));
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
    return `
      .labels { display: grid; grid-template-columns: repeat(${sz.cols}, 1fr); gap: 4px; }
      .label { border: 2px solid #000; border-radius: 4px; padding: 6px 8px; page-break-inside: avoid; width: ${sz.w}; min-height: ${sz.h}; background: white; }
      .label-line1 { font-weight: bold; font-size: ${sz.cols >= 4 ? '9px' : sz.cols >= 3 ? '11px' : '13px'}; border-bottom: 1px solid #999; padding-bottom: 3px; margin-bottom: 4px; color: #000; }
      .label-line2 { display: flex; gap: 5px; font-size: ${sz.cols >= 4 ? '8px' : '9px'}; flex-wrap: wrap; }
      .label-line2 span { background: #e5e5e5; padding: 1px 4px; border-radius: 3px; font-weight: 600; color: #000; }
      .label-zone { font-size: ${sz.cols >= 4 ? '7px' : '8px'}; color: #333; margin-top: 3px; font-weight: 500; }
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

    // No customer names/phones in the PDF — only counts and meal details
    const rows = members.map((m, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${mealLabel(m.meal_type)}</td>
        <td>${m.roti_quantity}</td>
        <td>${m.rice_type?.replace(/_/g, ' ')}</td>
        <td>${dietLabel(m.dietary_preference)}</td>
        <td>${m.delivery_area_name || '-'}</td>
        <td>${m.free_trial ? 'Trial' : m.plan_type}</td>
      </tr>
    `).join('');

    w.document.write(`<!DOCTYPE html><html><head><title>Kitchen Prep — ${format(selectedDate, 'dd MMM yyyy')}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        h2 { font-size: 14px; color: #666; margin-bottom: 16px; }
        .stats { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
        .stat { background: #f5f5f5; padding: 8px 14px; border-radius: 6px; }
        .stat-val { font-size: 18px; font-weight: bold; }
        .stat-label { font-size: 10px; color: #888; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #ddd; padding: 5px 8px; text-align: left; font-size: 11px; }
        th { background: #f0f0f0; font-weight: 600; }
        .no-print { text-align: center; margin: 10px 0; }
        @media print { .no-print { display: none; } }
      </style></head><body>
      <div class="no-print"><button onclick="window.print()" style="padding:8px 20px;font-size:14px;cursor:pointer;">Print / Save as PDF</button></div>
      <h1>${businessName} — Kitchen Prep</h1>
      <h2>${format(selectedDate, 'EEEE, dd MMMM yyyy')}</h2>
      <div class="stats">
        <div class="stat"><div class="stat-val">${summary.total}</div><div class="stat-label">Total Meals</div></div>
        <div class="stat"><div class="stat-val">${summary.lunch}</div><div class="stat-label">Lunch</div></div>
        <div class="stat"><div class="stat-val">${summary.dinner}</div><div class="stat-label">Dinner</div></div>
        <div class="stat"><div class="stat-val">${summary.totalRotis}</div><div class="stat-label">Rotis</div></div>
        <div class="stat"><div class="stat-val">${summary.veg}</div><div class="stat-label">Veg</div></div>
        <div class="stat"><div class="stat-val">${summary.nonVeg}</div><div class="stat-label">Non-Veg</div></div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Meal</th><th>Roti</th><th>Rice</th><th>Diet</th><th>Zone</th><th>Plan</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></body></html>`);
    w.document.close();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md shadow-lg border-b border-indigo-100 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-xl transform hover:scale-105 transition-transform">
              <ChefHat className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-gray-900 text-lg tracking-tight">{businessName}</h1>
              <p className="text-xs text-gray-700 font-semibold">Kitchen Management Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 hover:bg-indigo-50 transition-colors hidden sm:flex" 
              onClick={() => setSelectedDate((d) => subDays(d, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="relative">
              <Input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="h-9 w-full sm:w-40 text-xs border-2 border-indigo-200 text-center font-semibold bg-white/80 focus:border-indigo-400"
              />
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 hover:bg-indigo-50 transition-colors hidden sm:flex" 
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
          <Card className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-900">
                <Eye className="h-4 w-4" />
                Tomorrow's Menu Preview — {format(addDays(selectedDate, 1), 'EEEE, MMM dd')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {nextDayMenu.breakfast && (
                  <div className="bg-white/90 backdrop-blur rounded-xl p-3 border-2 border-indigo-200 shadow-md">
                    <p className="text-[10px] font-bold text-indigo-600 mb-1.5">🌅 BREAKFAST</p>
                    <p className="text-xs font-bold text-gray-900 leading-snug">{nextDayMenu.breakfast}</p>
                  </div>
                )}
                {nextDayMenu.lunch && (
                  <div className="bg-white/90 backdrop-blur rounded-xl p-3 border-2 border-indigo-200 shadow-md">
                    <p className="text-[10px] font-bold text-orange-600 mb-1.5">☀️ LUNCH</p>
                    <p className="text-xs font-bold text-gray-900 leading-snug">{nextDayMenu.lunch}</p>
                  </div>
                )}
                {nextDayMenu.dinner && (
                  <div className="bg-white/90 backdrop-blur rounded-xl p-3 border-2 border-indigo-200 shadow-md">
                    <p className="text-[10px] font-bold text-purple-600 mb-1.5">🌙 DINNER</p>
                    <p className="text-xs font-bold text-gray-900 leading-snug">{nextDayMenu.dinner}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-extrabold text-blue-900">{summary.total}</p>
              <p className="text-[10px] text-blue-700 font-bold mt-1">Total Meals</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-extrabold text-amber-900">{summary.lunch}</p>
              <p className="text-[10px] text-amber-700 font-bold mt-1">Lunch</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 via-pink-50 to-fuchsia-100 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-extrabold text-purple-900">{summary.dinner}</p>
              <p className="text-[10px] text-purple-700 font-bold mt-1">Dinner</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-100 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-3 text-center"><p className="text-xl font-extrabold text-emerald-900">{summary.totalRotis}</p><p className="text-[10px] text-emerald-700 font-bold mt-1">Rotis</p></CardContent>
          </Card>
          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 via-lime-50 to-emerald-100 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-3 text-center"><p className="text-xl font-extrabold text-green-900">{summary.veg}</p><p className="text-[10px] text-green-700 font-bold mt-1">Veg</p></CardContent>
          </Card>
          <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 via-rose-50 to-pink-100 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-3 text-center"><p className="text-xl font-extrabold text-red-900">{summary.nonVeg}</p><p className="text-[10px] text-red-700 font-bold mt-1">Non-Veg</p></CardContent>
          </Card>
          <Card className="border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-100 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-3 text-center"><p className="text-xl font-extrabold text-cyan-900">{summary.breakfast}</p><p className="text-[10px] text-cyan-700 font-bold mt-1">Breakfast</p></CardContent>
          </Card>
        </div>

        {/* Actions */}
        <Card className="border-2 border-indigo-200 bg-white shadow-xl">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-indigo-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Printer className="h-4 w-4 text-indigo-600" />
                Print Labels
              </h3>
              <Badge variant="outline" className="text-xs font-bold border-indigo-300 text-indigo-700 bg-indigo-50">
                {members.length} labels ready
              </Badge>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handlePrintLabels} 
                className="flex-1 h-12 text-base font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 shadow-xl border-0"
              >
                <Printer className="h-5 w-5 mr-2" /> 
                Print Labels
              </Button>
              <Button 
                onClick={handleDownloadPDF} 
                variant="outline" 
                className="flex-1 h-12 text-base font-bold border-2 border-indigo-300 hover:bg-indigo-50 shadow-md"
              >
                <Download className="h-5 w-5 mr-2" /> 
                Download Prep Sheet
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Today's Meals Overview */}
        {membersLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
        ) : members.length === 0 ? (
          <Card className="border-2 border-gray-200 bg-white shadow-lg">
            <CardContent className="py-12 text-center">
              <ChefHat className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-700 font-bold">No meals to prepare for this date</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-indigo-200 bg-white shadow-xl">
            <CardHeader className="pb-3 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50">
              <CardTitle className="text-sm font-bold flex items-center justify-between text-gray-900">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-600" />
                  Today's Meal Details
                </span>
                <Badge variant="outline" className="text-xs font-bold border-indigo-300 bg-white">
                  {format(selectedDate, 'MMM dd')}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {/* Summary Stats at Top */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 pb-4 border-b-2 border-indigo-100">
                <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                  <p className="text-2xl font-extrabold text-blue-900">{summary.total}</p>
                  <p className="text-[10px] text-blue-700 font-bold mt-1">Total</p>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200">
                  <p className="text-2xl font-extrabold text-amber-900">{summary.lunch}</p>
                  <p className="text-[10px] text-amber-700 font-bold mt-1">Lunch Only</p>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
                  <p className="text-2xl font-extrabold text-purple-900">{summary.dinner}</p>
                  <p className="text-[10px] text-purple-700 font-bold mt-1">Dinner Only</p>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                  <p className="text-2xl font-extrabold text-green-900">{summary.veg + summary.nonVeg}</p>
                  <p className="text-[10px] text-green-700 font-bold mt-1">Both Meals</p>
                </div>
              </div>

              {/* Detailed Member List */}
              <ScrollArea className="max-h-[400px] pr-4">
                <div className="space-y-2">
                  {members.map((member, idx) => (
                    <div key={member.id} className="flex items-start justify-between p-3 bg-gradient-to-r from-white via-indigo-50/30 to-white rounded-xl border-2 border-gray-100 hover:border-indigo-300 hover:shadow-md transition-all">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-gray-900 truncate">{member.name}</p>
                            {member.free_trial && (
                              <Badge className="text-[9px] bg-indigo-100 text-indigo-700 border-indigo-300 font-bold px-1.5 py-0.5">
                                TRIAL
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="outline" className="text-[9px] font-bold border-blue-300 text-blue-700 bg-blue-50">
                              🍽️ {mealLabel(member.meal_type)}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] font-bold border-amber-300 text-amber-700 bg-amber-50">
                              🫓 {member.roti_quantity} Roti
                            </Badge>
                            <Badge variant="outline" className="text-[9px] font-bold border-green-300 text-green-700 bg-green-50">
                              {dietLabel(member.dietary_preference) === 'VEG' ? '🥬' : dietLabel(member.dietary_preference) === 'NV' ? '🍗' : '🥗'} {dietLabel(member.dietary_preference)}
                            </Badge>
                            {member.delivery_area_name && (
                              <Badge variant="outline" className="text-[9px] font-bold border-purple-300 text-purple-700 bg-purple-50">
                                📍 {member.delivery_area_name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Real-Time Inventory Section */}
        <Card className="border-2 border-indigo-200 bg-white shadow-xl">
          <CardHeader className="pb-3 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-900">
                <Package className="h-5 w-5 text-indigo-600" />
                Live Inventory Stock
              </CardTitle>
              <div className="flex items-center gap-2">
                {lastUpdated && (
                  <p className="text-[10px] text-gray-600 font-medium">
                    Updated: {format(lastUpdated, 'HH:mm:ss')}
                  </p>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-indigo-100"
                  onClick={() => {
                    setInventoryLoading(true);
                    supabase
                      .from('inventory')
                      .select('id, name, unit, quantity')
                      .eq('owner_id', ownerId)
                      .order('name')
                      .then(({ data }) => {
                        setInventoryItems((data || []).map((d: any) => ({ 
                          id: d.id, 
                          name: d.name, 
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
            <p className="text-xs text-gray-700 font-medium mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Real-time updates enabled • Stock changes automatically sync
            </p>
            <InventoryRequestForm 
              ownerId={ownerId} 
              date={format(selectedDate, 'yyyy-MM-dd')} 
              inventoryItems={inventoryItems}
              inventoryLoading={inventoryLoading}
            />
          </CardContent>
        </Card>
      </main>

      {/* Print Size Selection Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="max-w-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold sticky top-0 bg-white pb-3 border-b">
              <Printer className="h-6 w-6 text-indigo-600" />
              Select Label Size & Print
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-700 sticky top-14 bg-white pt-2">
              Choose sticker size and customize label content
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Size Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-900">Sticker Dimensions:</Label>
              <Select value={printSize} onValueChange={(v) => setPrintSize(v as LabelFormat)}>
                <SelectTrigger className="w-full h-12 border-2 border-indigo-300 bg-white shadow-md">
                  <SelectValue placeholder="Choose sticker size" />
                </SelectTrigger>
                <SelectContent className="bg-white shadow-xl max-h-64" style={{ zIndex: '9999', position: 'fixed' }}>
                  {Object.entries(LABEL_SIZES).map(([key, sz]) => (
                    <SelectItem key={key} value={key} className="text-sm py-3 hover:bg-indigo-50 cursor-pointer">
                      <div className="flex items-center justify-between w-full gap-4">
                        <span className="font-bold text-gray-900">{sz.name.split(' (')[0]}</span>
                        <span className="text-xs text-indigo-600 font-mono font-semibold flex-shrink-0 bg-indigo-50 px-2 py-1 rounded">
                          {sz.w} × {sz.h}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content Filters - Toggle Buttons */}
            <div className="space-y-3">
              <Label className="text-sm font-bold text-gray-900 block mb-3">Include on Label:</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-indigo-600" />
                    <span className="text-sm font-bold text-gray-900">Member Name</span>
                  </div>
                  <Switch
                    checked={showNameOnLabel}
                    onCheckedChange={setShowNameOnLabel}
                    className="data-[state=checked]:bg-indigo-600"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📞</span>
                    <span className="text-sm font-bold text-gray-900">Phone Number</span>
                  </div>
                  <Switch
                    checked={showPhoneOnLabel}
                    onCheckedChange={setShowPhoneOnLabel}
                    className="data-[state=checked]:bg-blue-600"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border-2 border-amber-200">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🍽️</span>
                    <span className="text-sm font-bold text-gray-900">Meal Type</span>
                  </div>
                  <Switch
                    checked={showMealTypeOnLabel}
                    onCheckedChange={setShowMealTypeOnLabel}
                    className="data-[state=checked]:bg-amber-600"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🫓</span>
                    <span className="text-sm font-bold text-gray-900">Roti Count</span>
                  </div>
                  <Switch
                    checked={showRotiOnLabel}
                    onCheckedChange={setShowRotiOnLabel}
                    className="data-[state=checked]:bg-green-600"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🍚</span>
                    <span className="text-sm font-bold text-gray-900">Rice Type</span>
                  </div>
                  <Switch
                    checked={showRiceOnLabel}
                    onCheckedChange={setShowRiceOnLabel}
                    className="data-[state=checked]:bg-purple-600"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-rose-50 rounded-lg border-2 border-red-200">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🥗</span>
                    <span className="text-sm font-bold text-gray-900">Diet Preference</span>
                  </div>
                  <Switch
                    checked={showDietOnLabel}
                    onCheckedChange={setShowDietOnLabel}
                    className="data-[state=checked]:bg-red-600"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-cyan-50 to-sky-50 rounded-lg border-2 border-cyan-200">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-cyan-600" />
                    <span className="text-sm font-bold text-gray-900">Delivery Area</span>
                  </div>
                  <Switch
                    checked={showAreaOnLabel}
                    onCheckedChange={setShowAreaOnLabel}
                    className="data-[state=checked]:bg-cyan-600"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border-2 border-yellow-200">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-yellow-200 text-yellow-800 border-yellow-300 text-[9px] font-bold px-2 py-0.5">TRIAL</Badge>
                    <span className="text-sm font-bold text-gray-900">Trial Badge</span>
                  </div>
                  <Switch
                    checked={showTrialOnLabel}
                    onCheckedChange={setShowTrialOnLabel}
                    className="data-[state=checked]:bg-yellow-600"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border-2 border-slate-300">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-600" />
                    <span className="text-sm font-bold text-gray-900">Full Address</span>
                  </div>
                  <Switch
                    checked={showAddressOnLabel}
                    onCheckedChange={setShowAddressOnLabel}
                    className="data-[state=checked]:bg-slate-600"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border-2 border-orange-200">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📝</span>
                    <span className="text-sm font-bold text-gray-900">Special Notes</span>
                  </div>
                  <Switch
                    checked={showNotesOnLabel}
                    onCheckedChange={setShowNotesOnLabel}
                    className="data-[state=checked]:bg-orange-600"
                  />
                </div>
              </div>
            </div>
            
            {/* Preview Box */}
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-xl p-4 border-2 border-indigo-200 shadow-inner">
              <p className="text-sm font-bold text-indigo-900 mb-2">📊 Preview:</p>
              <div className="space-y-1.5">
                <p className="text-sm text-gray-800 font-semibold">
                  <span className="text-indigo-600 font-extrabold text-base">{members.length}</span> labels will be printed
                </p>
                <p className="text-sm text-gray-800 font-semibold">
                  Selected: <span className="font-bold text-indigo-600">{LABEL_SIZES[printSize].name}</span>
                </p>
                <p className="text-xs text-gray-700 font-medium">
                  Dimensions: <span className="font-mono font-bold text-gray-900">{LABEL_SIZES[printSize].w} × {LABEL_SIZES[printSize].h}</span>
                </p>
                <div className="pt-2 border-t border-indigo-200 mt-2">
                  <p className="text-xs font-bold text-indigo-900 mb-1">Included fields:</p>
                  <div className="flex flex-wrap gap-1">
                    {showNameOnLabel && <Badge className="text-[9px] bg-indigo-200 text-indigo-800">Name</Badge>}
                    {showPhoneOnLabel && <Badge className="text-[9px] bg-blue-200 text-blue-800">Phone</Badge>}
                    {showMealTypeOnLabel && <Badge className="text-[9px] bg-amber-200 text-amber-800">Meal</Badge>}
                    {showRotiOnLabel && <Badge className="text-[9px] bg-green-200 text-green-800">Roti</Badge>}
                    {showRiceOnLabel && <Badge className="text-[9px] bg-purple-200 text-purple-800">Rice</Badge>}
                    {showDietOnLabel && <Badge className="text-[9px] bg-red-200 text-red-800">Diet</Badge>}
                    {showAreaOnLabel && <Badge className="text-[9px] bg-cyan-200 text-cyan-800">Area</Badge>}
                    {showTrialOnLabel && <Badge className="text-[9px] bg-yellow-200 text-yellow-800">Trial</Badge>}
                    {showAddressOnLabel && <Badge className="text-[9px] bg-slate-200 text-slate-800">Address</Badge>}
                    {showNotesOnLabel && <Badge className="text-[9px] bg-orange-200 text-orange-800">Notes</Badge>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 bg-white pt-3 border-t">
            <Button variant="outline" onClick={() => setShowPrintDialog(false)} className="border-2 font-semibold hover:bg-gray-50">
              Cancel
            </Button>
            <Button onClick={confirmPrintLabels} className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 font-bold shadow-xl border-0">
              <Printer className="h-4 w-4 mr-2" />
              Print Labels
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Inventory Request inline component ---
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
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // No longer fetch here - items are passed as props from parent
  }, [ownerId]);

  const handleSubmit = async () => {
    const activeRequests = Object.entries(requests).filter(([, qty]) => qty > 0);
    if (activeRequests.length === 0) { toast.error('Enter quantity for at least one item'); return; }

    setSubmitting(true);
    try {
      // Insert into inventory_requests (or consumption log)
      const inserts = activeRequests.map(([itemId, qty]) => ({
        owner_id: ownerId,
        inventory_id: itemId,
        requested_qty: qty,
        date,
        status: 'pending',
        requested_by: 'kitchen',
      }));

      const { error } = await supabase.from('inventory_consumption').insert(inserts.map((r) => ({
        owner_id: r.owner_id,
        inventory_id: r.inventory_id,
        quantity_used: r.requested_qty,
        date: r.date,
        notes: 'Kitchen request',
      })) as any);

      if (error) throw error;
      toast.success(`${activeRequests.length} items requested`);
      setSubmitted(true);
      setRequests({});
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (inventoryLoading) return <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>;

  if (inventoryItems.length === 0) return <p className="text-sm text-gray-600 font-medium text-center py-6 bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-gray-200">No inventory items configured by the owner</p>;

  if (submitted) return (
    <div className="text-center py-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border-2 border-emerald-200">
      <p className="text-base text-emerald-700 font-bold mb-3">✓ Request submitted!</p>
      <Button variant="outline" size="sm" className="mt-2 font-semibold border-2" onClick={() => setSubmitted(false)}>Make another request</Button>
    </div>
  );

  return (
    <div className="space-y-3">
      {inventoryItems.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-3 py-3 px-4 border-b-2 border-indigo-100 last:border-0 hover:bg-gradient-to-r hover:from-indigo-50 hover:via-purple-50 hover:to-white transition-all rounded-xl">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
            <p className="text-xs text-gray-700 font-semibold mt-1">Available: <span className="font-extrabold text-indigo-600 text-base">{item.available_qty}</span> {item.unit}</p>
          </div>
          <Input
            type="number"
            min={0}
            placeholder="Qty"
            className="w-28 h-11 text-sm text-center font-bold border-2 border-indigo-300 focus:border-indigo-500"
            value={requests[item.id] || ''}
            onChange={(e) => setRequests({ ...requests, [item.id]: parseFloat(e.target.value) || 0 })}
          />
          <span className="text-xs text-gray-600 font-bold w-12 text-right">{item.unit}</span>
        </div>
      ))}
      <Button onClick={handleSubmit} className="w-full h-12 font-bold text-base bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 shadow-xl border-0" disabled={submitting}>
        {submitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Package className="h-5 w-5 mr-2" />}
        Submit Request
      </Button>
    </div>
  );
}
