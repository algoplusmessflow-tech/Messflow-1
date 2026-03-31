// src/components/restaurant/RestaurantMenuManager.tsx - PART 1
// VIDEO-STYLE MENU MANAGEMENT UI
// Premium UI with drag-and-drop, image uploads, and real-time preview

import React, { useState, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Upload,
  Grid3x3,
  List,
  Search,
  Filter,
  ChevronRight,
  Leaf,
  Flame,
  Clock,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const menuItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Item name required"),
  description: z.string().min(5, "Description required"),
  price: z.number().min(0.01, "Valid price required"),
  category: z.string().min(1, "Category required"),
  image_url: z.string().url().optional(),
  prep_time_minutes: z.number().min(1).max(120),
  kitchen_notes: z.string().optional(),
  vegetarian: z.boolean().default(false),
  spicy: z.boolean().default(false),
  calories: z.number().optional(),
});

type MenuItem = z.infer<typeof menuItemSchema>;

// ============================================================================
// MENU ITEM CARD (Grid View)
// ============================================================================

interface MenuItemCardProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, onEdit, onDelete }) => {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
      {/* Image Container */}
      <div className="relative h-40 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Upload size={32} />
          </div>
        )}

        {/* Badges Overlay */}
        <div className="absolute top-2 right-2 flex gap-2">
          {item.vegetarian && (
            <Badge className="bg-green-500 hover:bg-green-600">
              <Leaf size={12} className="mr-1" /> Veg
            </Badge>
          )}
          {item.spicy && (
            <Badge className="bg-red-500 hover:bg-red-600">
              <Flame size={12} className="mr-1" /> Spicy
            </Badge>
          )}
        </div>

        {/* Edit/Delete Buttons (on Hover) */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button
            onClick={() => onEdit(item)}
            className="p-2 bg-white rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Edit2 size={18} className="text-blue-600" />
          </button>
          <button
            onClick={() => onDelete(item.id!)}
            className="p-2 bg-white rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 size={18} className="text-red-600" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1 line-clamp-2">
          {item.name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
          {item.description}
        </p>

        {/* Meta Info */}
        <div className="flex items-center justify-between mb-3 text-sm">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Clock size={14} />
            <span>{item.prep_time_minutes} min</span>
          </div>
          {item.calories && (
            <span className="text-xs text-gray-500">{item.calories} cal</span>
          )}
        </div>

        {/* Category & Price */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            {item.category}
          </Badge>
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
            AED {item.price.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MENU ITEM FORM DIALOG - PART 1
// ============================================================================

interface MenuItemFormProps {
  item?: MenuItem;
  onSubmit: (item: MenuItem) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const MenuItemForm: React.FC<MenuItemFormProps> = ({
  item,
  onSubmit,
  isOpen,
  setIsOpen,
}) => {
  const form = useForm<MenuItem>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: item || {
      name: "",
      description: "",
      price: 0,
      category: "Main Course",
      prep_time_minutes: 15,
      vegetarian: false,
      spicy: false,
    },
  });

  const handleSubmit = (data: MenuItem) => {
    onSubmit(data);
    form.reset();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {item ? "Edit Menu Item" : "Add New Menu Item"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Name & Category */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Butter Chicken"
                        className="text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                      >
                        <option>Main Course</option>
                        <option>Appetizer</option>
                        <option>Bread</option>
                        <option>Dessert</option>
                        <option>Beverage</option>
                        <option>Side Dish</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Describe the dish, ingredients, flavors..."
                      rows={3}
                      className="text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Price & Prep Time */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (AED) *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prep_time_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prep Time (min) *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        max="120"
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="calories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calories (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        onChange={(e) =>
                          field.onChange(e.target.value ? parseInt(e.target.value) : undefined)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Kitchen Notes */}
            <FormField
              control={form.control}
              name="kitchen_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kitchen Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Special instructions for kitchen staff..."
                      rows={2}
                      className="text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Flags */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vegetarian"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      {...field}
                      value="true"
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <FormLabel className="mb-0 cursor-pointer">
                      <Leaf size={16} className="inline mr-2 text-green-500" />
                      Vegetarian
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="spicy"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      {...field}
                      value="true"
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <FormLabel className="mb-0 cursor-pointer">
                      <Flame size={16} className="inline mr-2 text-red-500" />
                      Spicy
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full py-6 text-lg">
              {item ? "Update Item" : "Add Item"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default MenuItemForm;// ============================================================================
// MAIN COMPONENT: Restaurant Menu Manager - PART 2
// ============================================================================

interface RestaurantMenuManagerProps {
  venueId: string;
}

export const RestaurantMenuManager: React.FC<RestaurantMenuManagerProps> = ({
  venueId,
}) => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | undefined>();
  const [items, setItems] = useState<MenuItem[]>([
    {
      id: "1",
      name: "Butter Chicken",
      description: "Creamy tomato-based curry with tender chicken pieces",
      price: 120,
      category: "Main Course",
      prep_time_minutes: 20,
      vegetarian: false,
      spicy: false,
      calories: 350,
    },
    {
      id: "2",
      name: "Naan Bread",
      description: "Traditional Indian flatbread cooked in tandoor",
      price: 25,
      category: "Bread",
      prep_time_minutes: 5,
      vegetarian: true,
      spicy: false,
    },
  ]);

  const categories = Array.from(
    new Set(items.map((item) => item.category))
  );

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddItem = (item: MenuItem) => {
    if (editingItem?.id) {
      setItems(
        items.map((i) => (i.id === editingItem.id ? { ...item, id: i.id } : i))
      );
      setEditingItem(undefined);
    } else {
      setItems([...items, { ...item, id: Math.random().toString() }]);
    }
  };

  const handleDeleteItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Menu Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {items.length} items • {categories.length} categories
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2.5 rounded-lg transition-all ${
                  viewMode === "grid"
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                <Grid3x3 size={20} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2.5 rounded-lg transition-all ${
                  viewMode === "list"
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                <List size={20} />
              </button>

              <MenuItemForm
                isOpen={isFormOpen}
                setIsOpen={setIsFormOpen}
                item={editingItem}
                onSubmit={handleAddItem}
              />
              <Button
                onClick={() => {
                  setEditingItem(undefined);
                  setIsFormOpen(true);
                }}
                className="px-6 py-2.5 text-base"
              >
                <Plus size={20} className="mr-2" />
                Add Item
              </Button>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search
                size={18}
                className="absolute left-3 top-3 text-gray-400"
              />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            <select
              value={selectedCategory || ""}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-gray-600 dark:text-gray-400">
              No menu items found
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow flex items-center justify-between"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {item.description}
                  </p>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <Badge variant="outline">{item.category}</Badge>
                  <span className="font-bold text-lg text-blue-600">
                    AED {item.price.toFixed(2)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditItem(item)}
                  >
                    <Edit2 size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteItem(item.id!)}
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantMenuManager;
