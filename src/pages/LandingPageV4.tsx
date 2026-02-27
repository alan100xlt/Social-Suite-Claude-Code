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

/* ─── V4: Bold Geometric / Neon ─── */

const platforms = [
  { icon: FaFacebook, name: "Facebook" },
  { icon: FaInstagram, name: "Instagram" },
  { icon: FaTwitter, name: "X / Twitter" },
  { icon: FaLinkedin, name: "LinkedIn" },
  { icon: FaTiktok, name: "TikTok" },
  { icon: FaYoutube, name: "YouTube" },
  { icon: SiBluesky, name: "Bluesky" },
  { icon: SiThreads, name: "Threads" },
];

const steps = [
  { num: "01", title: "Connect your RSS feeds", desc: "Point us at your newsroom. We watch for every new article.", icon: Newspaper },
  { num: "02", title: "AI crafts your strategy", desc: "Platform-specific hooks, tone, and hashtags — automatically.", icon: Bot },
  { num: "03", title: "Review or auto-publish", desc: "Team approval or instant automation. Your call.", icon: Send },
  { num: "04", title: "Track what works", desc: "Real-time cross-platform analytics.", icon: BarChart3 },
];

const features = [
  { icon: Sparkles, title: "AI Content Engine", desc: "Strategy-first generation per platform." },
  { icon: Zap, title: "RSS Automations", desc: "Article → generate → publish on autopilot." },
  { icon: Layers, title: "Per-Platform Tailoring", desc: "Each channel gets optimized content." },
  { icon: Shield, title: "Brand Voice Control", desc: "Your tone. Your rules. Always." },
  { icon: Users, title: "Team Approvals", desc: "Email-based. No account needed." },
  { icon: BarChart3, title: "Cross-Platform Analytics", desc: "Unified dashboard for everything." },
  { icon: RefreshCw, title: "AI Daily Briefing", desc: "Daily performance snapshot." },
  { icon: Mail, title: "Custom Email Branding", desc: "Your brand on every touchpoint." },
];

