import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { useEffect } from 'react';

interface Profile {
  id: string;
  user_id: string;
  business_name: string;
  owner_email: string;
  subscription_status: 'active' | 'expired' | 'trial';
  subscription_expiry: string | null;
  plan_type: 'free' | 'pro' | 'enterprise'; // Added plan_type
  payment_link: string | null;
  storage_used: number;
  storage_limit: number;
  tax_trn: string | null;
  tax_name: string | null;
  tax_rate: number | null;
  is_paid: boolean;
  whatsapp_api_key: string | null;
  created_at: string;
  updated_at: string;
  member_count?: number;
  is_platform_gateway_enabled?: boolean;
  platform_gateway_config?: any;
}

// ... (rest of the file until updateSubscription)



interface MemberData {
  id: string;
  name: string;
  phone: string;
  status: string;
  plan_type: string;
  balance: number;
  monthly_fee: number;
  joining_date: string;
  plan_expiry_date: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  selected_menu_week: number | null;
}

interface MenuData {
  id: string;
  day: string;
  week_number: number;
  breakfast: string | null;
  lunch: string | null;
  dinner: string | null;
  optional_dishes: any;
  owner_id: string;
}

export interface MemberWithMenuData extends MemberData {
  menuDetails?: {
    week: number;
    days: {
      day: string;
      breakfast: string;
      lunch: string;
      dinner: string;
    }[];
  };
}

interface PromoCode {
  id: string;
  code: string;
  days_to_add: number;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
}

interface PromoCodeAssignment {
  id: string;
  promo_code_id: string;
  profile_id: string;
  created_at: string;
  profile?: {
    business_name: string;
    owner_email: string;
  };
}

interface SuperAdminUser {
  id: string;
  user_id: string;
  role: 'super_admin' | 'mess_owner';
  created_at: string;
  email?: string;
}

