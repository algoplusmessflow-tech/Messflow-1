import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Minus, FileEdit, ShoppingBag, Loader2, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { MenuItem, RestaurantTable, Order, OrderItem } from "@/integrations/supabase/types";
import CheckoutModal from "@/components/billing/CheckoutModal";

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialNotes?: string;
}

export default function OrderTaking() {
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get("tableId");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeNoteItem, setActiveNoteItem] = useState<MenuItem | null>(null);
  const [noteText, setNoteText] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const { data: table } = useQuery({
    queryKey: ["table", tableId],
    queryFn: async () => {
      if (!tableId) throw new Error("No table ID");
      const { data, error } = await supabase.from("restaurant_tables").select("*").eq("id", tableId).single();
      if (error) throw error;
      return data as RestaurantTable;
    },
    enabled: !!tableId,
  });

  const { data: menuItems, isLoading: menuLoading } = useQuery({
    queryKey: ["menu_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_items").select("*").eq("is_available", true).order("category");
      if (error) throw error;
      return data as MenuItem[];
    },
    enabled: !!user,
  });

  // Fetch existing open/served order for this table (for checkout flow)
  const { data: existingOrder } = useQuery({
    queryKey: ["table_order", tableId],
    queryFn: async () => {
      if (!tableId) return null;
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("table_id", tableId)
        .in("status", ["open", "served"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Order | null;
    },
    enabled: !!tableId,
  });

  // Fetch order items for existing order
  const { data: existingOrderItems = [] } = useQuery({
    queryKey: ["order_items", existingOrder?.id],
    queryFn: async () => {
      if (!existingOrder) return [];
      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", existingOrder.id);
      if (error) throw error;
      return data as OrderItem[];
    },
    enabled: !!existingOrder?.id,
  });

  const isServed = existingOrder?.status === "served";
  const hasExistingOrder = !!existingOrder && existingOrder.status !== "paid";

  const updateQuantity = (item: MenuItem, delta: number) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === item.id);
      if (!existing) {
        if (delta > 0) return [...prev, { menuItem: item, quantity: 1 }];
        return prev;
      }
      const newQuantity = existing.quantity + delta;
      if (newQuantity <= 0) return prev.filter(c => c.menuItem.id !== item.id);
      return prev.map(c => c.menuItem.id === item.id ? { ...c, quantity: newQuantity } : c);
    });
  };

  const openNotes = (item: MenuItem) => {
    const existing = cart.find(c => c.menuItem.id === item.id);
    setNoteText(existing?.specialNotes || "");
    setActiveNoteItem(item);
  };

  const saveNotes = () => {
    if (!activeNoteItem) return;
    setCart(prev => prev.map(c =>
      c.menuItem.id === activeNoteItem.id ? { ...c, specialNotes: noteText } : c
    ));
    setActiveNoteItem(null);
  };

  const getQuantity = (itemId: string) => cart.find(c => c.menuItem.id === itemId)?.quantity || 0;

  const totalAmount = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const submitOrderMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user found");
      if (!table) throw new Error("No table loaded");
      if (cart.length === 0) throw new Error("Cart is empty");

      let orderNumber = "";
      let kotNumber = "";

      try {
        const { data: ordNum, error: ordErr } = await supabase.rpc("next_order_number", { p_owner_id: user.id });
        if (ordErr) throw ordErr;
        orderNumber = ordNum;

        const { data: kotNum, error: kotErr } = await supabase.rpc("next_kot_number", { p_owner_id: user.id });
        if (kotErr) throw kotErr;
        kotNumber = kotNum;
      } catch {
        throw new Error("Failed to generate sequential ID. Please check your connection to the database.");
      }

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          owner_id: user.id,
          table_id: table.id,
          waiter_id: user.id,
          order_number: orderNumber,
          order_type: "dine_in",
          status: "open",
          subtotal: totalAmount,
          total: totalAmount,
        })
        .select()
        .single();
      if (orderError) throw orderError;

      const itemsSummary = cart.map(c => `${c.quantity}x ${c.menuItem.name}`).join(", ");
      const { data: kotData, error: kotError } = await supabase
        .from("kot_tickets")
        .insert({
          owner_id: user.id,
          order_id: orderData.id,
          ticket_number: kotNumber,
          kot_type: "new",
          status: "pending",
          table_name: table.name,
          order_type: "dine_in",
          items_summary: itemsSummary,
        })
        .select()
        .single();
      if (kotError) throw kotError;

      const orderItemsInsert = cart.map(c => ({
        order_id: orderData.id,
        kot_id: kotData.id,
        item_name: c.menuItem.name,
        item_category: c.menuItem.category,
        quantity: c.quantity,
        unit_price: c.menuItem.price,
        total_price: c.menuItem.price * c.quantity,
        status: "pending",
        special_notes: c.specialNotes || null,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItemsInsert);
      if (itemsError) throw itemsError;

      return { orderData, kotData };
    },
    onSuccess: (data) => {
      toast({ title: "Order sent to kitchen!" });
      queryClient.invalidateQueries({ queryKey: ["table_order", tableId] });
      setCart([]);
      navigate(`/kot/print/${data.kotData.id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    },
  });

  const handlePaid = () => {
    queryClient.invalidateQueries({ queryKey: ["table_order", tableId] });
    queryClient.invalidateQueries({ queryKey: ["restaurant_tables"] });
    setTimeout(() => navigate("/tables"), 1500);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-dashboard-background w-full overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 bg-card border-b border-border/50 px-4 py-3 min-h-[60px] flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="min-h-[44px] min-w-[44px] touch-manipulation">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg leading-tight">{table?.name || "Loading Table…"}</h1>
            <p className="text-sm text-muted-foreground leading-tight">
              {isServed ? "Order Served — Ready to Bill" : hasExistingOrder ? "Order Active" : "New Order"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-0 capitalize">
            {table?.zone || "Zone"}
          </Badge>
          {/* Generate Bill button — enabled when order is served */}
          {hasExistingOrder && (
            <Button
              size="sm"
              variant={isServed ? "default" : "outline"}
              onClick={() => setCheckoutOpen(true)}
              className={`min-h-[44px] touch-manipulation rounded-xl gap-2 ${
                isServed ? "shadow-lg shadow-primary/25 animate-pulse" : ""
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span className="hidden sm:inline">{isServed ? "Generate Bill" : "View Bill"}</span>
            </Button>
          )}
        </div>
      </header>

      {/* Menu List */}
      <main className="flex-1 overflow-y-auto w-full pb-32">
        <div className="px-4 py-4 max-w-lg mx-auto space-y-3">
          {menuLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-muted rounded-xl h-[80px] w-full" />
            ))
          ) : menuItems?.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No menu items available.</p>
            </div>
          ) : (
            menuItems?.map(item => {
              const qty = getQuantity(item.id);
              return (
                <div key={item.id} className="bg-card p-4 rounded-2xl shadow-sm border border-border/50 flex justify-between items-center gap-4 transition-all active:scale-[0.98]">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
                      {item.is_veg !== null && (
                        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${item.is_veg ? "bg-green-500" : "bg-red-500"}`} />
                      )}
                    </div>
                    <p className="text-sm text-primary font-medium mt-1">₹{item.price}</p>
                    {qty > 0 && cart.find(c => c.menuItem.id === item.id)?.specialNotes && (
                      <p className="text-xs text-muted-foreground mt-1 truncate bg-muted px-2 py-0.5 rounded-md inline-block">
                        Note: {cart.find(c => c.menuItem.id === item.id)?.specialNotes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2">
                    {qty > 0 ? (
                      <>
                        <Button variant="outline" size="icon" className="h-10 w-10 sm:h-11 sm:w-11 rounded-full touch-manipulation" onClick={() => openNotes(item)}>
                          <FileEdit className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-10 w-10 sm:h-11 sm:w-11 rounded-full border-primary/20 bg-primary/5 text-primary touch-manipulation" onClick={() => updateQuantity(item, -1)}>
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-6 text-center font-bold text-lg">{qty}</span>
                        <Button variant="default" size="icon" className="h-10 w-10 sm:h-11 sm:w-11 rounded-full touch-manipulation" onClick={() => updateQuantity(item, 1)}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        className="min-h-[44px] rounded-full px-6 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 touch-manipulation"
                        onClick={() => updateQuantity(item, 1)}
                      >
                        Add
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Sticky bottom bar — Submit Order */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border/50 p-4 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.08)] z-30">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground font-medium">{totalItems} Item{totalItems > 1 ? "s" : ""}</span>
              <span className="text-xl font-bold text-foreground">₹{totalAmount}</span>
            </div>
            <Button
              className="flex-1 min-h-[56px] text-base rounded-2xl touch-manipulation shadow-lg shadow-primary/25"
              onClick={() => submitOrderMutation.mutate()}
              disabled={submitOrderMutation.isPending}
            >
              {submitOrderMutation.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <ShoppingBag className="w-5 h-5 mr-2" />}
              {submitOrderMutation.isPending ? "Sending to Kitchen…" : "Submit Order"}
            </Button>
          </div>
        </div>
      )}

      {/* Special Notes Modal */}
      <Dialog open={!!activeNoteItem} onOpenChange={(open) => !open && setActiveNoteItem(null)}>
        <DialogContent className="sm:max-w-md mt-[-10vh]">
          <DialogHeader>
            <DialogTitle>Add Special Instructions</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="e.g. Less spicy, Allergy to peanuts…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="min-h-[100px] text-base"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveNoteItem(null)} className="min-h-[44px]">Cancel</Button>
            <Button onClick={saveNotes} className="min-h-[44px]">Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Modal */}
      {existingOrder && tableId && (
        <CheckoutModal
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          order={existingOrder}
          orderItems={existingOrderItems}
          tableName={table?.name ?? "Table"}
          tableId={tableId}
          onPaid={handlePaid}
        />
      )}
    </div>
  );
}
