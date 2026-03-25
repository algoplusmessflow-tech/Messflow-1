import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useInventory } from '@/hooks/useInventory';
import { useAuth } from '@/lib/auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { InventoryBulkAddModal } from '@/components/InventoryBulkAddModal';
import { DailyConsumptionModal } from '@/components/DailyConsumptionModal';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Plus, Minus, Trash2, Loader2, Package, Pencil, Upload, ArrowDown, ChefHat, Clock, CheckCircle, Printer } from 'lucide-react';
import { toast } from 'sonner';

const UNITS = ['kg', 'pcs', 'liters', 'grams', 'boxes', 'packets'];

export default function Inventory() {
  const { inventory, isLoading, addItem, updateQuantity, updateItem, deleteItem } = useInventory();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isConsumptionOpen, setIsConsumptionOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{ 
    id: string; 
    item_name: string; 
    quantity: string; 
    unit: string;
    description: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    item_name: '',
    quantity: '',
    unit: 'kg',
    description: '',
  });

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    await addItem.mutateAsync({
      item_name: formData.item_name.trim(),
      quantity: Number(formData.quantity),
      unit: formData.unit.trim(),
      description: formData.description.trim() || undefined,
    } as any);
    setFormData({ item_name: '', quantity: '', unit: 'kg', description: '' });
    setIsAddOpen(false);
  };

  const handleQuantityChange = async (id: string, currentQty: number, delta: number) => {
    const newQty = Math.max(0, currentQty + delta);
    await updateQuantity.mutateAsync({ id, quantity: newQty });
  };

  const openEditDialog = (item: typeof inventory[0]) => {
    setEditingItem({
      id: item.id,
      item_name: item.item_name,
      quantity: String(item.quantity),
      unit: item.unit,
      description: (item as any).description || '',
    });
    setIsEditOpen(true);
  };

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    
    await updateItem.mutateAsync({
      id: editingItem.id,
      item_name: editingItem.item_name.trim(),
      quantity: Number(editingItem.quantity),
      unit: editingItem.unit.trim(),
    });
    setEditingItem(null);
    setIsEditOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteItem.mutateAsync(deleteId);
    setDeleteId(null);
  };

  // Low stock items (less than 5 units)
  const lowStockItems = inventory.filter((item) => Number(item.quantity) < 5);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Inventory</h1>
            <p className="text-muted-foreground">{inventory.length} items</p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setIsConsumptionOpen(true)}
            >
              <ArrowDown className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Daily Use</span>
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setIsBulkOpen(true)}
            >
              <Upload className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Bulk Add</span>
            </Button>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Inventory Item</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddItem} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="itemName">Item Name</Label>
                    <Input
                      id="itemName"
                      value={formData.item_name}
                      onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                      placeholder="e.g., Rice"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        step="0.1"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        placeholder="10"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit">Unit</Label>
                      <Select
                        value={formData.unit}
                        onValueChange={(value) => setFormData({ ...formData, unit: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description..."
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={addItem.isPending}>
                    {addItem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Item
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <Card className="border-amber-500/50 bg-amber-500/10">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                ⚠️ Low Stock Alert: {lowStockItems.map(i => i.item_name).join(', ')}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))
          ) : inventory.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No inventory items yet. Add your first item.</p>
              </CardContent>
            </Card>
          ) : (
            inventory.map((item) => (
              <Card key={item.id} className={Number(item.quantity) < 5 ? 'border-amber-500/50' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{item.item_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {Number(item.quantity).toFixed(1)} {item.unit}
                        {(item as any).description && (
                          <span className="ml-2 text-xs">• {(item as any).description}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => handleQuantityChange(item.id, Number(item.quantity), -1)}
                        disabled={updateQuantity.isPending}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-12 text-center font-medium">
                        {Number(item.quantity).toFixed(1)}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => handleQuantityChange(item.id, Number(item.quantity), 1)}
                        disabled={updateQuantity.isPending}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Inventory Item</DialogTitle>
            </DialogHeader>
            {editingItem && (
              <form onSubmit={handleEditItem} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editItemName">Item Name</Label>
                  <Input
                    id="editItemName"
                    value={editingItem.item_name}
                    onChange={(e) => setEditingItem({ ...editingItem, item_name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editQuantity">Quantity</Label>
                    <Input
                      id="editQuantity"
                      type="number"
                      step="0.1"
                      value={editingItem.quantity}
                      onChange={(e) => setEditingItem({ ...editingItem, quantity: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editUnit">Unit</Label>
                    <Select
                      value={editingItem.unit}
                      onValueChange={(value) => setEditingItem({ ...editingItem, unit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateItem.isPending}>
                    {updateItem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Item?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The item will be permanently removed from your inventory.
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

        {/* Bulk Add Modal */}
        <InventoryBulkAddModal open={isBulkOpen} onOpenChange={setIsBulkOpen} />

        {/* Daily Consumption Modal */}
        <DailyConsumptionModal open={isConsumptionOpen} onOpenChange={setIsConsumptionOpen} />

        {/* Kitchen Requests Section */}
        <KitchenRequests />
      </div>
    </AppLayout>
  );
}

// ═══ KITCHEN REQUESTS COMPONENT ═══

// Resolve display name — accepts optional local inventory list for fallback lookup
function resolveItemName(req: any, inventoryList?: any[]): string {
  // 1. Joined inventory record (best case)
  if (req.inventory?.item_name) return req.inventory.item_name;
  // 2. Local inventory list lookup by inventory_id
  if (req.inventory_id && inventoryList?.length) {
    const found = inventoryList.find((i: any) => i.id === req.inventory_id);
    if (found) return found.item_name || found.name;
  }
  // 3. Special request — parse "SPECIAL REQUEST: Tomatoes (2 kg)"
  if (req.notes?.includes('SPECIAL REQUEST:')) {
    return req.notes
      .replace('SPECIAL REQUEST:', '')
      .replace(/\s*\([^)]*\)\s*$/, '')
      .replace('[APPROVED]', '')
      .trim();
  }
  return 'Unknown item';
}

function resolveUnit(req: any, inventoryList?: any[]): string {
  if (req.inventory?.unit) return req.inventory.unit;
  if (req.inventory_id && inventoryList?.length) {
    const found = inventoryList.find((i: any) => i.id === req.inventory_id);
    if (found) return found.unit || 'pcs';
  }
  const match = req.notes?.match(/\(([\d.]+)\s*(\w+)\)/);
  return match?.[2] || 'pcs';
}

function KitchenRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { inventory } = useInventory();

  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ['kitchen-requests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('inventory_consumption')
        .select('*, inventory:inventory_id(item_name, unit)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) {
        const fallback = await supabase
          .from('inventory_consumption')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);
        return (fallback.data || []).map((r: any) => ({ ...r, inventory: null }));
      }
      return (data || []).map((r: any) => ({
        ...r,
        inventory: Array.isArray(r.inventory) ? r.inventory[0] : r.inventory,
      }));
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Group pending rows into batches by (created_at minute + date)
  type BatchedRequest = {
    batchKey: string;
    date: string;
    created_at: string;
    rows: any[];
  };

  const pendingRows = requests.filter((r: any) =>
    (r.notes?.includes('Kitchen request') || r.notes?.includes('SPECIAL REQUEST')) &&
    !r.notes?.includes('[APPROVED]')
  );

  const approvedRows = requests.filter((r: any) => r.notes?.includes('[APPROVED]'));

  const pendingBatches: BatchedRequest[] = Object.values(
    pendingRows.reduce((acc: Record<string, BatchedRequest>, r: any) => {
      const key = (r.created_at?.slice(0, 16) ?? '') + '_' + (r.date ?? '');
      if (!acc[key]) acc[key] = { batchKey: key, date: r.date, created_at: r.created_at, rows: [] };
      acc[key].rows.push(r);
      return acc;
    }, {})
  ).sort((a, b) => b.created_at.localeCompare(a.created_at));

  const approvedBatches: BatchedRequest[] = Object.values(
    approvedRows.reduce((acc: Record<string, BatchedRequest>, r: any) => {
      const key = (r.created_at?.slice(0, 16) ?? '') + '_' + (r.date ?? '');
      if (!acc[key]) acc[key] = { batchKey: key, date: r.date, created_at: r.created_at, rows: [] };
      acc[key].rows.push(r);
      return acc;
    }, {})
  ).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 20);

  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchedRequest | null>(null);
  // editable quantities per row id
  const [editQty, setEditQty] = useState<Record<string, number>>({});
  const [approving, setApproving] = useState(false);

  const openBatch = (batch: BatchedRequest) => {
    const init: Record<string, number> = {};
    batch.rows.forEach(r => { init[r.id] = r.quantity_used ?? 0; });
    setEditQty(init);
    setSelectedBatch(batch);
  };

  const handleApproveBatch = async (batch: BatchedRequest) => {
    setApproving(true);
    try {
      for (const r of batch.rows) {
        const qty = editQty[r.id] ?? r.quantity_used ?? 0;
        if (r.inventory_id && qty > 0) {
          const invItem = inventory.find(i => i.id === r.inventory_id);
          if (invItem) {
            const newQty = Math.max(0, Number(invItem.quantity) - qty);
            await supabase.from('inventory').update({ quantity: newQty }).eq('id', r.inventory_id);
          }
        }
        // Overwrite notes cleanly — never double-append
        const baseNotes = (r.notes ?? '').replace(/\s*\[APPROVED\]/g, '').trim();
        await supabase
          .from('inventory_consumption')
          .update({ quantity_used: qty, notes: baseNotes + ' [APPROVED]' })
          .eq('id', r.id);
      }
      // Force fresh fetch, then close dialog
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setSelectedBatch(null);
      setEditQty({});
      toast.success(`${batch.rows.length} item(s) approved — stock updated`);
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    } finally {
      setApproving(false);
    }
  };

  const handlePrintBatch = (batch: BatchedRequest) => {
    const w = window.open('', '_blank');
    if (!w) return;
    const rows = batch.rows.map((r, i) => {
      const name = resolveItemName(r, inventory);
      const unit = resolveUnit(r, inventory);
      const qty = editQty[r.id] ?? r.quantity_used ?? 0;
      const type = r.notes?.includes('SPECIAL REQUEST') ? 'Special' : 'Stock';
      return `<tr><td>${i + 1}</td><td>${name}</td><td>${qty}</td><td>${unit}</td><td>${type}</td></tr>`;
    }).join('');
    w.document.write(`<!DOCTYPE html><html><head><title>Inventory Request — ${batch.date}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;padding:24px;font-size:13px}
      h1{font-size:18px;margin-bottom:4px}p.sub{color:#666;font-size:12px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}
      th{background:#f5f5f5;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
      .footer{margin-top:24px;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:12px}
      @media print{.no-print{display:none}}</style></head><body>
      <div class="no-print" style="margin-bottom:16px">
        <button onclick="window.print()" style="padding:8px 20px;cursor:pointer;border:1px solid #ddd;border-radius:6px">Print</button>
      </div>
      <h1>Inventory Request</h1>
      <p class="sub">Date: ${batch.date} &nbsp;|&nbsp; Submitted: ${new Date(batch.created_at).toLocaleString()}</p>
      <table><thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Unit</th><th>Type</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="footer">Total: ${batch.rows.length} items &nbsp;|&nbsp; MessFlow</div>
      </body></html>`);
    w.document.close();
  };

  if (pendingBatches.length === 0 && approvedBatches.length === 0 && !isLoading) return null;

  // History = only fully approved batches
  const historyBatches: BatchedRequest[] = Object.values(
    requests
      .filter((r: any) =>
        (r.notes?.includes('Kitchen request') || r.notes?.includes('SPECIAL REQUEST')) &&
        r.notes?.includes('[APPROVED]')
      )
      .reduce((acc: Record<string, BatchedRequest>, r: any) => {
        const key = (r.created_at?.slice(0, 16) ?? '') + '_' + (r.date ?? '');
        if (!acc[key]) acc[key] = { batchKey: key, date: r.date, created_at: r.created_at, rows: [] };
        acc[key].rows.push(r);
        return acc;
      }, {})
  ).sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ChefHat className="h-4 w-4 text-primary" />
              Kitchen Requests
              {pendingBatches.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">{pendingBatches.length} pending</Badge>
              )}
            </h3>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowHistoryDialog(true)}>
              <Clock className="h-3 w-3 mr-1" /> History
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : pendingBatches.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No pending requests</p>
          ) : (
            <div className="space-y-2">
              {pendingBatches.map((batch) => (
                <div
                  key={batch.batchKey}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => openBatch(batch)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {batch.rows.length} item{batch.rows.length > 1 ? 's' : ''} requested
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {batch.date} · {new Date(batch.created_at).toLocaleTimeString()}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {batch.rows.slice(0, 3).map((r, i) => (
                        <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
                          {resolveItemName(r, inventory)}
                        </span>
                      ))}
                      {batch.rows.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{batch.rows.length - 3} more</span>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="border-amber-400 text-amber-600 text-[10px] ml-2 flex-shrink-0">
                    Pending
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Request History
            </DialogTitle>
          </DialogHeader>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : historyBatches.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No approved requests yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {historyBatches.map((batch) => (
                <div
                  key={batch.batchKey}
                  className="flex items-center justify-between p-3 rounded-lg border border-green-500/30 bg-green-500/5 hover:bg-green-500/10 cursor-pointer transition-colors"
                  onClick={() => { openBatch(batch); setShowHistoryDialog(false); }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{batch.date}</p>
                      <Badge variant="outline" className="text-[9px] border-green-500 text-green-600">
                        <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Approved
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {batch.rows.length} item{batch.rows.length > 1 ? 's' : ''} · {new Date(batch.created_at).toLocaleTimeString()}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {batch.rows.slice(0, 3).map((r, i) => (
                        <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
                          {resolveItemName(r, inventory)}
                        </span>
                      ))}
                      {batch.rows.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{batch.rows.length - 3} more</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 ml-2"
                    onClick={(e) => { e.stopPropagation(); handlePrintBatch(batch); }}
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)} className="w-full">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Detail Dialog */}
      <Dialog open={!!selectedBatch} onOpenChange={(open) => !open && setSelectedBatch(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Request — {selectedBatch?.date}
            </DialogTitle>
          </DialogHeader>

          {selectedBatch && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Submitted: {new Date(selectedBatch.created_at).toLocaleString()}
              </p>
              <div className="rounded-lg border border-border divide-y divide-border">
                {selectedBatch.rows.map((r) => {
                  const name = resolveItemName(r, inventory);
                  const unit = resolveUnit(r, inventory);
                  const isApproved = r.notes?.includes('[APPROVED]');
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        <p className="text-[10px] text-muted-foreground">{unit}</p>
                      </div>
                      {isApproved ? (
                        <span className="text-sm text-muted-foreground">{editQty[r.id] ?? r.quantity_used} {unit}</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number" min={0} step="0.1"
                            className="w-20 h-8 text-sm text-center"
                            value={editQty[r.id] ?? r.quantity_used ?? 0}
                            onChange={(e) => setEditQty({ ...editQty, [r.id]: parseFloat(e.target.value) || 0 })}
                          />
                          <span className="text-xs text-muted-foreground w-8">{unit}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {selectedBatch.rows[0]?.notes?.includes('[APPROVED]') && (
                <Badge variant="outline" className="border-green-500 text-green-600 w-full justify-center py-1">
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Approved
                </Badge>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => selectedBatch && handlePrintBatch(selectedBatch)}>
              <Printer className="h-4 w-4 mr-1.5" /> Print
            </Button>
            {selectedBatch && !selectedBatch.rows[0]?.notes?.includes('[APPROVED]') && (
              <Button className="flex-1" onClick={() => selectedBatch && handleApproveBatch(selectedBatch)} disabled={approving}>
                {approving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
                Approve All
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
