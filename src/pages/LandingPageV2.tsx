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

/* ─── V2: Editorial / Warm Minimalist ─── */

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
  { num: "01", title: "Connect your RSS feeds", desc: "Point us at your newsroom. We monitor every new article the moment it's published.", icon: Newspaper },
  { num: "02", title: "AI crafts your strategy", desc: "Our engine reads the full article and builds a platform-specific content strategy.", icon: Bot },
  { num: "03", title: "Review or auto-publish", desc: "Send posts for team approval or let automations publish instantly.", icon: Send },
  { num: "04", title: "Track what works", desc: "Real-time analytics across every channel. See what resonates.", icon: BarChart3 },
];

const features = [
  { icon: Sparkles, title: "AI Content Engine", desc: "Strategy-first generation tailored to each platform's audience." },
  { icon: Zap, title: "RSS Automations", desc: "New article → generate → approve or publish. Your newsroom on autopilot." },
  { icon: Layers, title: "Per-Platform Tailoring", desc: "LinkedIn gets the professional take. Twitter gets the punchy hook." },
  { icon: Shield, title: "Brand Voice Control", desc: "Configure tone, emoji style, content length, and hashtag strategy." },
  { icon: Users, title: "Team Approvals", desc: "Route posts to editors via email. No account needed." },
  { icon: BarChart3, title: "Cross-Platform Analytics", desc: "Unified dashboard for all channels and metrics." },
  { icon: RefreshCw, title: "AI Daily Briefing", desc: "Start each day with an AI summary of what's performing." },
  { icon: Mail, title: "Custom Email Branding", desc: "Approval emails carry your brand — not ours." },
];

