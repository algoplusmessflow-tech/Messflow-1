import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, BellOff, Bell, ChefHat, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { KotTicket } from "@/integrations/supabase/types";
import { KOTCard } from "./KOTCard";

// ── Audio ding via Web Audio API (no external file needed) ────────────────────
function playDing() {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);

    gainNode.gain.setValueAtTime(0.6, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.6);
  } catch {
    console.warn("Audio playback not available.");
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface KitchenKDSProps {
  ownerId: string;
}

// ── Main KDS component ────────────────────────────────────────────────────────
export function KitchenKDS({ ownerId }: KitchenKDSProps) {
  const queryClient = useQueryClient();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [servedIds, setServedIds] = useState<Set<string>>(new Set());
  const prevTicketIds = useRef<Set<string>>(new Set());
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Fetch active KOTs (exclude served)
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["kot_tickets", ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kot_tickets")
        .select("*")
        .eq("owner_id", ownerId)
        .in("status", ["pending", "preparing", "ready"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as KotTicket[];
    },
    enabled: !!ownerId,
    refetchInterval: 30_000, // Fallback poll every 30s in case of dropped WS
  });

  // Realtime subscription
  useEffect(() => {
    if (!ownerId) return;

    const channel = supabase
      .channel(`kds-kot-${ownerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "kot_tickets",
          filter: `owner_id=eq.${ownerId}`,
        },
        (payload) => {
          // Play ding on new order
          if (soundEnabledRef.current) playDing();
          queryClient.invalidateQueries({ queryKey: ["kot_tickets", ownerId] });
          console.log("[KDS] New KOT arrived:", payload.new);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "kot_tickets",
          filter: `owner_id=eq.${ownerId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["kot_tickets", ownerId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ownerId, queryClient]);

  // Detect brand-new tickets (for ding on first load diff)
  useEffect(() => {
    const currentIds = new Set(tickets.map((t) => t.id));
    if (prevTicketIds.current.size > 0) {
      for (const id of currentIds) {
        if (!prevTicketIds.current.has(id) && soundEnabledRef.current) {
          playDing();
          break;
        }
      }
    }
    prevTicketIds.current = currentIds;
  }, [tickets]);

  const handleServed = useCallback((kotId: string) => {
    setServedIds((prev) => new Set(prev).add(kotId));
    // After a short delay, remove from view (the query will re-fetch and filter it)
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["kot_tickets", ownerId] });
    }, 800);
  }, [ownerId, queryClient]);

  // Filter out just-served tickets for a smooth dismiss animation
  const visibleTickets = tickets.filter((t) => !servedIds.has(t.id));

  // Status counts for the header bar
  const counts = {
    pending: tickets.filter((t) => t.status === "pending").length,
    preparing: tickets.filter((t) => t.status === "preparing").length,
    ready: tickets.filter((t) => t.status === "ready").length,
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* KDS Header bar */}
      <div className="sticky top-0 z-20 bg-gray-900 border-b-2 border-gray-700 px-4 py-3 flex items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <ChefHat className="w-7 h-7 text-yellow-400 flex-shrink-0" />
          <h2 className="text-xl font-black tracking-tight hidden sm:block">Live Kitchen Display</h2>
        </div>

        {/* Status pill counters */}
        <div className="flex items-center gap-2 flex-1 justify-center">
          <span className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-full">
            <span className="text-lg font-black">{counts.pending}</span> New
          </span>
          <span className="flex items-center gap-1.5 bg-yellow-400 text-black text-sm font-bold px-3 py-1 rounded-full">
            <span className="text-lg font-black">{counts.preparing}</span> Cooking
          </span>
          <span className="flex items-center gap-1.5 bg-green-500 text-white text-sm font-bold px-3 py-1 rounded-full">
            <span className="text-lg font-black">{counts.ready}</span> Ready
          </span>
        </div>

        {/* Sound toggle */}
        <Button
          variant="ghost"
          size="icon"
          className={`min-h-[44px] min-w-[44px] rounded-xl touch-manipulation ${
            soundEnabled ? "text-yellow-400 hover:text-yellow-300" : "text-gray-500 hover:text-gray-400"
          }`}
          onClick={() => setSoundEnabled((v) => !v)}
          title={soundEnabled ? "Mute alerts" : "Unmute alerts"}
        >
          {soundEnabled ? <Bell className="w-6 h-6" /> : <BellOff className="w-6 h-6" />}
        </Button>
      </div>

      {/* Tickets grid */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-xl font-semibold">Loading Kitchen Display…</span>
          </div>
        ) : visibleTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-gray-500">
            <CheckCircle2 className="w-16 h-16 text-green-600 opacity-60" />
            <p className="text-2xl font-bold">All Clear!</p>
            <p className="text-lg">No active orders. New tickets will appear here instantly.</p>
            <Badge className="mt-2 bg-gray-800 text-gray-400 border-gray-700 text-sm px-4 py-1">
              Realtime connected
            </Badge>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleTickets.map((ticket) => (
              <KOTCard
                key={ticket.id}
                ticket={ticket}
                onServed={handleServed}
              />
            ))}
          </div>
        )}
      </div>

      {/* Keyboard shortcut hint */}
      <p className="text-center text-gray-700 text-xs pb-6 font-mono">
        Tap card header or footer to cycle status · Tap individual items for per-item tracking
      </p>
    </div>
  );
}
