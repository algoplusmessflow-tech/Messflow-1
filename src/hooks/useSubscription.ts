import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import { toast } from 'sonner';
import { getDaysUntilExpiry } from '@/lib/format';

export function useSubscription() {
  const { profile, isLoading } = useProfile();
  const queryClient = useQueryClient();

  const subscriptionStatus = profile?.subscription_status || 'trial';
  const subscriptionExpiry = profile?.subscription_expiry ? new Date(profile.subscription_expiry) : null;
  const daysUntilExpiry = subscriptionExpiry ? getDaysUntilExpiry(subscriptionExpiry) : null;

  const isExpired = subscriptionStatus === 'expired' || (daysUntilExpiry !== null && daysUntilExpiry < 0);
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
  const paymentLink = profile?.payment_link || null;

  // Apply promo code
  const applyPromoCode = useMutation({
    mutationFn: async (code: string) => {
      // First check if code exists and is valid
      const { data: promoCode, error: promoError } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_used', false)
        .maybeSingle();

      if (promoError) throw promoError;
      if (!promoCode) throw new Error('Invalid or already used promo code');

      // Check if promo code has assignments (restricted to specific users)
      const { data: assignments, error: assignmentError } = await supabase
        .from('promo_code_assignments')
        .select('profile_id')
        .eq('promo_code_id', promoCode.id);

      if (assignmentError) throw assignmentError;

      // If there are assignments, check if current user is in the list
      if (assignments && assignments.length > 0) {
        const isAssigned = assignments.some(a => a.profile_id === profile?.id);
        if (!isAssigned) {
          throw new Error('This promo code is not available for your account');
        }
      }

      // Calculate new expiry date
      const currentExpiry = subscriptionExpiry || new Date();
      const newExpiry = new Date(currentExpiry);
      newExpiry.setDate(newExpiry.getDate() + promoCode.days_to_add);

      // Update profile subscription
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'active',
          subscription_expiry: newExpiry.toISOString(),
        })
        .eq('id', profile?.id);

      if (updateError) throw updateError;

      // Mark promo code as used
      const { error: markUsedError } = await supabase
        .from('promo_codes')
        .update({
          is_used: true,
          used_by: profile?.user_id,
          used_at: new Date().toISOString(),
        })
        .eq('id', promoCode.id);

      if (markUsedError) throw markUsedError;

      return { daysAdded: promoCode.days_to_add };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success(`Subscription extended by ${data.daysAdded} days!`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Mark broadcast as seen
  const markBroadcastSeen = useMutation({
    mutationFn: async (broadcastId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ last_broadcast_seen_id: broadcastId })
        .eq('id', profile?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  return {
    isLoading,
    subscriptionStatus,
    subscriptionExpiry,
    daysUntilExpiry,
    isExpired,
    isExpiringSoon,
    paymentLink,
    applyPromoCode,
    markBroadcastSeen,
    lastBroadcastSeenId: profile?.last_broadcast_seen_id,
  };
}
