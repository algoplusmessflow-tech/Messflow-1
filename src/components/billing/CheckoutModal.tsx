import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Banknote, CreditCard, SplitSquareVertical, Loader2, Printer, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Order, OrderItem } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import InvoicePrinter from "./InvoicePrinter";

// UAE VAT = 5%
const UAE_VAT_RATE = 0.05;

type PaymentMethod = "cash" | "card" | "split";

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  orderItems: OrderItem[];
  tableName: string;
  tableId: string;
  onPaid: () => void;
}

export default function CheckoutModal({
  open,
  onOpenChange,
  order,
  orderItems,
  tableName,
  tableId,
  onPaid,
}: CheckoutModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [discountPct, setDiscountPct] = useState(0);
  const [showInvoice, setShowInvoice] = useState(false);
  const [paidOrder, setPaidOrder] = useState<Order | null>(null);

  // ── Calculations ────────────────────────────────────────────────────────────
  const subtotal = orderItems.reduce(
    (sum, i) => sum + (i.unit_price ?? 0) * (i.quantity ?? 1),
    0
  );
  const discountAmount = parseFloat(((subtotal * discountPct) / 100).toFixed(2));
  const taxableAmount = subtotal - discountAmount;
  const vatAmount = parseFloat((taxableAmount * UAE_VAT_RATE).toFixed(2));
  const grandTotal = parseFloat((taxableAmount + vatAmount).toFixed(2));

  // ── Confirm Payment ─────────────────────────────────────────────────────────
  const payMutation = useMutation({
    mutationFn: async () => {
      // 1. Update order to paid
      const { data: updatedOrder, error: orderErr } = await supabase
        .from("orders")
        .update({
          status: "paid",
          payment_status: "paid",
          payment_method: paymentMethod,
          subtotal,
          discount_amount: discountAmount,
          tax_rate: UAE_VAT_RATE,
          tax_amount: vatAmount,
          total: grandTotal,
          completed_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .select()
        .single();

      if (orderErr) throw orderErr;

      // 2. Release the table to "available"
      const { error: tableErr } = await supabase
        .from("restaurant_tables")
        .update({ status: "available" })
        .eq("id", tableId);

      if (tableErr) throw tableErr;

      return updatedOrder as Order;
    },
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ["restaurant_tables"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Payment confirmed!", description: `₹${grandTotal} via ${paymentMethod}` });
      setPaidOrder(updatedOrder);
      setShowInvoice(true);
      onPaid();
    },
    onError: (err: Error) => {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
    },
  });

  const handleClose = () => {
    setShowInvoice(false);
    setPaidOrder(null);
    setDiscountPct(0);
    setPaymentMethod("cash");
    onOpenChange(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Checkout — {tableName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Order Number */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Order</span>
              <Badge variant="outline" className="font-mono font-bold">
                {order.order_number}
              </Badge>
            </div>

            {/* Line items */}
            <div className="space-y-2 rounded-xl border border-border/60 bg-muted/30 p-3">
              {orderItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="flex-1 font-medium">
                    {item.quantity}× {item.item_name}
                    {item.special_notes && (
                      <span className="block text-xs text-muted-foreground italic">
                        ↳ {item.special_notes}
                      </span>
                    )}
                  </span>
                  <span className="font-semibold tabular-nums">
                    ₹{((item.unit_price ?? 0) * (item.quantity ?? 1)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Discount */}
            <div className="flex items-center gap-3">
              <Label htmlFor="discount" className="flex-shrink-0 text-sm font-medium">
                Discount %
              </Label>
              <Input
                id="discount"
                type="number"
                min={0}
                max={100}
                value={discountPct}
                onChange={(e) => setDiscountPct(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="w-24 min-h-[44px] text-center font-bold text-base"
              />
            </div>

            {/* Totals */}
            <div className="space-y-1.5 rounded-xl border border-border/60 bg-muted/20 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({discountPct}%)</span>
                  <span>- ₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>VAT (5% UAE)</span>
                <span>₹{vatAmount.toFixed(2)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between text-lg font-black">
                <span>Total</span>
                <span className="text-primary">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment method — 3 large touch targets */}
            <div>
              <p className="text-sm font-medium mb-2">Payment Method</p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "cash", label: "Cash", icon: Banknote },
                    { id: "card", label: "Card", icon: CreditCard },
                    { id: "split", label: "Split", icon: SplitSquareVertical },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPaymentMethod(id)}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 min-h-[72px] font-bold text-sm transition-all touch-manipulation active:scale-[0.97] ${
                      paymentMethod === id
                        ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                        : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5"
                    }`}
                    aria-pressed={paymentMethod === id}
                  >
                    <Icon className="w-6 h-6" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={handleClose}
              className="min-h-[44px] touch-manipulation w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={() => payMutation.mutate()}
              disabled={payMutation.isPending}
              className="min-h-[56px] text-base font-bold flex-1 rounded-2xl shadow-lg shadow-primary/25 touch-manipulation"
            >
              {payMutation.isPending ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5 mr-2" />
              )}
              {payMutation.isPending ? "Processing…" : `Confirm ₹${grandTotal.toFixed(2)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice view — shown after successful payment */}
      {showInvoice && paidOrder && (
        <InvoicePrinter
          order={paidOrder}
          orderItems={orderItems}
          tableName={tableName}
          subtotal={subtotal}
          discountAmount={discountAmount}
          vatAmount={vatAmount}
          grandTotal={grandTotal}
          paymentMethod={paymentMethod}
          onClose={handleClose}
        />
      )}
    </>
  );
}
