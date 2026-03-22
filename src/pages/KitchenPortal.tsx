import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays, subDays } from 'date-fns';
import {
  ChefHat, UtensilsCrossed, Leaf, Beef, ChevronLeft, ChevronRight,
  MapPin, Users, Loader2, Wheat, Printer, Download, Package
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
};

type LabelFormat = 'a4' | 'portable-50mm' | 'portable-80mm';

export default function KitchenPortal() {
  const { slug } = useParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState('');
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [members, setMembers] = useState<PrepMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [labelFormat, setLabelFormat] = useState<LabelFormat>('a4');

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

  // Fetch active members for prep
  useEffect(() => {
    if (!ownerId) return;
    const fetchMembers = async () => {
      setMembersLoading(true);
      try {
        const { data, error } = await supabase
          .from('members')
          .select('id, name, phone, address, meal_type, roti_quantity, rice_type, dietary_preference, delivery_area_id, pause_service, skip_weekends, free_trial, plan_type, monthly_fee')
          .eq('owner_id', ownerId)
          .eq('status', 'active');
        if (error) throw error;

        const { data: zones } = await supabase.from('delivery_areas').select('id, name').eq('owner_id', ownerId);
        const zoneMap: Record<string, string> = {};
        (zones || []).forEach((z: any) => { zoneMap[z.id] = z.name; });

        const dayOfWeek = selectedDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        const prepMembers: PrepMember[] = ((data || []) as any[])
          .filter((m) => {
            if (m.pause_service) return false;
            if (m.skip_weekends && isWeekend) return false;
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

  // Label CSS per format
  const getLabelStyles = (fmt: LabelFormat) => {
    if (fmt === 'portable-50mm') return `
      .labels { display: flex; flex-direction: column; gap: 2px; }
      .label { border: 1px solid #333; border-radius: 2px; padding: 3px 5px; page-break-inside: avoid; width: 50mm; }
      .label-line1 { font-weight: bold; font-size: 9px; }
      .label-line2 { font-size: 7px; display: flex; gap: 4px; }
      .label-line2 span { background: #eee; padding: 0 2px; border-radius: 1px; }
      .label-zone { font-size: 6px; color: #666; }
    `;
    if (fmt === 'portable-80mm') return `
      .labels { display: flex; flex-direction: column; gap: 3px; }
      .label { border: 1px solid #333; border-radius: 3px; padding: 4px 6px; page-break-inside: avoid; width: 80mm; }
      .label-line1 { font-weight: bold; font-size: 10px; }
      .label-line2 { font-size: 8px; display: flex; gap: 5px; }
      .label-line2 span { background: #eee; padding: 0 3px; border-radius: 2px; }
      .label-zone { font-size: 7px; color: #666; }
    `;
    // A4 default: 3-column grid
    return `
      .labels { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
      .label { border: 1px solid #333; border-radius: 4px; padding: 6px 8px; page-break-inside: avoid; }
      .label-line1 { font-weight: bold; font-size: 11px; border-bottom: 1px solid #ccc; padding-bottom: 2px; margin-bottom: 3px; }
      .label-line2 { display: flex; gap: 6px; font-size: 9px; flex-wrap: wrap; }
      .label-line2 span { background: #f0f0f0; padding: 1px 4px; border-radius: 2px; }
      .label-zone { font-size: 8px; color: #666; margin-top: 2px; }
    `;
  };

  const handlePrintLabels = () => {
    const w = window.open('', '_blank');
    if (!w) { toast.error('Popup blocked'); return; }

    const labelsHtml = members.map((m, i) => `
      <div class="label">
        <div class="label-line1">#${i + 1} — ${mealLabel(m.meal_type)}</div>
        <div class="label-line2">
          <span>Roti: ${m.roti_quantity}</span>
          <span>${m.rice_type?.replace(/_/g, ' ')}</span>
          <span>${dietLabel(m.dietary_preference)}</span>
          ${m.free_trial ? '<span>TRIAL</span>' : ''}
        </div>
        ${m.delivery_area_name ? `<div class="label-zone">${m.delivery_area_name}</div>` : ''}
      </div>
    `).join('');

    w.document.write(`<!DOCTYPE html><html><head><title>Labels — ${format(selectedDate, 'dd MMM yyyy')}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 8px; }
        ${getLabelStyles(labelFormat)}
        .no-print { text-align: center; margin: 10px 0; }
        @media print { .no-print { display: none; } body { padding: 0; } }
      </style></head><body>
      <div class="no-print">
        <button onclick="window.print()" style="padding:8px 20px;font-size:14px;cursor:pointer;">Print</button>
        <p style="font-size:12px;color:#666;margin-top:4px;">${members.length} labels · ${labelFormat === 'a4' ? 'A4 Sheet' : labelFormat === 'portable-50mm' ? '50mm Portable' : '80mm Portable'}</p>
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

  if (!isAuthenticated || !ownerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <ChefHat className="h-8 w-8 text-emerald-500" />
            </div>
            <CardTitle className="text-xl">Kitchen Portal</CardTitle>
            <p className="text-gray-500 mt-2">This link is invalid or has expired.</p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <ChefHat className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm">{businessName}</h1>
              <p className="text-xs text-gray-500">Kitchen Team</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate((d) => subDays(d, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="h-8 w-32 text-xs border-0 text-center"
            />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate((d) => addDays(d, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Summary Stats — no customer names, only aggregates */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
              <p className="text-[10px] text-gray-500">Total Meals</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{summary.lunch}</p>
              <p className="text-[10px] text-gray-500">Lunch</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-purple-600">{summary.dinner}</p>
              <p className="text-[10px] text-gray-500">Dinner</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <Card className="border-0 shadow-sm"><CardContent className="p-2 text-center"><p className="text-lg font-bold">{summary.totalRotis}</p><p className="text-[10px] text-gray-500">Rotis</p></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-2 text-center"><p className="text-lg font-bold text-green-600">{summary.veg}</p><p className="text-[10px] text-gray-500">Veg</p></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-2 text-center"><p className="text-lg font-bold text-red-600">{summary.nonVeg}</p><p className="text-[10px] text-gray-500">Non-Veg</p></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-2 text-center"><p className="text-lg font-bold text-blue-600">{summary.breakfast}</p><p className="text-[10px] text-gray-500">Breakfast</p></CardContent></Card>
        </div>

        {/* Actions: Label format selector + Print + Download */}
        <div className="flex gap-2 items-center">
          <Select value={labelFormat} onValueChange={(v) => setLabelFormat(v as LabelFormat)}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a4">A4 Sheet</SelectItem>
              <SelectItem value="portable-50mm">50mm Portable</SelectItem>
              <SelectItem value="portable-80mm">80mm Portable</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handlePrintLabels} variant="outline" className="flex-1 h-9 text-xs">
            <Printer className="h-3.5 w-3.5 mr-1" /> Print Labels
          </Button>
          <Button onClick={handleDownloadPDF} variant="outline" className="flex-1 h-9 text-xs">
            <Download className="h-3.5 w-3.5 mr-1" /> Prep Sheet
          </Button>
        </div>

        {/* Prep Queue — NO customer names or phone numbers visible */}
        {membersLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
        ) : members.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <ChefHat className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No meals to prepare for this date</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1.5">
            <p className="text-xs text-gray-500 font-medium">{members.length} meals — {format(selectedDate, 'EEEE, dd MMM')}</p>
            {members.map((m, i) => (
              <Card key={m.id} className="border-0 shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono text-muted-foreground w-6">#{i + 1}</span>
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                        {mealLabel(m.meal_type)}
                      </Badge>
                      {m.delivery_area_name && (
                        <span className="text-xs text-gray-500 flex items-center gap-0.5 truncate">
                          <MapPin className="h-3 w-3" />{m.delivery_area_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                        <Wheat className="h-2.5 w-2.5 mr-0.5" />{m.roti_quantity}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                        {m.rice_type?.replace(/_/g, ' ')}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-5 px-1.5 ${
                          m.dietary_preference === 'veg' ? 'border-green-400 text-green-600' :
                          m.dietary_preference === 'non_veg' ? 'border-red-400 text-red-600' : ''
                        }`}
                      >
                        {dietLabel(m.dietary_preference)}
                      </Badge>
                      {m.free_trial && (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-emerald-400 text-emerald-600">T</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Inventory Request Section */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Inventory Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-3">Request materials from stock for today's prep</p>
            <InventoryRequestForm ownerId={ownerId} date={format(selectedDate, 'yyyy-MM-dd')} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

// --- Inventory Request inline component ---
function InventoryRequestForm({ ownerId, date }: { ownerId: string; date: string }) {
  const [items, setItems] = useState<{ id: string; name: string; unit: string; available_qty: number }[]>([]);
  const [requests, setRequests] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('inventory')
          .select('id, name, unit, quantity')
          .eq('owner_id', ownerId)
          .order('name');
        setItems((data || []).map((d: any) => ({ id: d.id, name: d.name, unit: d.unit || 'pcs', available_qty: d.quantity || 0 })));
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchInventory();
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

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>;

  if (items.length === 0) return <p className="text-xs text-gray-400 text-center py-4">No inventory items configured by the owner</p>;

  if (submitted) return (
    <div className="text-center py-4">
      <p className="text-sm text-emerald-600 font-medium">Request submitted!</p>
      <Button variant="outline" size="sm" className="mt-2" onClick={() => setSubmitted(false)}>Make another request</Button>
    </div>
  );

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100 last:border-0">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{item.name}</p>
            <p className="text-[10px] text-gray-400">Available: {item.available_qty} {item.unit}</p>
          </div>
          <Input
            type="number"
            min={0}
            placeholder="Qty"
            className="w-20 h-8 text-sm text-center"
            value={requests[item.id] || ''}
            onChange={(e) => setRequests({ ...requests, [item.id]: parseFloat(e.target.value) || 0 })}
          />
          <span className="text-xs text-gray-400 w-8">{item.unit}</span>
        </div>
      ))}
      <Button onClick={handleSubmit} className="w-full h-9" disabled={submitting}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Package className="h-4 w-4 mr-1" />}
        Submit Request
      </Button>
    </div>
  );
}