function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-stone-200 bg-stone-50/90 backdrop-blur-lg">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/images/longtale-logo-light.png" alt="Longtale.ai" className="h-7 object-contain" />
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm text-stone-500 font-medium">
          <a href="#how-it-works" className="hover:text-stone-900 transition-colors">Process</a>
          <a href="#features" className="hover:text-stone-900 transition-colors">Features</a>
          <a href="#platforms" className="hover:text-stone-900 transition-colors">Platforms</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth/login" className="text-sm text-stone-500 hover:text-stone-900 transition-colors px-4 py-2">
            Sign In
          </Link>
          <Link
            to="/get-started"
            className="text-sm font-semibold text-stone-50 px-5 py-2.5 rounded-full bg-stone-900 hover:bg-stone-800 transition-colors"
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
    posthog.capture('onboarding_url_submitted', { url: trimmed, source: 'landing_v2_hero' });
    navigate(`/discover?url=${encodeURIComponent(trimmed)}`);
  };

  return (
    <section className="relative min-h-screen flex flex-col justify-center pt-24 bg-stone-50">
      {/* Warm gradient accent */}
      <div className="absolute top-0 right-0 w-[60%] h-[70%] pointer-events-none" style={{ background: "radial-gradient(ellipse at top right, rgba(251,191,36,0.08) 0%, rgba(249,115,22,0.04) 40%, transparent 70%)" }} />

      <div className="relative z-10 max-w-4xl mx-auto px-6">
        <p className="text-sm font-medium text-amber-600 tracking-wide uppercase mb-6">For Media Companies</p>

        <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl leading-[1.05] text-stone-900 tracking-tight">
          Your articles<br />
          deserve a<br />
          <em className="not-italic text-amber-600">bigger audience</em>
        </h1>

        <p className="mt-8 text-lg md:text-xl text-stone-500 max-w-xl leading-relaxed">
          Longtale reads your articles, writes platform-perfect social posts, and publishes them — so your journalism reaches every corner of the internet.
        </p>

        <form onSubmit={handleUrlSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mt-10">
          <div className="flex-1 relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
            <input
              type="text"
              placeholder="your-publication.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="w-full h-14 pl-12 pr-4 text-base bg-white border border-stone-300 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 rounded-full"
            />
          </div>
          <button
            type="submit"
            disabled={!url.trim()}
            className="h-14 px-8 rounded-full bg-stone-900 hover:bg-stone-800 text-white font-semibold text-base transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            Discover <ArrowRight className="h-5 w-5" />
          </button>
        </form>

        <p className="mt-4 text-sm text-stone-400">No credit card required</p>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-32 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <p className="text-sm font-medium text-amber-600 tracking-wide uppercase mb-4">Process</p>
        <h2 className="font-serif text-3xl md:text-5xl text-stone-900 tracking-tight mb-16">
          From article to audience<br />in four simple steps
        </h2>

        <div className="space-y-0">
          {steps.map((step, i) => (
            <div key={step.num} className="flex gap-8 py-10 border-t border-stone-200 group">
              <span className="text-5xl font-serif text-stone-200 group-hover:text-amber-400 transition-colors min-w-[80px]">{step.num}</span>
              <div>
                <h3 className="text-xl font-semibold text-stone-900 mb-2">{step.title}</h3>
                <p className="text-stone-500 leading-relaxed max-w-md">{step.desc}</p>
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
    <section id="features" className="py-32 bg-stone-50">
      <div className="max-w-5xl mx-auto px-6">
        <p className="text-sm font-medium text-amber-600 tracking-wide uppercase mb-4">Features</p>
        <h2 className="font-serif text-3xl md:text-5xl text-stone-900 tracking-tight mb-16">
          Everything your newsroom needs
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
          {features.map((f) => (
            <div key={f.title} className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <f.icon className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-stone-900 mb-1">{f.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Platforms() {
  return (
    <section id="platforms" className="py-32 bg-white">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <p className="text-sm font-medium text-amber-600 tracking-wide uppercase mb-4">Platforms</p>
        <h2 className="font-serif text-3xl md:text-5xl text-stone-900 tracking-tight mb-4">
          One article. Every channel.
        </h2>
        <p className="text-stone-500 max-w-xl mx-auto mb-16">
          Connect once and publish everywhere with content tailored to each audience.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          {platforms.map((p) => (
            <div key={p.name} className="flex items-center gap-2 px-5 py-3 rounded-full border border-stone-200 bg-stone-50 hover:border-amber-300 hover:bg-amber-50 transition-all text-sm font-medium text-stone-700">
              <p.icon className="w-4 h-4" />
              {p.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-32 bg-stone-900">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="font-serif text-3xl md:text-5xl text-white tracking-tight">
          Ready to grow your reach?
        </h2>
        <p className="mt-6 text-lg text-stone-400 max-w-lg mx-auto">
          Join media companies that publish smarter, faster, and on-brand.
        </p>
        <div className="flex items-center justify-center gap-4 mt-10">
          <Link
            to="/get-started"
            className="px-10 py-4 rounded-full bg-amber-500 text-stone-900 font-semibold text-base hover:bg-amber-400 transition-colors"
          >
            Start Free Trial
          </Link>
          <Link
            to="/auth/login"
            className="px-10 py-4 rounded-full border border-stone-700 text-stone-300 font-medium text-base hover:bg-stone-800 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-stone-50">
      <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <img src="/images/longtale-logo-light.png" alt="Longtale.ai" className="h-6 object-contain" />
        <div className="flex items-center gap-6 text-sm text-stone-400">
          <Link to="/auth/login" className="hover:text-stone-700 transition-colors">Sign In</Link>
          <Link to="/auth/signup" className="hover:text-stone-700 transition-colors">Sign Up</Link>
          <a href="#features" className="hover:text-stone-700 transition-colors">Features</a>
        </div>
        <p className="text-xs text-stone-400">© {new Date().getFullYear()} Longtale.ai</p>
      </div>
    </footer>
  );
}

export default function LandingPageV2() {
  return (
    <div className="min-h-screen bg-stone-50">
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
