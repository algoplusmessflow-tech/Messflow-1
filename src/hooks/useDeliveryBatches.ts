import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export type DeliveryArea = {
  id: string;
  name: string;
  description?: string | null;
  owner_id: string;
  center_lat: number | null;
  center_lng: number | null;
  radius_km: number | null;
  driver_id: string | null;
  created_at: string;
  updated_at: string;
  driver?: {
    id: string;
    name: string;
    phone: string;
  };
  member_count?: number;
  members_in_radius?: number;
};

export type Driver = {
  id: string;
  name: string;
  phone: string;
  access_code: string;
  status: string;
  owner_id: string;
  zone_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type DriverZoneMapping = {
  id: string;
  driver_id: string;
  zone_id: string;
  assigned_at: string;
  assigned_by: string | null;
};

export type MemberGeo = {
  id: string;
  name: string;
  phone: string;
  address?: string | null;
  delivery_area_id: string | null;
  location_lat: number | null;
  location_lng: number | null;
  map_link: string | null;
  status: string;
};

export function useDeliveryAreas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: areas = [], isLoading } = useQuery({
    queryKey: ['deliveryAreas', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('delivery_areas')
        .select('*, driver:drivers(id, name, phone)')
        .eq('owner_id', user.id)
        .order('name');
      if (error) throw error;
      return (data || []).map((area: any) => ({
        ...area,
        driver: area.driver?.[0] || null,
        center_lat: area.center_lat || null,
        center_lng: area.center_lng || null,
        radius_km: area.radius_km || null,
        driver_id: area.driver_id || null,
      })) as unknown as DeliveryArea[];
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const addArea = useMutation({
    mutationFn: async (data: { name: string; description?: string; center_lat?: number | null; center_lng?: number | null; radius_km?: number }) => {
      if (!user) throw new Error('Not authenticated');
      const { data: inserted, error } = await supabase
        .from('delivery_areas')
        .insert({ 
          name: data.name, 
          description: data.description || null,
          center_lat: data.center_lat || null,
          center_lng: data.center_lng || null,
          radius_km: data.radius_km || 5,
          owner_id: user.id 
        } as any)
        .select('*, driver:drivers(id, name, phone)')
        .single();
      if (error) throw error;
      return inserted as unknown as DeliveryArea;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryAreas'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
      toast.success('Delivery area created!');
    },
    onError: (error: Error) => {
      toast.error('Failed to create area: ' + error.message);
    },
  });

  const updateArea = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; description?: string; center_lat?: number | null; center_lng?: number | null; radius_km?: number }) => {
      if (!user) throw new Error('Not authenticated');
      const { data: updated, error } = await supabase
        .from('delivery_areas')
        .update({ 
          name: data.name, 
          description: data.description || null,
          center_lat: data.center_lat || null,
          center_lng: data.center_lng || null,
          radius_km: data.radius_km || 5,
          updated_at: new Date().toISOString() 
        } as any)
        .eq('id', id)
        .eq('owner_id', user.id)
        .select('*, driver:drivers(id, name, phone)')
        .single();
      if (error) throw error;
      return updated as unknown as DeliveryArea;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryAreas'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
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
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
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
    staleTime: 30000,
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

export function useDriverZoneMappings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ['driverZoneMappings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('driver_zone_mapping')
        .select('*, driver:drivers(id, name, phone), zone:delivery_areas(id, name)')
        .order('assigned_at', { ascending: false });
      if (error) {
        console.warn('Error fetching driver zone mappings:', error);
        return [];
      }
      return data as DriverZoneMapping[];
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const assignDriverToZone = useMutation({
    mutationFn: async ({ driverId, zoneId }: { driverId: string; zoneId: string }) => {
      const { data, error } = await supabase
        .from('driver_zone_mapping')
        .insert({ driver_id: driverId, zone_id: zoneId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverZoneMappings'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
      toast.success('Driver assigned to zone!');
    },
    onError: (error: Error) => {
      if (error.message.includes('unique')) {
        toast.error('Driver is already assigned to this zone');
      } else {
        toast.error('Failed to assign driver: ' + error.message);
      }
    },
  });

  const removeDriverFromZone = useMutation({
    mutationFn: async ({ driverId, zoneId }: { driverId: string; zoneId: string }) => {
      const { error } = await supabase
        .from('driver_zone_mapping')
        .delete()
        .eq('driver_id', driverId)
        .eq('zone_id', zoneId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverZoneMappings'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
      toast.success('Driver removed from zone');
    },
    onError: (error: Error) => {
      toast.error('Failed to remove driver: ' + error.message);
    },
  });

  return { mappings, isLoading, assignDriverToZone, removeDriverFromZone };
}

export function useMemberByArea() {
  const { user } = useAuth();

  const { data: membersByArea = {}, isLoading } = useQuery({
    queryKey: ['membersByArea', user?.id],
    queryFn: async () => {
      if (!user) return {};
      
      try {
        const { data, error } = await supabase
          .from('members')
          .select('id, name, phone, status, address, delivery_area_id' as any)
          .eq('owner_id', user.id)
          .eq('status', 'active');

        if (error) throw error;

        const grouped = data?.reduce((acc, member: any) => {
          const areaId = member.delivery_area_id || 'unassigned';
          if (!acc[areaId]) acc[areaId] = [];
          acc[areaId].push(member);
          return acc;
        }, {} as { [areaId: string]: typeof data });

        return grouped;
      } catch (err) {
        console.warn('Error fetching members by area:', err);
        return {};
      }
    },
    enabled: !!user,
    staleTime: 30000,
  });

  return { membersByArea, isLoading };
}

export function useMembersWithGeo() {
  const { user } = useAuth();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members-geo', user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const { data, error } = await supabase
          .from('members')
          .select('id, name, phone, status, address, delivery_area_id, location_lat, location_lng, map_link' as any)
          .eq('owner_id', user.id)
          .eq('status', 'active');
        if (error) throw error;
        return (data || []) as unknown as MemberGeo[];
      } catch { return []; }
    },
    enabled: !!user,
    staleTime: 30000,
  });

  return { members, isLoading };
}
