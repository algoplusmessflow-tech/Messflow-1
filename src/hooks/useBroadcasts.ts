import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface Broadcast {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

export function useBroadcasts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch latest broadcast
  const { data: latestBroadcast } = useQuery({
    queryKey: ['latest-broadcast'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as Broadcast | null;
    },
    enabled: !!user,
  });

  // Fetch all broadcasts (for super admin)
  const { data: allBroadcasts = [] } = useQuery({
    queryKey: ['all-broadcasts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Broadcast[];
    },
    enabled: !!user,
  });

  // Create broadcast (super admin only)
  const createBroadcast = useMutation({
    mutationFn: async ({ title, message }: { title: string; message: string }) => {
      const { data, error } = await supabase
        .from('broadcasts')
        .insert({ title, message })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-broadcasts'] });
      queryClient.invalidateQueries({ queryKey: ['latest-broadcast'] });
      toast.success('Broadcast sent!');
    },
    onError: (error) => {
      toast.error('Failed to send broadcast: ' + error.message);
    },
  });

  // Delete broadcast (super admin only)
  const deleteBroadcast = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('broadcasts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-broadcasts'] });
      queryClient.invalidateQueries({ queryKey: ['latest-broadcast'] });
      toast.success('Broadcast deleted!');
    },
    onError: (error) => {
      toast.error('Failed to delete broadcast: ' + error.message);
    },
  });

  return {
    latestBroadcast,
    allBroadcasts,
    createBroadcast,
    deleteBroadcast,
  };
}
