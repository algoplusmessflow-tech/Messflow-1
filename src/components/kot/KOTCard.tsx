import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, ChevronDown, Utensils, CheckCircle2, FileWarning } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { KotTicket, OrderItem } from "@/integrations/supabase/types";

// ── Status metadata ──────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:   { label: "New",      next: "preparing", bg: "bg-blue-600",   text: "text-white",  border: "border-blue-700"   },
  preparing: { label: "Preparing",next: "ready",     bg: "bg-yellow-400", text: "text-black",  border: "border-yellow-500"  },
  ready:     { label: "Ready",    next: "served",    bg: "bg-green-500",  text: "text-white",  border: "border-green-600"   },
  served:    { label: "Served",   next: null,        bg: "bg-gray-400",   text: "text-white",  border: "border-gray-500"    },
} as const;

type KotStatus = keyof typeof STATUS_CONFIG;

// ── Timer hook ────────────────────────────────────────────────────────────────
function useElapsedTime(createdAt: string | null) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!createdAt) return;
    const start = new Date(createdAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdAt]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const label = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const isOverdue = mins >= 15;

  return { mins, label, isOverdue };
}

// ── Item status cycle pill ────────────────────────────────────────────────────
function ItemRow({
  item,
  onCycle,
}: {
  item: OrderItem;
  onCycle: (itemId: string, nextStatus: string) => void;
}) {
  const st = (item.status ?? "pending") as KotStatus;
  const cfg = STATUS_CONFIG[st] ?? STATUS_CONFIG.pending;

  return (
    <button
      type="button"
      className={`w-full text-left flex items-start justify-between gap-3 px-4 py-3 rounded-xl border-2 transition-all active:scale-[0.97] touch-manipulation min-h-[56px] ${cfg.bg} ${cfg.border}`}
      onClick={() => cfg.next && onCycle(item.id, cfg.next)}
      disabled={!cfg.next}
      aria-label={`${item.item_name} — ${cfg.label}. Tap to cycle.`}
    >
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-xl leading-tight ${cfg.text}`}>
          <span className="mr-2 font-black text-2xl">{item.quantity}×</span>
          {item.item_name}
        </p>
        {item.special_notes && (
          <p className={`mt-1 text-sm font-semibold italic opacity-90 border-l-4 border-current pl-2 ${cfg.text}`}>
            {item.special_notes}
          </p>
        )}
      </div>
      <Badge
        className={`flex-shrink-0 text-xs font-bold uppercase tracking-wider border ${cfg.bg} ${cfg.text} ${cfg.border} self-start mt-0.5`}
      >
        {cfg.label}
      </Badge>
    </button>
  );
}

// ── Main KOT Card ─────────────────────────────────────────────────────────────
interface KOTCardProps {
  ticket: KotTicket;
  onServed: (kotId: string) => void;
}

export function KOTCard({ ticket, onServed }: KOTCardProps) {
  const queryClient = useQueryClient();
  const { label: timerLabel, isOverdue } = useElapsedTime(ticket.created_at);
  const status = (ticket.status ?? "pending") as KotStatus;
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

  // Fetch line items for this KOT
  const { data: items = [] } = useQuery({
    queryKey: ["kot_items", ticket.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .eq("kot_id", ticket.id)
        .order("created_at");
      if (error) throw error;
      return data as OrderItem[];
    },
  });

  // Cycle whole-KOT status
  const cycleKotMutation = useMutation({
    mutationFn: async (nextStatus: string) => {
      const { error } = await supabase
        .from("kot_tickets")
        .update({ status: nextStatus })
        .eq("id", ticket.id);
      if (error) throw error;

      // Also bulk-update line items if going to "served"
      if (nextStatus === "served") {
        await supabase
          .from("order_items")
          .update({ status: "ready" })
          .eq("kot_id", ticket.id);
        onServed(ticket.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kot_tickets"] });
      queryClient.invalidateQueries({ queryKey: ["kot_items", ticket.id] });
    },
  });

  // Cycle individual item status
  const cycleItemMutation = useMutation({
    mutationFn: async ({ itemId, nextStatus }: { itemId: string; nextStatus: string }) => {
      const { error } = await supabase
        .from("order_items")
        .update({ status: nextStatus })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kot_items", ticket.id] });
    },
  });

  const handleCycleKot = useCallback(() => {
    if (cfg.next) cycleKotMutation.mutate(cfg.next);
  }, [cfg.next, cycleKotMutation]);

  const handleCycleItem = useCallback((itemId: string, nextStatus: string) => {
    cycleItemMutation.mutate({ itemId, nextStatus });
  }, [cycleItemMutation]);

  // Red border if overdue and not already ready/served
  const isAlertRed = isOverdue && !["ready", "served"].includes(status);

  return (
    <article
      className={`flex flex-col rounded-2xl border-4 shadow-xl overflow-hidden transition-all duration-300 ${
        isAlertRed
          ? "border-red-600 shadow-red-500/30"
          : cfg.border + " shadow-black/10"
      }`}
      aria-label={`KOT ${ticket.ticket_number} — ${cfg.label}`}
    >
      {/* ── Card Header (tap to cycle whole KOT) ────────────────────────── */}
      <button
        type="button"
        className={`flex items-center justify-between gap-3 px-4 py-3 min-h-[72px] w-full text-left transition-colors touch-manipulation active:brightness-110 ${
          isAlertRed ? "bg-red-600" : cfg.bg
        } ${isAlertRed ? "text-white" : cfg.text}`}
        onClick={handleCycleKot}
        disabled={!cfg.next || cycleKotMutation.isPending}
        aria-label={`Cycle KOT ${ticket.ticket_number} to ${cfg.next ?? "done"}`}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-2xl font-black tracking-tight leading-none">
            {ticket.ticket_number}
          </span>
          <span className="text-lg font-bold opacity-90 leading-none">
            {ticket.table_name ?? "Table"}
          </span>
        </div>

        <div className="flex flex-col items-end gap-1">
          {/* Timer */}
          <div className={`flex items-center gap-1.5 font-mono font-bold text-xl ${isAlertRed ? "text-white" : cfg.text}`}>
            <Clock className="w-5 h-5" />
            {timerLabel}
          </div>
          {/* Status badge */}
          <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border-2 ${cfg.bg} ${cfg.text} ${cfg.border} bg-black/10`}>
            {isAlertRed ? "⚠ OVERDUE" : cfg.label} — Tap to advance
          </span>
        </div>
      </button>

      {/* ── Line Items body ──────────────────────────────────────────────── */}
      <div className="bg-gray-950 flex-1 p-3 space-y-2">
        {items.length === 0 ? (
          <div className="flex items-center gap-2 text-gray-400 py-4 justify-center">
            <FileWarning className="w-5 h-5" />
            <span className="text-sm">No items found for this ticket.</span>
          </div>
        ) : (
          items.map((item) => (
            <ItemRow key={item.id} item={item} onCycle={handleCycleItem} />
          ))
        )}
      </div>

      {/* ── Card footer ─────────────────────────────────────────────────── */}
      <button
        type="button"
        className={`flex items-center justify-center gap-2 px-4 py-3.5 min-h-[52px] w-full font-bold text-base transition-all touch-manipulation active:brightness-110 ${
          cfg.next === "served"
            ? "bg-green-500 text-white hover:bg-green-400"
            : cfg.next === null
            ? "bg-gray-800 text-gray-400 cursor-default"
            : isAlertRed
            ? "bg-red-700 text-white hover:bg-red-600"
            : "bg-gray-900 text-gray-200 hover:bg-gray-800"
        }`}
        onClick={handleCycleKot}
        disabled={!cfg.next || cycleKotMutation.isPending}
      >
        {cfg.next === "served" ? (
          <>
            <CheckCircle2 className="w-5 h-5" />
            Mark as Served & Dismiss
          </>
        ) : cfg.next === null ? (
          <>
            <Utensils className="w-5 h-5 opacity-50" />
            Served
          </>
        ) : (
          <>
            <ChevronDown className="w-5 h-5" />
            {`Advance → ${STATUS_CONFIG[cfg.next as KotStatus]?.label ?? cfg.next}`}
          </>
        )}
      </button>
    </article>
  );
}