function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black border-b-2 border-lime-400">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/images/longtale-logo-dark.png" alt="Longtale.ai" className="h-8 object-contain" />
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400 font-mono uppercase tracking-wider">
          <a href="#how-it-works" className="hover:text-lime-400 transition-colors">Process</a>
          <a href="#features" className="hover:text-lime-400 transition-colors">Features</a>
          <a href="#platforms" className="hover:text-lime-400 transition-colors">Platforms</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth/login" className="text-sm text-zinc-400 hover:text-white transition-colors px-4 py-2 font-mono">
            LOG IN
          </Link>
          <Link
            to="/get-started"
            className="text-sm font-bold text-black px-5 py-2.5 bg-lime-400 hover:bg-lime-300 transition-colors font-mono uppercase tracking-wider"
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
    posthog.capture('onboarding_url_submitted', { url: trimmed, source: 'landing_v4_hero' });
    navigate(`/discover?url=${encodeURIComponent(trimmed)}`);
  };

  return (
    <section className="relative min-h-screen flex flex-col justify-center pt-20 bg-black overflow-hidden">
      {/* Geometric grid */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(163,230,53,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(163,230,53,0.03) 1px, transparent 1px)", backgroundSize: "80px 80px" }} />
      {/* Corner accent */}
      <div className="absolute top-20 right-0 w-80 h-80 border-2 border-lime-400/20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-60 h-60 border-2 border-lime-400/10 pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <div className="inline-block px-3 py-1 border border-lime-400 text-lime-400 text-xs font-mono uppercase tracking-[0.3em] mb-10">
          For Media Companies
        </div>

        <h1 className="font-black text-5xl md:text-7xl lg:text-[6rem] leading-[0.95] text-white tracking-tighter uppercase">
          Automate<br />
          Your Social<br />
          <span className="text-lime-400">Presence</span>
        </h1>

        <p className="mt-8 text-lg text-zinc-500 max-w-xl leading-relaxed font-mono">
          Article → AI → Every Platform. Your journalism deserves a bigger audience.
        </p>

        <form onSubmit={handleUrlSubmit} className="flex flex-col sm:flex-row gap-0 max-w-xl mt-10">
          <div className="flex-1 relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
            <input
              type="text"
              placeholder="your-publication.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="w-full h-14 pl-12 pr-4 text-base bg-zinc-900 border-2 border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:border-lime-400 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={!url.trim()}
            className="h-14 px-8 bg-lime-400 hover:bg-lime-300 text-black font-bold text-sm uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-mono"
          >
            Discover <ArrowRight className="h-5 w-5" />
          </button>
        </form>

        <div className="flex gap-12 mt-16">
          {[
            { v: "10+", l: "PLATFORMS" },
            { v: "90%", l: "TIME SAVED" },
            { v: "24/7", l: "ALWAYS ON" },
          ].map(s => (
            <div key={s.l}>
              <div className="text-4xl font-black text-lime-400">{s.v}</div>
              <div className="text-xs text-zinc-600 mt-1 font-mono tracking-wider">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-32 bg-black border-t-2 border-zinc-800">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-20">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-lime-400 border border-lime-400/30 px-3 py-1">Process</span>
          <h2 className="mt-6 text-4xl md:text-6xl font-black text-white tracking-tighter uppercase">
            Four Steps<br />
            To <span className="text-lime-400">Autopilot</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-2 border-zinc-800">
          {steps.map((step, i) => (
            <div key={step.num} className={`p-10 border border-zinc-800 group hover:bg-lime-400/5 transition-colors ${i === 0 ? 'border-t-0 border-l-0' : ''}`}>
              <div className="flex items-center gap-4 mb-6">
                <span className="text-4xl font-black text-zinc-800 group-hover:text-lime-400/30 transition-colors font-mono">{step.num}</span>
                <step.icon className="w-6 h-6 text-lime-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 uppercase tracking-tight">{step.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="py-32 bg-black border-t-2 border-zinc-800">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-20">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-lime-400 border border-lime-400/30 px-3 py-1">Features</span>
          <h2 className="mt-6 text-4xl md:text-6xl font-black text-white tracking-tighter uppercase">
            Full <span className="text-lime-400">Arsenal</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div key={f.title} className="border-2 border-zinc-800 p-6 hover:border-lime-400/40 transition-colors group">
              <f.icon className="w-6 h-6 text-lime-400 mb-5" />
              <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wide">{f.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Platforms() {
  return (
    <section id="platforms" className="py-32 bg-black border-t-2 border-zinc-800">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <span className="text-xs font-mono uppercase tracking-[0.3em] text-lime-400 border border-lime-400/30 px-3 py-1">Platforms</span>
        <h2 className="mt-6 text-4xl md:text-6xl font-black text-white tracking-tighter uppercase mb-16">
          Every <span className="text-lime-400">Channel</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {platforms.map((p) => (
            <div key={p.name} className="group flex flex-col items-center gap-3 p-6 border-2 border-zinc-800 hover:border-lime-400/40 transition-colors">
              <p.icon className="w-8 h-8 text-zinc-400 group-hover:text-lime-400 transition-colors" />
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 group-hover:text-white transition-colors">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-32 bg-lime-400">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-6xl font-black text-black tracking-tighter uppercase">
          Ready to<br />Go Viral?
        </h2>
        <p className="mt-6 text-lg text-black/60 max-w-lg mx-auto font-mono">
          Join media companies publishing smarter every day.
        </p>
        <div className="flex items-center justify-center gap-4 mt-10">
          <Link to="/get-started" className="px-10 py-4 bg-black text-lime-400 font-bold text-sm uppercase tracking-wider hover:bg-zinc-900 transition-colors font-mono">
            Start Free
          </Link>
          <Link to="/auth/login" className="px-10 py-4 border-2 border-black text-black font-bold text-sm uppercase tracking-wider hover:bg-black/10 transition-colors font-mono">
            Log In
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t-2 border-zinc-800 bg-black">
      <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <img src="/images/longtale-logo-dark.png" alt="Longtale.ai" className="h-6 object-contain" />
        <div className="flex items-center gap-6 text-xs text-zinc-500 font-mono uppercase tracking-wider">
          <Link to="/auth/login" className="hover:text-lime-400 transition-colors">Log In</Link>
          <Link to="/auth/signup" className="hover:text-lime-400 transition-colors">Sign Up</Link>
          <a href="#features" className="hover:text-lime-400 transition-colors">Features</a>
        </div>
        <p className="text-xs text-zinc-600 font-mono">© {new Date().getFullYear()} Longtale.ai</p>
      </div>
    </footer>
  );
}

export default function LandingPageV4() {
  return (
    <div className="min-h-screen bg-black">
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
