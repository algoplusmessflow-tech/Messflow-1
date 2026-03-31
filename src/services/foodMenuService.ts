// src/services/foodMenuService.ts
// RESTAURANT FOOD MENU SERVICE - Production-Grade CRUD Operations
// Complete food item management with inventory, pricing, nutrition tracking

import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// TYPES
// ============================================================================

export interface FoodMenuItem {
  id?: string;
  venue_id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  cost?: number;
  prep_time_minutes: number;
  cooking_method?: string;
  portion_weight_grams?: number;
  
  // Nutritional
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sodium_mg?: number;
  
  // Ingredients & Allergens
  ingredients?: Array<{ name: string; quantity: number; unit: string }>;
  allergens?: string[];
  
  // Dietary
  vegetarian: boolean;
  vegan: boolean;
  glutenfree: boolean;
  spicy: boolean;
  sugar_free?: boolean;
  
  // Availability
  is_available: boolean;
  available_from_time?: string; // HH:MM
  available_until_time?: string; // HH:MM
  
  // Inventory
  current_quantity?: number;
  max_daily_quantity?: number;
  reorder_at_quantity?: number;
  
  // Media & Notes
  image_url?: string;
  kitchen_notes?: string;
  tags?: string[];
  
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
}

interface ServiceResponse<T> {
  data: T | null;
  error: any;
  success: boolean;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class FoodMenuService {
  /**
   * ADD FOOD ITEM - Create new menu item
   */
  async addFoodItem(
    venueId: string,
    item: Omit<FoodMenuItem, "id" | "created_at" | "updated_at">
  ): Promise<ServiceResponse<FoodMenuItem>> {
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

      return { data: data as FoodMenuItem, error, success: !error };
    } catch (err) {
      return { data: null, error: err, success: false };
    }
  }

  /**
   * GET MENU ITEMS - Retrieve items with filters
   */
  async getMenuItems(
    venueId: string,
    filters?: {
      category?: string;
      vegetarian?: boolean;
      vegan?: boolean;
      spicy?: boolean;
      maxPrepTime?: number;
      searchTerm?: string;
    }
  ): Promise<ServiceResponse<FoodMenuItem[]>> {
    try {
      let query = supabase
        .from("restaurants.food_menu_items")
        .select("*")
        .eq("venue_id", venueId)
        .eq("is_available", true)
        .order("category")
        .order("name");

      if (filters?.category) {
        query = query.eq("category", filters.category);
      }

      if (filters?.vegetarian) {
        query = query.eq("vegetarian", true);
      }

      if (filters?.vegan) {
        query = query.eq("vegan", true);
      }

      if (filters?.spicy) {
        query = query.eq("spicy", true);
      }

      if (filters?.maxPrepTime) {
        query = query.lte("prep_time_minutes", filters.maxPrepTime);
      }

      if (filters?.searchTerm) {
        query = query.or(
          `name.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`
        );
      }

      const { data, error } = await query;

      return { data: data as FoodMenuItem[], error, success: !error };
    } catch (err) {
      return { data: null, error: err, success: false };
    }
  }

  /**
   * GET SINGLE ITEM
   */
  async getMenuItem(itemId: string): Promise<ServiceResponse<FoodMenuItem>> {
    try {
      const { data, error } = await supabase
        .from("restaurants.food_menu_items")
        .select("*")
        .eq("id", itemId)
        .single();

      return { data: data as FoodMenuItem, error, success: !error };
    } catch (err) {
      return { data: null, error: err, success: false };
    }
  }

  /**
   * UPDATE FOOD ITEM
   */
  async updateFoodItem(
    itemId: string,
    updates: Partial<FoodMenuItem>
  ): Promise<ServiceResponse<FoodMenuItem>> {
    try {
      const { data, error } = await supabase
        .from("restaurants.food_menu_items")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", itemId)
        .select()
        .single();

      return { data: data as FoodMenuItem, error, success: !error };
    } catch (err) {
      return { data: null, error: err, success: false };
    }
  }

  /**
   * DELETE FOOD ITEM (Archive)
   */
  async deleteFoodItem(itemId: string): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from("restaurants.food_menu_items")
        .update({ is_available: false })
        .eq("id", itemId);

