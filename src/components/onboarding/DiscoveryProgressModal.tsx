import { useState, useEffect } from 'react';
import { Globe, Rss, Sparkles, CheckCircle, Loader2, ArrowRight, Mail, Newspaper } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { posthog } from '@/lib/posthog';
import { useNavigate } from 'react-router-dom';

interface DiscoveryProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: string;
  postsReady: boolean;
  userLoggedIn: boolean;
  onAuthSuccess: () => void;
  onViewPosts: () => void;
  /** Live data from each step */
  liveData: {
    businessName?: string;
    description?: string;
    feedCount?: number;
    articleTitle?: string;
    platforms?: string[];
  };
}

type StepStatus = 'pending' | 'active' | 'done';

export function DiscoveryProgressModal({
  open, onOpenChange, phase, postsReady, userLoggedIn,
  onAuthSuccess, onViewPosts, liveData,
}: DiscoveryProgressModalProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmailField, setShowEmailField] = useState(false);

  // Smart timing: show email field once at least one step completes
  useEffect(() => {
    if (!userLoggedIn && !showEmailField) {
      const donePhases = ['discovering-rss', 'generating-posts', 'discovered', 'creating-company', 'complete'];
      if (donePhases.includes(phase) || liveData.businessName) {
        const timer = setTimeout(() => setShowEmailField(true), 800);
        return () => clearTimeout(timer);
      }
    }
  }, [phase, userLoggedIn, showEmailField, liveData.businessName]);

  const noFeedsFound = liveData.feedCount === 0 && liveData.platforms?.length === 0;
  const discoveryDone = postsReady || noFeedsFound;

  const getStepStatus = (stepId: string): StepStatus => {
    const phaseMap: Record<string, number> = {
      'crawling': 0, 'discovering-rss': 1, 'generating-posts': 2,
      'discovered': 3, 'creating-company': 3, 'complete': 3,
    };
    const currentIndex = phaseMap[phase] ?? 0;
    const stepIndex = ['crawling', 'rss', 'posts'].indexOf(stepId);

    if (stepId === 'crawling' && liveData.businessName) return 'done';
    if (stepId === 'rss' && liveData.feedCount !== undefined) return 'done';
    if (stepId === 'posts' && (postsReady || noFeedsFound)) return 'done';

    if (stepIndex < currentIndex) return 'done';
    if (stepIndex === currentIndex) return 'active';
    if (phase === 'crawling' && stepId === 'rss') return 'active';
    return 'pending';
  };

  const progressPercent = (() => {
    let p = 0;
    if (liveData.businessName) p += 33;
    if (liveData.feedCount !== undefined) p += 33;
    if (postsReady || (liveData.feedCount === 0 && liveData.platforms?.length === 0)) p += 34;
    return Math.min(p, 100);
  })();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setLoading(true);

    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/instant-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({ title: 'Error', description: data.error || 'Something went wrong.', variant: 'destructive' });
        return;
      }

      if (data.existing_user) {
        // User already has an account — send them to login
        toast({
          title: 'Welcome back!',
          description: 'You already have an account. Redirecting to sign in…',
        });
        navigate(`/auth/login?email=${encodeURIComponent(trimmed)}`);
        return;
      }

      posthog.capture('onboarding_email_submitted', { email: trimmed, source: 'discovery_drawer' });

      // Set the session — AuthContext SIGNED_IN will auto-claim pendingCompanyId
      // then redirect to /app where ProtectedRoute decides (wizard if in_progress, dashboard if done)
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      onAuthSuccess();

    } catch {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      id: 'crawling',
      label: 'Analyzing Website',
      icon: <Globe className="w-4 h-4" />,
      liveDetail: liveData.businessName
        ? `Found: ${liveData.businessName}${liveData.description ? ` — "${liveData.description.slice(0, 60)}…"` : ''}`
        : 'Extracting brand, colors, social channels…',
    },
    {
      id: 'rss',
      label: 'Discovering RSS Feeds',
      icon: <Rss className="w-4 h-4" />,
      liveDetail: liveData.feedCount !== undefined
        ? liveData.feedCount === 0
          ? 'No RSS feeds detected on this site'
          : `Found ${liveData.feedCount} feed${liveData.feedCount !== 1 ? 's' : ''}${liveData.articleTitle ? ` · Latest: "${liveData.articleTitle.slice(0, 50)}…"` : ''}`
        : 'Scanning for content feeds…',
    },
    {
      id: 'posts',
      label: 'Generating Social Posts',
      icon: <Sparkles className="w-4 h-4" />,
      liveDetail: postsReady
        ? `Ready on ${liveData.platforms?.join(', ') || 'multiple platforms'}`
        : noFeedsFound
          ? 'Skipped — no articles to generate from. You can add RSS feeds later.'
          : 'Creating AI-powered posts from your content…',
    },
  ];

  const emailFormUI = (label: string) => (
    <div className="space-y-2.5">
      <p className="text-xs text-zinc-400 text-center">{label}</p>
      <form onSubmit={handleEmailSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            type="email"
            placeholder="you@publication.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-10 pl-9 text-sm bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
          />
        </div>
        <Button
          type="submit"
          disabled={loading || !email.trim()}
          className="h-10 px-5 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 text-white font-semibold text-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue'}
        </Button>
      </form>
      <p className="text-[11px] text-zinc-600 text-center">
        {loading ? 'Creating your account…' : 'Enter your email to get started — no password needed'}
      </p>
    </div>
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-zinc-900 border-zinc-800 max-h-[70vh]">
        <div className="max-w-lg mx-auto w-full px-4 pb-6 pt-2">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-white">Building your Publisher DNA</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {postsReady ? 'Discovery complete!' : noFeedsFound ? 'Discovery complete — no content feeds detected' : 'Analyzing in real-time…'}
              </p>
            </div>
            {discoveryDone && (
              <div className={`flex items-center gap-1.5 text-xs font-medium ${noFeedsFound && !postsReady ? 'text-amber-400' : 'text-green-400'}`}>
                <CheckCircle className="w-3.5 h-3.5" /> {noFeedsFound && !postsReady ? 'Partial' : 'Done'}
              </div>
            )}
          </div>

          {/* Progress bar */}
          <Progress
            value={progressPercent}
            className="h-1.5 bg-zinc-800 mb-4 [&>[role=progressbar]]:bg-gradient-to-r [&>[role=progressbar]]:from-purple-500 [&>[role=progressbar]]:to-fuchsia-500 [&>[role=progressbar]]:transition-all [&>[role=progressbar]]:duration-700"
          />

          {/* Steps */}
          <div className="space-y-2 mb-4">
            {steps.map((step) => {
              const status = getStepStatus(step.id);
              return (
                <div
                  key={step.id}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg transition-all duration-500 ${
                    status === 'active' ? 'bg-purple-500/10 border border-purple-500/20' :
                    status === 'done' ? 'bg-zinc-800/30' : 'opacity-30'
                  }`}
                >
                  <div className={`mt-0.5 flex-shrink-0 ${
                    status === 'done' ? 'text-green-400' :
                    status === 'active' ? 'text-purple-400' : 'text-zinc-600'
                  }`}>
                    {status === 'done' ? <CheckCircle className="w-4 h-4" /> :
                     status === 'active' ? <Loader2 className="w-4 h-4 animate-spin" /> :
                     step.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${
                      status === 'done' ? 'text-zinc-300' :
                      status === 'active' ? 'text-white' : 'text-zinc-600'
                    }`}>{step.label}</p>
                    <p className={`text-xs mt-0.5 line-clamp-1 ${
                      status === 'done' ? 'text-zinc-500' :
                      status === 'active' ? 'text-zinc-400' : 'text-zinc-700'
                    }`}>{step.liveDetail}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom CTA */}
          {noFeedsFound && !postsReady && userLoggedIn ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-center gap-2 text-amber-400 text-sm font-medium">
                <Newspaper className="w-4 h-4" />
                No content feeds found — continue to add them manually
              </div>
              <Button
                onClick={onViewPosts}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 text-white font-semibold shadow-lg shadow-purple-500/20"
              >
                Continue to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : postsReady && userLoggedIn ? (
            <Button
              onClick={onViewPosts}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 text-white font-semibold shadow-lg shadow-purple-500/20"
            >
              View Your Posts <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : postsReady && !userLoggedIn ? (
            emailFormUI('Posts ready — enter your email to go to your dashboard!')
          ) : showEmailField && !userLoggedIn ? (
            emailFormUI('Save your results — enter your email:')
          ) : !userLoggedIn ? (
            <p className="text-xs text-zinc-500 text-center py-1">Analyzing your publication…</p>
          ) : (
            <p className="text-xs text-zinc-500 text-center py-1">Sit tight — generating your posts…</p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
