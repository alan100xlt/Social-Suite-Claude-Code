import { Newspaper, Zap, BarChart3, Users, ArrowRight, Sparkles, Play, CheckCircle } from "lucide-react";
import { FaInstagram, FaTwitter, FaLinkedin, FaFacebook } from "react-icons/fa";
import { SiBluesky } from "react-icons/si";

const tagline = "Your articles become social posts — automatically.";
const sub = "AI-powered social media management built for media companies. Turn RSS feeds into platform-perfect content across every channel.";

export default function DesignPreview() {
  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-border px-6 py-4">
        <h1 className="text-lg font-bold text-foreground">Landing Page — Pick a Direction</h1>
        <p className="text-sm text-muted-foreground">Scroll to see 4 hero variants. Tell me which one (or mix) you like.</p>
      </div>

      {/* ═══════════════ VARIANT 1: Bold & Editorial ═══════════════ */}
      <section className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden" style={{ background: "linear-gradient(175deg, #0a0e1a 0%, #141b2d 60%, #1a1040 100%)" }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 20%, rgba(255,100,50,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(120,80,255,0.2) 0%, transparent 50%)" }} />
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-orange-400">For Media Companies</span>
            <span className="h-px flex-1 max-w-[80px] bg-orange-400/40" />
          </div>
          <h1 className="font-bold text-5xl md:text-7xl lg:text-8xl leading-[0.9] text-white max-w-4xl">
            Articles in.<br />
            <span className="bg-gradient-to-r from-orange-400 via-rose-400 to-purple-400 bg-clip-text text-transparent">Social posts out.</span>
          </h1>
          <p className="mt-8 text-lg md:text-xl text-white/60 max-w-2xl leading-relaxed">
            {sub}
          </p>
          <div className="flex items-center gap-4 mt-10">
            <button className="px-8 py-4 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white font-semibold text-lg shadow-[0_0_40px_rgba(255,100,50,0.3)] hover:shadow-[0_0_60px_rgba(255,100,50,0.5)] transition-shadow">
              Start Free <ArrowRight className="inline ml-2 h-5 w-5" />
            </button>
            <button className="px-8 py-4 rounded-full border border-white/20 text-white/80 font-medium text-lg hover:bg-white/5 transition-colors">
              <Play className="inline mr-2 h-5 w-5" /> Watch Demo
            </button>
          </div>
          <div className="flex items-center gap-6 mt-12 text-white/40 text-sm">
            <span className="flex items-center gap-2"><FaFacebook /> <FaInstagram /> <FaTwitter /> <FaLinkedin /> <SiBluesky /></span>
            <span>10+ platforms supported</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <span className="inline-block px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-400 text-xs font-bold uppercase tracking-wider">Variant 1 — Bold & Editorial</span>
        </div>
      </section>

      {/* ═══════════════ VARIANT 2: Clean & Modern SaaS ═══════════════ */}
      <section className="relative min-h-[90vh] flex flex-col justify-center bg-white">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 60%)" }} />
        <div className="relative z-10 max-w-5xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-medium mb-8">
            <Sparkles className="h-4 w-4" /> AI-Powered Social Management
          </div>
          <h1 className="font-bold text-4xl md:text-6xl lg:text-7xl leading-tight text-gray-900">
            {tagline}
          </h1>
          <p className="mt-6 text-lg md:text-xl text-gray-500 max-w-2xl mx-auto">
            {sub}
          </p>
          <div className="flex items-center justify-center gap-4 mt-10">
            <button className="px-8 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold text-base shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors">
              Get Started Free <ArrowRight className="inline ml-2 h-4 w-4" />
            </button>
            <button className="px-8 py-3.5 rounded-xl border border-gray-200 text-gray-700 font-medium text-base hover:bg-gray-50 transition-colors">
              Book a Demo
            </button>
          </div>
          {/* Feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-12">
            {["RSS → Social Posts", "10+ Platforms", "AI Strategy Engine", "Team Approvals", "Brand Voice Control", "Full Analytics"].map(f => (
              <span key={f} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-50 border border-gray-100 text-gray-600 text-sm">
                <CheckCircle className="h-3.5 w-3.5 text-green-500" /> {f}
              </span>
            ))}
          </div>
        </div>
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <span className="inline-block px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-xs font-bold uppercase tracking-wider">Variant 2 — Clean & Modern SaaS</span>
        </div>
      </section>

      {/* ═══════════════ VARIANT 3: Dark & Premium ═══════════════ */}
      <section className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden" style={{ background: "linear-gradient(180deg, #09090b 0%, #18181b 100%)" }}>
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full" style={{ background: "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)" }} />
          <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-400 text-sm font-medium mb-8">
            <Zap className="h-4 w-4" /> Built for Media Companies
          </div>
          <h1 className="font-bold text-4xl md:text-6xl lg:text-[5.5rem] leading-[1.05] text-white tracking-tight">
            Automate your<br />
            <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">social presence</span>
          </h1>
          <p className="mt-8 text-lg text-zinc-400 max-w-xl mx-auto">
            From article to social post in seconds. AI writes, your team approves, every platform gets the perfect message.
          </p>
          <div className="flex items-center justify-center gap-4 mt-10">
            <button className="px-8 py-4 rounded-2xl bg-white text-black font-semibold text-base hover:bg-zinc-100 transition-colors">
              Start Free Trial
            </button>
            <button className="px-8 py-4 rounded-2xl border border-zinc-700 text-zinc-300 font-medium text-base hover:bg-zinc-900 transition-colors">
              See How It Works
            </button>
          </div>
          {/* Stat row */}
          <div className="grid grid-cols-3 gap-8 mt-16 max-w-lg mx-auto">
            {[{ n: "10+", l: "Platforms" }, { n: "90%", l: "Time saved" }, { n: "∞", l: "Posts/month" }].map(s => (
              <div key={s.l}>
                <div className="text-3xl font-bold text-white">{s.n}</div>
                <div className="text-sm text-zinc-500 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <span className="inline-block px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-xs font-bold uppercase tracking-wider">Variant 3 — Dark & Premium</span>
        </div>
      </section>

      {/* ═══════════════ VARIANT 4: Playful & Colorful ═══════════════ */}
      <section className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden" style={{ background: "linear-gradient(135deg, #fef3c7 0%, #fce7f3 30%, #ede9fe 60%, #dbeafe 100%)" }}>
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-yellow-300/40 blur-3xl" />
        <div className="absolute bottom-20 right-20 w-48 h-48 rounded-full bg-purple-300/30 blur-3xl" />
        <div className="absolute top-1/3 right-10 w-24 h-24 rounded-full bg-pink-300/40 blur-2xl" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/60 backdrop-blur border border-white/40 text-violet-700 font-semibold text-sm mb-8 shadow-sm">
            🚀 Social Media on Autopilot
          </div>
          <h1 className="font-extrabold text-4xl md:text-6xl lg:text-7xl leading-tight text-gray-900">
            Turn articles into<br />
            <span className="relative">
              <span className="relative z-10">social magic</span>
              <span className="absolute bottom-1 left-0 right-0 h-4 bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 rounded-full -z-0 opacity-60" />
            </span> ✨
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-xl mx-auto">
            Your AI-powered newsroom assistant. Connect RSS feeds, pick your channels, and let the magic happen.
          </p>
          <div className="flex items-center justify-center gap-4 mt-10">
            <button className="px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-bold text-base shadow-xl shadow-violet-200 hover:shadow-2xl transition-shadow">
              Try It Free →
            </button>
            <button className="px-8 py-4 rounded-2xl bg-white/70 backdrop-blur border border-white/40 text-gray-700 font-semibold text-base hover:bg-white/90 transition-colors shadow-sm">
              🎬 Watch Demo
            </button>
          </div>
          {/* Platform icons in floating bubbles */}
          <div className="flex items-center justify-center gap-4 mt-14">
            {[
              { icon: <FaFacebook className="w-6 h-6 text-blue-600" />, bg: "bg-blue-100" },
              { icon: <FaInstagram className="w-6 h-6 text-pink-600" />, bg: "bg-pink-100" },
              { icon: <FaTwitter className="w-6 h-6 text-sky-500" />, bg: "bg-sky-100" },
              { icon: <FaLinkedin className="w-6 h-6 text-blue-700" />, bg: "bg-blue-100" },
              { icon: <SiBluesky className="w-6 h-6 text-sky-400" />, bg: "bg-sky-50" },
            ].map((p, i) => (
              <div key={i} className={`w-14 h-14 rounded-2xl ${p.bg} flex items-center justify-center shadow-md border border-white/60`}>
                {p.icon}
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <span className="inline-block px-4 py-2 bg-white/60 backdrop-blur border border-white/40 rounded-full text-violet-700 text-xs font-bold uppercase tracking-wider">Variant 4 — Playful & Colorful</span>
        </div>
      </section>
    </div>
  );
}
