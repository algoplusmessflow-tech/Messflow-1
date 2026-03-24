import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { uploadFile } from '@/lib/upload-service';
import type { DeliveryCompletion } from '@/integrations/supabase/types';

export type DeliveryCompletionWithDetails = DeliveryCompletion & {
  member_name?: string;
  member_phone?: string;
  driver_name?: string;
  driver_phone?: string;
};

export function useDeliveryCompletions(options?: { ownerId?: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const ownerId = options?.ownerId || user?.id;

  const fetchCompletions = async () => {
    if (!ownerId) return [];

    const { data, error } = await supabase
      .from('delivery_completions')
      .select(`
        *,
        member:members(id, name, phone),
        driver:drivers(id, name, phone)
      `)
      .eq('owner_id', ownerId)
      .order('completed_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      ...item,
      member_name: item.member?.name,
      member_phone: item.member?.phone,
      driver_name: item.driver?.name,
      driver_phone: item.driver?.phone,
    })) as DeliveryCompletionWithDetails[];
  };

  const { data: completions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['deliveryCompletions', ownerId],
    queryFn: fetchCompletions,
    enabled: !!ownerId,
  });

  return { completions, isLoading, error, refetch };
}

export function useDriverDeliveryCompletions(driverId?: string, ownerId?: string) {
  const fetchDriverCompletions = async () => {
    if (!driverId || !ownerId) return [];

    const { data, error } = await supabase
      .from('delivery_completions')
      .select(`
        *,
        member:members(id, name, phone, address, location_lat, location_lng)
      `)
      .eq('driver_id', driverId)
      .eq('owner_id', ownerId)
      .eq('delivery_date', new Date().toISOString().split('T')[0])
      .order('completed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const { data: todayCompletions = [], isLoading, refetch } = useQuery({
    queryKey: ['driverDeliveryCompletions', driverId, ownerId],
    queryFn: fetchDriverCompletions,
    enabled: !!driverId && !!ownerId,
  });

  return { todayCompletions, isLoading, refetch };
}

export function useCompleteDelivery() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const completeDelivery = useMutation({
    mutationFn: async ({
      memberId,
      driverId,
      ownerId,
      proofPhoto,
      locationLat,
      locationLng,
      locationMatched,
      locationMatchDistanceKm,
      notes,
      status,
    }: {
      memberId: string;
      driverId: string;
      ownerId: string;
      proofPhoto?: File;
      locationLat?: number;
      locationLng?: number;
      locationMatched?: boolean;
      locationMatchDistanceKm?: number;
      notes?: string;
      status?: string;
    }) => {
      let proofPhotoUrl: string | null = null;
      let proofPhotoSize: number | null = null;

      if (proofPhoto) {
        try {
          const uploadResult = await uploadFile(proofPhoto, ownerId, {
            folder: 'mess-manager/delivery-proofs',
          });
          proofPhotoUrl = uploadResult.url;
          proofPhotoSize = uploadResult.size;
        } catch (uploadError) {
          console.error('Photo upload failed:', uploadError);
          throw new Error('Failed to upload proof photo');
        }
      }

      const completionStatus = status || (locationMatched === false ? 'flagged' : 'completed');

      const { data, error } = await supabase
        .from('delivery_completions')
        .insert({
          member_id: memberId,
          driver_id: driverId,
          owner_id: ownerId,
          delivery_date: new Date().toISOString().split('T')[0],
          completed_at: new Date().toISOString(),
          proof_photo_url: proofPhotoUrl,
          proof_photo_size: proofPhotoSize,
          location_lat: locationLat || null,
          location_lng: locationLng || null,
          location_matched: locationMatched ?? null,
          location_match_distance_km: locationMatchDistanceKm || null,
          notes: notes || null,
          status: completionStatus,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('members')
        .update({ delivery_status: completionStatus } as any)
        .eq('id', memberId)
        .eq('owner_id', ownerId);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deliveryCompletions', variables.ownerId] });
      queryClient.invalidateQueries({ queryKey: ['driverDeliveryCompletions', variables.driverId] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Delivery completed successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to complete delivery');
    },
  });

  return completeDelivery;
}

export function useCheckDeliveryCompleted(memberId: string, driverId: string, ownerId: string) {
  const fetchStatus = async () => {
    if (!memberId || !driverId || !ownerId) return null;

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('delivery_completions')
      .select('*')
      .eq('member_id', memberId)
      .eq('driver_id', driverId)
      .eq('delivery_date', today)
      .maybeSingle();

    if (error) {
      console.error('Error checking delivery status:', error);
      return null;
    }

    return data;
  };

  return useQuery({
    queryKey: ['deliveryStatus', memberId, driverId, todayDate()],
    queryFn: fetchStatus,
    enabled: !!memberId && !!driverId && !!ownerId,
    staleTime: 30000,
    refetchInterval: 30000,
  });
}

function todayDate() {
  return new Date().toISOString().split('T')[0];
}
