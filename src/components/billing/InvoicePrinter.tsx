import { Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Order, OrderItem } from "@/integrations/supabase/types";

interface InvoicePrinterProps {
  order: Order;
  orderItems: OrderItem[];
  tableName: string;
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  grandTotal: number;
  paymentMethod: string;
  onClose: () => void;
}

export default function InvoicePrinter({
  order,
  orderItems,
  tableName,
  subtotal,
  discountAmount,
  vatAmount,
  grandTotal,
  paymentMethod,
  onClose,
}: InvoicePrinterProps) {
  const handlePrint = () => window.print();

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-AE", {
    day: "2-digit", month: "short", year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-AE", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 overflow-y-auto print:bg-white">
      {/* Non-printable toolbar */}
      <div className="print:hidden sticky top-0 bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between gap-3 z-10">
        <Button
          variant="ghost"
          onClick={onClose}
          className="min-h-[44px] touch-manipulation"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Done
        </Button>
        <Button
          onClick={handlePrint}
          className="min-h-[44px] touch-manipulation"
        >
          <Printer className="w-5 h-5 mr-2" />
          Print Invoice
        </Button>
      </div>

      {/* Print styles injected inline */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden { display: none !important; }
        }
      `}</style>

      {/* 80mm receipt container */}
      <div
        className="mx-auto my-8 bg-white shadow-xl border border-gray-200 print:shadow-none print:border-0 print:my-0 print:mx-0"
        style={{ maxWidth: "302px", fontFamily: "'Courier New', Courier, monospace" }}
      >
        <div className="px-3 py-4 space-y-3 text-black">

          {/* Header */}
          <div className="text-center border-b-2 border-dashed border-black pb-3">
            <p className="text-[11px] uppercase tracking-widest font-bold">Tax Invoice</p>
            <h1 className="text-xl font-black uppercase leading-none mt-1">RECEIPT</h1>
            <p className="text-[10px] mt-1 font-mono">{dateStr} · {timeStr}</p>
          </div>

          {/* Order meta */}
          <div className="text-[12px] space-y-0.5">
            <div className="flex justify-between">
              <span className="uppercase font-bold">Order</span>
              <span className="font-mono">{order.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="uppercase font-bold">Table</span>
              <span className="font-mono">{tableName}</span>
            </div>
            <div className="flex justify-between">
              <span className="uppercase font-bold">Payment</span>
              <span className="font-mono uppercase">{paymentMethod}</span>
            </div>
          </div>

          {/* Items */}
          <div className="border-t-2 border-b-2 border-dashed border-black py-2 space-y-1.5">
            <div className="flex justify-between text-[10px] font-black uppercase border-b border-black pb-1 mb-2">
              <span>Item</span>
              <span>Qty</span>
              <span>Amt</span>
            </div>
            {orderItems.map((item) => {
              const lineTotal = (item.unit_price ?? 0) * (item.quantity ?? 1);
              return (
                <div key={item.id} className="text-[12px]">
                  <div className="flex justify-between font-bold">
                    <span className="flex-1 truncate mr-2 uppercase">{item.item_name}</span>
                    <span className="w-6 text-center">{item.quantity}</span>
                    <span className="w-16 text-right">₹{lineTotal.toFixed(2)}</span>
                  </div>
                  {item.special_notes && (
                    <p className="text-[10px] italic font-semibold pl-2 border-l-2 border-black ml-1 leading-snug">
                      * {item.special_notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="text-[12px] space-y-1">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-mono">₹{subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between font-bold">
                <span>Discount</span>
                <span className="font-mono">- ₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>VAT (5%)</span>
              <span className="font-mono">₹{vatAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[15px] font-black border-t-2 border-black pt-1 mt-1">
              <span>TOTAL</span>
              <span className="font-mono">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center border-t-2 border-dashed border-black pt-3 space-y-1">
            <p className="text-[11px] font-bold uppercase">Thank you for dining with us!</p>
            <p className="text-[9px] text-gray-600 uppercase tracking-wider">
              VAT Reg. No.: TRN-XXXXXXXXX
            </p>
            <p className="text-[9px] text-gray-500 mt-1">
              ----- End of Invoice -----
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
