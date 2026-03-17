import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, MapPin, Loader2, Users, Search, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type DeliveryZone = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
};

export default function DeliveryZones() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  // Fetch zones with member count
  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['delivery-zones', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: areas, error } = await supabase
        .from('delivery_areas')
        .select('*')
        .eq('owner_id', user.id)
        .order('name');
      if (error) throw error;

      // Get member counts per zone
      const { data: members } = await supabase
        .from('members')
        .select('delivery_area_id')
        .eq('owner_id', user.id)
        .not('delivery_area_id', 'is', null);

      const countMap: Record<string, number> = {};
      (members || []).forEach((m: any) => {
        if (m.delivery_area_id) {
          countMap[m.delivery_area_id] = (countMap[m.delivery_area_id] || 0) + 1;
        }
      });

      return (areas || []).map((a: any) => ({
        ...a,
        member_count: countMap[a.id] || 0,
      }));
    },
    enabled: !!user,
  });

  const addZone = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data: zone, error } = await supabase
        .from('delivery_areas')
        .insert({ owner_id: user.id, name: data.name.trim(), description: data.description.trim() || null })
        .select()
        .single();
      if (error) throw error;
      return zone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones', user?.id] });
      toast.success('Zone added!');
      setIsAddOpen(false);
      setFormData({ name: '', description: '' });
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const updateZone = useMutation({
    mutationFn: async (data: { id: string; name: string; description: string }) => {
      const { error } = await supabase
        .from('delivery_areas')
        .update({ name: data.name.trim(), description: data.description.trim() || null })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones', user?.id] });
      toast.success('Zone updated!');
      setIsEditOpen(false);
      setSelectedZone(null);
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const deleteZone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('delivery_areas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones', user?.id] });
      toast.success('Zone deleted!');
      setDeleteId(null);
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const openEdit = (zone: DeliveryZone) => {
    setSelectedZone(zone);
    setFormData({ name: zone.name, description: zone.description || '' });
    setIsEditOpen(true);
  };

  const filteredZones = zones.filter((z) =>
    searchQuery === '' || z.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalMembers = zones.reduce((sum, z) => sum + (z.member_count || 0), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MapPin className="h-6 w-6 text-primary" />
              Delivery Zones
            </h1>
            <p className="text-muted-foreground">
              {zones.length} zones · {totalMembers} members assigned
            </p>
          </div>
          <Button onClick={() => { setFormData({ name: '', description: '' }); setIsAddOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Add Zone
          </Button>
        </div>

        {/* Search */}
        {zones.length > 3 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search zones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchQuery('')}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        {/* Zone List */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
          ) : filteredZones.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">
                  {zones.length === 0
                    ? 'No delivery zones yet. Create your first zone to organize deliveries by area.'
                    : 'No zones match your search.'}
                </p>
                {zones.length === 0 && (
                  <Button className="mt-4" onClick={() => setIsAddOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Create First Zone
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredZones.map((zone) => (
              <Card key={zone.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <MapPin className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium truncate">{zone.name}</h3>
                          {zone.description && (
                            <p className="text-sm text-muted-foreground truncate">{zone.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {zone.member_count}
                      </Badge>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(zone)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(zone.id)}
                        disabled={zone.member_count > 0}
                        title={zone.member_count > 0 ? 'Remove members from this zone first' : 'Delete zone'}
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

        {/* Add Zone Dialog */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Delivery Zone</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addZone.mutate(formData); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="zone-name">Zone Name *</Label>
                <Input
                  id="zone-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Downtown, West End, Midtown"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zone-desc">Description</Label>
                <Textarea
                  id="zone-desc"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Area boundaries, landmarks, notes..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1" disabled={addZone.isPending || !formData.name.trim()}>
                  {addZone.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Zone
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Zone Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Zone</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); if (selectedZone) updateZone.mutate({ id: selectedZone.id, ...formData }); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Zone Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1" disabled={updateZone.isPending || !formData.name.trim()}>
                  {updateZone.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Zone?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this delivery zone. Members assigned to this zone will be unassigned.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteId && deleteZone.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
