import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, CheckCircle, Sparkles, AlertTriangle, Mail, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { posthog } from '@/lib/posthog';
import { DiscoveryBoard } from '@/components/onboarding/DiscoveryBoard';
import { DiscoveryProgressModal } from '@/components/onboarding/DiscoveryProgressModal';
import { SocialPostPreviewModal } from '@/components/onboarding/SocialPostPreviewModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PENDING_COMPANY_KEY = 'pendingCompanyId';

type Phase = 'crawling' | 'discovering-rss' | 'generating-posts' | 'discovered' | 'creating-company' | 'complete' | 'failed';

// Complete persona profiles for voice settings
export const PERSONA_PROFILES: Record<string, {
  tone: string;
  content_length: string;
  emoji_style: string;
  hashtag_strategy: string;
  custom_instructions: string;
  voice_mode: string;
}> = {
  neutral: {
    tone: 'neutral',
    content_length: 'standard',
    emoji_style: 'minimalist',
    hashtag_strategy: 'smart',
    custom_instructions: 'Factual, trustworthy, journalistic. Let the story speak.',
    voice_mode: 'custom',
  },
  friendly: {
    tone: 'friendly',
    content_length: 'standard',
    emoji_style: 'contextual',
    hashtag_strategy: 'smart',
    custom_instructions: 'Warm and conversational. Use "we" and community language.',
    voice_mode: 'custom',
  },
  urgent: {
    tone: 'urgent',
    content_length: 'headline',
    emoji_style: 'minimalist',
    hashtag_strategy: 'smart_and_brand',
    custom_instructions: 'Lead with the most critical fact. Create urgency.',
    voice_mode: 'custom',
  },
  engagement: {
    tone: 'engagement',
    content_length: 'full',
    emoji_style: 'contextual',
    hashtag_strategy: 'smart',
    custom_instructions: 'Ask a provocative question. Invite debate and replies.',
    voice_mode: 'custom',
  },
};

interface Article {
  title: string;
  description: string;
  link: string;
  imageUrl?: string;
}

