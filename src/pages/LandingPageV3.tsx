import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { posthog } from "@/lib/posthog";
import {
  Zap, ArrowRight, Sparkles, Newspaper, BarChart3,
  Shield, Users, Bot, Send, Globe, Layers, RefreshCw, Mail,
} from "lucide-react";
import {
  FaInstagram, FaTwitter, FaLinkedin, FaFacebook, FaTiktok, FaYoutube,
} from "react-icons/fa";
import { SiBluesky, SiThreads } from "react-icons/si";

/* ─── V3: Gradient Glass / Aurora ─── */

const platforms = [
  { icon: FaFacebook, name: "Facebook", color: "#1877F2" },
  { icon: FaInstagram, name: "Instagram", color: "#E4405F" },
  { icon: FaTwitter, name: "X / Twitter", color: "#1DA1F2" },
  { icon: FaLinkedin, name: "LinkedIn", color: "#0A66C2" },
  { icon: FaTiktok, name: "TikTok", color: "#69C9D0" },
  { icon: FaYoutube, name: "YouTube", color: "#FF0000" },
  { icon: SiBluesky, name: "Bluesky", color: "#0085FF" },
  { icon: SiThreads, name: "Threads", color: "#ffffff" },
];

const steps = [
  { num: "01", title: "Connect your RSS feeds", desc: "We monitor every new article the moment it's published.", icon: Newspaper },
  { num: "02", title: "AI crafts your strategy", desc: "Platform-specific content strategy — tone, hooks, hashtags.", icon: Bot },
  { num: "03", title: "Review or auto-publish", desc: "Team approval or instant automation. You stay in control.", icon: Send },
  { num: "04", title: "Track what works", desc: "Real-time analytics across every channel.", icon: BarChart3 },
];

const features = [
  { icon: Sparkles, title: "AI Content Engine", desc: "Strategy-first generation tailored per platform." },
  { icon: Zap, title: "RSS Automations", desc: "Article → generate → publish. Full autopilot." },
  { icon: Layers, title: "Per-Platform Tailoring", desc: "Each platform gets its own optimized content." },
  { icon: Shield, title: "Brand Voice Control", desc: "Your tone, your rules. The AI follows." },
  { icon: Users, title: "Team Approvals", desc: "Email-based approval — no account needed." },
  { icon: BarChart3, title: "Cross-Platform Analytics", desc: "Unified metrics across all channels." },
  { icon: RefreshCw, title: "AI Daily Briefing", desc: "Daily AI summary of performance and tasks." },
  { icon: Mail, title: "Custom Email Branding", desc: "Your brand on every email, not ours." },
];

const stats = [
  { value: "10+", label: "Platforms" },
  { value: "90%", label: "Time Saved" },
  { value: "24/7", label: "Automation" },
  { value: "∞", label: "Posts / Month" },
];

