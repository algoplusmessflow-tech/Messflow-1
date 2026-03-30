import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, LayoutGrid } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { TableCard } from "@/components/tables/TableCard";
import { AddTableModal } from "@/components/tables/AddTableModal";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { RestaurantTable } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

export default function Tables() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { data: tables, isLoading } = useQuery({
    queryKey: ["restaurant_tables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("*")
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleTableClick = async (table: RestaurantTable) => {
    if (table.status === 'available') {
      try {
        const { error } = await supabase
          .from("restaurant_tables")
          .update({ status: 'occupied' })
          .eq('id', table.id);
          
        if (error) throw error;
      } catch (e: any) {
        toast({ title: "Error updating table state", description: e.message, variant: "destructive" });
        return;
      }
    }
    navigate(`/order/new?tableId=${table.id}`);
  };

  return (
    <div className="flex h-dvh bg-dashboard-background overflow-hidden relative w-full">
      <DesktopSidebar />
      
      <main className="flex-1 overflow-y-auto w-full pb-20 md:pb-0">
        <div className="md:ml-64 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/50 pb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <LayoutGrid className="w-7 h-7 text-primary" />
                Table Management
              </h1>
              <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">
                Manage your interactive restaurant layout and view live seating status.
              </p>
            </div>
            
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="w-full sm:w-auto min-h-[44px] touch-manipulation shadow-sm group rounded-xl"
            >
              <Plus className="mr-2 h-5 w-5 transition-transform group-hover:rotate-90" />
              Add Table
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-8">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-muted rounded-xl h-[120px] shadow-sm" />
              ))
            ) : tables?.length === 0 ? (
              <div className="col-span-full py-16 px-4 text-center border-2 border-dashed rounded-2xl bg-card/30">
                <LayoutGrid className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-foreground">No tables found</h3>
                <p className="text-muted-foreground mt-2 mb-6 max-w-sm mx-auto">
                  Get started by adding your first table to begin managing orders and reservations.
                </p>
                <Button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="min-h-[44px] touch-manipulation"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add First Table
                </Button>
              </div>
            ) : (
              tables?.map((table) => (
                <TableCard key={table.id} table={table} onClick={() => handleTableClick(table)} />
              ))
            )}
          </div>
        </div>
      </main>

      <BottomNav />
      <AddTableModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
    </div>
  );
}
