import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Sparkles, Newspaper, BarChart3, Shield,
  Send, Brain, Building2,
  Check, X, Menu, XIcon,
  Inbox, FileText, Eye, Target, Network, DollarSign,
  Lock, KeyRound, DatabaseZap, Palette, Clock, TrendingUp,
} from "lucide-react";
import {
  FaTwitter, FaLinkedin, FaFacebook,
} from "react-icons/fa";

/* ─────────────────────────────────────────────
   Intersection Observer hook for scroll reveals
   ───────────────────────────────────────────── */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function RevealSection({ children, className = "", delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Color Palettes
   ───────────────────────────────────────────── */
interface MarketingPalette {
  name: string;
  swatch: string; // preview color for the picker
  vars: Record<string, string>;
}

const PALETTE_STORAGE_KEY = "marketing-palette";

const palettes: MarketingPalette[] = [
  {
    name: "Ocean Slate",
    swatch: "#2563eb",
    vars: {
      "--m-bg": "#f8fafc", "--m-bg-alt": "#f1f5f9", "--m-bg-accent": "#dbeafe",
      "--m-bg-dark": "#0f172a", "--m-surface": "#ffffff", "--m-border": "#cbd5e1",
      "--m-text": "#1e293b", "--m-text-secondary": "#475569", "--m-text-muted": "#94a3b8",
      "--m-accent": "#2563eb", "--m-accent-hover": "#1d4ed8",
      "--m-accent-light": "#dbeafe", "--m-accent-subtle": "#eff6ff",
      "--m-heading-font": "'Georgia', 'Times New Roman', serif",
      "--m-body-font": "system-ui, -apple-system, 'Segoe UI', sans-serif",
    },
  },
  {
    name: "Warm Editorial",
    swatch: "#d97706",
    vars: {
      "--m-bg": "#faf8f5", "--m-bg-alt": "#f5f0ea", "--m-bg-accent": "#fef3c7",
      "--m-bg-dark": "#1c1917", "--m-surface": "#ffffff", "--m-border": "#e7e5e4",
      "--m-text": "#292524", "--m-text-secondary": "#78716c", "--m-text-muted": "#a8a29e",
      "--m-accent": "#d97706", "--m-accent-hover": "#b45309",
      "--m-accent-light": "#fef3c7", "--m-accent-subtle": "#fffbeb",
      "--m-heading-font": "'Georgia', 'Times New Roman', serif",
      "--m-body-font": "system-ui, -apple-system, 'Segoe UI', sans-serif",
    },
  },
  {
    name: "Ocean",
    swatch: "#0284c7",
    vars: {
      "--m-bg": "#f0f9ff", "--m-bg-alt": "#e0f2fe", "--m-bg-accent": "#bae6fd",
      "--m-bg-dark": "#0c1929", "--m-surface": "#ffffff", "--m-border": "#bae6fd",
      "--m-text": "#0c4a6e", "--m-text-secondary": "#0369a1", "--m-text-muted": "#7dd3fc",
      "--m-accent": "#0284c7", "--m-accent-hover": "#0369a1",
      "--m-accent-light": "#e0f2fe", "--m-accent-subtle": "#f0f9ff",
      "--m-heading-font": "'Georgia', 'Times New Roman', serif",
      "--m-body-font": "system-ui, -apple-system, 'Segoe UI', sans-serif",
    },
  },
  {
    name: "Ocean Deep",
    swatch: "#0e7490",
    vars: {
      "--m-bg": "#ecfeff", "--m-bg-alt": "#cffafe", "--m-bg-accent": "#a5f3fc",
      "--m-bg-dark": "#083344", "--m-surface": "#ffffff", "--m-border": "#a5f3fc",
      "--m-text": "#164e63", "--m-text-secondary": "#0e7490", "--m-text-muted": "#67e8f9",
      "--m-accent": "#0e7490", "--m-accent-hover": "#155e75",
      "--m-accent-light": "#cffafe", "--m-accent-subtle": "#ecfeff",
      "--m-heading-font": "'Georgia', 'Times New Roman', serif",
      "--m-body-font": "system-ui, -apple-system, 'Segoe UI', sans-serif",
    },
  },
  {
    name: "Ocean Storm",
    swatch: "#4f46e5",
    vars: {
      "--m-bg": "#f5f7ff", "--m-bg-alt": "#eef0ff", "--m-bg-accent": "#c7d2fe",
      "--m-bg-dark": "#111827", "--m-surface": "#ffffff", "--m-border": "#c7d2fe",
      "--m-text": "#1e1b4b", "--m-text-secondary": "#3730a3", "--m-text-muted": "#a5b4fc",
      "--m-accent": "#4f46e5", "--m-accent-hover": "#4338ca",
      "--m-accent-light": "#e0e7ff", "--m-accent-subtle": "#eef2ff",
      "--m-heading-font": "'Georgia', 'Times New Roman', serif",
      "--m-body-font": "system-ui, -apple-system, 'Segoe UI', sans-serif",
    },
  },
  {
    name: "Ocean Mist",
    swatch: "#0d9488",
    vars: {
      "--m-bg": "#f0fdfa", "--m-bg-alt": "#ccfbf1", "--m-bg-accent": "#99f6e4",
      "--m-bg-dark": "#042f2e", "--m-surface": "#ffffff", "--m-border": "#99f6e4",
      "--m-text": "#134e4a", "--m-text-secondary": "#0f766e", "--m-text-muted": "#5eead4",
      "--m-accent": "#0d9488", "--m-accent-hover": "#0f766e",
      "--m-accent-light": "#ccfbf1", "--m-accent-subtle": "#f0fdfa",
      "--m-heading-font": "'Georgia', 'Times New Roman', serif",
      "--m-body-font": "system-ui, -apple-system, 'Segoe UI', sans-serif",
    },
  },
];

const fontCSS = `
  .marketing-page {
    font-family: var(--m-body-font);
  }
  .marketing-page h1, .marketing-page h2 {
    font-family: var(--m-heading-font);
  }
`;

function getSavedPalette(): number {
  try {
    const saved = localStorage.getItem(PALETTE_STORAGE_KEY);
    if (saved !== null) {
      const idx = parseInt(saved, 10);
      if (idx >= 0 && idx < palettes.length) return idx;
    }
  } catch { /* SSR or restricted storage */ }
  return 0;
}

/* ─────────────────────────────────────────────
   Floating Theme Picker
   ───────────────────────────────────────────── */
function ThemePicker({ current, onChange }: { current: number; onChange: (i: number) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-2">
      {/* Palette panel */}
      {open && (
        <div className="rounded-2xl shadow-2xl p-4 mb-1 animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{ backgroundColor: "var(--m-surface)", border: "1px solid var(--m-border)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--m-text-muted)" }}>
            Theme
          </p>
          <div className="flex flex-col gap-2">
            {palettes.map((p, i) => (
              <button
                key={p.name}
                onClick={() => { onChange(i); setOpen(false); }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all hover:scale-[1.02]"
                style={{
                  backgroundColor: current === i ? "var(--m-accent-light)" : "transparent",
                  border: current === i ? "1px solid var(--m-accent)" : "1px solid transparent",
                }}
              >
                <div className="w-5 h-5 rounded-full shrink-0 shadow-inner" style={{ backgroundColor: p.swatch }} />
                <span className="text-sm font-medium whitespace-nowrap" style={{ color: current === i ? "var(--m-accent)" : "var(--m-text-secondary)" }}>
                  {p.name}
                </span>
                {current === i && <Check size={14} style={{ color: "var(--m-accent)" }} className="ml-auto" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl"
        style={{ backgroundColor: "var(--m-accent)", color: "#fff" }}
        title="Change color theme"
      >
        <Palette size={20} />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section 1: Navigation
   ───────────────────────────────────────────── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Compare", href: "#compare" },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled
        ? "shadow-sm"
        : ""
    }`} style={{
      backgroundColor: scrolled ? "rgba(250,248,245,0.95)" : "transparent",
      backdropFilter: scrolled ? "blur(16px)" : "none",
      borderBottom: scrolled ? "1px solid var(--m-border)" : "1px solid transparent",
    }}>
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-10 py-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src="/images/longtale-logo-light.png" alt="Longtale.ai" className="h-7 object-contain" />
        </Link>

        <div className="hidden md:flex items-center gap-10 text-[15px] font-medium" style={{ color: "var(--m-text-secondary)" }}>
          {navLinks.map(l => (
            <a key={l.href} href={l.href} className="hover:opacity-80 transition-opacity" style={{ color: "var(--m-text-secondary)" }}>{l.label}</a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/auth/login" className="text-sm px-4 py-2 transition-opacity hover:opacity-80" style={{ color: "var(--m-text-secondary)" }}>
            Sign In
          </Link>
          <a
            href="#book-demo"
            className="text-sm font-semibold text-white px-6 py-2.5 rounded-full transition-all hover:shadow-lg"
            style={{ backgroundColor: "var(--m-accent)" }}
          >
            Book a Demo
          </a>
        </div>

        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2" style={{ color: "var(--m-text)" }}>
          {mobileOpen ? <XIcon size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden px-6 pb-6" style={{ backgroundColor: "var(--m-bg)", borderTop: "1px solid var(--m-border)" }}>
          {navLinks.map(l => (
            <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
              className="block py-3 font-medium" style={{ color: "var(--m-text-secondary)", borderBottom: "1px solid var(--m-border)" }}>{l.label}</a>
          ))}
          <div className="flex flex-col gap-3 mt-4">
            <Link to="/auth/login" className="text-center text-sm py-2" style={{ color: "var(--m-text-secondary)" }}>Sign In</Link>
            <a href="#book-demo" className="text-center text-sm font-semibold text-white px-6 py-2.5 rounded-full" style={{ backgroundColor: "var(--m-accent)" }}>
              Book a Demo
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ─────────────────────────────────────────────
   Hero — "One dashboard for your entire media network"
   ───────────────────────────────────────────── */
function SocialPostCard({ platform, color, title, metric, metricLabel, delay }: {
  platform: string; color: string; title: string; metric: string; metricLabel: string; delay: number;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
      style={{
        backgroundColor: "var(--m-surface)",
        border: "1px solid var(--m-border)",
        width: "220px",
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="h-1.5" style={{ backgroundColor: color }} />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full" style={{ backgroundColor: color, opacity: 0.15 }} />
          <span className="text-xs font-semibold" style={{ color }}>{platform}</span>
        </div>
        <p className="text-sm font-medium leading-snug mb-3" style={{ color: "var(--m-text)" }}>
          {title}
        </p>
        <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid var(--m-border)" }}>
          <span className="text-lg font-bold" style={{ color: "var(--m-text)" }}>{metric}</span>
          <span className="text-xs" style={{ color: "var(--m-text-muted)" }}>{metricLabel}</span>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative min-h-[100vh] flex items-center pt-20 overflow-hidden"
      style={{ backgroundColor: "var(--m-bg)" }}>

      {/* Subtle radial accents */}
      <div className="absolute top-0 right-0 w-[70%] h-[80%] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 80% 20%, rgba(217,119,6,0.06) 0%, rgba(245,158,11,0.02) 40%, transparent 70%)" }} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Copy */}
          <div>
            <RevealSection>
              <p className="text-sm font-semibold tracking-widest uppercase mb-6 flex items-center gap-2"
                style={{ color: "var(--m-accent)" }}>
                <span className="w-8 h-px" style={{ backgroundColor: "var(--m-accent)" }} />
                Built for Media Companies
              </p>
            </RevealSection>

            <RevealSection delay={100}>
              <h1 className="text-[2.75rem] sm:text-6xl lg:text-[4.5rem] leading-[1.05] tracking-tight max-w-xl"
                style={{ color: "var(--m-text)" }}>
                One dashboard for your entire{" "}
                <span className="relative inline-block">
                  <span className="relative z-10" style={{ color: "var(--m-accent)" }}>media network</span>
                  <span className="absolute bottom-1 left-0 right-0 h-3 -rotate-1 rounded-sm" style={{ backgroundColor: "var(--m-accent-light)", opacity: 0.6 }} />
                </span>
              </h1>
            </RevealSection>

            <RevealSection delay={200}>
              <p className="mt-8 text-lg leading-relaxed max-w-lg"
                style={{ color: "var(--m-text-secondary)" }}>
                Longtale gives media groups rollup analytics, per-publication isolation, and AI-powered social automation — across every title in your portfolio.
              </p>
            </RevealSection>

            <RevealSection delay={300}>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <a href="#book-demo"
                  className="group inline-flex items-center gap-2 text-base font-semibold text-white px-8 py-3.5 rounded-full transition-all hover:shadow-xl"
                  style={{ backgroundColor: "var(--m-accent)" }}>
                  Book a Demo
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </a>
                <a href="#features"
                  className="inline-flex items-center gap-2 text-base font-medium px-6 py-3.5 rounded-full transition-all"
                  style={{ color: "var(--m-text-secondary)", border: "1px solid var(--m-border)" }}>
                  See What's Different
                </a>
              </div>
            </RevealSection>

            {/* Trust strip — exec-focused */}
            <RevealSection delay={450}>
              <div className="mt-14 flex flex-wrap items-center gap-8 md:gap-10">
                {[
                  { value: "50+", label: "Publications" },
                  { value: "10+", label: "Platforms" },
                  { value: "Rollup", label: "Analytics" },
                  { value: "Enterprise", label: "Security" },
                ].map((s, i) => (
                  <div key={i} className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold" style={{ color: "var(--m-text)", fontFamily: "var(--m-heading-font)" }}>{s.value}</span>
                    <span className="text-xs uppercase tracking-wider" style={{ color: "var(--m-text-muted)" }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </RevealSection>
          </div>

          {/* Right — Social Post Cards (reduced to 3) */}
          <RevealSection delay={300} className="hidden lg:block">
            <div className="relative h-[420px]">
              <div className="absolute top-0 right-12 rotate-3 animate-float" style={{ animationDuration: "7s" }}>
                <SocialPostCard
                  platform="Facebook"
                  color="#1877F2"
                  title="Breaking: City council approves historic downtown renewal project"
                  metric="2.4K"
                  metricLabel="engagements"
                  delay={0}
                />
              </div>
              <div className="absolute top-16 right-[220px] -rotate-2 animate-float" style={{ animationDuration: "8s", animationDelay: "1s" }}>
                <SocialPostCard
                  platform="X / Twitter"
                  color="#1DA1F2"
                  title="The downtown renewal plan just passed. Here's what changes for residents. Thread."
                  metric="847"
                  metricLabel="retweets"
                  delay={100}
                />
              </div>
              <div className="absolute top-[180px] right-8 rotate-1 animate-float" style={{ animationDuration: "9s", animationDelay: "2s" }}>
                <SocialPostCard
                  platform="LinkedIn"
                  color="#0A66C2"
                  title="How our city's $2B renewal plan sets a new standard for urban development"
                  metric="1.2K"
                  metricLabel="impressions"
                  delay={200}
                />
              </div>
            </div>
          </RevealSection>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce"
        style={{ color: "var(--m-text-muted)" }}>
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <div className="w-px h-8" style={{ background: "linear-gradient(to bottom, var(--m-text-muted), transparent)" }} />
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Value Prop Section — reusable layout
   ───────────────────────────────────────────── */
function ValuePropSection({
  heading,
  description,
  visual,
  reversed = false,
  bgColor,
  badge,
  id,
}: {
  heading: string;
  description: string;
  visual: React.ReactNode;
  reversed?: boolean;
  bgColor: string;
  badge?: string;
  id?: string;
}) {
  return (
    <section id={id} className="relative py-24 md:py-32 overflow-hidden" style={{ backgroundColor: bgColor }}>
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center ${reversed ? "lg:[direction:rtl]" : ""}`}>
          <div className={reversed ? "lg:[direction:ltr]" : ""}>
            <RevealSection>
              {badge && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-6"
                  style={{ backgroundColor: "var(--m-accent-light)", color: "var(--m-accent)" }}>
                  <Sparkles size={12} /> {badge}
                </span>
              )}
              <h2 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-none mb-8" style={{ color: "var(--m-text)" }}>
                {heading}
              </h2>
              <p className="text-lg md:text-xl leading-relaxed max-w-lg" style={{ color: "var(--m-text-secondary)" }}>
                {description}
              </p>
            </RevealSection>
          </div>
          <div className={reversed ? "lg:[direction:ltr]" : ""}>
            <RevealSection delay={200}>
              {visual}
            </RevealSection>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Section 2: Scale. (PROMOTED — #1 differentiator)
   ───────────────────────────────────────────── */
function ScaleVisual() {
  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: "var(--m-surface)", border: "1px solid var(--m-border)" }}>
      {/* Parent */}
      <div className="flex justify-center mb-4">
        <div className="px-5 py-3 rounded-xl flex items-center gap-2"
          style={{ backgroundColor: "var(--m-accent-light)", border: "2px solid var(--m-accent)" }}>
          <Building2 size={18} style={{ color: "var(--m-accent)" }} />
          <span className="text-sm font-bold" style={{ color: "var(--m-accent)" }}>National Media Group</span>
        </div>
      </div>
      {/* Connector lines */}
      <div className="flex justify-center mb-4">
        <div className="w-px h-6" style={{ backgroundColor: "var(--m-border)" }} />
      </div>
      <div className="flex justify-center gap-3 mb-4">
        <div className="h-px flex-1 max-w-[80px]" style={{ backgroundColor: "var(--m-border)" }} />
        <div className="h-px flex-1 max-w-[80px]" style={{ backgroundColor: "var(--m-border)" }} />
        <div className="h-px flex-1 max-w-[80px]" style={{ backgroundColor: "var(--m-border)" }} />
      </div>
      {/* Children */}
      <div className="grid grid-cols-3 gap-3">
        {["City Herald", "Tech Weekly", "Sports Daily"].map((name, i) => (
          <div key={i} className="text-center px-3 py-3 rounded-lg" style={{ backgroundColor: "var(--m-bg-alt)", border: "1px solid var(--m-border)" }}>
            <Newspaper size={14} className="mx-auto mb-1.5" style={{ color: "var(--m-text-muted)" }} />
            <p className="text-xs font-medium" style={{ color: "var(--m-text)" }}>{name}</p>
          </div>
        ))}
      </div>
      {/* Rollup stats */}
      <div className="mt-4 pt-4 grid grid-cols-3 gap-3" style={{ borderTop: "1px solid var(--m-border)" }}>
        {[
          { label: "Total Reach", value: "1.2M" },
          { label: "Posts/Week", value: "340" },
          { label: "Ad Revenue", value: "$48K" },
        ].map((s, i) => (
          <div key={i} className="text-center">
            <p className="text-lg font-bold" style={{ color: "var(--m-text)" }}>{s.value}</p>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--m-text-muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section 3: Automate + Publish (MERGED)
   ───────────────────────────────────────────── */
function AutomatePublishVisual() {
  const pipelineSteps = [
    { icon: FileText, label: "Article", color: "var(--m-accent)" },
    { icon: Brain, label: "AI", color: "#8b5cf6" },
    { icon: Sparkles, label: "Posts", color: "#06b6d4" },
    { icon: Check, label: "Published", color: "#10b981" },
  ];

  const platformOutputs = [
    { platform: "LinkedIn", color: "#0A66C2", text: "How our city's $2B plan sets a new urban development standard." },
    { platform: "X / Twitter", color: "#1DA1F2", text: "The downtown renewal plan just passed. Here's what it means." },
    { platform: "Instagram", color: "#E4405F", text: "Before & after: What downtown looks like by 2028" },
  ];

  return (
    <div className="space-y-4">
      {/* Pipeline mini-diagram */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: "var(--m-surface)", border: "1px solid var(--m-border)" }}>
        <div className="flex items-center justify-between gap-2">
          {pipelineSteps.map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${s.color}15`, color: s.color }}>
                  <s.icon size={20} />
                </div>
                <span className="text-xs font-medium" style={{ color: "var(--m-text-secondary)" }}>{s.label}</span>
              </div>
              {i < pipelineSteps.length - 1 && (
                <ArrowRight size={14} style={{ color: "var(--m-text-muted)" }} className="shrink-0 -mt-5" />
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 flex items-center gap-3" style={{ borderTop: "1px solid var(--m-border)" }}>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs" style={{ color: "var(--m-text-muted)" }}>9:00 AM — Article published. 9:01 AM — 4 posts queued.</span>
        </div>
      </div>

      {/* Platform-tailored outputs */}
      {platformOutputs.map((c, i) => (
        <div key={i} className="rounded-xl overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md"
          style={{ backgroundColor: "var(--m-surface)", border: "1px solid var(--m-border)" }}>
          <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: "1px solid var(--m-border)" }}>
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
            <span className="text-xs font-semibold" style={{ color: c.color }}>{c.platform}</span>
          </div>
          <p className="px-4 py-3 text-sm" style={{ color: "var(--m-text)" }}>{c.text}</p>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section 4: Understand. — Inbox AI + Crisis Detection
   ───────────────────────────────────────────── */
function UnderstandVisual() {
  const messages = [
    { from: "Maria G.", text: "We'd love to feature your coverage in our newsletter...", badge: "Lead", badgeColor: "#10b981" },
    { from: "Breaking Alert", text: "Negative sentiment spike detected on recent op-ed", badge: "Crisis", badgeColor: "#ef4444" },
    { from: "user_2847", text: "great article thanks for sharing", badge: "Low priority", badgeColor: "#a8a29e" },
    { from: "NewsDesk PR", text: "Interview request from national morning show...", badge: "Lead", badgeColor: "#10b981" },
  ];
  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--m-surface)", border: "1px solid var(--m-border)" }}>
      <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--m-border)" }}>
        <Inbox size={16} style={{ color: "var(--m-accent)" }} />
        <span className="text-sm font-semibold" style={{ color: "var(--m-text)" }}>Smart Inbox</span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--m-accent-light)", color: "var(--m-accent)" }}>AI Classified</span>
      </div>
      {messages.map((m, i) => (
        <div key={i} className="px-5 py-3.5 flex items-start gap-3 transition-colors hover:bg-black/[0.02]"
          style={{ borderBottom: i < messages.length - 1 ? "1px solid var(--m-border)" : "none" }}>
          <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: m.badgeColor }}>
            {m.from[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: "var(--m-text)" }}>{m.from}</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${m.badgeColor}18`, color: m.badgeColor }}>
                {m.badge}
              </span>
            </div>
            <p className="text-xs mt-0.5 truncate" style={{ color: "var(--m-text-muted)" }}>{m.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section 5: Monetize. — Ad Sales & Revenue
   ───────────────────────────────────────────── */
function MonetizeVisual() {
  const adSlots = [
    { publication: "City Herald", platform: "Facebook", reach: "320K", cpm: "$18", revenue: "$5,760", fill: 92 },
    { publication: "Tech Weekly", platform: "LinkedIn", reach: "180K", cpm: "$32", revenue: "$5,760", fill: 88 },
    { publication: "Sports Daily", platform: "Instagram", reach: "540K", cpm: "$14", revenue: "$7,560", fill: 95 },
  ];

  return (
    <div className="space-y-4">
      {/* Revenue dashboard card */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: "var(--m-surface)", border: "1px solid var(--m-border)" }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <DollarSign size={16} style={{ color: "var(--m-accent)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--m-text)" }}>Ad Network Revenue</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--m-accent-light)", color: "var(--m-accent)" }}>This Month</span>
        </div>

        {/* Revenue headline */}
        <div className="flex items-baseline gap-3 mb-6">
          <span className="text-4xl font-bold" style={{ color: "var(--m-text)", fontFamily: "var(--m-heading-font)" }}>$48,240</span>
          <span className="text-sm font-medium text-emerald-600">+23% vs last month</span>
        </div>

        {/* Revenue breakdown by publication */}
        <div className="space-y-3">
          {adSlots.map((slot, i) => (
            <div key={i} className="rounded-xl p-4" style={{ backgroundColor: "var(--m-bg-alt)", border: "1px solid var(--m-border)" }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-semibold" style={{ color: "var(--m-text)" }}>{slot.publication}</span>
                  <span className="text-xs ml-2" style={{ color: "var(--m-text-muted)" }}>{slot.platform}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: "var(--m-text)" }}>{slot.revenue}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--m-border)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${slot.fill}%`, backgroundColor: "var(--m-accent)" }} />
                  </div>
                </div>
                <span className="text-xs font-medium shrink-0" style={{ color: "var(--m-text-secondary)" }}>{slot.fill}% fill</span>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-[11px]" style={{ color: "var(--m-text-muted)" }}>{slot.reach} reach</span>
                <span className="text-[11px]" style={{ color: "var(--m-text-muted)" }}>{slot.cpm} CPM</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Advertiser value prop */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--m-surface)", border: "1px solid var(--m-border)" }}>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { value: "1.04M", label: "Network Reach" },
            { value: "$19.08", label: "Avg CPM" },
            { value: "92%", label: "Fill Rate" },
          ].map((s, i) => (
            <div key={i}>
              <p className="text-lg font-bold" style={{ color: "var(--m-text)" }}>{s.value}</p>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--m-text-muted)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section 6: Competitive Matrix (DARK)
   ───────────────────────────────────────────── */
type CellValue = "full" | "partial" | "yes" | "no" | string;

const competitors = ["Longtale", "Hootsuite", "Buffer", "Sprout Social", "Echobox", "True Anthem"] as const;

const comparisonRows: { feature: string; values: CellValue[]; highlight?: boolean }[] = [
  { feature: "AI Content from Articles", values: ["Full article + strategy", "Basic AI assist", "AI assistant", "AI assist", "Headlines only", "AI distribution"] },
  { feature: "Unified Social Inbox", values: ["full", "yes", "no", "yes", "no", "no"] },
  { feature: "Crisis Detection", values: ["full", "no", "no", "partial", "no", "no"] },
  { feature: "OG Image Generator", values: ["full", "no", "no", "no", "no", "no"] },
  { feature: "Email Approvals (no login)", values: ["yes", "no", "no", "no", "no", "no"] },
  { feature: "Media Company Hierarchy", values: ["full", "no", "no", "no", "no", "no"], highlight: true },
  { feature: "Ad Network", values: ["full", "no", "no", "no", "no", "no"], highlight: true },
  { feature: "Historical AI Audit", values: ["full", "no", "no", "no", "partial", "no"] },
  { feature: "RSS Automation", values: ["full", "partial", "no", "no", "yes", "yes"] },
  { feature: "Platforms", values: ["10+", "10+", "8", "10+", "5", "5"] },
  { feature: "Built for Publishers", values: ["full", "no", "no", "no", "yes", "yes"] },
];

function CellDisplay({ value }: { value: CellValue }) {
  if (value === "full") return (
    <div className="flex items-center justify-center">
      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
        <Check size={14} style={{ color: "var(--m-accent)" }} />
      </div>
    </div>
  );
  if (value === "yes") return <div className="flex items-center justify-center"><Check size={16} className="text-emerald-500" /></div>;
  if (value === "partial") return <div className="flex items-center justify-center"><span className="text-xs text-yellow-500 font-medium">Partial</span></div>;
  if (value === "no") return <div className="flex items-center justify-center"><X size={14} className="text-stone-600" /></div>;
  return <span className="text-xs text-stone-300 font-medium">{value}</span>;
}

function ComparisonSection() {
  return (
    <section id="compare" className="relative py-24 md:py-32"
      style={{ backgroundColor: "var(--m-bg-dark)" }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <RevealSection>
          <p className="text-sm font-semibold tracking-widest uppercase mb-4 flex items-center gap-2"
            style={{ color: "var(--m-accent)" }}>
            <span className="w-8 h-px" style={{ backgroundColor: "var(--m-accent)" }} />
            vs. The Rest
          </p>
          <h2 className="text-3xl md:text-5xl text-white leading-tight max-w-3xl">
            Unlike generic social tools{" "}
            <span className="text-stone-500">that bolt on publisher features as an afterthought</span>
          </h2>
          <p className="mt-4 text-lg text-stone-400 max-w-2xl">
            Longtale is the only platform purpose-built for end-to-end media company social operations.
          </p>
        </RevealSection>

        <RevealSection delay={200}>
          <div className="mt-12 overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[800px] border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-sm font-medium text-stone-500 pb-4 pr-4 w-[200px]">Feature</th>
                  {competitors.map((c, i) => (
                    <th key={c} className="text-center text-sm font-semibold pb-4 px-3"
                      style={{ color: i === 0 ? "var(--m-accent)" : "#a8a29e" }}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, ri) => (
                  <tr key={ri} className="border-t border-stone-800/60"
                    style={{ backgroundColor: row.highlight ? "rgba(255,255,255,0.03)" : "transparent" }}>
                    <td className="text-sm py-3.5 pr-4 font-medium"
                      style={{ color: row.highlight ? "var(--m-accent-light)" : "#d6d3d1" }}>
                      {row.feature}
                      {row.highlight && (
                        <span className="ml-1.5 text-[9px] font-bold uppercase" style={{ color: "var(--m-accent)" }}>Exclusive</span>
                      )}
                    </td>
                    {row.values.map((val, vi) => (
                      <td key={vi} className="text-center py-3.5 px-3"
                        style={{ backgroundColor: vi === 0 ? "rgba(255,255,255,0.03)" : "transparent" }}>
                        <CellDisplay value={val} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </RevealSection>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Section 6: AI Audit CTA
   ───────────────────────────────────────────── */
function AuditCTASection() {
  return (
    <section id="book-demo" className="relative py-24 md:py-32 overflow-hidden"
      style={{ background: "linear-gradient(180deg, var(--m-accent-subtle), var(--m-accent-light))" }}>
      <div className="relative z-10 max-w-3xl mx-auto px-6 lg:px-10 text-center">
        <RevealSection>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-8"
            style={{ backgroundColor: "var(--m-accent)", color: "#fff" }}>
            <Eye size={16} />
            Free with every demo
          </div>

          <h2 className="text-3xl md:text-5xl lg:text-6xl leading-tight" style={{ color: "var(--m-text)" }}>
            See what your newsroom is missing
          </h2>

          <p className="mt-6 text-lg max-w-xl mx-auto leading-relaxed" style={{ color: "var(--m-text-secondary)" }}>
            Book a demo and we'll run a free AI audit of your last 90 days. Editorial leads you missed, audience trends, content decay, optimal posting windows.
          </p>
        </RevealSection>

        <RevealSection delay={200}>
          <div className="mt-10">
            <a href="mailto:hello@longtale.ai?subject=Demo%20Request"
              className="group inline-flex items-center gap-2 text-base font-bold text-white px-10 py-4 rounded-full transition-all hover:shadow-xl hover:-translate-y-0.5"
              style={{ backgroundColor: "var(--m-accent)" }}>
              Book a Demo
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
          <p className="mt-4 text-sm" style={{ color: "var(--m-text-muted)" }}>No credit card. No commitment. Just insights.</p>
        </RevealSection>

        <RevealSection delay={400}>
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Sentiment Analysis", icon: Target },
              { label: "Posting Windows", icon: Clock },
              { label: "Content Decay", icon: TrendingUp },
              { label: "Editorial Leads", icon: Sparkles },
            ].map((item, i) => (
              <div key={i} className="rounded-xl p-4 text-center"
                style={{ backgroundColor: "var(--m-surface)", border: "1px solid var(--m-border)" }}>
                <item.icon size={20} className="mx-auto mb-2" style={{ color: "var(--m-accent)" }} />
                <p className="text-xs font-medium" style={{ color: "var(--m-text-secondary)" }}>{item.label}</p>
              </div>
            ))}
          </div>
        </RevealSection>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Section 7: Trust + Footer
   ───────────────────────────────────────────── */
const trustItems = [
  { icon: Lock, title: "Multi-Tenant Isolation", desc: "Your data never leaves your tenant. Every query is scoped to your company." },
  { icon: Shield, title: "Row-Level Security", desc: "Database-enforced access control on every table. Not app-level — a database guarantee." },
  { icon: KeyRound, title: "Role-Based Access", desc: "Owner, admin, member roles with granular permissions. Editors see only what they need." },
  { icon: DatabaseZap, title: "Enterprise Infrastructure", desc: "Postgres-backed, edge-deployed, with real-time sync and automated backups." },
];

function TrustSection() {
  return (
    <section className="relative py-24 md:py-32" style={{ backgroundColor: "var(--m-bg)" }}>
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <RevealSection>
          <div className="text-center mb-16">
            <p className="text-sm font-semibold tracking-widest uppercase mb-4" style={{ color: "var(--m-accent)" }}>
              Trust & Security
            </p>
            <h2 className="text-3xl md:text-5xl leading-tight max-w-3xl mx-auto" style={{ color: "var(--m-text)" }}>
              Enterprise-grade security.{" "}
              <span style={{ color: "var(--m-text-muted)" }}>Built in from day one.</span>
            </h2>
          </div>
        </RevealSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trustItems.map((t, i) => (
            <RevealSection key={i} delay={i * 100}>
              <div className="rounded-2xl p-6 text-center hover:shadow-lg transition-all hover:-translate-y-1"
                style={{ backgroundColor: "var(--m-surface)", border: "1px solid var(--m-border)" }}>
                <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: "var(--m-accent-light)", color: "var(--m-accent)" }}>
                  <t.icon size={22} />
                </div>
                <h3 className="font-semibold mb-2" style={{ color: "var(--m-text)" }}>{t.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--m-text-secondary)" }}>{t.desc}</p>
              </div>
            </RevealSection>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ backgroundColor: "var(--m-bg)", borderTop: "1px solid var(--m-border)" }}>
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-16">
        <div className="flex flex-col md:flex-row items-start justify-between gap-12">
          <div className="max-w-sm">
            <img src="/images/longtale-logo-light.png" alt="Longtale.ai" className="h-7 object-contain mb-4" />
            <p className="text-sm leading-relaxed" style={{ color: "var(--m-text-secondary)" }}>
              Built for media groups by people who understand publishing. One dashboard for your entire network.
            </p>
          </div>

          <div className="flex flex-wrap gap-16">
            {[
              { title: "Product", links: [{ label: "Features", href: "#features" }, { label: "Compare", href: "#compare" }, { label: "Book a Demo", href: "#book-demo" }] },
              { title: "Company", links: [{ label: "About", href: "#" }, { label: "Blog", href: "#" }, { label: "Careers", href: "#" }, { label: "Contact", href: "#" }] },
              { title: "Legal", links: [{ label: "Privacy Policy", href: "#" }, { label: "Terms of Service", href: "#" }, { label: "Security", href: "#" }] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--m-text-muted)" }}>{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map(l => (
                    <li key={l.label}>
                      <a href={l.href} className="text-sm transition-opacity hover:opacity-80" style={{ color: "var(--m-text-secondary)" }}>{l.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderTop: "1px solid var(--m-border)" }}>
          <p className="text-xs" style={{ color: "var(--m-text-muted)" }}>&copy; {new Date().getFullYear()} Longtale.ai. All rights reserved.</p>
          <div className="flex items-center gap-4" style={{ color: "var(--m-text-muted)" }}>
            <a href="#" className="hover:opacity-70 transition-opacity"><FaTwitter size={16} /></a>
            <a href="#" className="hover:opacity-70 transition-opacity"><FaLinkedin size={16} /></a>
            <a href="#" className="hover:opacity-70 transition-opacity"><FaFacebook size={16} /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────
   Main Page Component — 7 sections
   ───────────────────────────────────────────── */
export default function MarketingPage() {
  const [paletteIdx, setPaletteIdx] = useState(getSavedPalette);

  const handleChange = (i: number) => {
    setPaletteIdx(i);
    try { localStorage.setItem(PALETTE_STORAGE_KEY, String(i)); } catch { /* noop */ }
  };

  // Apply palette as inline CSS custom properties so React controls them directly
  const paletteStyle = palettes[paletteIdx].vars as React.CSSProperties;

  return (
    <div className="min-h-screen antialiased">
      <style>{fontCSS}</style>
      <div className="marketing-page" style={paletteStyle}>
        <Nav />

        {/* 1. Hero */}
        <Hero />

        {/* 2. Scale — #1 differentiator, hits within one scroll */}
        <ValuePropSection
          id="features"
          heading="Scale."
          description="One dashboard for your entire network. Parent company sees rollup analytics across all publications. Regional papers, niche verticals, local stations — isolated data, shared brand voice. Turn social accounts into ad inventory."
          visual={<ScaleVisual />}
          bgColor="var(--m-bg-alt)"
          reversed
          badge="Only on Longtale"
        />

        {/* 3. Monetize — ad sales revenue */}
        <ValuePropSection
          heading="Monetize."
          description="Your competitors sell banner ads. You sell social reach. Turn your network's combined audience into premium ad inventory — programmatic or direct-sold. Advertisers buy cross-publication campaigns. You keep the margin. Every post is a revenue opportunity."
          visual={<MonetizeVisual />}
          bgColor="var(--m-bg)"
          badge="New Revenue Stream"
        />

        {/* 4. Optimize (was Automate + Publish) */}
        <ValuePropSection
          heading="Optimize."
          description="From article to every channel — automatically. RSS detects new stories, AI writes platform-perfect posts, editors approve from email. LinkedIn gets thought leadership. Twitter gets punchy hooks. Instagram gets visual stories. Your brand voice, every channel."
          visual={<AutomatePublishVisual />}
          bgColor="var(--m-bg-alt)"
          reversed
        />

        {/* 5. Engage (was Understand) */}
        <ValuePropSection
          heading="Engage."
          description="Every DM, comment, and mention — AI-classified. Editorial leads surfaced, crises flagged in real-time. See everything across your network in one intelligent inbox."
          visual={<UnderstandVisual />}
          bgColor="var(--m-bg)"
        />

        {/* 6. Competitive Matrix */}
        <ComparisonSection />

        {/* 7. AI Audit CTA */}
        <AuditCTASection />

        {/* 8. Trust + Footer */}
        <TrustSection />
        <Footer />

        <ThemePicker current={paletteIdx} onChange={handleChange} />
      </div>
    </div>
  );
}
