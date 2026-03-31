// src/services/restaurantFoodMenuService.ts
// RESTAURANT FOOD MENU SERVICE - Real CRUD operations for restaurant menu items
// Manages food items, categories, pricing, inventory, preparation times

import { supabase } from "@/integrations/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";

// ============================================================================
// TYPES
// ============================================================================

export interface RestaurantFoodItem {
  id?: string;
  venue_id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  cost?: number; // Cost to prepare (for margin calculation)
  image_url?: string;
  prep_time_minutes: number;
  cooking_method?: string; // 'fry', 'grill', 'boil', 'bake', 'steam', etc.
  temperature_f?: number; // Serving temperature
  portionSize?: string; // e.g., "250g", "1 plate", "500ml"
  ingredients: string[]; // List of ingredients
  allergens?: string[]; // Allergen warnings
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  spicy: boolean;
  vegetarian: boolean;
  vegan: boolean;
  glutenfree: boolean;
  is_available: boolean;
  available_from?: string; // HH:MM format
  available_until?: string; // HH:MM format
  max_daily_quantity?: number;
  current_quantity?: number;
  kitchen_notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FoodCategory {
  id?: string;
  venue_id: string;
  name: string;
  description?: string;
  display_order: number;
  icon_url?: string;
  is_active: boolean;
  created_at?: string;
}

export interface MenuServiceResponse<T> {
  data: T | null;
  error: PostgrestError | null;
  success: boolean;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class RestaurantFoodMenuService {
  /**
   * Add a new food item to the restaurant menu
   */
  async addFoodItem(
    venueId: string,
    item: Omit<RestaurantFoodItem, "id" | "created_at" | "updated_at">
  ): Promise<MenuServiceResponse<RestaurantFoodItem>> {
    try {
      const { data, error } = await supabase
        .from("restaurants.food_menu_items")
        .insert([
          {
            venue_id: venueId,
            ...item,
            created_by: (await supabase.auth.getUser()).data.user?.id,
          },
        ])
        .select()
        .single();

      return {
        data: data as RestaurantFoodItem | null,
        error,
        success: !error,
      };
    } catch (err) {
      return {
        data: null,
        error: err as PostgrestError,
        success: false,
      };
    }
  }

  /**
   * Get all food items for a venue with filters
   */
  async getFoodMenuByVenue(
    venueId: string,
    filters?: {
      category?: string;
      vegetarian?: boolean;
      spicy?: boolean;
      searchTerm?: string;
    }
  ): Promise<MenuServiceResponse<RestaurantFoodItem[]>> {
    try {
      let query = supabase
        .from("restaurants.food_menu_items")
        .select("*")
        .eq("venue_id", venueId)
        .eq("is_available", true)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (filters?.category) {
        query = query.eq("category", filters.category);
      }

      if (filters?.vegetarian !== undefined) {
        query = query.eq("vegetarian", filters.vegetarian);
      }

      if (filters?.spicy !== undefined) {
        query = query.eq("spicy", filters.spicy);
      }

      if (filters?.searchTerm) {
        query = query.or(
          `name.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`
        );
      }

      const { data, error } = await query;

      return {
        data: data as RestaurantFoodItem[] | null,
        error,
        success: !error,
      };
    } catch (err) {
      return {
        data: null,
        error: err as PostgrestError,
        success: false,
      };
    }
  }

  /**
   * Update food item
   */
  async updateFoodItem(
    itemId: string,
    updates: Partial<RestaurantFoodItem>
  ): Promise<MenuServiceResponse<RestaurantFoodItem>> {
    try {
      const { data, error } = await supabase
        .from("restaurants.food_menu_items")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", itemId)
        .select()
        .single();

      return {
        data: data as RestaurantFoodItem | null,
        error,
        success: !error,
      };
    } catch (err) {
      return {
        data: null,
        error: err as PostgrestError,
        success: false,
      };
    }
  }

  /**
   * Delete (archive) food item
   */
  async deleteFoodItem(itemId: string): Promise<MenuServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from("restaurants.food_menu_items")
        .update({ is_available: false })
        .eq("id", itemId);

      return {
        data: null,
        error,
        success: !error,
      };
    } catch (err) {
      return {
        data: null,
        error: err as PostgrestError,
        success: false,
      };
    }
  }

  /**
   * Bulk update item availability
   */
  async bulkUpdateAvailability(
    updates: Array<{ itemId: string; isAvailable: boolean }>
  ): Promise<MenuServiceResponse<null>> {
    try {
      for (const update of updates) {
        await supabase
          .from("restaurants.food_menu_items")
          .update({ is_available: update.isAvailable })
          .eq("id", update.itemId);
      }
      return {
        data: null,
        error: null,
        success: true,
      };
    } catch (err) {
      return {
        data: null,
        error: err as PostgrestError,
        success: false,
      };
    }
  }

