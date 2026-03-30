import { useState } from "react";
import {
  UtensilsCrossed, ChefHat, Users, Ticket, Table2, ShoppingBag, BarChart3,
  Smartphone, Wifi, CheckCircle2, ArrowRight,
} from "lucide-react";

const MODES = [
  {
    id: "mess",
    label: "Mess",
    emoji: "🍱",
    color: "from-amber-500 to-orange-500",
    glow: "shadow-amber-500/25",
    tagline: "Built for subscription-based meal services",
    features: [
      { icon: Users,          text: "Member & subscription management" },
      { icon: BarChart3,      text: "Monthly billing & due tracking"   },
      { icon: ChefHat,        text: "Daily kitchen prep sheet"          },
      { icon: UtensilsCrossed,text: "Inventory & consumption logs"      },
    ],
    preview: [
      { label: "Members",   value: "142", up: true  },
      { label: "Collected", value: "AED 18.4k", up: true  },
      { label: "Pending",   value: "AED 2.1k",  up: false },
    ],
  },
  {
    id: "restaurant",
    label: "Restaurant",
    emoji: "🍽️",
    color: "from-rose-500 to-pink-500",
    glow: "shadow-rose-500/25",
    tagline: "Full table & kitchen display system",
    features: [
      { icon: Table2,     text: "Live table grid with status colours"  },
      { icon: Ticket,     text: "Realtime KOT to kitchen display"       },
      { icon: ShoppingBag,text: "Checkout with UAE VAT (5%) auto-calc"  },
      { icon: Printer,    text: "80mm thermal printer support"           },
    ],
    preview: [
      { label: "Active Tables", value: "8/12",     up: true  },
      { label: "Open KOTs",     value: "5",        up: true  },
      { label: "Today Revenue", value: "AED 4.2k", up: true  },
    ],
  },
  {
    id: "canteen",
    label: "Canteen",
    emoji: "🏫",
    color: "from-emerald-500 to-teal-500",
    glow: "shadow-emerald-500/25",
    tagline: "Token-based self-service for institutions",
    features: [
      { icon: Ticket,     text: "Token generation & scanning"           },
      { icon: Users,      text: "Staff & visitor meal management"        },
      { icon: BarChart3,  text: "Shift-wise meal consumption reports"   },
      { icon: ChefHat,    text: "Bulk prep planning"                     },
    ],
    preview: [
      { label: "Tokens Today", value: "384",      up: true  },
      { label: "Meals Served", value: "319",      up: true  },
      { label: "Cost/Meal",    value: "AED 5.20", up: false },
    ],
  },
];

// Tiny component import shim — lucide Printer isn't imported yet at top
function Printer({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

export default function BusinessModes() {
  const [active, setActive] = useState(0);
  const mode = MODES[active];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background glow follows active mode */}
      <div
        className={`absolute inset-0 pointer-events-none transition-all duration-700 bg-gradient-to-br ${mode.color} opacity-5 blur-3xl`}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-amber-400 font-bold mb-4 bg-amber-500/10 px-3 py-1 rounded-full">
            One App · Multiple Modes
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
            Your Business Type,<br />
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Your Workflow
            </span>
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto text-lg">
            Sign up once. The app adapts to how <em>you</em> run food service — no extras, no complexity.
          </p>
        </div>

        {/* Mode Switcher tabs */}
        <div className="flex gap-2 justify-center flex-wrap mb-10">
          {MODES.map((m, i) => (
            <button
              key={m.id}
              onClick={() => setActive(i)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm min-h-[44px] touch-manipulation border-2 transition-all duration-300 ${
                active === i
                  ? `bg-gradient-to-r ${m.color} border-transparent text-white shadow-xl ${m.glow}`
                  : "border-white/10 text-white/50 hover:border-white/20 hover:text-white/80 bg-white/[0.03]"
              }`}
            >
              <span className="text-lg">{m.emoji}</span>
              {m.label} Mode
            </button>
          ))}
        </div>

        {/* Mode content — split card */}
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {/* Left: Features */}
          <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6">
            <div>
              <span className="text-3xl">{mode.emoji}</span>
              <h3 className="text-2xl font-extrabold text-white mt-2">{mode.label} Mode</h3>
              <p className="text-white/50 mt-1 text-sm">{mode.tagline}</p>
            </div>

            <ul className="space-y-4">
              {mode.features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-white/80">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${mode.color} bg-opacity-20`}>
                    <f.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium">{f.text}</span>
                </li>
              ))}
            </ul>

            <div className="pt-2">
              <a
                href="/login"
                className={`inline-flex items-center gap-2 font-bold text-sm text-white bg-gradient-to-r ${mode.color} px-5 py-3 rounded-2xl min-h-[44px] touch-manipulation shadow-lg transition-opacity hover:opacity-90`}
              >
                Start as {mode.label}
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Right: Mock dashboard preview */}
          <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-6 md:p-8">
            <p className="text-xs text-white/30 uppercase tracking-widest font-bold mb-5">Live Dashboard Preview</p>

            {/* Animated stat pills */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {mode.preview.map((s, i) => (
                <div key={i} className="bg-white/[0.05] border border-white/10 rounded-2xl p-3 text-center">
                  <p className="text-lg md:text-2xl font-black text-white">{s.value}</p>
                  <p className="text-[10px] text-white/40 font-medium mt-0.5 leading-tight">{s.label}</p>
                  <span className={`text-[10px] font-bold mt-1 inline-block ${s.up ? "text-green-400" : "text-red-400"}`}>
                    {s.up ? "▲" : "▼"}
                  </span>
                </div>
              ))}
            </div>

            {/* Fake activity feed */}
            <div className="space-y-2">
              {active === 0 && (
                <>
                  <FeedRow color="green"  text="Ali Hassan — Subscription renewed · AED 900" time="2m ago" />
                  <FeedRow color="amber"  text="Kitchen prep sheet printed for 142 members" time="8m ago" />
                  <FeedRow color="red"    text="3 members pending payment · AED 2100"       time="1h ago" />
                </>
              )}
              {active === 1 && (
                <>
                  <FeedRow color="blue"   text="Table 5 — New KOT #031 sent to kitchen"     time="45s ago" />
                  <FeedRow color="green"  text="Table 3 — Order paid · AED 185 (Card)"      time="3m ago" />
                  <FeedRow color="amber"  text="Table 8 — KOT #030 ⚠ Overdue 17 mins"       time="17m ago" />
                </>
              )}
              {active === 2 && (
                <>
                  <FeedRow color="green"  text="Token #384 scanned — Lunch · Cafeteria A"   time="1m ago" />
                  <FeedRow color="blue"   text="Batch print · 50 tokens for dinner shift"   time="12m ago" />
                  <FeedRow color="amber"  text="Low stock alert: Rice — 8kg remaining"      time="30m ago" />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeedRow({ color, text, time }: { color: string; text: string; time: string }) {
  const dot: Record<string, string> = {
    green: "bg-green-500",
    amber: "bg-amber-400",
    red: "bg-red-500",
    blue: "bg-blue-400",
  };
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dot[color] || "bg-gray-500"}`} />
      <p className="text-xs text-white/60 flex-1 leading-snug">{text}</p>
      <span className="text-[10px] text-white/30 flex-shrink-0">{time}</span>
    </div>
  );
}
