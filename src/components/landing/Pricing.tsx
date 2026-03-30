import { Link } from "react-router-dom";
import { CheckCircle2, X, Star, Zap, ArrowRight, ShieldCheck } from "lucide-react";

interface PlanRow {
  feature: string;
  messflow: string | boolean;
  foodics: string | boolean;
  whatsapp: string | boolean;
}

const ROWS: PlanRow[] = [
  { feature: "Monthly Price",            messflow: "AED 200",    foodics: "AED 500+",   whatsapp: "Free*"      },
  { feature: "Table & KOT Management",  messflow: true,         foodics: true,          whatsapp: false        },
  { feature: "Realtime Kitchen Display", messflow: true,         foodics: true,          whatsapp: false        },
  { feature: "UAE VAT Invoicing (5%)",   messflow: true,         foodics: true,          whatsapp: false        },
  { feature: "Mess / Canteen Mode",      messflow: true,         foodics: false,         whatsapp: false        },
  { feature: "Monthly Subscription Billing", messflow: true,    foodics: false,         whatsapp: false        },
  { feature: "Offline-first Support",    messflow: true,         foodics: false,         whatsapp: false        },
  { feature: "Arabic & English UI",      messflow: "Coming soon",foodics: true,          whatsapp: "N/A"        },
  { feature: "No Setup Fee",             messflow: true,         foodics: false,         whatsapp: true         },
  { feature: "Dedicated UAE Support",    messflow: true,         foodics: true,          whatsapp: false        },
  { feature: "Setup Time",              messflow: "< 5 mins",   foodics: "Days",        whatsapp: "Instant"    },
];

function Cell({ val, highlight }: { val: string | boolean; highlight?: boolean }) {
  if (typeof val === "boolean") {
    return val ? (
      <CheckCircle2 className={`w-5 h-5 mx-auto ${highlight ? "text-amber-400" : "text-green-400"}`} />
    ) : (
      <X className="w-5 h-5 mx-auto text-white/20" />
    );
  }
  return (
    <span className={`text-sm font-semibold ${highlight ? "text-amber-300" : "text-white/60"}`}>
      {val}
    </span>
  );
}

const ADDONS = [
  { icon: Zap,           label: "Realtime KOT",              desc: "Kitchen tickets appear instantly on display — no F5 key needed." },
  { icon: ShieldCheck,   label: "UAE VAT Compliant",         desc: "Auto-calculates 5% VAT on every invoice. Print-ready in seconds." },
  { icon: CheckCircle2,  label: "WhatsApp-level Simplicity", desc: "Designed for busy F&B owners — not accountants. 3 taps, done." },
  { icon: Star,          label: "Multi-mode in One App",     desc: "Run a mess, restaurant, AND canteen — all under one login." },
];

export default function LandingPricing() {
  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-amber-400 font-bold mb-4 bg-amber-500/10 px-3 py-1 rounded-full">
            Transparent Pricing
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-5 leading-tight">
            Replace Expensive POS Systems<br />
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              at a Fraction of the Cost
            </span>
          </h2>
          <p className="text-white/60 max-w-xl mx-auto text-lg">
            UAE-built software that competes with Foodics — at{" "}
            <strong className="text-white">AED 200/month</strong> instead of AED 500+.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden mb-12">
          {/* Table header */}
          <div className="grid grid-cols-4 gap-0 border-b border-white/10">
            <div className="p-4 md:p-6" />
            <div className="p-4 md:p-6 text-center border-l border-white/10">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold bg-amber-500 text-black px-2 py-1 rounded-full mb-2">
                <Star className="w-3 h-3" /> BEST VALUE
              </div>
              <p className="text-base md:text-xl font-black text-white">MessFlow</p>
              <p className="text-2xl md:text-4xl font-black text-amber-400 mt-1">200</p>
              <p className="text-xs text-white/40">AED / month</p>
            </div>
            <div className="p-4 md:p-6 text-center border-l border-white/10">
              <p className="text-base md:text-xl font-black text-white/60">Foodics</p>
              <p className="text-2xl md:text-4xl font-black text-white/30 mt-1">500<span className="text-base">+</span></p>
              <p className="text-xs text-white/30">AED / month</p>
            </div>
            <div className="p-4 md:p-6 text-center border-l border-white/10">
              <p className="text-base md:text-xl font-black text-white/60">WhatsApp</p>
              <p className="text-2xl md:text-4xl font-black text-white/30 mt-1">—</p>
              <p className="text-xs text-white/30 leading-tight">Manual work,<br/>no automation</p>
            </div>
          </div>

          {/* Rows */}
          {ROWS.map((row, i) => (
            <div
              key={i}
              className={`grid grid-cols-4 gap-0 border-b border-white/5 last:border-0 ${
                i % 2 === 0 ? "bg-white/[0.02]" : ""
              }`}
            >
              <div className="p-3 md:p-4 flex items-center">
                <span className="text-xs md:text-sm text-white/70 font-medium">{row.feature}</span>
              </div>
              <div className="p-3 md:p-4 flex items-center justify-center border-l border-amber-500/20 bg-amber-500/[0.03]">
                <Cell val={row.messflow} highlight />
              </div>
              <div className="p-3 md:p-4 flex items-center justify-center border-l border-white/5">
                <Cell val={row.foodics} />
              </div>
              <div className="p-3 md:p-4 flex items-center justify-center border-l border-white/5">
                <Cell val={row.whatsapp} />
              </div>
            </div>
          ))}
        </div>

        {/* Fine print */}
        <p className="text-center text-xs text-white/25 mb-16">
          * WhatsApp is free but requires manual tracking, has zero automation, and no UAE VAT invoicing.
        </p>

        {/* Why MessFlow callouts */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {ADDONS.map(({ icon: Icon, label, desc }, i) => (
            <div
              key={i}
              className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 hover:border-amber-500/30 hover:bg-white/[0.06] transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Icon className="w-5 h-5 text-amber-400" />
              </div>
              <p className="font-bold text-white text-sm mb-1">{label}</p>
              <p className="text-xs text-white/50 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="relative rounded-3xl overflow-hidden text-center">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20" />
          <div className="relative py-12 px-6 md:px-16">
            <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
              Start for <span className="text-amber-400">AED 200/month</span>. Cancel anytime.
            </h3>
            <p className="text-white/60 mb-6 max-w-lg mx-auto">
              No hardware lock-in. No setup fee. Works on any phone, tablet, or laptop — even with spotty kitchen WiFi.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold px-8 py-4 rounded-2xl text-lg shadow-xl shadow-amber-500/25 transition-all min-h-[56px] touch-manipulation"
            >
              Get Started Today
              <ArrowRight className="w-5 h-5" />
            </Link>
            <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
              {["14-day free trial", "No credit card", "UAE-based support"].map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-sm text-white/50">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
