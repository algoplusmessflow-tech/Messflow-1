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
import { Plus, Minus, Trash2, Loader2, Package, Pencil, Upload, ArrowDown, ChefHat, Clock, CheckCircle } from 'lucide-react';
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
function KitchenRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { inventory } = useInventory();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['kitchen-requests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('inventory_consumption')
        .select('*, inventory:inventory_id(item_name, unit)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) {
        // Fallback without join
        const fallback = await supabase
          .from('inventory_consumption')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        return (fallback.data || []).map((r: any) => ({ ...r, inventory: null }));
      }
      return (data || []).map((r: any) => ({
        ...r,
        inventory: Array.isArray(r.inventory) ? r.inventory[0] : r.inventory,
      }));
    },
    enabled: !!user,
    staleTime: 15000,
  });

  const kitchenRequests = requests.filter((r: any) => r.notes?.includes('Kitchen request') || r.notes?.includes('SPECIAL REQUEST'));

  if (kitchenRequests.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ChefHat className="h-4 w-4 text-primary" />
            Kitchen Requests
            <Badge variant="secondary" className="text-[10px]">{kitchenRequests.length}</Badge>
          </h3>
        </div>
        <div className="space-y-2">
          {kitchenRequests.map((req: any) => {
            const isSpecial = req.notes?.includes('SPECIAL REQUEST');
            const itemName = req.inventory?.item_name || (isSpecial ? req.notes?.replace('SPECIAL REQUEST: ', '') : 'Unknown item');
            return (
              <div key={req.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{itemName}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {req.date || format(new Date(req.created_at), 'dd MMM')}
                    {req.quantity_used > 0 && <span>· Qty: {req.quantity_used}</span>}
                    {isSpecial && <Badge variant="outline" className="text-[9px] h-4">Special</Badge>}
                  </div>
                </div>
                <Button
                  size="sm" variant="outline" className="text-xs h-7"
                  onClick={async () => {
                    // Mark as fulfilled by deleting or updating
                    await supabase.from('inventory_consumption').delete().eq('id', req.id);
                    queryClient.invalidateQueries({ queryKey: ['kitchen-requests'] });
                    toast.success('Request fulfilled');
                  }}
                >
                  <CheckCircle className="h-3 w-3 mr-1" /> Done
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
