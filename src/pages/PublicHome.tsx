import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  UtensilsCrossed, ArrowRight, CheckCircle2, Star,
  Wifi, Headphones, Smartphone, Zap, Table2, Ticket,
  Users, CreditCard, ChefHat, BarChart3, Globe,
} from "lucide-react";
import BusinessModes from "@/components/landing/BusinessModes";
import LandingPricing from "@/components/landing/Pricing";

// ── Data ────────────────────────────────────────────────────────────────────
const STATS = [
  { value: "500+",    label: "F&B Operators" },
  { value: "50K+",   label: "Members Served" },
  { value: "AED 200", label: "Starting / month" },
  { value: "99.9%",  label: "Uptime" },
];

const CORE_FEATURES = [
  { icon: Table2,     title: "Table Management",        desc: "Live table grid with status colours. See every table at a glance." },
  { icon: Ticket,     title: "Realtime KOT",            desc: "Orders appear on the kitchen display instantly. No refresh, no delay." },
  { icon: Users,      title: "Member Subscriptions",    desc: "Automated billing, dues tracking and renewal notifications." },
  { icon: CreditCard, title: "UAE VAT Invoicing",       desc: "5% VAT auto-calculated on every bill. Print-ready in seconds." },
  { icon: ChefHat,    title: "Kitchen Prep Sheets",     desc: "Daily summary sent to kitchen staff — qty by zone, diet, and meal." },
  { icon: BarChart3,  title: "Business Insights",       desc: "Revenue, expenses, and membership analytics in one dashboard." },
];

const UAE_SUPPORT = [
  { icon: Wifi,         title: "Offline-First",        desc: "Works even on spotty kitchen WiFi. Syncs when connection returns." },
  { icon: Headphones,   title: "UAE-Based Support",    desc: "WhatsApp + email support staffed by a local team in the UAE." },
  { icon: Smartphone,   title: "Mobile-First Design",  desc: "Built for phones. Every button is thumb-friendly — 44px+ targets." },
  { icon: Globe,        title: "Multi-Currency Ready", desc: "AED primary. Built with UAE tax law compliance from day one." },
  { icon: Zap,          title: "5-Minute Setup",       desc: "Create account, add menu items, start taking orders. Done." },
  { icon: Star,         title: "No Lock-in",           desc: "Cancel anytime. No hardware purchase. No setup fees. No contracts." },
];

const TESTIMONIALS = [
  {
    quote: "Reduced my WhatsApp management chaos by 80%. Now I see collections, dues, and kitchen prep all in one screen.",
    name: "Syed Ashraf",
    role: "Mess Owner, Dubai",
    avatar: "SA",
  },
  {
    quote: "We switched from Foodics. MessFlow costs AED 300 less per month and does everything we actually need.",
    name: "Ramesh Kumar",
    role: "Restaurant Manager, Abu Dhabi",
    avatar: "RK",
  },
  {
    quote: "The KOT display is a game changer. Kitchen staff never miss an order now. It just works.",
    name: "Priya Nair",
    role: "Canteen Manager, Sharjah",
    avatar: "PN",
  },
];

