// src/services/restaurantMenuService.ts
// RESTAURANT MENU SERVICE - Backend integration with Supabase
// Full CRUD operations with real-time updates

import { supabase } from "@/integrations/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";

// ============================================================================
// TYPES
// ============================================================================

export interface MenuItem {
  id?: string;
  venue_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url?: string;
  prep_time_minutes: number;
  kitchen_notes?: string;
  vegetarian: boolean;
  spicy: boolean;
  calories?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MenuServiceResponse<T> {
  data: T | null;
  error: PostgrestError | null;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class RestaurantMenuService {
  /**
   * Get all menu items for a venue
   */
  async getMenuByVenue(venueId: string): Promise<MenuServiceResponse<MenuItem[]>> {
    try {
      const { data, error } = await supabase
        .from("restaurants.menu_items")
        .select("*")
        .eq("venue_id", venueId)
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      return { data: data as MenuItem[] | null, error };
    } catch (err) {
      console.error("Error fetching menu items:", err);
      return { data: null, error: err as PostgrestError };
    }
  }

  /**
   * Get menu items by category
   */
  async getMenuItemsByCategory(
    venueId: string,
    category: string
  ): Promise<MenuServiceResponse<MenuItem[]>> {
    try {
      const { data, error } = await supabase
        .from("restaurants.menu_items")
        .select("*")
        .eq("venue_id", venueId)
        .eq("category", category)
        .eq("is_active", true)
        .order("name", { ascending: true });

      return { data: data as MenuItem[] | null, error };
    } catch (err) {
      console.error("Error fetching menu items by category:", err);
      return { data: null, error: err as PostgrestError };
    }
  }

  /**
   * Get single menu item by ID
   */
  async getMenuItemById(itemId: string): Promise<MenuServiceResponse<MenuItem>> {
    try {
      const { data, error } = await supabase
        .from("restaurants.menu_items")
        .select("*")
        .eq("id", itemId)
        .single();

      return { data: data as MenuItem | null, error };
    } catch (err) {
      console.error("Error fetching menu item:", err);
      return { data: null, error: err as PostgrestError };
    }
  }

  /**
   * Add new menu item
   */
  async addMenuItem(venueId: string, item: Omit<MenuItem, "id" | "venue_id" | "created_at" | "updated_at">): Promise<MenuServiceResponse<MenuItem>> {
    try {
      const { data, error } = await supabase
        .from("restaurants.menu_items")
        .insert([
          {
            venue_id: venueId,
            ...item,
            is_active: true,
          },
        ])
        .select()
        .single();

      return { data: data as MenuItem | null, error };
    } catch (err) {
      console.error("Error adding menu item:", err);
      return { data: null, error: err as PostgrestError };
    }
  }

  /**
   * Update menu item
   */
  async updateMenuItem(
    itemId: string,
    updates: Partial<MenuItem>
  ): Promise<MenuServiceResponse<MenuItem>> {
    try {
      const { data, error } = await supabase
        .from("restaurants.menu_items")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", itemId)
        .select()
        .single();

      return { data: data as MenuItem | null, error };
    } catch (err) {
      console.error("Error updating menu item:", err);
      return { data: null, error: err as PostgrestError };
    }
  }

  /**
   * Delete menu item (soft delete - set is_active to false)
   */
  async deleteMenuItem(itemId: string): Promise<MenuServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from("restaurants.menu_items")
        .update({ is_active: false })
        .eq("id", itemId);

      return { data: null, error };
    } catch (err) {
      console.error("Error deleting menu item:", err);
      return { data: null, error: err as PostgrestError };
    }
  }

  /**
   * Toggle menu item active status
   */
  async toggleMenuItemStatus(
    itemId: string,
    isActive: boolean
  ): Promise<MenuServiceResponse<MenuItem>> {
    try {
      const { data, error } = await supabase
        .from("restaurants.menu_items")
        .update({ is_active: isActive })
        .eq("id", itemId)
        .select()
        .single();

      return { data: data as MenuItem | null, error };
    } catch (err) {
      console.error("Error toggling menu item status:", err);
      return { data: null, error: err as PostgrestError };
    }
  }

  /**
   * Upload menu item image
   */
  async uploadMenuItemImage(
    itemId: string,
    file: File
  ): Promise<MenuServiceResponse<string>> {
    try {
      const fileName = `${itemId}-${Date.now()}-${file.name}`;
      const filePath = `restaurant-menu/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("restaurant-menu-images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        return { data: null, error: uploadError };
      }

      const { data } = supabase.storage
        .from("restaurant-menu-images")
        .getPublicUrl(filePath);

      await this.updateMenuItem(itemId, { image_url: data.publicUrl });

      return { data: data.publicUrl, error: null };
    } catch (err) {
      console.error("Error uploading menu item image:", err);
      return { data: null, error: err as PostgrestError };
    }
  }

  /**
   * Bulk update menu items
   */
  async bulkUpdateMenuItems(
    updates: Array<{ id: string; changes: Partial<MenuItem> }>
  ): Promise<MenuServiceResponse<null>> {
    try {
      for (const update of updates) {
        await supabase
          .from("restaurants.menu_items")
          .update({
            ...update.changes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", update.id);
      }
      return { data: null, error: null };
    } catch (err) {
      console.error("Error bulk updating menu items:", err);
      return { data: null, error: err as PostgrestError };
    }
  }

  /**
   * Search menu items
   */
  async searchMenuItems(
    venueId: string,
    searchTerm: string
  ): Promise<MenuServiceResponse<MenuItem[]>> {
    try {
      const { data, error } = await supabase
        .from("restaurants.menu_items")
        .select("*")
        .eq("venue_id", venueId)
        .eq("is_active", true)
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order("category", { ascending: true });

      return { data: data as MenuItem[] | null, error };
    } catch (err) {
      console.error("Error searching menu items:", err);
      return { data: null, error: err as PostgrestError };
    }
  }

  /**
   * Get menu statistics
   */
  async getMenuStats(venueId: string): Promise<MenuServiceResponse<any>> {
    try {
      const { data, error } = await supabase
        .from("restaurants.menu_items")
        .select("category, COUNT(*) as count, AVG(price) as avg_price")
        .eq("venue_id", venueId)
        .eq("is_active", true)
        .group_by("category");

      return { data, error };
    } catch (err) {
      console.error("Error fetching menu stats:", err);
      return { data: null, error: err as PostgrestError };
    }
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const restaurantMenuService = new RestaurantMenuService();
export default restaurantMenuService;
