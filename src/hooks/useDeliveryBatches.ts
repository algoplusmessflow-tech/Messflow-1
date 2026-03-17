import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { useEffect } from 'react';

export type DeliveryArea = {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
};

export type Driver = {
  id: string;
  name: string;
  phone: string;
  access_code: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type DeliveryBatch = {
  id: string;
  owner_id: string;
  date: string;
  area_id: string;
  driver_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  area?: DeliveryArea;
  driver?: Driver;
  delivery_count?: number;
  delivered_count?: number;
  pending_count?: number;
};

export type BatchDelivery = {
  id: string;
  owner_id: string;
  batch_id: string;
  member_id: string;
  status: string;
  delivery_time: string | null;
  proof_url: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  member?: {
    id: string;
    name: string;
    phone: string;
    address: string | null;
    location_lat: number | null;
    location_lng: number | null;
    map_link: string | null;
    delivery_area_id: string | null;
  };
};

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function useDeliveryAreas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: areas = [], isLoading } = useQuery({
    queryKey: ['deliveryAreas', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('delivery_areas')
        .select('*')
        .eq('owner_id', user.id)
        .order('name');
      if (error) throw error;
      return data as DeliveryArea[];
    },
    enabled: !!user,
  });

  const addArea = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data: inserted, error } = await supabase
        .from('delivery_areas')
        .insert({ ...data, owner_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return inserted as DeliveryArea;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryAreas'] });
      toast.success('Delivery area created!');
    },
    onError: (error: Error) => {
      toast.error('Failed to create area: ' + error.message);
    },
  });

  const updateArea = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; description?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data: updated, error } = await supabase
        .from('delivery_areas')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('owner_id', user.id)
        .select()
        .single();
      if (error) throw error;
      return updated as DeliveryArea;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryAreas'] });
      toast.success('Area updated!');
    },
    onError: (error: Error) => {
      toast.error('Failed to update area: ' + error.message);
    },
  });

  const deleteArea = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('delivery_areas')
        .delete()
        .eq('id', id)
        .eq('owner_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryAreas'] });
      toast.success('Area deleted!');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete area: ' + error.message);
    },
  });

  return { areas, isLoading, addArea, updateArea, deleteArea };
}

export function useDrivers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('owner_id', user.id)
        .order('name');
      if (error) throw error;
      return data as Driver[];
    },
    enabled: !!user,
  });

  const addDriver = useMutation({
    mutationFn: async (data: { name: string; phone: string; access_code: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data: inserted, error } = await supabase
        .from('drivers')
        .insert({ ...data, owner_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return inserted as Driver;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver created!');
    },
    onError: (error: Error) => {
      toast.error('Failed to create driver: ' + error.message);
    },
  });

  const updateDriver = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; phone: string; status: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data: updated, error } = await supabase
        .from('drivers')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('owner_id', user.id)
        .select()
        .single();
      if (error) throw error;
      return updated as Driver;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver updated!');
    },
    onError: (error: Error) => {
      toast.error('Failed to update driver: ' + error.message);
    },
  });

  const deleteDriver = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', id)
        .eq('owner_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver deleted!');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete driver: ' + error.message);
    },
  });

  return { drivers, isLoading, addDriver, updateDriver, deleteDriver };
}

