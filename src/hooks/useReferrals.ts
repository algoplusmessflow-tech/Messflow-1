import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import type { ReferralCode, ReferralUse } from '@/integrations/supabase/types-extended';

function generateReferralCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function useReferralCodes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: referralCodes = [], isLoading, error } = useQuery({
    queryKey: ['referralCodes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const { data, error } = await supabase
          .from('referral_codes')
          .select('*, members(name, phone)')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.warn('Referral codes table may not exist yet:', error.message);
          return [];
        }
        return data as ReferralCode[];
      } catch (e) {
        console.warn('Error fetching referral codes:', e);
        return [];
      }
    },
    enabled: !!user,
  });

  const createReferralCode = useMutation({
    mutationFn: async ({ memberId, discountPercent, maxUses, expiresAt }: {
      memberId?: string;
      discountPercent?: number;
      maxUses?: number;
      expiresAt?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      let code = generateReferralCode();
      
      // Ensure unique code
      const { data: existing } = await supabase
        .from('referral_codes')
        .select('id')
        .eq('code', code)
        .single();
      
      if (existing) {
        code = generateReferralCode();
      }

      const { data, error } = await supabase
        .from('referral_codes')
        .insert({
          owner_id: user.id,
          member_id: memberId || null,
          code,
          discount_percent: discountPercent || 5,
          max_uses: maxUses || 10,
          expires_at: expiresAt || null,
        })
        .select('*, members(name, phone)')
        .single();

      if (error) throw error;
      return data as ReferralCode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referralCodes', user?.id] });
      toast.success('Referral code created!');
    },
    onError: (error: Error) => {
      toast.error('Failed to create referral code: ' + error.message);
    },
  });

  const toggleReferralCode = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('referral_codes')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, members(name, phone)')
        .single();

      if (error) throw error;
      return data as ReferralCode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referralCodes', user?.id] });
      toast.success('Referral code updated!');
    },
    onError: (error: Error) => {
      toast.error('Failed to update referral code: ' + error.message);
    },
  });

  const deleteReferralCode = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('referral_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referralCodes', user?.id] });
      toast.success('Referral code deleted!');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete referral code: ' + error.message);
    },
  });

  return {
    referralCodes,
    isLoading,
    error,
    createReferralCode,
    toggleReferralCode,
    deleteReferralCode,
  };
}

export function useReferralUses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: referralUses = [], isLoading, error } = useQuery({
    queryKey: ['referralUses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const { data, error } = await supabase
          .from('referral_uses')
          .select('*, referral_codes(code), referred_members(name, phone), referrer_members(name)')
          .eq('owner_id', user.id)
          .order('used_at', { ascending: false });
        
        if (error) {
          console.warn('Referral uses table may not exist yet:', error.message);
          return [];
        }
        return data as ReferralUse[];
      } catch (e) {
        console.warn('Error fetching referral uses:', e);
        return [];
      }
    },
    enabled: !!user,
  });

  return {
    referralUses,
    isLoading,
    error,
  };
}

export function useValidateReferralCode(code: string) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['validateReferralCode', code],
    queryFn: async () => {
      if (!code) return null;
      try {
        const { data: referral, error } = await supabase
          .from('referral_codes')
          .select('*, members(name, phone)')
          .eq('code', code.toUpperCase())
          .eq('is_active', true)
          .single();
        
        if (error || !referral) return null;
        
        // Check if expired
        if (referral.expires_at && new Date(referral.expires_at) < new Date()) {
          return null;
        }
        
        // Check if max uses reached
        if (referral.uses_count >= referral.max_uses) {
          return null;
        }
        
        return referral as ReferralCode;
      } catch {
        return null;
      }
    },
    enabled: !!code,
  });

  return { referralCode: data, isLoading, refetch };
}
