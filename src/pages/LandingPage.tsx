import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { posthog } from "@/lib/posthog";
import {
  Zap, ArrowRight, Sparkles, CheckCircle, Newspaper, BarChart3,
  Shield, Users, Bot, Clock, Send, Eye, Heart, MessageCircle,
  ChevronRight, Globe, Layers, RefreshCw, Mail, FileText,
} from "lucide-react";
import {
  FaInstagram, FaTwitter, FaLinkedin, FaFacebook, FaTiktok, FaYoutube,
} from "react-icons/fa";
import { SiBluesky, SiThreads } from "react-icons/si";

/* ─── Shared constants ─── */

const platforms = [
  { icon: FaFacebook, name: "Facebook", color: "#1877F2" },
  { icon: FaInstagram, name: "Instagram", color: "#E4405F" },
  { icon: FaTwitter, name: "X / Twitter", color: "#1DA1F2" },
  { icon: FaLinkedin, name: "LinkedIn", color: "#0A66C2" },
  { icon: FaTiktok, name: "TikTok", color: "#ffffff" },
  { icon: FaYoutube, name: "YouTube", color: "#FF0000" },
  { icon: SiBluesky, name: "Bluesky", color: "#0085FF" },
  { icon: SiThreads, name: "Threads", color: "#ffffff" },
];

const steps = [
  {
    num: "01",
    title: "Connect your RSS feeds",
    desc: "Point us at your newsroom. We monitor every new article the moment it's published.",
    icon: Newspaper,
  },
  {
    num: "02",
    title: "AI crafts your strategy",
    desc: "Our engine reads the full article and builds a platform-specific content strategy — tone, hooks, hashtags, everything.",
    icon: Bot,
  },
  {
    num: "03",
    title: "Review or auto-publish",
    desc: "Send posts for team approval or let automations publish instantly. You stay in control.",
    icon: Send,
  },
  {
    num: "04",
    title: "Track what works",
    desc: "Real-time analytics across every channel. See what resonates and double down.",
    icon: BarChart3,
  },
];

const features = [
  {
    icon: Sparkles,
    title: "AI Content Engine",
    desc: "Strategy-first generation. The AI reads your article, proposes an angle, then writes platform-perfect posts — not generic copies.",
  },
  {
    icon: Zap,
    title: "RSS Automations",
    desc: "Set rules per feed: new article → generate → approve or publish. Your newsroom runs on autopilot.",
  },
  {
    icon: Layers,
    title: "Per-Platform Tailoring",
    desc: "LinkedIn gets the professional take. Twitter gets the punchy hook. Instagram gets the visual angle. All from one article.",
  },
  {
    icon: Shield,
    title: "Brand Voice Control",
    desc: "Configure tone, emoji style, content length, and hashtag strategy. The AI follows your brand guidelines, not its own.",
  },
  {
    icon: Users,
    title: "Team Approvals",
    desc: "Route posts to editors via email. They approve, edit, or reject — without needing an account.",
  },
  {
    icon: BarChart3,
    title: "Cross-Platform Analytics",
    desc: "Unified dashboard for views, engagement, follower growth, and top-performing content across all channels.",
  },
  {
    icon: RefreshCw,
    title: "AI Daily Briefing",
    desc: "Start each day with an AI-generated summary of what's performing, what's upcoming, and what needs attention.",
  },
  {
    icon: Mail,
    title: "Custom Email Branding",
    desc: "Approval emails and invitations carry your brand — logo, colors, and messaging. Not ours.",
  },
];

const stats = [
  { value: "10+", label: "Platforms" },
  { value: "90%", label: "Time Saved" },
  { value: "24/7", label: "Automation" },
  { value: "∞", label: "Posts / Month" },
];

/* ─── Components ─── */

