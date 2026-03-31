// src/pages/RestaurantMenu.tsx
// Restaurant Menu Management - Add/Edit menu items for restaurant mode

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Search, Utensils, Coffee, Wine, Cake, Salad, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MenuItem {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  price: number;
  is_available: boolean | null;
  is_veg: boolean | null;
  image_url: string | null;
  preparation_time: number | null;
  sort_order: number | null;
}

const CATEGORIES = [
  { id: 'starters', label: 'Starters', icon: Utensils },
  { id: 'main-course', label: 'Main Course', icon: Utensils },
  { id: 'beverages', label: 'Beverages', icon: Coffee },
  { id: 'desserts', label: 'Desserts', icon: Cake },
  { id: 'salads', label: 'Salads', icon: Salad },
  { id: 'sides', label: 'Sides', icon: Wine },
];

export default function RestaurantMenu() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'main-course',
    description: '',
    price: '',
    is_veg: true,
    is_available: true,
    preparation_time: '',
  });

  // Fetch menu items
  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['restaurant-menu-items', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('owner_id', user?.id)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as MenuItem[];
    },
    enabled: !!user,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const itemData = {
        name: formData.name.trim(),
        category: formData.category,
        description: formData.description.trim() || null,
        price: parseFloat(formData.price) || 0,
        is_veg: formData.is_veg,
        is_available: formData.is_available,
        preparation_time: formData.preparation_time ? parseInt(formData.preparation_time) : null,
        owner_id: user?.id,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('menu_items')
          .update(itemData)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('menu_items')
          .insert(itemData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-menu-items'] });
      toast.success(editingItem ? 'Menu item updated!' : 'Menu item added!');
      closeModal();
    },
    onError: (error: Error) => {
      toast.error('Failed to save: ' + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-menu-items'] });
      toast.success('Menu item deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete: ' + error.message);
    },
  });

  // Toggle availability
  const toggleAvailability = async (item: MenuItem) => {
    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: !item.is_available })
      .eq('id', item.id);
    
    if (error) {
      toast.error('Failed to update availability');
      return;
    }
    
    queryClient.invalidateQueries({ queryKey: ['restaurant-menu-items'] });
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: 'main-course',
      description: '',
      price: '',
      is_veg: true,
      is_available: true,
      preparation_time: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category || 'main-course',
      description: item.description || '',
      price: item.price.toString(),
      is_veg: item.is_veg ?? true,
      is_available: item.is_available ?? true,
      preparation_time: item.preparation_time?.toString() || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  // Filter items
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedItems = filteredItems.reduce((acc, item) => {
    const cat = item.category || 'uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const getCategoryLabel = (cat: string) => {
    return CATEGORIES.find(c => c.id === cat)?.label || cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Restaurant Menu</h1>
            <p className="text-muted-foreground">Manage your restaurant menu items</p>
          </div>
          <Button onClick={openAddModal} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Menu Items */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Utensils className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No menu items found</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Add your first menu item to get started'}
              </p>
              {!searchQuery && selectedCategory === 'all' && (
                <Button onClick={openAddModal}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Item
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category}>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  {getCategoryLabel(category)}
                  <Badge variant="secondary">{items.length}</Badge>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((item) => (
                    <Card key={item.id} className={cn('transition-opacity', !item.is_available && 'opacity-60')}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">{item.name}</h3>
                              {item.is_veg !== null && (
                                <span
                                  className={cn(
                                    'w-4 h-4 rounded-sm flex-shrink-0 border',
                                    item.is_veg ? 'border-green-600 bg-green-600' : 'border-red-600 bg-red-600'
                                  )}
                                />
                              )}
                              {!item.is_available && (
                                <Badge variant="outline" className="text-xs">Unavailable</Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {item.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-sm">
                              <span className="font-bold text-primary">₹{item.price}</span>
                              {item.preparation_time && (
                                <span className="text-muted-foreground">
                                  {item.preparation_time} min
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleAvailability(item)}
                              title={item.is_available ? 'Mark unavailable' : 'Mark available'}
                            >
                              {item.is_available ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <span className="h-4 w-4 text-muted-foreground">✗</span>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(item)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(item.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Butter Chicken"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the dish..."
                className="min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prepTime">Prep Time (min)</Label>
                <Input
                  id="prepTime"
                  type="number"
                  min="0"
                  value={formData.preparation_time}
                  onChange={(e) => setFormData({ ...formData, preparation_time: e.target.value })}
                  placeholder="15"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Label>Veg/Non-Veg</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={formData.is_veg ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData({ ...formData, is_veg: true })}
                    className={cn(formData.is_veg && 'bg-green-600 hover:bg-green-700')}
                  >
                    Veg
                  </Button>
                  <Button
                    type="button"
                    variant={!formData.is_veg ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData({ ...formData, is_veg: false })}
                    className={cn(!formData.is_veg && 'bg-red-600 hover:bg-red-700')}
                  >
                    Non-Veg
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="available">Available</Label>
              <Switch
                id="available"
                checked={formData.is_available}
                onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!formData.name.trim() || !formData.price || saveMutation.isPending}
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? 'Update' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