  /**
   * Get menu item by ID
   */
  async getFoodItemById(
    itemId: string
  ): Promise<MenuServiceResponse<RestaurantFoodItem>> {
    try {
      const { data, error } = await supabase
        .from("restaurants.food_menu_items")
        .select("*")
        .eq("id", itemId)
        .single();

      return {
        data: data as RestaurantFoodItem | null,
        error,
        success: !error,
      };
    } catch (err) {
      return {
        data: null,
        error: err as PostgrestError,
        success: false,
      };
    }
  }

  /**
   * Get menu items by category
   */
  async getFoodMenuByCategory(
    venueId: string,
    category: string
  ): Promise<MenuServiceResponse<RestaurantFoodItem[]>> {
    try {
      const { data, error } = await supabase
        .from("restaurants.food_menu_items")
        .select("*")
        .eq("venue_id", venueId)
        .eq("category", category)
        .eq("is_available", true)
        .order("name", { ascending: true });

      return {
        data: data as RestaurantFoodItem[] | null,
        error,
        success: !error,
      };
    } catch (err) {
      return {
        data: null,
        error: err as PostgrestError,
        success: false,
      };
    }
  }

  /**
   * Search food items
   */
  async searchFoodItems(
    venueId: string,
    searchTerm: string
  ): Promise<MenuServiceResponse<RestaurantFoodItem[]>> {
    try {
      const { data, error } = await supabase
        .from("restaurants.food_menu_items")
        .select("*")
        .eq("venue_id", venueId)
        .eq("is_available", true)
        .or(
          `name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,ingredients.cs.{"${searchTerm}"}`
        );

      return {
        data: data as RestaurantFoodItem[] | null,
        error,
        success: !error,
      };
    } catch (err) {
      return {
        data: null,
        error: err as PostgrestError,
        success: false,
      };
    }
  }

  /**
   * Get menu statistics for venue
   */
  async getMenuStats(
    venueId: string
  ): Promise<
    MenuServiceResponse<{
      totalItems: number;
      categoriesCount: number;
      vegetarianCount: number;
      spicyCount: number;
      avgPrepTime: number;
    }>
  > {
    try {
      const { data, error, count } = await supabase
        .from("restaurants.food_menu_items")
        .select("category, prep_time_minutes, vegetarian, spicy", { count: "exact" })
        .eq("venue_id", venueId)
        .eq("is_available", true);

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      const stats = {
        totalItems: count || 0,
        categoriesCount: [...new Set((data || []).map((item: any) => item.category))].length,
        vegetarianCount: (data || []).filter((item: any) => item.vegetarian).length,
        spicyCount: (data || []).filter((item: any) => item.spicy).length,
        avgPrepTime:
          (data || []).length > 0
            ? Math.round(
                (data || []).reduce((sum: number, item: any) => sum + item.prep_time_minutes, 0) /
                  (data || []).length
              )
            : 0,
      };

      return {
        data: stats,
        error: null,
        success: true,
      };
    } catch (err) {
      return {
        data: null,
        error: err as PostgrestError,
        success: false,
      };
    }
  }

  /**
   * Create food category
   */
  async createCategory(
    venueId: string,
    category: Omit<FoodCategory, "id" | "created_at">
  ): Promise<MenuServiceResponse<FoodCategory>> {
    try {
      const { data, error } = await supabase
        .from("restaurants.food_categories")
        .insert([
          {
            venue_id: venueId,
            ...category,
          },
        ])
        .select()
        .single();

      return {
        data: data as FoodCategory | null,
        error,
        success: !error,
      };
    } catch (err) {
      return {
        data: null,
        error: err as PostgrestError,
        success: false,
      };
    }
  }

  /**
   * Get all categories for venue
   */
  async getCategoriesByVenue(
    venueId: string
  ): Promise<MenuServiceResponse<FoodCategory[]>> {
    try {
      const { data, error } = await supabase
        .from("restaurants.food_categories")
        .select("*")
        .eq("venue_id", venueId)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      return {
        data: data as FoodCategory[] | null,
        error,
        success: !error,
      };
    } catch (err) {
      return {
        data: null,
        error: err as PostgrestError,
        success: false,
      };
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const restaurantFoodMenuService = new RestaurantFoodMenuService();
export default restaurantFoodMenuService;