function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/60 bg-[#09090b]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/images/longtale-logo-dark.png" alt="Longtale.ai" className="h-10 object-contain" />
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
          <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#platforms" className="hover:text-white transition-colors">Platforms</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth/login" className="text-sm text-zinc-400 hover:text-white transition-colors px-4 py-2">
            Log In
          </Link>
          <Link
            to="/get-started"
            className="text-sm font-semibold text-white px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 transition-all shadow-lg shadow-purple-500/20"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  const [url, setUrl] = useState('');
  const navigate = useNavigate();

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    posthog.capture('onboarding_url_submitted', { url: trimmed, source: 'landing_hero' });
    navigate(`/discover?url=${encodeURIComponent(trimmed)}`);
  };

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-20" style={{ background: "linear-gradient(180deg, #09090b 0%, #18181b 100%)" }}>
      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full" style={{ background: "radial-gradient(circle, rgba(168,85,247,0.10) 0%, transparent 70%)" }} />
      </div>
      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-400 text-sm font-medium mb-8">
          <Zap className="h-4 w-4" /> Built for Media Companies
        </div>

        <h1 className="font-bold text-4xl md:text-6xl lg:text-[5.5rem] leading-[1.05] text-white tracking-tight">
          Automate your<br />
          <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">social presence</span>
        </h1>

        <p className="mt-8 text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          From article to social post in seconds. AI writes, your team approves, every platform gets the perfect message.
        </p>

        {/* URL input */}
        <form onSubmit={handleUrlSubmit} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto mt-10">
          <div className="flex-1 relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <input
              type="text"
              placeholder="your-publication.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="w-full h-14 pl-12 pr-4 text-base bg-zinc-900 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 rounded-xl"
            />
          </div>
          <button
            type="submit"
            disabled={!url.trim()}
            className="h-14 px-8 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 text-white font-semibold text-base shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            Discover <ArrowRight className="h-5 w-5" />
          </button>
        </form>
        <p className="mt-4 text-sm text-zinc-600">No credit card required — just paste your URL</p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 max-w-2xl mx-auto">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-3xl md:text-4xl font-bold text-white">{s.value}</div>
              <div className="text-sm text-zinc-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Fade out */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#09090b] to-transparent pointer-events-none" />
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-32" style={{ background: "#09090b" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-20">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-purple-400">How It Works</span>
          <h2 className="mt-4 text-3xl md:text-5xl font-bold text-white tracking-tight">
            Four steps to<br />
            <span className="bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">social autopilot</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step) => (
            <div key={step.num} className="group relative">
              <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:border-purple-500/30 hover:bg-zinc-900/80 transition-all duration-300 h-full">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-xs font-bold text-purple-500 tracking-wider">{step.num}</span>
                  <div className="h-px flex-1 bg-zinc-800 group-hover:bg-purple-500/30 transition-colors" />
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-5">
                  <step.icon className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="relative py-32" style={{ background: "linear-gradient(180deg, #09090b 0%, #0f0a1a 50%, #09090b 100%)" }}>
      {/* Subtle side glow */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)" }} />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-fuchsia-400">Features</span>
          <h2 className="mt-4 text-3xl md:text-5xl font-bold text-white tracking-tight">
            Everything your newsroom<br />
            <span className="bg-gradient-to-r from-fuchsia-400 to-pink-400 bg-clip-text text-transparent">needs to go social</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div key={f.title} className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 hover:border-purple-500/20 transition-all duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 border border-purple-500/15 flex items-center justify-center mb-5 group-hover:border-purple-500/30 transition-colors">
                <f.icon className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Platforms() {
  return (
    <section id="platforms" className="relative py-32" style={{ background: "#09090b" }}>
      <div className="max-w-4xl mx-auto px-6 text-center">
        <span className="text-xs font-bold uppercase tracking-[0.25em] text-purple-400">Platforms</span>
        <h2 className="mt-4 text-3xl md:text-5xl font-bold text-white tracking-tight mb-6">
          One article. Every channel.
        </h2>
        <p className="text-zinc-400 max-w-xl mx-auto mb-16">
          Connect once and publish everywhere. Each platform gets content tailored to its audience, format, and best practices.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {platforms.map((p) => (
            <div key={p.name} className="group flex flex-col items-center gap-3 p-6 rounded-2xl border border-zinc-800 bg-zinc-900/30 hover:border-purple-500/20 transition-all">
              <p.icon className="w-8 h-8 transition-transform group-hover:scale-110" style={{ color: p.color }} />
              <span className="text-sm font-medium text-zinc-300">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="relative py-32 overflow-hidden" style={{ background: "linear-gradient(180deg, #09090b 0%, #0f0a1a 100%)" }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full" style={{ background: "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 60%)" }} />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
          Ready to automate your<br />
          <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">social presence?</span>
        </h2>
        <p className="mt-6 text-lg text-zinc-400 max-w-lg mx-auto">
          Join media companies that publish smarter, faster, and on-brand — across every channel.
        </p>
        <div className="flex items-center justify-center gap-4 mt-10">
          <Link
            to="/get-started"
            className="px-10 py-4 rounded-2xl bg-white text-black font-semibold text-base hover:bg-zinc-100 transition-colors"
          >
            Start Free Trial
          </Link>
          <Link
            to="/auth/login"
            className="px-10 py-4 rounded-2xl border border-zinc-700 text-zinc-300 font-medium text-base hover:bg-zinc-900 transition-colors"
          >
            Log In
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-zinc-800" style={{ background: "#09090b" }}>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src="/images/longtale-logo-dark.png" alt="Longtale.ai" className="h-8 object-contain" />
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <Link to="/auth/login" className="hover:text-zinc-300 transition-colors">Log In</Link>
            <Link to="/auth/signup" className="hover:text-zinc-300 transition-colors">Sign Up</Link>
            <a href="#features" className="hover:text-zinc-300 transition-colors">Features</a>
          </div>
          <p className="text-xs text-zinc-600">© {new Date().getFullYear()} Longtale.ai. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ─── */

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: "#09090b" }}>
      <Nav />
      <Hero />
      <HowItWorks />
      <Features />
      <Platforms />
      <CTA />
      <Footer />
    </div>
  );
}