export function useSuperAdmin() {
  const { isSuperAdmin } = useUserRole();
  const { user } = useAuth();
  const queryClient = useQueryClient();



  // Fetch all profiles (owners) with member counts
  const { data: allProfiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get member counts for each profile
      const profilesWithCounts = await Promise.all(
        (profiles as Profile[]).map(async (profile) => {
          const { count } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', profile.user_id);

          return {
            ...profile,
            member_count: count || 0,
          };
        })
      );

      // Filter out super admin accounts from the tenant list
      const filteredProfiles = await Promise.all(
        profilesWithCounts.map(async (profile) => {
          const { data: userRole } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.user_id)
            .single();

          return {
            ...profile,
            isSuperAdmin: userRole?.role === 'super_admin',
          };
        })
      );

      return filteredProfiles.filter(profile => !profile.isSuperAdmin);
    },
    enabled: isSuperAdmin,
    refetchInterval: 10000, // Auto-refresh every 10 seconds for real-time updates
  });

  // Set up real-time subscription for members table
  useEffect(() => {
    if (!isSuperAdmin) return;

    const channel = supabase
      .channel('super-admin-members')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'members',
        },
        () => {
          // Invalidate and refetch profiles with updated member counts
          queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSuperAdmin, queryClient]);

  // Fetch all promo codes
  const { data: promoCodes = [], isLoading: promoLoading } = useQuery({
    queryKey: ['promo-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PromoCode[];
    },
    enabled: isSuperAdmin,
  });

  // Fetch promo code assignments
  const { data: promoAssignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['promo-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_code_assignments')
        .select('*, profile:profiles(business_name, owner_email)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PromoCodeAssignment[];
    },
    enabled: isSuperAdmin,
  });

  // Fetch all super admins
  const { data: superAdmins = [], isLoading: superAdminsLoading } = useQuery({
    queryKey: ['super-admins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'super_admin')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get emails from profiles
      const superAdminData = await Promise.all(
        (data as SuperAdminUser[]).map(async (admin) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('owner_email')
            .eq('user_id', admin.user_id)
            .single();

          return {
            ...admin,
            email: profile?.owner_email || 'Unknown',
          };
        })
      );

      return superAdminData;
    },
    enabled: isSuperAdmin,
  });

  // Update owner's payment link
  const updatePaymentLink = useMutation({
    mutationFn: async ({ profileId, paymentLink }: { profileId: string; paymentLink: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ payment_link: paymentLink })
        .eq('id', profileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
      toast.success('Payment link updated!');
    },
    onError: (error) => {
      toast.error('Failed to update payment link: ' + error.message);
    },
  });

  // Update owner's business name
  const updateBusinessName = useMutation({
    mutationFn: async ({ profileId, businessName }: { profileId: string; businessName: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ business_name: businessName })
        .eq('id', profileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
      toast.success('Business name updated!');
    },
    onError: (error) => {
      toast.error('Failed to update business name: ' + error.message);
    },
  });

  // Fetch menu for a specific owner
  const fetchMenuForOwner = async (ownerId: string): Promise<MenuData[]> => {
    const { data, error } = await supabase
      .from('menu')
      .select('*')
      .eq('owner_id', ownerId)
      .order('week_number', { ascending: true })
      .order('day', { ascending: true });

    if (error) throw error;
    return data as MenuData[];
  };

  // Fetch members for a specific owner (for export) - fetch ALL details including menu
  const fetchMembersForOwner = async (ownerId: string): Promise<MemberWithMenuData[]> => {
    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch menu data for this owner
    const menuData = await fetchMenuForOwner(ownerId);

    // Attach menu details to each member based on their selected_menu_week
    const membersWithMenu: MemberWithMenuData[] = (members as MemberData[]).map(member => {
      const selectedWeek = member.selected_menu_week || 1;
      const weekMenu = menuData.filter(m => m.week_number === selectedWeek);

      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const sortedWeekMenu = weekMenu.sort((a, b) =>
        dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
      );

      return {
        ...member,
        menuDetails: {
          week: selectedWeek,
          days: sortedWeekMenu.map(m => ({
            day: m.day,
            breakfast: m.breakfast || '-',
            lunch: m.lunch || '-',
            dinner: m.dinner || '-',
          })),
        },
      };
    });

    return membersWithMenu;
  };

  // Update owner's subscription
  const updateSubscription = useMutation({
    mutationFn: async ({
      profileId,
      status,
      expiryDate,
      planType
    }: {
      profileId: string;
      status: 'active' | 'expired' | 'trial';
      expiryDate: string;
      planType?: 'free' | 'pro' | 'enterprise';
    }) => {
      const updates: any = {
        subscription_status: status,
        subscription_expiry: expiryDate,
      };

      if (planType) {
        updates.plan_type = planType;
        if (planType === 'free') updates.storage_limit = 104857600; // 100MB
        if (planType === 'pro') updates.storage_limit = 10737418240; // 10GB
        if (planType === 'enterprise') updates.storage_limit = 1099511627776; // 1TB
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
      toast.success('Subscription updated!');
    },
    onError: (error) => {
      toast.error('Failed to update subscription: ' + error.message);
    },
  });

  // Create promo code
  const createPromoCode = useMutation({
    mutationFn: async ({ code, daysToAdd, assignToProfileIds }: { code: string; daysToAdd: number, assignToProfileIds?: string[] }) => {
      const { data, error } = await supabase
        .from('promo_codes')
        .insert({ code: code.toUpperCase(), days_to_add: daysToAdd })
        .select()
        .single();

      if (error) throw error;

      if (assignToProfileIds && assignToProfileIds.length > 0) {
        const assignments = assignToProfileIds.map(profileId => ({
          promo_code_id: data.id,
          profile_id: profileId,
        }));
        const { error: assignError } = await supabase
          .from('promo_code_assignments')
          .insert(assignments);
        if (assignError) throw assignError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      queryClient.invalidateQueries({ queryKey: ['promo-assignments'] });
      toast.success('Promo code created!');
    },
    onError: (error) => {
      toast.error('Failed to create promo code: ' + error.message);
    },
  });

  // Delete promo code
  const deletePromoCode = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      queryClient.invalidateQueries({ queryKey: ['promo-assignments'] });
      toast.success('Promo code deleted!');
    },
  });

  // Assign promo code to users
  const assignPromoCode = useMutation({
    mutationFn: async ({ promoCodeId, profileIds }: { promoCodeId: string; profileIds: string[] }) => {
      // First remove any existing assignments for this promo code
      await supabase
        .from('promo_code_assignments')
        .delete()
        .eq('promo_code_id', promoCodeId);

      // If no users selected, promo is public
      if (profileIds.length === 0) return;

      // Add new assignments
      const assignments = profileIds.map(profileId => ({
        promo_code_id: promoCodeId,
        profile_id: profileId,
      }));

      const { error } = await supabase
        .from('promo_code_assignments')
        .insert(assignments);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-assignments'] });
      toast.success('Promo code assignment updated!');
    },
    onError: (error) => {
      toast.error('Failed to assign promo code: ' + error.message);
    },
  });

  // Remove single assignment
  const removePromoAssignment = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('promo_code_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-assignments'] });
      toast.success('Assignment removed!');
    },
  });

  // Toggle payment status
  const togglePaymentStatus = useMutation({
    mutationFn: async ({ profileId, isPaid }: { profileId: string; isPaid: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_paid: isPaid })
        .eq('id', profileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
      toast.success('Payment status updated!');
    },
    onError: (error) => {
      toast.error('Failed to update payment status: ' + error.message);
    },
  });

  // Add super admin by email
  const addSuperAdmin = useMutation({
    mutationFn: async (email: string) => {
      // First, find the user by email in profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('owner_email', email.toLowerCase().trim())
        .single();

      if (profileError || !profile) {
        throw new Error('User not found. Make sure they have signed up first.');
      }

      // Check if already a super admin
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', profile.user_id)
        .eq('role', 'super_admin')
        .single();

      if (existingRole) {
        throw new Error('User is already a super admin.');
      }

      // Add super admin role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: profile.user_id, role: 'super_admin' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admins'] });
      toast.success('Super admin added successfully!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Remove super admin
  const removeSuperAdmin = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admins'] });
      toast.success('Super admin removed!');
    },
    onError: (error) => {
      toast.error('Failed to remove super admin: ' + error.message);
    },
  });



  // Fetch current super admin profile for settings
  const { data: currentSuperAdminProfile } = useQuery({
    queryKey: ['current-super-admin-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user && isSuperAdmin,
  });

  // Update gateway settings
  const updateGatewaySettings = useMutation({
    mutationFn: async ({
      isEnabled,
      config
    }: {
      isEnabled: boolean;
      config: any
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          is_platform_gateway_enabled: isEnabled,
          platform_gateway_config: config
        } as any) // Cast as any since types might not be updated
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-super-admin-profile'] });
      toast.success('Gateway settings updated!');
    },
    onError: (error) => {
      toast.error('Failed to update gateway settings: ' + error.message);
    },
  });

  // Update platform API configuration (Super Admin only)
  const updatePlatformApiConfig = useMutation({
    mutationFn: async (config: Record<string, any>) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('profiles')
        .update({ platform_api_config: config } as any)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-super-admin-profile'] });
      toast.success('API configuration saved!');
    },
    onError: (error) => {
      toast.error('Failed to save API config: ' + error.message);
    },
  });

  return {
    isSuperAdmin,
    allProfiles,
    promoCodes,
    promoAssignments,
    superAdmins,
    profilesLoading,
    promoLoading,
    assignmentsLoading,
    superAdminsLoading,
    updatePaymentLink,
    updateBusinessName,
    updateSubscription,
    createPromoCode,
    deletePromoCode,
    assignPromoCode,
    removePromoAssignment,
    togglePaymentStatus,
    addSuperAdmin,
    removeSuperAdmin,
    fetchMembersForOwner,
    currentSuperAdminProfile,
    updateGatewaySettings,
    updatePlatformApiConfig,
  };
}