export function useBatches(date?: string, areaId?: string, driverId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: batches = [], isLoading, refetch } = useQuery({
    queryKey: ['batches', user?.id, date, areaId, driverId],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('delivery_batches')
        .select(`
          *,
          area:delivery_areas(*),
          driver:drivers(*)
        `)
        .eq('owner_id', user.id);

      if (date) {
        query = query.eq('date', date);
      }
      if (areaId) {
        query = query.eq('area_id', areaId);
      }
      if (driverId) {
        query = query.eq('driver_id', driverId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Get delivery counts for each batch
      const batchesWithCounts = await Promise.all((data || []).map(async (batch) => {
        const { data: deliveries } = await supabase
          .from('batch_deliveries')
          .select('status')
          .eq('batch_id', batch.id);

        const deliveryCount = deliveries?.length || 0;
        const deliveredCount = deliveries?.filter(d => d.status === 'delivered').length || 0;
        const pendingCount = deliveries?.filter(d => d.status === 'pending').length || 0;

        return {
          ...batch,
          delivery_count: deliveryCount,
          delivered_count: deliveredCount,
          pending_count: pendingCount,
        };
      }));

      return batchesWithCounts as DeliveryBatch[];
    },
    enabled: !!user,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('batches-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_batches',
          filter: `owner_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['batches'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const checkExistingBatch = async (date: string, areaId?: string) => {
    if (!user) return null;
    
    let query = supabase
      .from('delivery_batches')
      .select('id, date, area_id, status')
      .eq('owner_id', user.id)
      .eq('date', date);

    if (areaId) {
      query = query.eq('area_id', areaId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  };

  const generateBatches = useMutation({
    mutationFn: async ({ date, areaId, regenerate = false }: { date: string; areaId?: string; regenerate?: boolean }) => {
      if (!user) throw new Error('Not authenticated');

      // Check for existing batches first
      if (!regenerate) {
        const existing = await checkExistingBatch(date, areaId);
        if (existing && existing.length > 0) {
          return { existing, skipped: true };
        }
      }

      // If regenerating, delete existing batches for this date
      if (regenerate) {
        const existingBatches = await checkExistingBatch(date, areaId);
        if (existingBatches && existingBatches.length > 0) {
          const batchIds = existingBatches.map(b => b.id);
          await supabase.from('batch_deliveries').delete().in('batch_id', batchIds);
          await supabase.from('delivery_batches').delete().in('id', batchIds);
        }
      }

      // Get active members with location data (only active status)
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('id, name, phone, address, location_lat, location_lng, map_link, delivery_area_id, status')
        .eq('owner_id', user.id)
        .eq('status', 'active');

      if (membersError) throw membersError;

      // Get delivery areas
      const { data: areasData, error: areasError } = await supabase
        .from('delivery_areas')
        .select('*')
        .eq('owner_id', user.id);

      if (areasError) throw areasError;

      // Filter to specific area if provided
      const targetAreas = areaId 
        ? areasData?.filter(a => a.id === areaId) 
        : areasData;

      // Group members by delivery_area_id
      const membersByArea = membersData?.reduce((acc, member) => {
        const areaId = member.delivery_area_id;
        if (areaId) {
          if (!acc[areaId]) acc[areaId] = [];
          acc[areaId].push(member);
        }
        return acc;
      }, {} as { [areaId: string]: typeof membersData });

      // Create batches for each area that has members
      const createdBatches: DeliveryBatch[] = [];
      
      for (const area of targetAreas || []) {
        const membersInArea = membersByArea?.[area.id] || [];
        
        if (membersInArea.length === 0) continue;

        const { data: batchData, error: batchError } = await supabase
          .from('delivery_batches')
          .insert({
            id: generateUUID(),
            owner_id: user.id,
            date: date,
            area_id: area.id,
            status: 'pending'
          })
          .select('*, area:delivery_areas(*), driver:drivers(*)')
          .single();

        if (batchError) throw batchError;

        // Create batch deliveries for each member
        const deliveryInserts = membersInArea.map(member => ({
          id: generateUUID(),
          owner_id: user.id,
          batch_id: batchData.id,
          member_id: member.id,
          status: 'pending'
        }));

        const { error: deliveriesError } = await supabase
          .from('batch_deliveries')
          .insert(deliveryInserts);

        if (deliveriesError) throw deliveriesError;

        createdBatches.push({
          ...batchData,
          delivery_count: membersInArea.length,
          delivered_count: 0,
          pending_count: membersInArea.length,
        } as DeliveryBatch);
      }

      return { createdBatches, skipped: false };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      if ('skipped' in result && result.skipped) {
        toast.info('Batches already exist for this date. Use regenerate to replace them.');
      } else {
        toast.success('Batches generated successfully!');
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to generate batches: ' + error.message);
    },
  });

  const assignDriver = useMutation({
    mutationFn: async ({ batchId, driverId }: { batchId: string; driverId: string | null }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('delivery_batches')
        .update({
          driver_id: driverId,
          status: driverId ? 'assigned' : 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', batchId)
        .eq('owner_id', user.id)
        .select('*, area:delivery_areas(*), driver:drivers(*)')
        .single();
      
      if (error) throw error;
      return data as DeliveryBatch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Driver assigned!');
    },
    onError: (error: Error) => {
      toast.error('Failed to assign driver: ' + error.message);
    },
  });

  const updateBatchStatus = useMutation({
    mutationFn: async ({ batchId, status }: { batchId: string; status: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('delivery_batches')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', batchId)
        .eq('owner_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
    onError: (error: Error) => {
      toast.error('Failed to update batch: ' + error.message);
    },
  });

  return { 
    batches, 
    isLoading, 
    refetch,
    generateBatches, 
    assignDriver, 
    updateBatchStatus,
    checkExistingBatch 
  };
}

export function useBatchDeliveries(batchId: string | null) {
  const { data: deliveries = [], isLoading, refetch } = useQuery({
    queryKey: ['batchDeliveries', batchId],
    queryFn: async () => {
      if (!batchId) return [];
      
      const { data, error } = await supabase
        .from('batch_deliveries')
        .select(`
          *,
          member:members(id, name, phone, address, location_lat, location_lng, map_link, delivery_area_id)
        `)
        .eq('batch_id', batchId)
        .order('created_at');

      if (error) throw error;
      return data as BatchDelivery[];
    },
    enabled: !!batchId,
  });

  const updateDeliveryStatus = useMutation({
    mutationFn: async ({ deliveryId, status, remarks }: { deliveryId: string; status: string; remarks?: string }) => {
      const { data, error } = await supabase
        .from('batch_deliveries')
        .update({
          status,
          remarks: remarks || null,
          delivery_time: status === 'delivered' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Don't invalidate - we'll handle refetch manually for performance
    },
    onError: (error: Error) => {
      toast.error('Failed to update delivery: ' + error.message);
    },
  });

  return { deliveries, isLoading, refetch, updateDeliveryStatus };
}

export function useMemberByArea() {
  const { user } = useAuth();

  const { data: membersByArea = {}, isLoading } = useQuery({
    queryKey: ['membersByArea', user?.id],
    queryFn: async () => {
      if (!user) return {};
      
      const { data, error } = await supabase
        .from('members')
        .select('id, name, phone, address, location_lat, location_lng, delivery_area_id, status')
        .eq('owner_id', user.id)
        .eq('status', 'active');

      if (error) throw error;

      const grouped = data?.reduce((acc, member) => {
        const areaId = member.delivery_area_id || 'unassigned';
        if (!acc[areaId]) acc[areaId] = [];
        acc[areaId].push(member);
        return acc;
      }, {} as { [areaId: string]: typeof data });

      return grouped;
    },
    enabled: !!user,
  });

  return { membersByArea, isLoading };
}
