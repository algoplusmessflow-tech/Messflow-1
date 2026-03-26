-- =====================================================
-- REFERRAL SYSTEM ENHANCEMENT
-- Adds reward tracking, referred_by field on members,
-- and auto-generate referral codes
-- =====================================================

-- Add referred_by to members table
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS referred_by_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS referral_code_used TEXT;

-- Add reward tracking to referral_uses
ALTER TABLE public.referral_uses ADD COLUMN IF NOT EXISTS reward_amount NUMERIC DEFAULT 0;
ALTER TABLE public.referral_uses ADD COLUMN IF NOT EXISTS reward_status TEXT DEFAULT 'pending';  -- pending, paid, cancelled
ALTER TABLE public.referral_uses ADD COLUMN IF NOT EXISTS reward_paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.referral_uses ADD COLUMN IF NOT EXISTS payment_confirmed BOOLEAN DEFAULT false;
ALTER TABLE public.referral_uses ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add referral stats to referral_codes
ALTER TABLE public.referral_codes ADD COLUMN IF NOT EXISTS total_revenue_generated NUMERIC DEFAULT 0;
ALTER TABLE public.referral_codes ADD COLUMN IF NOT EXISTS reward_per_referral NUMERIC DEFAULT 50;

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_members_referred_by ON public.members(referred_by_member_id);
CREATE INDEX IF NOT EXISTS idx_referral_uses_status ON public.referral_uses(reward_status);

-- Verify
SELECT 'members.referred_by_member_id' as col, count(*) FROM public.members WHERE referred_by_member_id IS NOT NULL
UNION ALL
SELECT 'referral_codes', count(*) FROM public.referral_codes
UNION ALL
SELECT 'referral_uses', count(*) FROM public.referral_uses;