export default function Discover() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const url = searchParams.get('url') || '';

  const [phase, setPhase] = useState<Phase>('crawling');
  const [crawlData, setCrawlData] = useState<any>(null);
  const [rssFeeds, setRssFeeds] = useState<any[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [posts, setPosts] = useState<Record<string, string>>({});
  const [postsReady, setPostsReady] = useState(false);
  const [selectedArticleIndex, setSelectedArticleIndex] = useState(0);
  const [isGeneratingPosts, setIsGeneratingPosts] = useState(false);
  const [showDrawer, setShowDrawer] = useState(true);
  const [showPostsModal, setShowPostsModal] = useState(false);
  const [accountCreated, setAccountCreated] = useState(!!user);
  const crawlStarted = useRef(false);
  const currentPersonaRef = useRef('neutral');
  const [failedEmail, setFailedEmail] = useState('');
  const [failedEmailSent, setFailedEmailSent] = useState(false);

  // Live data for the drawer
  const [liveData, setLiveData] = useState<{
    businessName?: string;
    description?: string;
    feedCount?: number;
    articleTitle?: string;
    platforms?: string[];
  }>({});

  useEffect(() => {
    if (!url) navigate('/get-started');
  }, [url, navigate]);

  useEffect(() => {
    if (user) setAccountCreated(true);
  }, [user]);

  // Auto-switch to posts modal when posts are generated
  useEffect(() => {
    if (postsReady && Object.keys(posts).length > 0) {
      setShowDrawer(false);
      setShowPostsModal(true);
    }
  }, [postsReady, posts]);

  // ─── Parallel pipeline: crawl + RSS run simultaneously ───
  useEffect(() => {
    if (!url || crawlStarted.current) return;
    crawlStarted.current = true;

    const runPipeline = async () => {
      setPhase('crawling');
      posthog.capture('onboarding_discovery_started', { url });

      // Launch crawl and RSS in parallel with a 20s timeout (only triggers if no RSS feeds found)
      const TIMEOUT_MS = 20_000;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('DISCOVERY_TIMEOUT')), TIMEOUT_MS)
      );

      const crawlPromise = supabase.functions.invoke('deep-website-crawl', {
        body: { url, mode: 'fast' },
      });

      const rssPromise = supabase.functions.invoke('discover-rss-feeds', {
        body: { url, fastMode: true },
      });

      // Process results as they arrive
      let feedArticles: Article[] = [];

      let crawlResult: PromiseSettledResult<any>;
      let rssResult: PromiseSettledResult<any>;

      try {
        const [cr, rr] = await Promise.race([
          Promise.allSettled([crawlPromise, rssPromise]),
          timeoutPromise.then(() => { throw new Error('DISCOVERY_TIMEOUT'); }),
        ]) as [PromiseSettledResult<any>, PromiseSettledResult<any>];
        crawlResult = cr;
        rssResult = rr;
      } catch (e: any) {
        if (e?.message === 'DISCOVERY_TIMEOUT') {
          console.error('Discovery timed out after 60s');
          posthog.capture('onboarding_discovery_timeout', { url });
          setPhase('failed');
          return;
        }
        throw e;
      }

      // Handle crawl result
      if (crawlResult.status === 'fulfilled') {
        const { data: crawl, error: crawlError } = crawlResult.value;
        if (!crawlError && crawl?.success !== false) {
          setCrawlData(crawl);
          setLiveData(prev => ({
            ...prev,
            businessName: crawl?.businessName,
            description: crawl?.description?.slice(0, 100),
          }));
          posthog.capture('onboarding_crawl_complete', { url, businessName: crawl?.businessName });
        } else {
          console.error('Crawl error:', crawlError);
        }
      }

      // Handle RSS result
      if (rssResult.status === 'fulfilled') {
        const { data: rss, error: rssError } = rssResult.value;
        if (!rssError && rss?.success && rss.feeds) {
          setRssFeeds(rss.feeds);
          setLiveData(prev => ({
            ...prev,
            feedCount: rss.feeds.length,
            articleTitle: rss.firstArticle?.title,
          }));
          posthog.capture('onboarding_rss_discovered', { url, feedCount: rss.feeds.length });

          if (rss.articles && Array.isArray(rss.articles) && rss.articles.length > 0) {
            feedArticles = rss.articles.slice(0, 5);
          } else if (rss.firstArticle) {
            feedArticles = [rss.firstArticle];
          }

          // Add fallback image from crawl data for articles missing images
          const crawlImage = crawlResult?.status === 'fulfilled'
            ? (crawlResult.value?.data?.ogImage || crawlResult.value?.data?.logoUrl || crawlResult.value?.data?.screenshotUrl)
            : null;
          if (crawlImage) {
            feedArticles = feedArticles.map(a => a.imageUrl ? a : { ...a, imageUrl: crawlImage });
          }

          setArticles(feedArticles);
        }
      }

      // Generate social posts from first article
      if (feedArticles.length > 0) {
        setPhase('generating-posts');
        setIsGeneratingPosts(true);
        try {
          const article = feedArticles[0];
          const defaultProfile = PERSONA_PROFILES['neutral'];
          const { data: postData, error: postError } = await supabase.functions.invoke('generate-social-post', {
            body: {
              mode: 'posts',
              title: article.title,
              description: article.description,
              link: article.link,
              imageUrl: article.imageUrl,
              objective: 'reach',
              platforms: ['facebook', 'linkedin', 'twitter'],
              approvedStrategy: `Write engaging social posts about: ${article.title}. Key points: ${article.description}`,
              voiceSettings: defaultProfile,
            },
          });

          if (!postError && postData?.posts) {
            const platformKeys = Object.keys(postData.posts);
            setPosts(postData.posts);
            setPostsReady(true);
            setLiveData(prev => ({ ...prev, platforms: platformKeys }));
            posthog.capture('onboarding_posts_generated', { url, platforms: platformKeys });
          }
        } catch (e) {
          console.log('Post generation failed:', e);
        } finally {
          setIsGeneratingPosts(false);
        }
      } else {
        // No articles found — skip post generation, mark as complete
        setPostsReady(false);
        setLiveData(prev => ({ ...prev, platforms: [] }));
      }

      // ─── Persist discovery data to DB ───
      setPhase('discovered');

      try {
        const { data: persistResult, error: persistError } = await supabase.functions.invoke('create-discovery-company', {
          body: {
            url,
            crawlData: crawlResult?.status === 'fulfilled' ? crawlResult.value?.data : null,
            rssFeeds: rssResult?.status === 'fulfilled' ? rssResult.value?.data?.feeds : [],
            articles: feedArticles,
          },
        });

        if (!persistError && persistResult?.companyId) {
          localStorage.setItem(PENDING_COMPANY_KEY, persistResult.companyId);
          posthog.capture('onboarding_discovery_persisted', {
            companyId: persistResult.companyId,
            feedCount: persistResult.feedCount,
            articleCount: persistResult.articleCount,
            leadsCount: persistResult.leadsCount,
          });
        }
      } catch (e) {
        console.error('Failed to persist discovery data:', e);
      }
    };

    runPipeline();
  }, [url, toast]);

  // Generate posts for a different article
  const generatePostsForArticle = async (index: number, tone: string = 'neutral') => {
    const article = articles[index];
    if (!article) return;

    const profile = PERSONA_PROFILES[tone] || PERSONA_PROFILES['neutral'];

    setIsGeneratingPosts(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-social-post', {
        body: {
          mode: 'posts',
          title: article.title,
          description: article.description,
          link: article.link,
          imageUrl: article.imageUrl,
          objective: 'reach',
          platforms: ['facebook', 'linkedin', 'twitter'],
          approvedStrategy: `Write engaging social posts about: ${article.title}. Key points: ${article.description}`,
          voiceSettings: profile,
        },
      });
      if (!error && data?.posts) {
        setPosts(data.posts);
      }
    } catch (e) {
      console.log('Post regeneration failed:', e);
    } finally {
      setIsGeneratingPosts(false);
    }
  };

  const handleArticleChange = async (index: number) => {
    setSelectedArticleIndex(index);
    posthog.capture('onboarding_article_changed', { articleIndex: index, articleTitle: articles[index]?.title });
    await generatePostsForArticle(index, currentPersonaRef.current);
  };

  const handlePersonaChange = async (persona: string) => {
    currentPersonaRef.current = persona;
    posthog.capture('onboarding_persona_changed', { persona });
    await generatePostsForArticle(selectedArticleIndex, persona);
  };

  const handleAuthSuccess = () => {
    setAccountCreated(true);
    posthog.capture('onboarding_signup_completed', { source: 'discovery_drawer' });
  };

  const handleViewPosts = () => {
    setShowDrawer(false);
    setShowPostsModal(true);
    posthog.capture('onboarding_view_posts_clicked');
  };

  // Claim company and go to onboarding wizard
  const handleContinue = async () => {
    if (!user) {
      setShowDrawer(true);
      return;
    }

    setPhase('creating-company');
    try {
      const pendingId = localStorage.getItem(PENDING_COMPANY_KEY);
      if (pendingId) {
        // Claim the pre-created company
        const { data, error } = await supabase.functions.invoke('claim-discovery-company', {
          body: { companyId: pendingId },
        });
        if (error) throw error;
        localStorage.removeItem(PENDING_COMPANY_KEY);
        posthog.capture('onboarding_company_claimed', { companyId: pendingId });
      } else {
        // Fallback: create company directly (old flow)
        const businessName = crawlData?.businessName || new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace('www.', '');
        const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50) || 'my-publication';

        const { data: company, error: companyError } = await supabase
          .from('companies')
          .insert({ name: businessName, slug, created_by: user.id, website_url: url, branding: crawlData?.data || {} })
          .select()
          .single();
        if (companyError) throw companyError;

        await supabase.from('company_memberships').insert({ user_id: user.id, company_id: company.id, role: 'owner' });

        for (const feed of rssFeeds.slice(0, 3)) {
          await supabase.from('rss_feeds').insert({ company_id: company.id, name: feed.title || 'RSS Feed', url: feed.url, is_active: true });
        }
      }

      setPhase('complete');
      const businessName = crawlData?.businessName || 'your publication';
      toast({ title: 'Publication created!', description: `${businessName} is ready to go.` });
      posthog.capture('onboarding_company_created', { businessName, feedCount: rssFeeds.length });
      setTimeout(() => navigate('/app/onboarding/wizard'), 1500);
    } catch (err) {
      console.error('Company creation error:', err);
      toast({ title: 'Error', description: 'Failed to create your publication.', variant: 'destructive' });
      setPhase('discovered');
    }
  };

  const phaseMessages: Record<Phase, string> = {
    'crawling': 'Analyzing your website...',
    'discovering-rss': 'Discovering RSS feeds...',
    'generating-posts': 'Generating social posts...',
    'discovered': 'Discovery complete!',
    'creating-company': 'Setting up your publication...',
    'complete': 'All set! Redirecting...',
    'failed': 'Discovery could not complete',
  };

  const isLoading = phase === 'crawling' || phase === 'discovering-rss' || phase === 'generating-posts';

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/landing" className="flex items-center gap-2">
            <img src="/images/longtale-logo-dark.png" alt="Longtale.ai" className="h-8 object-contain" />
          </Link>
          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                {phaseMessages[phase]}
              </div>
            ) : phase === 'complete' ? (
              <div className="flex items-center gap-2 text-sm text-green-500">
                <CheckCircle className="w-4 h-4" />
                {phaseMessages[phase]}
              </div>
            ) : phase === 'discovered' && user ? (
              <Button
                onClick={handleContinue}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
              >
                Continue to Dashboard
              </Button>
            ) : null}
          </div>
        </div>
      </nav>

      {/* Main content — visible behind the drawer */}
      <div className="pt-20 px-6 pb-32">
        <div className="max-w-7xl mx-auto">
          {phase === 'failed' ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="max-w-md w-full text-center space-y-6">
                <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7 text-destructive" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">We couldn't analyze this site</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Our team has been notified and is looking into <span className="font-medium text-foreground">{url}</span>. Leave your email and we'll reach out when your account is ready.
                  </p>
                </div>
                {failedEmailSent ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-primary">
                    <CheckCircle className="w-4 h-4" />
                    We'll be in touch soon!
                  </div>
                ) : (
                  <form
                    className="flex gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!failedEmail) return;
                      posthog.capture('onboarding_discovery_failed_email', { url, email: failedEmail });
                      // Store the failed discovery + email for the team
                      await supabase.from('api_call_logs').insert({
                        function_name: 'discovery-failed',
                        action: 'timeout',
                        success: false,
                        error_message: `User email: ${failedEmail}`,
                        request_body: { url, email: failedEmail },
                      });
                      setFailedEmailSent(true);
                      toast({ title: 'Got it!', description: "We'll reach out when your account is ready." });
                    }}
                  >
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={failedEmail}
                      onChange={(e) => setFailedEmail(e.target.value)}
                      required
                      className="flex-1"
                    />
                    <Button type="submit" size="sm">
                      <Mail className="w-4 h-4 mr-1.5" /> Notify me
                    </Button>
                  </form>
                )}
                <Button variant="ghost" size="sm" onClick={() => navigate('/get-started')} className="text-muted-foreground">
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Try a different URL
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">Publisher DNA</h1>
                <p className="text-sm text-muted-foreground mt-1">{url}</p>
              </div>
              <DiscoveryBoard
                crawlData={crawlData}
                rssFeeds={rssFeeds}
                isLoading={isLoading}
                phase={phase}
              />
            </>
          )}
        </div>
      </div>

      {/* Reopen drawer button */}
      {!showDrawer && (isLoading || postsReady) && (
        <button
          onClick={() => setShowDrawer(true)}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold shadow-lg transition-all hover:scale-105"
        >
          <Sparkles className="w-4 h-4" />
          See your AI social posts
        </button>
      )}

      {/* Non-blocking bottom sheet drawer */}
      <DiscoveryProgressModal
        open={showDrawer}
        onOpenChange={setShowDrawer}
        phase={phase}
        postsReady={postsReady}
        userLoggedIn={accountCreated}
        onAuthSuccess={handleAuthSuccess}
        onViewPosts={handleViewPosts}
        liveData={liveData}
      />

      {/* Social post preview modal */}
      <SocialPostPreviewModal
        open={showPostsModal}
        onClose={() => setShowPostsModal(false)}
        posts={posts}
        articles={articles}
        selectedArticleIndex={selectedArticleIndex}
        onArticleChange={handleArticleChange}
        onPersonaChange={handlePersonaChange}
        isGenerating={isGeneratingPosts}
      />
    </div>
  );
}
