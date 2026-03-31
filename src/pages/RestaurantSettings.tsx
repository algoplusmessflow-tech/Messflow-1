// src/pages/RestaurantSettings.tsx
// RESTAURANT MODE SETTINGS - Standalone Configuration
// Updated: Menu, Tables, Taxes, Details ONLY (no Sales/Customer portals)

import React, { useState } from "react";
import {
  Settings,
  UtensilsCrossed,
  Table2,
  DollarSign,
  ChefHat,
  Plus,
  Edit2,
  Trash2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

// ============================================================================
// SCHEMAS
// ============================================================================

const restaurantDetailsSchema = z.object({
  restaurant_name: z.string().min(2, "Restaurant name required"),
  phone: z.string().min(7, "Valid phone required"),
  email: z.string().email(),
  address: z.string().min(5),
  city: z.string().min(2),
  tax_rate: z.number().min(0).max(100),
});

const tableSchema = z.object({
  id: z.string().optional(),
  table_number: z.number().min(1),
  capacity: z.number().min(1).max(20),
  location_zone: z.string().optional(),
});

const taxSchema = z.object({
  id: z.string().optional(),
  tax_name: z.string().min(2),
  tax_rate: z.number().min(0).max(100),
});

type RestaurantDetails = z.infer<typeof restaurantDetailsSchema>;
type Table = z.infer<typeof tableSchema>;
type Tax = z.infer<typeof taxSchema>;

// ============================================================================
// DETAILS TAB
// ============================================================================

const DetailsTab: React.FC = () => {
  const form = useForm<RestaurantDetails>({
    resolver: zodResolver(restaurantDetailsSchema),
    defaultValues: {
      restaurant_name: "My Restaurant",
      phone: "+971 50 123 4567",
      email: "restaurant@example.com",
      address: "123 Main Street",
      city: "Dubai",
      tax_rate: 5,
    },
  });

  const onSubmit = (data: RestaurantDetails) => {
    console.log("Restaurant details saved:", data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="restaurant_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-semibold">Restaurant Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter restaurant name" className="h-11" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold">Phone Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="+971 50 123 4567" className="h-11" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold">Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="restaurant@example.com"
                    className="h-11"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-semibold">Address</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Enter full address"
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold">City</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Dubai, Abu Dhabi, etc."
                    className="h-11"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tax_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold">Default Tax Rate (%)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="0.1"
                    max="100"
                    className="h-11"
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <Save size={18} className="mr-2" />
          Save Restaurant Details
        </Button>
      </form>
    </Form>
  );
};

// ============================================================================
// TABLES TAB
// ============================================================================

const TablesTab: React.FC = () => {
  const [tables, setTables] = useState<Table[]>([
    { id: "1", table_number: 1, capacity: 2, location_zone: "Window" },
    { id: "2", table_number: 2, capacity: 4, location_zone: "Corner" },
    { id: "3", table_number: 3, capacity: 6, location_zone: "Center" },
  ]);

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<Table>({
    resolver: zodResolver(tableSchema),
    defaultValues: { table_number: 1, capacity: 2, location_zone: "" },
  });

  const onSubmit = (data: Table) => {
    if (editingId) {
      setTables(tables.map((t) => (t.id === editingId ? { ...data, id: editingId } : t)));
      setEditingId(null);
    } else {
      setTables([...tables, { ...data, id: Math.random().toString() }]);
    }
    form.reset();
    setIsOpen(false);
  };

  const handleEdit = (table: Table) => {
    form.reset(table);
    setEditingId(table.id!);
    setIsOpen(true);
  };

  return (
    <div className="space-y-4">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            onClick={() => {
              setEditingId(null);
              form.reset();
            }}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Plus size={18} className="mr-2" />
            Add Table
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Table" : "Add Table"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="table_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Table Number</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity (Guests)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        max="20"
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location_zone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Zone (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Window, Corner, Center, etc."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full">
                Save Table
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tables.map((table) => (
          <div
            key={table.id}
            className="p-4 border rounded-lg dark:border-gray-700 text-center hover:shadow-lg transition bg-white dark:bg-gray-800"
          >
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {table.table_number}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {table.capacity} guests
            </div>
            {table.location_zone && (
              <div className="text-xs text-gray-500 mt-1">{table.location_zone}</div>
            )}
            <div className="flex gap-2 mt-3 justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(table)}
              >
                <Edit2 size={14} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTables(tables.filter((t) => t.id !== table.id))}
              >
                <Trash2 size={14} className="text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// TAX SETUP TAB
// ============================================================================

const TaxSetupTab: React.FC = () => {
  const [taxes, setTaxes] = useState<Tax[]>([{ id: "1", tax_name: "VAT", tax_rate: 5 }]);
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<Tax>({
    resolver: zodResolver(taxSchema),
    defaultValues: { tax_name: "", tax_rate: 0 },
  });

  const onSubmit = (data: Tax) => {
    setTaxes([...taxes, { ...data, id: Math.random().toString() }]);
    form.reset();
    setIsOpen(false);
  };

  return (
    <div className="space-y-4">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="w-full bg-blue-600 hover:bg-blue-700">
            <Plus size={18} className="mr-2" />
            Add Tax
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tax</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="tax_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., VAT, Service Tax" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tax_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Rate (%)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.1"
                        max="100"
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full">
                Save Tax
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {taxes.map((tax) => (
          <div
            key={tax.id}
            className="p-4 border rounded-lg dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800"
          >
            <div>
              <h4 className="font-semibold">{tax.tax_name}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {tax.tax_rate}% of order value
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTaxes(taxes.filter((t) => t.id !== tax.id))}
            >
              <Trash2 size={16} className="text-red-500" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const RestaurantSettings: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings size={32} className="text-blue-600" />
            <h1 className="text-3xl font-bold">Restaurant Settings</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your restaurant configuration - Menu, Tables, Taxes, and Details
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white dark:bg-gray-800 p-1 rounded-lg shadow-sm">
            <TabsTrigger
              value="details"
              className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <Settings size={16} />
              <span className="hidden sm:inline">Details</span>
            </TabsTrigger>
            <TabsTrigger
              value="tables"
              className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <Table2 size={16} />
              <span className="hidden sm:inline">Tables</span>
            </TabsTrigger>
            <TabsTrigger
              value="tax"
              className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <DollarSign size={16} />
              <span className="hidden sm:inline">Tax</span>
            </TabsTrigger>
            <TabsTrigger
              value="menu"
              className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <UtensilsCrossed size={16} />
              <span className="hidden sm:inline">Menu</span>
            </TabsTrigger>
          </TabsList>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <TabsContent value="details" className="m-0">
              <DetailsTab />
            </TabsContent>

            <TabsContent value="tables" className="m-0">
              <TablesTab />
            </TabsContent>

            <TabsContent value="tax" className="m-0">
              <TaxSetupTab />
            </TabsContent>

            <TabsContent value="menu" className="m-0">
              <div className="text-center py-12">
                <UtensilsCrossed size={48} className="mx-auto text-blue-600 mb-4 opacity-50" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Manage your menu items
                </p>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <ChefHat size={18} className="mr-2" />
                  Go to Menu Manager
                </Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            💡 Menu Management
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            To manage your menu items (add, edit, delete), please visit the separate Menu Manager page for a full-featured interface with image uploads and bulk operations.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RestaurantSettings;
