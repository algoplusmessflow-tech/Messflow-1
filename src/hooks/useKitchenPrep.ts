import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export type PrepSummary = {
  totalMeals: number;
  breakfastCount: number;
  lunchCount: number;
  dinnerCount: number;
  bothCount: number;
  vegCount: number;
  nonVegCount: number;
  bothDietCount: number;
  customDietCount: number;
  totalRotis: number;
  whiteRiceCount: number;
  brownRiceCount: number;
  noRiceCount: number;
  jeeragaSalaCount: number;
  pausedCount: number;
  weekendSkipCount: number;
  trialCount: number;
};

export type PrepByArea = {
  areaId: string;
  areaName: string;
  totalMeals: number;
  lunchCount: number;
  dinnerCount: number;
  totalRotis: number;
  vegCount: number;
  nonVegCount: number;
};

export type MemberPrep = {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  mealType: string;
  rotiQuantity: number;
  riceType: string;
  dietaryPreference: string;
  deliveryAreaId: string | null;
  deliveryAreaName: string | null;
  pauseService: boolean;
  skipWeekends: boolean;
  freeTrial: boolean;
};

export function useKitchenPrep(date?: string) {
  const { user } = useAuth();
  const queryDate = date || new Date().toISOString().split('T')[0];

  const { data: prepSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['kitchenPrep', 'summary', user?.id, queryDate],
    queryFn: async (): Promise<PrepSummary> => {
      if (!user) {
        return getEmptySummary();
      }

      try {
        // Get active members with their food preferences
        const { data: members, error } = await supabase
          .from('members')
          .select(`
            id, name, phone, address,
            meal_type, roti_quantity, rice_type, dietary_preference,
            pause_service, skip_weekends, free_trial,
            delivery_area_id,
            delivery_areas!members_delivery_area_id_fkey(name)
          `)
          .eq('owner_id', user.id)
          .eq('status', 'active');

        if (error) {
          console.warn('Error fetching kitchen prep data:', error.message);
          // Return empty summary if columns don't exist
          return getEmptySummary();
        }

        const summary: PrepSummary = getEmptySummary();

        members?.forEach(member => {
          const mealType = member.meal_type || 'both';
          const dietaryPref = member.dietary_preference || 'non_veg';
          const riceType = member.rice_type || 'white_rice';
          const rotiQty = member.roti_quantity || 0;
          const isPaused = member.pause_service || false;
          const skipsWeekends = member.skip_weekends || false;
          const isTrial = member.free_trial || false;

          // Skip paused members
          if (isPaused) {
            summary.pausedCount++;
            return;
          }

          // Skip weekends check
          const dayOfWeek = new Date(queryDate).getDay();
          if (skipsWeekends && (dayOfWeek === 5 || dayOfWeek === 6)) {
            return; // Friday or Saturday
          }

          summary.totalMeals++;
          
          // Meal type counts
          if (mealType === 'lunch') summary.lunchCount++;
          else if (mealType === 'dinner') summary.dinnerCount++;
          else if (mealType === 'both') summary.bothCount++;
          
          // Dietary counts
          if (dietaryPref === 'veg') summary.vegCount++;
          else if (dietaryPref === 'non_veg') summary.nonVegCount++;
          else if (dietaryPref === 'both') summary.bothDietCount++;
          else if (dietaryPref === 'custom') summary.customDietCount++;
          
          // Roti count
          summary.totalRotis += rotiQty;
          
          // Rice type counts
          if (riceType === 'white_rice') summary.whiteRiceCount++;
          else if (riceType === 'brown_rice') summary.brownRiceCount++;
          else if (riceType === 'jeeraga_sala') summary.jeeragaSalaCount++;
          else summary.noRiceCount++;
          
          // Service options
          if (isTrial) summary.trialCount++;
          if (skipsWeekends) summary.weekendSkipCount++;
        });

        return summary;
      } catch (e) {
        console.warn('Error in kitchen prep:', e);
        return getEmptySummary();
      }
    },
    enabled: !!user,
  });

  const { data: prepByArea = [], isLoading: areaLoading } = useQuery({
    queryKey: ['kitchenPrep', 'byArea', user?.id, queryDate],
    queryFn: async (): Promise<PrepByArea[]> => {
      if (!user) return [];

      try {
        const { data: areas } = await supabase
          .from('delivery_areas')
          .select('id, name')
          .eq('owner_id', user.id);

        const { data: members } = await supabase
          .from('members')
          .select('id, meal_type, roti_quantity, dietary_preference, delivery_area_id, pause_service, skip_weekends')
          .eq('owner_id', user.id)
          .eq('status', 'active');

        const dayOfWeek = new Date(queryDate).getDay();

        const areaStats: PrepByArea[] = (areas || []).map(area => {
          const areaMembers = (members || []).filter(m => 
            m.delivery_area_id === area.id && 
            !m.pause_service &&
            !(m.skip_weekends && (dayOfWeek === 5 || dayOfWeek === 6))
          ) || [];

          return {
            areaId: area.id,
            areaName: area.name,
            totalMeals: areaMembers.length,
            lunchCount: areaMembers.filter(m => m.meal_type === 'lunch').length,
            dinnerCount: areaMembers.filter(m => m.meal_type === 'dinner').length,
            totalRotis: areaMembers.reduce((sum, m) => sum + (m.roti_quantity || 0), 0),
            vegCount: areaMembers.filter(m => m.dietary_preference === 'veg').length,
            nonVegCount: areaMembers.filter(m => m.dietary_preference === 'non_veg').length,
          };
        }) || [];

        return areaStats;
      } catch (e) {
        console.warn('Error fetching prep by area:', e);
        return [];
      }
    },
    enabled: !!user,
  });

  const { data: prepList = [], isLoading: listLoading } = useQuery({
    queryKey: ['kitchenPrep', 'list', user?.id, queryDate],
    queryFn: async (): Promise<MemberPrep[]> => {
      if (!user) return [];

      try {
        const { data: members } = await supabase
          .from('members')
          .select(`
            id, name, phone, address,
            meal_type, roti_quantity, rice_type, dietary_preference,
            pause_service, skip_weekends, free_trial,
            delivery_area_id,
            delivery_areas!members_delivery_area_id_fkey(name)
          `)
          .eq('owner_id', user.id)
          .eq('status', 'active')
          .order('delivery_area_id', { ascending: true })
          .order('name', { ascending: true });

        const dayOfWeek = new Date(queryDate).getDay();

        return (members || [])
          .filter(m => !m.pause_service && !(m.skip_weekends && (dayOfWeek === 5 || dayOfWeek === 6)))
          .map(m => ({
            id: m.id,
            name: m.name,
            phone: m.phone,
            address: m.address,
            mealType: m.meal_type || 'both',
            rotiQuantity: m.roti_quantity || 0,
            riceType: m.rice_type || 'white_rice',
            dietaryPreference: m.dietary_preference || 'non_veg',
            deliveryAreaId: m.delivery_area_id,
            deliveryAreaName: (m.delivery_areas as any)?.name || null,
            pauseService: m.pause_service || false,
            skipWeekends: m.skip_weekends || false,
            freeTrial: m.free_trial || false,
          }));
      } catch (e) {
        console.warn('Error fetching prep list:', e);
        return [];
      }
    },
    enabled: !!user,
  });

  return {
    prepSummary: prepSummary || getEmptySummary(),
    prepByArea,
    prepList,
    summaryLoading,
    areaLoading,
    listLoading,
    queryDate,
  };
}

function getEmptySummary(): PrepSummary {
  return {
    totalMeals: 0,
    breakfastCount: 0,
    lunchCount: 0,
    dinnerCount: 0,
    bothCount: 0,
    vegCount: 0,
    nonVegCount: 0,
    bothDietCount: 0,
    customDietCount: 0,
    totalRotis: 0,
    whiteRiceCount: 0,
    brownRiceCount: 0,
    noRiceCount: 0,
    jeeragaSalaCount: 0,
    pausedCount: 0,
    weekendSkipCount: 0,
    trialCount: 0,
  };
}
