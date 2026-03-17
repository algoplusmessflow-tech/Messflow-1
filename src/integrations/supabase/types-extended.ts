import { Database } from './types';

export type SalesPerson = Database['public']['Tables']['sales_persons']['Row'];
export type SalesPersonInsert = Database['public']['Tables']['sales_persons']['Insert'];
export type SalesPersonUpdate = Database['public']['Tables']['sales_persons']['Update'];

export type DeletionRequest = Database['public']['Tables']['deletion_requests']['Row'];
export type DeletionRequestInsert = Database['public']['Tables']['deletion_requests']['Insert'];
export type DeletionRequestUpdate = Database['public']['Tables']['deletion_requests']['Update'];

export type MemberWithLocation = Database['public']['Tables']['members']['Row'] & {
  address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  map_link?: string | null;
  delivery_area_id?: string | null;
  sales_person_id?: string | null;
  meal_type?: string;
  roti_quantity?: number;
  rice_type?: string;
  dietary_preference?: string;
  special_notes?: string | null;
  pause_service?: boolean;
  skip_weekends?: boolean;
  free_trial?: boolean;
};

export type ProfileWithSlug = Database['public']['Tables']['profiles']['Row'] & {
  business_slug?: string | null;
  feature_white_ui?: boolean;
  feature_slug_links?: boolean;
};

export type ReferralCode = {
  id: string;
  owner_id: string;
  member_id: string | null;
  code: string;
  discount_percent: number;
  max_uses: number;
  uses_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  members?: { name: string; phone: string } | null;
};

export type ReferralUse = {
  id: string;
  owner_id: string;
  referral_code_id: string;
  referrer_member_id: string | null;
  referred_member_id: string;
  discount_applied: number;
  used_at: string;
  referral_codes?: { code: string } | null;
  referred_members?: { name: string; phone: string } | null;
  referrer_members?: { name: string } | null;
};
