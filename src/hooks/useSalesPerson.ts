import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { useEffect } from 'react';
import type { SalesPerson, SalesPersonInsert, SalesPersonUpdate } from '@/integrations/supabase/types-extended';

function generateAccessToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token.toUpperCase();
}

export function useSalesPersons() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: salesPersons = [], isLoading, error } = useQuery({
    queryKey: ['salesPersons', user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const { data, error } = await supabase
          .from('sales_persons')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.warn('Error fetching sales persons:', error.message);
          return [];
        }
        return data as SalesPerson[];
      } catch (e) {
        console.warn('Error in sales persons query:', e);
        return [];
      }
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('sales-persons-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales_persons',
          filter: `owner_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['salesPersons', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const addSalesPerson = useMutation({
    mutationFn: async (salesPerson: Omit<SalesPersonInsert, 'owner_id' | 'access_token'>) => {
      if (!user) throw new Error('Not authenticated');
      
      console.log('Adding sales person:', salesPerson);
      
      const { data, error } = await supabase
        .from('sales_persons')
        .insert({
          ...salesPerson,
          owner_id: user.id,
          access_token: generateAccessToken(),
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Sales person added:', data);
      return data as SalesPerson;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesPersons', user?.id] });
      toast.success('Sales person added successfully!');
    },
    onError: (error: Error) => {
      console.error('Error adding sales person:', error);
      toast.error('Failed to add sales person: ' + error.message);
    },
  });

  const updateSalesPerson = useMutation({
    mutationFn: async ({ id, ...updates }: SalesPersonUpdate & { id: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('sales_persons')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('owner_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as SalesPerson;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesPersons', user?.id] });
      toast.success('Sales person updated successfully!');
    },
    onError: (error: Error) => {
      toast.error('Failed to update sales person: ' + error.message);
    },
  });

  const deleteSalesPerson = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('sales_persons')
        .delete()
        .eq('id', id)
        .eq('owner_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesPersons', user?.id] });
      toast.success('Sales person deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete sales person: ' + error.message);
    },
  });

  const toggleSalesPersonStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('sales_persons')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('owner_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as SalesPerson;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesPersons', user?.id] });
      toast.success('Sales person status updated!');
    },
    onError: (error: Error) => {
      toast.error('Failed to update status: ' + error.message);
    },
  });

  const regenerateAccessToken = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const newToken = generateAccessToken();
      const { data, error } = await supabase
        .from('sales_persons')
        .update({
          access_token: newToken,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('owner_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return { data: data as SalesPerson, newToken };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesPersons', user?.id] });
      toast.success('Access token regenerated!');
    },
    onError: (error: Error) => {
      toast.error('Failed to regenerate token: ' + error.message);
    },
  });

  return {
    salesPersons,
    isLoading,
    addSalesPerson,
    updateSalesPerson,
    deleteSalesPerson,
    toggleSalesPersonStatus,
    regenerateAccessToken,
  };
}

export function useSalesPersonByToken(token: string | null) {
  const { data: salesPerson, isLoading } = useQuery({
    queryKey: ['salesPersonByToken', token],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await supabase
        .from('sales_persons')
        .select('*, profiles!inner(business_name, business_slug)')
        .eq('access_token', token)
        .eq('is_active', true)  // Only allow active sales persons
        .single();
      
      if (error) return null;
      return data as SalesPerson & { profiles?: { business_name: string; business_slug: string } };
    },
    enabled: !!token,
  });

  return { salesPerson, isLoading };
}

export function useDeletionRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: deletionRequests = [], isLoading, error } = useQuery({
    queryKey: ['deletionRequests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const { data, error } = await supabase
          .from('deletion_requests')
          .select('*, members(name, phone), sales_persons(name)')
          .eq('owner_id', user.id)
          .order('requested_at', { ascending: false });
        
        if (error) {
          console.warn('Error fetching deletion requests:', error.message);
          return [];
        }
        return data;
      } catch (e) {
        console.warn('Error in deletion requests query:', e);
        return [];
      }
    },
    enabled: !!user,
  });

  const pendingRequests = deletionRequests.filter(r => r.status === 'pending');

  const approveDeletion = useMutation({
    mutationFn: async ({ requestId, memberId }: { requestId: string; memberId: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      await supabase
        .from('deletion_requests')
        .update({
          status: 'approved',
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq('id', requestId);

      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId)
        .eq('owner_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deletionRequests', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['members', user?.id] });
      toast.success('Member deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error('Failed to approve deletion: ' + error.message);
    },
  });

  const rejectDeletion = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('deletion_requests')
        .update({
          status: 'rejected',
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq('id', requestId)
        .eq('owner_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deletionRequests', user?.id] });
      toast.success('Deletion request rejected!');
    },
    onError: (error: Error) => {
      toast.error('Failed to reject deletion: ' + error.message);
    },
  });

  return {
    deletionRequests,
    pendingRequests,
    isLoading,
    approveDeletion,
    rejectDeletion,
  };
}
