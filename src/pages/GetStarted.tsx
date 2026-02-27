import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Globe, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { posthog } from '@/lib/posthog';

export default function GetStarted() {
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    posthog.capture('onboarding_url_submitted', { url: trimmed, source: 'get_started' });
    navigate(`/discover?url=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#09090b' }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/60 bg-[#09090b]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/images/longtale-logo-dark.png" alt="Longtale.ai" className="h-8 object-contain" />
          </Link>
          <Link to="/auth/login" className="text-sm text-zinc-400 hover:text-white transition-colors px-4 py-2">
            Log In
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-20">
        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)' }} />
        </div>

        <div className="relative z-10 max-w-2xl w-full text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-400 text-sm font-medium mb-8">
            <Globe className="h-4 w-4" /> URL-first onboarding
          </div>

          <h1 className="font-bold text-4xl md:text-5xl lg:text-6xl leading-tight text-white tracking-tight mb-6">
            Discover your<br />
            <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              publication DNA
            </span>
          </h1>

          <p className="text-lg text-zinc-400 max-w-lg mx-auto mb-12 leading-relaxed">
            Just paste your website URL. We'll find your brand, your RSS feeds, and generate your first social media posts — all in seconds.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
            <div className="flex-1 relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
              <Input
                type="text"
                placeholder="your-publication.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="h-14 pl-12 text-base bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-purple-500/50 rounded-xl"
              />
            </div>
            <Button
              type="submit"
              disabled={isSubmitting || !url.trim()}
              className="h-14 px-8 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 text-white font-semibold text-base shadow-lg shadow-purple-500/20 transition-all"
            >
              {isSubmitting ? 'Discovering...' : 'Discover'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </form>

          <p className="mt-6 text-sm text-zinc-600">
            No credit card required. Your data is analyzed in real-time.
          </p>
        </div>
      </main>
    </div>
  );
}
