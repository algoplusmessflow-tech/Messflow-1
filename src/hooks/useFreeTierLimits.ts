import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/hooks/useProfile';
import type { Profile } from '@/integrations/supabase/types';

export const FREE_TIER_LIMITS = {
  MEMBERS: 50,
  INVOICES: 50,
  RECEIPT_SLOTS: 10,
  STORAGE_MB: 50,
  PDF_GENERATIONS: 15,
  EXCEL_GENERATIONS: 15,
} as const;

export function useFreeTierLimits() {
  const { user } = useAuth();
  const { profile } = useProfile();
  
  const planType = profile?.plan_type || 'free';
  const isPro = planType === 'pro';
  const invoiceCount = profile?.invoice_count || 0;

  // Count members
  const { data: memberCount = 0 } = useQuery({
    queryKey: ['member-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  // Count expenses with receipts
  const { data: receiptCount = 0 } = useQuery({
    queryKey: ['receipt-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .not('receipt_url', 'is', null);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  const limits = useMemo(() => {
    if (isPro) {
      return {
        canAddMember: true,
        canGenerateInvoice: true,
        canUploadReceipt: true,
        memberCount,
        memberLimit: Infinity,
        invoiceCount,
        invoiceLimit: Infinity,
        receiptCount,
        receiptLimit: Infinity,
        isPro: true,
      };
    }

    return {
      canAddMember: memberCount < FREE_TIER_LIMITS.MEMBERS,
      canGenerateInvoice: invoiceCount < FREE_TIER_LIMITS.INVOICES,
      canUploadReceipt: receiptCount < FREE_TIER_LIMITS.RECEIPT_SLOTS,
      memberCount,
      memberLimit: FREE_TIER_LIMITS.MEMBERS,
      invoiceCount,
      invoiceLimit: FREE_TIER_LIMITS.INVOICES,
      receiptCount,
      receiptLimit: FREE_TIER_LIMITS.RECEIPT_SLOTS,
      isPro: false,
    };
  }, [isPro, memberCount, invoiceCount, receiptCount]);

  return limits;
}
