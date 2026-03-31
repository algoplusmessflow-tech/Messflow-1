// src/hooks/useRestaurantMenu.ts
// REACT QUERY HOOKS for Restaurant Menu Management
// Real-time updates, caching, and optimistic updates

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { restaurantMenuService, MenuItem } from "@/services/restaurantMenuService";
import { useToast } from "@/components/ui/use-toast";

// ============================================================================
// QUERY KEYS
// ============================================================================

const RESTAURANT_MENU_KEYS = {
  all: ["restaurant-menu"] as const,
  byVenue: (venueId: string) => [...RESTAURANT_MENU_KEYS.all, "venue", venueId] as const,
  byCategory: (venueId: string, category: string) =>
    [...RESTAURANT_MENU_KEYS.byVenue(venueId), "category", category] as const,
  byId: (itemId: string) => [...RESTAURANT_MENU_KEYS.all, "item", itemId] as const,
  stats: (venueId: string) => [...RESTAURANT_MENU_KEYS.byVenue(venueId), "stats"] as const,
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Fetch all menu items for a venue
 */
export const useRestaurantMenu = (venueId: string, enabled = true) => {
  return useQuery({
    queryKey: RESTAURANT_MENU_KEYS.byVenue(venueId),
    queryFn: () => restaurantMenuService.getMenuByVenue(venueId),
    enabled: enabled && !!venueId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    select: (data) => data.data || [],
  });
};

/**
 * Fetch menu items by category
 */
export const useRestaurantMenuByCategory = (
  venueId: string,
  category: string,
  enabled = true
) => {
  return useQuery({
    queryKey: RESTAURANT_MENU_KEYS.byCategory(venueId, category),
    queryFn: () => restaurantMenuService.getMenuItemsByCategory(venueId, category),
    enabled: enabled && !!venueId && !!category,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    select: (data) => data.data || [],
  });
};

/**
 * Fetch single menu item
 */
export const useRestaurantMenuItem = (itemId: string, enabled = true) => {
  return useQuery({
    queryKey: RESTAURANT_MENU_KEYS.byId(itemId),
    queryFn: () => restaurantMenuService.getMenuItemById(itemId),
    enabled: enabled && !!itemId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    select: (data) => data.data,
  });
};

/**
 * Add new menu item (Mutation)
 */
export const useAddRestaurantMenuItem = (venueId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (item: Omit<MenuItem, "id" | "venue_id" | "created_at" | "updated_at">) =>
      restaurantMenuService.addMenuItem(venueId, item),
    onSuccess: (response) => {
      if (response.error) {
        toast({
          title: "Error",
          description: response.error.message,
          variant: "destructive",
        });
        return;
      }

      // Invalidate menu queries
      queryClient.invalidateQueries({
        queryKey: RESTAURANT_MENU_KEYS.byVenue(venueId),
      });

      toast({
        title: "Success",
        description: "Menu item added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add menu item",
        variant: "destructive",
      });
      console.error(error);
    },
  });
};

/**
 * Update menu item (Mutation)
 */
export const useUpdateRestaurantMenuItem = (venueId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      itemId,
      updates,
    }: {
      itemId: string;
      updates: Partial<MenuItem>;
    }) => restaurantMenuService.updateMenuItem(itemId, updates),
    onSuccess: (response) => {
      if (response.error) {
        toast({
          title: "Error",
          description: response.error.message,
          variant: "destructive",
        });
        return;
      }

      // Invalidate all menu queries
      queryClient.invalidateQueries({
        queryKey: RESTAURANT_MENU_KEYS.byVenue(venueId),
      });

      toast({
        title: "Success",
        description: "Menu item updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update menu item",
        variant: "destructive",
      });
      console.error(error);
    },
  });
};

/**
 * Delete menu item (Mutation)
 */
export const useDeleteRestaurantMenuItem = (venueId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (itemId: string) => restaurantMenuService.deleteMenuItem(itemId),
    onSuccess: (response) => {
      if (response.error) {
        toast({
          title: "Error",
          description: response.error.message,
          variant: "destructive",
        });
        return;
      }

      // Invalidate menu queries
      queryClient.invalidateQueries({
        queryKey: RESTAURANT_MENU_KEYS.byVenue(venueId),
      });

      toast({
        title: "Success",
        description: "Menu item deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete menu item",
        variant: "destructive",
      });
      console.error(error);
    },
  });
};

/**
 * Upload menu item image (Mutation)
 */
export const useUploadMenuItemImage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ itemId, file }: { itemId: string; file: File }) =>
      restaurantMenuService.uploadMenuItemImage(itemId, file),
    onSuccess: (response) => {
      if (response.error) {
        toast({
          title: "Error",
          description: response.error.message,
          variant: "destructive",
        });
        return;
      }

      // Invalidate item query
      queryClient.invalidateQueries({
        queryKey: RESTAURANT_MENU_KEYS.byId(response.data!),
      });

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
      console.error(error);
    },
  });
};

/**
 * Toggle menu item active status (Mutation)
 */
export const useToggleMenuItemStatus = (venueId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, isActive }: { itemId: string; isActive: boolean }) =>
      restaurantMenuService.toggleMenuItemStatus(itemId, isActive),
    onSuccess: () => {
      // Invalidate menu queries
      queryClient.invalidateQueries({
        queryKey: RESTAURANT_MENU_KEYS.byVenue(venueId),
      });
    },
  });
};

/**
 * Search menu items
 */
export const useSearchRestaurantMenu = (venueId: string, searchTerm: string) => {
  return useQuery({
    queryKey: [...RESTAURANT_MENU_KEYS.byVenue(venueId), "search", searchTerm],
    queryFn: () => restaurantMenuService.searchMenuItems(venueId, searchTerm),
    enabled: !!venueId && searchTerm.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
    select: (data) => data.data || [],
  });
};

/**
 * Get menu statistics
 */
export const useRestaurantMenuStats = (venueId: string) => {
  return useQuery({
    queryKey: RESTAURANT_MENU_KEYS.stats(venueId),
    queryFn: () => restaurantMenuService.getMenuStats(venueId),
    enabled: !!venueId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000,
    select: (data) => data.data,
  });
};
