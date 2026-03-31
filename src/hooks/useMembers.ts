import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';
import type { Database } from '@/integrations/supabase/types';

type Member = Database['public']['Tables']['members']['Row'];
type MemberInsert = Database['public']['Tables']['members']['Insert'];
type MemberUpdate = Database['public']['Tables']['members']['Update'];

export function useMembers() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching members:', error);
        throw error;
      }
      return data as Member[];
    },
    enabled: !!user && !authLoading,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('members-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'members',
          filter: `owner_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['members', user?.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const addMember = useMutation({
    mutationFn: async (member: Omit<MemberInsert, 'owner_id'>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('members')
        .insert({ ...member, owner_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', user?.id] });
      toast.success('Member added successfully!');
    },
    onError: (error) => {
      toast.error('Failed to add member: ' + error.message);
    },
  });

  const updateMember = useMutation({
    mutationFn: async ({ id, ...updates }: MemberUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('members')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', user?.id] });
      toast.success('Member updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update member: ' + error.message);
    },
  });

  const deleteMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', user?.id] });
      toast.success('Member deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete member: ' + error.message);
    },
  });

  return {
    members,
    isLoading,
    addMember,
    updateMember,
    deleteMember,
    activeCount: members.filter((m) => m.status === 'active').length,
    totalBalance: members.reduce((sum, m) => sum + Number(m.balance), 0),
  };
}