// ── Page ────────────────────────────────────────────────────────────────────
export default function PublicHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/mode-selection");
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-x-hidden">
      {/* ── Ambient Background ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-amber-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-60 w-[400px] h-[400px] bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-rose-500/5 rounded-full blur-3xl" />
      </div>

      {/* ═══════════════════════════════════════ NAV ══════════════════════════ */}
      <nav className="relative z-50 border-b border-white/5 sticky top-0 bg-[#0A0A0A]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <a href="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                <UtensilsCrossed className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-black tracking-tight">MessFlow</span>
            </a>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-7">
              <a href="#modes"    className="text-sm text-white/60 hover:text-white transition-colors">Modes</a>
              <a href="#features" className="text-sm text-white/60 hover:text-white transition-colors">Features</a>
              <a href="#pricing"  className="text-sm text-white/60 hover:text-white transition-colors">Pricing</a>
              <a href="#uae"      className="text-sm text-white/60 hover:text-white transition-colors">UAE Support</a>
            </div>

            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" className="text-white/70 hover:text-white hover:bg-white/5 min-h-[44px]">
                <Link to="/login">Sign In</Link>
              </Button>
              <Button
                asChild
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white border-0 shadow-lg shadow-amber-500/20 min-h-[44px] touch-manipulation"
              >
                <Link to="/login">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════ HERO ═════════════════════════ */}
      <section className="relative z-10 pt-20 pb-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-8 animate-fade-in-up">
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
              <span className="text-sm text-amber-300 font-semibold">
                The only affordable SaaS for UAE messes &amp; restaurants
              </span>
            </div>

            <h1
              className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight mb-6 animate-fade-in-up leading-[1.05]"
              style={{ animationDelay: "100ms" }}
            >
              <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                One App.{" "}
              </span>
              <br className="sm:hidden" />
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 bg-clip-text text-transparent">
                Every Mode.
              </span>
            </h1>

            <p
              className="text-lg sm:text-xl text-white/60 mb-4 max-w-2xl mx-auto animate-fade-in-up"
              style={{ animationDelay: "150ms" }}
            >
              Mess billing, restaurant KOT, canteen tokens — all in one platform built for the
              UAE&apos;s fast-paced food service industry.
            </p>

            <p
              className="text-base font-bold text-amber-400 mb-10 animate-fade-in-up"
              style={{ animationDelay: "180ms" }}
            >
              Starting at just{" "}
              <span className="text-2xl font-black text-amber-300">AED 200</span>/month
              &nbsp;—&nbsp; vs Foodics at AED 500+
            </p>

            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up"
              style={{ animationDelay: "250ms" }}
            >
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto h-14 text-lg px-8 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white border-0 shadow-xl shadow-amber-500/25 touch-manipulation rounded-2xl"
              >
                <Link to="/login" className="flex items-center gap-2">
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-14 text-lg border-white/20 text-white hover:bg-white/10 bg-transparent touch-manipulation rounded-2xl"
              >
                <a href="#pricing">See Pricing</a>
              </Button>
            </div>

            {/* Hero trust row */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-8 text-sm text-white/40">
              {["14-day free trial", "No credit card", "UAE-based support", "No setup fee"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                  {t}
                </span>
              ))}
            </div>

            {/* Stats bar */}
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 pt-12 border-t border-white/5 animate-fade-in-up"
              style={{ animationDelay: "350ms" }}
            >
              {STATS.map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                    {s.value}
                  </div>
                  <div className="text-xs text-white/40 mt-1 uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ BUSINESS MODES ══════════════════ */}
      <div id="modes">
        <BusinessModes />
      </div>

      {/* ════════════════════════════════════ FEATURES ═══════════════════════ */}
      <section id="features" className="py-24 bg-white/[0.02] relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-amber-400 font-bold mb-4 bg-amber-500/10 px-3 py-1 rounded-full">
              Platform Features
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4">
              Everything F&amp;B Owners{" "}
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Actually Need
              </span>
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-lg">
              No bloat. No training required. Designed for operators who are on their feet all day.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CORE_FEATURES.map((f, i) => (
              <div
                key={i}
                className="group bg-white/[0.03] border border-white/8 hover:bg-white/[0.06] hover:border-amber-500/25 transition-all duration-300 hover:-translate-y-1 rounded-2xl p-6"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <f.icon className="h-6 w-6 text-amber-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ UAE SUPPORT ══════════════════════ */}
      <section id="uae" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-400 font-bold mb-4 bg-emerald-500/10 px-3 py-1 rounded-full">
              🇦🇪 Built for the UAE
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4">
              Local Support.{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Global Standards.
              </span>
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-lg">
              We understand spotty WiFi in kitchen basements and last-minute billing rushes.
              MessFlow is engineered for UAE realities.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {UAE_SUPPORT.map((s, i) => (
              <div
                key={i}
                className="group bg-white/[0.03] border border-white/8 hover:bg-white/[0.06] hover:border-emerald-500/25 transition-all duration-300 rounded-2xl p-6"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <s.icon className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════ TESTIMONIALS ════════════════════ */}
      <section className="py-24 bg-white/[0.02] relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
              Loved by UAE F&amp;B Operators
            </h2>
            <p className="text-white/50">Real feedback from real kitchens</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 hover:border-amber-500/20 transition-colors">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-white/70 text-sm leading-relaxed mb-5 italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xs font-black text-white flex-shrink-0">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{t.name}</p>
                    <p className="text-xs text-white/40">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════ PRICING ════════════════════════ */}
      <LandingPricing />

      {/* ════════════════════════════════════ HOW IT WORKS ═══════════════════ */}
      <section className="py-24 bg-white/[0.02] relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
              Up and Running in{" "}
              <span className="text-amber-400">5 Minutes</span>
            </h2>
            <p className="text-white/60">No IT person. No hardware. No training days.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 relative">
            {[
              { n: "01", title: "Create Account",  desc: "Sign up with your phone number. Choose your business mode." },
              { n: "02", title: "Add Your Setup",  desc: "Tables, menu items, or members — takes under 5 minutes." },
              { n: "03", title: "Start Operating", desc: "Take orders, track billing, and manage your kitchen live." },
            ].map((s, i) => (
              <div key={i} className="text-center relative">
                <div className="text-7xl font-black text-white/4 mb-2 leading-none">{s.n}</div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-4 -mt-6 shadow-lg shadow-amber-500/20">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{s.title}</h3>
                <p className="text-white/55 text-sm">{s.desc}</p>
                {i < 2 && (
                  <div className="hidden md:block absolute top-14 left-[60%] w-[80%] h-px bg-gradient-to-r from-amber-500/40 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════ FINAL CTA ═══════════════════════ */}
      <section className="relative z-10 py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-600/20" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 to-transparent" />
            <div className="relative py-16 px-6 md:px-12">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">
                Join 500+ UAE F&amp;B Operators<br />
                <span className="text-amber-400">Already Saving Time &amp; Money</span>
              </h2>
              <p className="text-white/60 mb-8 max-w-xl mx-auto text-lg">
                Drop WhatsApp chaos. Launch your complete digital kitchen today.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black px-10 py-5 rounded-2xl text-lg shadow-2xl shadow-amber-500/30 transition-all min-h-[56px] touch-manipulation"
              >
                Start Free — AED 200/month
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════ FOOTER ══════════════════════════ */}
      <footer className="relative z-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                <UtensilsCrossed className="h-4 w-4 text-white" />
              </div>
              <span className="font-black text-white">MessFlow</span>
              <span className="text-white/30 text-xs ml-2">by Algo Plus</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-white/40">
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms"   className="hover:text-white transition-colors">Terms of Service</Link>
              <a href="https://algoplusit.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                algoplusit.com
              </a>
            </div>
            <p className="text-xs text-white/30">© {new Date().getFullYear()} MessFlow. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Animation keyframes */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .animate-fade-in-up {
          opacity: 0;
          animation: fadeInUp 0.65s cubic-bezier(.22,1,.36,1) forwards;
        }
      `}</style>
    </div>
  );
}