      return { data: null, error, success: !error };
    } catch (err) {
      return { data: null, error: err, success: false };
    }
  }

  /**
   * UPDATE INVENTORY
   */
  async updateInventory(
    itemId: string,
    quantity: number
  ): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from("restaurants.food_menu_items")
        .update({ current_quantity: quantity })
        .eq("id", itemId);

      return { data: null, error, success: !error };
    } catch (err) {
      return { data: null, error: err, success: false };
    }
  }

  /**
   * BULK UPDATE - Update multiple items
   */
  async bulkUpdateItems(
    updates: Array<{ id: string; changes: Partial<FoodMenuItem> }>
  ): Promise<ServiceResponse<null>> {
    try {
      for (const update of updates) {
        await supabase
          .from("restaurants.food_menu_items")
          .update(update.changes)
          .eq("id", update.id);
      }
      return { data: null, error: null, success: true };
    } catch (err) {
      return { data: null, error: err, success: false };
    }
  }

  /**
   * GET CATEGORIES
   */
  async getCategories(
    venueId: string
  ): Promise<ServiceResponse<FoodCategory[]>> {
    try {
      const { data, error } = await supabase
        .from("restaurants.food_categories")
        .select("*")
        .eq("venue_id", venueId)
        .eq("is_active", true)
        .order("display_order");

      return { data: data as FoodCategory[], error, success: !error };
    } catch (err) {
      return { data: null, error: err, success: false };
    }
  }

  /**
   * CREATE CATEGORY
   */
  async createCategory(
    venueId: string,
    category: Omit<FoodCategory, "id">
  ): Promise<ServiceResponse<FoodCategory>> {
    try {
      const { data, error } = await supabase
        .from("restaurants.food_categories")
        .insert([{ venue_id: venueId, ...category }])
        .select()
        .single();

      return { data: data as FoodCategory, error, success: !error };
    } catch (err) {
      return { data: null, error: err, success: false };
    }
  }

  /**
   * GET MENU STATISTICS
   */
  async getMenuStats(venueId: string): Promise<
    ServiceResponse<{
      totalItems: number;
      totalCategories: number;
      avgPrepTime: number;
      vegetarianCount: number;
      totalInventory: number;
      avgPrice: number;
    }>
  > {
    try {
      const { data, error } = await supabase
        .from("restaurants.food_menu_items")
        .select("*")
        .eq("venue_id", venueId)
        .eq("is_available", true);

      if (error || !data) {
        return { data: null, error, success: false };
      }

      const stats = {
        totalItems: data.length,
        totalCategories: new Set(data.map((i: any) => i.category)).size,
        avgPrepTime: Math.round(
          data.reduce((sum: number, i: any) => sum + i.prep_time_minutes, 0) /
            data.length
        ),
        vegetarianCount: data.filter((i: any) => i.vegetarian).length,
        totalInventory: data.reduce((sum: number, i: any) => sum + (i.current_quantity || 0), 0),
        avgPrice: parseFloat(
          (
            data.reduce((sum: number, i: any) => sum + i.price, 0) / data.length
          ).toFixed(2)
        ),
      };

      return { data: stats, error: null, success: true };
    } catch (err) {
      return { data: null, error: err, success: false };
    }
  }

  /**
   * GET PROFITABILITY ANALYSIS
   */
  async getProfitability(venueId: string): Promise<
    ServiceResponse<
      Array<{
        name: string;
        price: number;
        cost: number;
        profit: number;
        margin: number;
      }>
    >
  > {
    try {
      const { data, error } = await supabase
        .from("restaurants.food_menu_items")
        .select("name, price, cost")
        .eq("venue_id", venueId)
        .eq("is_available", true)
        .not("cost", "is", null);

      if (error || !data) {
        return { data: null, error, success: false };
      }

      const profits = data.map((item: any) => ({
        name: item.name,
        price: item.price,
        cost: item.cost,
        profit: item.price - item.cost,
        margin: ((item.price - item.cost) / item.price * 100).toFixed(1),
      }));

      return { data: profits, error: null, success: true };
    } catch (err) {
      return { data: null, error: err, success: false };
    }
  }

  /**
   * SEARCH MENU ITEMS (Advanced search)
   */
  async searchMenuItems(
    venueId: string,
    searchTerm: string
  ): Promise<ServiceResponse<FoodMenuItem[]>> {
    try {
      const { data, error } = await supabase
        .from("restaurants.food_menu_items")
        .select("*")
        .eq("venue_id", venueId)
        .eq("is_available", true)
        .or(
          `name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,tags.cs.{"${searchTerm}"}`
        );

      return { data: data as FoodMenuItem[], error, success: !error };
    } catch (err) {
      return { data: null, error: err, success: false };
    }
  }

  /**
   * GET LOW STOCK ITEMS
   */
  async getLowStockItems(venueId: string): Promise<ServiceResponse<FoodMenuItem[]>> {
    try {
      const { data, error } = await supabase
        .from("restaurants.food_menu_items")
        .select("*")
        .eq("venue_id", venueId)
        .eq("is_available", true)
        .lt("current_quantity", "reorder_at_quantity");

      return { data: data as FoodMenuItem[], error, success: !error };
    } catch (err) {
      return { data: null, error: err, success: false };
    }
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const foodMenuService = new FoodMenuService();
export default foodMenuService;