function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/60 backdrop-blur-2xl border-b border-white/5">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/images/longtale-logo-dark.png" alt="Longtale.ai" className="h-8 object-contain" />
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
          <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#platforms" className="hover:text-white transition-colors">Platforms</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth/login" className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2">
            Log In
          </Link>
          <Link
            to="/get-started"
            className="text-sm font-semibold text-white px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20"
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
    posthog.capture('onboarding_url_submitted', { url: trimmed, source: 'landing_v3_hero' });
    navigate(`/discover?url=${encodeURIComponent(trimmed)}`);
  };

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-20" style={{ background: "linear-gradient(135deg, #0f172a 0%, #020617 40%, #0c1426 100%)" }}>
      {/* Aurora glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[20%] w-[600px] h-[400px] rounded-full blur-[120px] opacity-30" style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }} />
        <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-20" style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)" }} />
        <div className="absolute top-[50%] left-[60%] w-[300px] h-[300px] rounded-full blur-[100px] opacity-15" style={{ background: "linear-gradient(135deg, #10b981, #06b6d4)" }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-sm font-medium mb-8 backdrop-blur-sm">
          <Zap className="h-4 w-4" /> AI-Powered Social Publishing
        </div>

        <h1 className="font-bold text-4xl md:text-6xl lg:text-[5.5rem] leading-[1.05] text-white tracking-tight">
          Turn articles into<br />
          <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">viral social content</span>
        </h1>

        <p className="mt-8 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          AI reads your articles, writes platform-perfect posts, and publishes across every channel. Your content strategy, automated.
        </p>

        <form onSubmit={handleUrlSubmit} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto mt-10">
          <div className="flex-1 relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input
              type="text"
              placeholder="your-publication.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="w-full h-14 pl-12 pr-4 text-base bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/50 rounded-2xl backdrop-blur-sm"
            />
          </div>
          <button
            type="submit"
            disabled={!url.trim()}
            className="h-14 px-8 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-base shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            Discover <ArrowRight className="h-5 w-5" />
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">No credit card required</p>

        {/* Stats in glass cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-2xl mx-auto">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
              <div className="text-3xl font-bold text-white">{s.value}</div>
              <div className="text-sm text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-32" style={{ background: "linear-gradient(180deg, #020617 0%, #0f172a 100%)" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-20">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">How It Works</span>
          <h2 className="mt-4 text-3xl md:text-5xl font-bold text-white tracking-tight">
            Four steps to <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">autopilot</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div key={step.num} className="group relative">
              <div className="p-8 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-sm hover:bg-white/[0.06] hover:border-cyan-500/20 transition-all duration-300 h-full">
                <span className="text-xs font-bold text-cyan-500/60 tracking-wider">{step.num}</span>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/15 flex items-center justify-center my-5">
                  <step.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
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
    <section id="features" className="relative py-32" style={{ background: "#0f172a" }}>
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none blur-[120px] opacity-10" style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)" }} />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-violet-400">Features</span>
          <h2 className="mt-4 text-3xl md:text-5xl font-bold text-white tracking-tight">
            Built for modern <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">newsrooms</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <div key={f.title} className="p-6 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.05] hover:border-violet-500/15 transition-all duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/10 to-pink-500/10 border border-violet-500/15 flex items-center justify-center mb-5 group-hover:border-violet-500/30 transition-colors">
                <f.icon className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Platforms() {
  return (
    <section id="platforms" className="relative py-32" style={{ background: "linear-gradient(180deg, #0f172a 0%, #020617 100%)" }}>
      <div className="max-w-4xl mx-auto px-6 text-center">
        <span className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">Platforms</span>
        <h2 className="mt-4 text-3xl md:text-5xl font-bold text-white tracking-tight mb-6">
          One article. Every channel.
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto mb-16">
          Connect once and publish everywhere with AI-tailored content.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          {platforms.map((p) => (
            <div key={p.name} className="group flex flex-col items-center gap-3 p-6 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-sm hover:bg-white/[0.06] hover:border-cyan-500/20 transition-all">
              <p.icon className="w-8 h-8 transition-transform group-hover:scale-110" style={{ color: p.color }} />
              <span className="text-sm font-medium text-slate-300">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="relative py-32 overflow-hidden" style={{ background: "#020617" }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] opacity-20" style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6, #8b5cf6)" }} />
      </div>
      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
          Ready to automate your <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">social reach?</span>
        </h2>
        <p className="mt-6 text-lg text-slate-400 max-w-lg mx-auto">
          Join the media companies publishing smarter every day.
        </p>
        <div className="flex items-center justify-center gap-4 mt-10">
          <Link to="/get-started" className="px-10 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-base hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20">
            Start Free Trial
          </Link>
          <Link to="/auth/login" className="px-10 py-4 rounded-2xl border border-white/10 text-slate-300 font-medium text-base hover:bg-white/5 transition-colors">
            Log In
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5" style={{ background: "#020617" }}>
      <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <img src="/images/longtale-logo-dark.png" alt="Longtale.ai" className="h-6 object-contain" />
        <div className="flex items-center gap-6 text-sm text-slate-500">
          <Link to="/auth/login" className="hover:text-slate-300 transition-colors">Log In</Link>
          <Link to="/auth/signup" className="hover:text-slate-300 transition-colors">Sign Up</Link>
          <a href="#features" className="hover:text-slate-300 transition-colors">Features</a>
        </div>
        <p className="text-xs text-slate-600">© {new Date().getFullYear()} Longtale.ai</p>
      </div>
    </footer>
  );
}

export default function LandingPageV3() {
  return (
    <div className="min-h-screen" style={{ background: "#020617" }}>
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
