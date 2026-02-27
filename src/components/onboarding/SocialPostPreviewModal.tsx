import { useState } from 'react';
import { Sparkles, Anchor, MessageSquare, Zap, MessagesSquare, Mail, Loader2, X } from 'lucide-react';
import { FaFacebook, FaLinkedin, FaTwitter } from 'react-icons/fa';
import { AnimatePresence, motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, MessageCircle, Share, ThumbsUp, Globe, MoreHorizontal, Repeat2, Send, Bookmark } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { posthog } from '@/lib/posthog';
import { useNavigate } from 'react-router-dom';

interface Article {
  title: string;
  description: string;
  link: string;
  imageUrl?: string;
}

interface SocialPostPreviewModalProps {
  open: boolean;
  onClose: () => void;
  posts: Record<string, string>;
  articles: Article[];
  selectedArticleIndex: number;
  onArticleChange: (index: number) => void;
  onPersonaChange: (persona: string) => void;
  isGenerating: boolean;
}

const PERSONA_OPTIONS = [
  { value: 'neutral', label: 'The Anchor', subtitle: 'Professional & balanced', icon: <Anchor className="w-4 h-4" /> },
  { value: 'friendly', label: 'The Neighbor', subtitle: 'Warm & approachable', icon: <MessageSquare className="w-4 h-4" /> },
  { value: 'urgent', label: 'The Town Crier', subtitle: 'Urgent & attention-grabbing', icon: <Zap className="w-4 h-4" /> },
  { value: 'engagement', label: 'The Instigator', subtitle: 'Conversation starter', icon: <MessagesSquare className="w-4 h-4" /> },
];

const platformMeta: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  facebook: { icon: <FaFacebook className="w-4 h-4" />, label: 'Facebook', color: '#1877F2' },
  linkedin: { icon: <FaLinkedin className="w-4 h-4" />, label: 'LinkedIn', color: '#0A66C2' },
  twitter: { icon: <FaTwitter className="w-4 h-4" />, label: 'Twitter / X', color: '#1DA1F2' },
};

export function SocialPostPreviewModal({ open, onClose, posts, articles, selectedArticleIndex, onArticleChange, onPersonaChange, isGenerating }: SocialPostPreviewModalProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const platforms = Object.keys(posts);
  const [activePlatform, setActivePlatform] = useState(platforms[0] || 'facebook');
  const [selectedPersona, setSelectedPersona] = useState('neutral');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const currentPlatform = platforms.includes(activePlatform) ? activePlatform : platforms[0];
  const currentArticle = articles[selectedArticleIndex];
  const currentPersona = PERSONA_OPTIONS.find(p => p.value === selectedPersona) || PERSONA_OPTIONS[0];

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
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Error', description: data.error || 'Something went wrong.', variant: 'destructive' });
        return;
      }
      if (data.existing_user) {
        toast({ title: 'Welcome back!', description: 'Redirecting to sign in…' });
        navigate(`/auth/login?email=${encodeURIComponent(trimmed)}`);
        return;
      }
      posthog.capture('onboarding_email_submitted', { email: trimmed, source: 'post_preview_modal', persona: selectedPersona });
      await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
      // AuthContext SIGNED_IN auto-claims pendingCompanyId → /app → ProtectedRoute → /app/onboarding/wizard
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="post-preview-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-sm flex flex-col"
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col h-full"
          >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 shrink-0">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-fuchsia-400" />
          <h1 className="text-lg font-bold text-white">Your AI-Generated Posts</h1>
          <Badge variant="outline" className="border-fuchsia-500/30 text-fuchsia-400 text-[10px] ml-1">Preview</Badge>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-zinc-800">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main content — scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full px-6 py-6 space-y-6">

          {/* Persona selector */}
          <section>
            <label className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-2 block">Voice Persona</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PERSONA_OPTIONS.map((persona) => (
                <button
                  key={persona.value}
                  onClick={() => {
                    setSelectedPersona(persona.value);
                    onPersonaChange(persona.value);
                  }}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all ${
                    selectedPersona === persona.value
                      ? 'border-fuchsia-500/50 bg-fuchsia-500/10 text-white'
                      : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  <span className={selectedPersona === persona.value ? 'text-fuchsia-400' : 'text-zinc-600'}>{persona.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{persona.label}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{persona.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Article selector */}
          {articles.length > 1 && (
            <section>
              <label className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1.5 block">Source Article</label>
              <Select
                value={String(selectedArticleIndex)}
                onValueChange={(v) => onArticleChange(Number(v))}
                disabled={isGenerating}
              >
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-300 h-auto py-2.5 [&>span]:line-clamp-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 z-[200]">
                  {articles.map((article, i) => (
                    <SelectItem key={i} value={String(i)} className="text-zinc-300 focus:bg-zinc-700 focus:text-white">
                      <span className="line-clamp-1">{article.title || 'Untitled'}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </section>
          )}

          {/* Platform tabs + post preview */}
          {platforms.length > 0 && (
            <section>
              <Tabs value={currentPlatform} onValueChange={setActivePlatform}>
                <TabsList className="bg-zinc-800/60 border border-zinc-700 w-full justify-start gap-1 h-auto p-1">
                  {platforms.map((p) => {
                    const meta = platformMeta[p];
                    return (
                      <TabsTrigger
                        key={p}
                        value={p}
                        className="flex items-center gap-1.5 text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400 rounded-md px-3 py-1.5"
                      >
                        {meta?.icon}
                        {meta?.label || p}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {platforms.map((p) => (
                  <TabsContent key={p} value={p} className="mt-4 mb-0">
                    {isGenerating ? (
                      <div className="flex items-center justify-center py-16 text-zinc-400">
                        <Sparkles className="w-5 h-5 animate-pulse mr-2" />
                        <span className="text-sm">Generating posts...</span>
                      </div>
                    ) : (
                      <PlatformPreview platform={p} content={posts[p] || ''} imageUrl={currentArticle?.imageUrl} />
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </section>
          )}
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="shrink-0 border-t border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md px-6 py-5">
        <div className="max-w-3xl mx-auto w-full">
          {loading ? (
            <div className="text-center space-y-1.5">
              <div className="flex items-center justify-center gap-2 text-fuchsia-400 text-sm font-medium">
                <Loader2 className="w-4 h-4 animate-spin" /> Creating your account…
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-sm text-white font-medium">Ready to launch? Enter your email to get started.</p>
                <p className="text-xs text-zinc-500 mt-0.5">No password needed — we'll get you in instantly</p>
              </div>
              <form onSubmit={handleEmailSubmit} className="flex gap-2 max-w-md mx-auto">
                <div className="flex-1 relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    type="email"
                    placeholder="you@publication.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 pl-9 text-sm bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-fuchsia-500/50"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="h-11 px-6 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 text-white font-semibold text-sm"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Launch My Account'}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Platform mockups ─── */

function PlatformPreview({ platform, content, imageUrl }: { platform: string; content: string; imageUrl?: string }) {
  if (platform === 'facebook') return <FacebookMockup content={content} imageUrl={imageUrl} />;
  if (platform === 'linkedin') return <LinkedInMockup content={content} imageUrl={imageUrl} />;
  if (platform === 'twitter') return <TwitterMockup content={content} imageUrl={imageUrl} />;
  return <GenericMockup platform={platform} content={content} />;
}

function ArticleImage({ imageUrl, className = '' }: { imageUrl?: string; className?: string }) {
  if (!imageUrl) return null;
  return (
    <div className={`relative overflow-hidden bg-zinc-100 ${className}`}>
      <img src={imageUrl} alt="Article" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
    </div>
  );
}

function FacebookMockup({ content, imageUrl }: { content: string; imageUrl?: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden text-[13px] max-w-md mx-auto">
      <div className="p-3 flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center text-white font-bold text-sm">P</div>
        <div className="flex-1">
          <p className="font-semibold text-[#050505] text-sm">Your Page</p>
          <div className="flex items-center gap-1 text-[#65676B] text-xs"><span>Just now</span><span>·</span><Globe className="w-3 h-3" /></div>
        </div>
        <MoreHorizontal className="w-5 h-5 text-[#65676B]" />
      </div>
      <div className="px-3 pb-2">
        <p className="text-[#050505] text-[15px] whitespace-pre-wrap leading-snug">{content}</p>
      </div>
      <ArticleImage imageUrl={imageUrl} className="w-full h-52" />
      <div className="px-3 py-2 flex items-center justify-between text-[#65676B] text-xs border-b border-[#CED0D4]">
        <div className="flex items-center gap-1"><div className="w-[18px] h-[18px] rounded-full bg-[#1877F2] flex items-center justify-center"><ThumbsUp className="w-2.5 h-2.5 text-white" /></div><span>0</span></div>
        <span>0 comments</span>
      </div>
      <div className="grid grid-cols-3 px-1 py-1">
        {[{ icon: ThumbsUp, label: 'Like' }, { icon: MessageCircle, label: 'Comment' }, { icon: Share, label: 'Share' }].map(({ icon: Icon, label }) => (
          <button key={label} className="flex items-center justify-center gap-1.5 py-2 rounded-md text-[#65676B] font-semibold text-[13px]"><Icon className="w-4 h-4" />{label}</button>
        ))}
      </div>
    </div>
  );
}

function LinkedInMockup({ content, imageUrl }: { content: string; imageUrl?: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden text-[14px] border border-[#E0E0E0] max-w-md mx-auto">
      <div className="p-3 flex items-center gap-2">
        <div className="w-12 h-12 rounded-full bg-[#0A66C2] flex items-center justify-center text-white font-bold">P</div>
        <div>
          <p className="font-semibold text-[#000000E6] text-sm">Your Name</p>
          <p className="text-[#00000099] text-xs">Headline · 1st</p>
          <p className="text-[#00000099] text-xs">Just now · <Globe className="w-3 h-3 inline" /></p>
        </div>
      </div>
      <div className="px-3 pb-2"><p className="text-[#000000E6] text-[14px] whitespace-pre-wrap leading-snug">{content}</p></div>
      <ArticleImage imageUrl={imageUrl} className="w-full h-48" />
      <div className="px-3 py-1.5 border-b border-[#E0E0E0] text-xs text-[#00000099]">0 reactions</div>
      <div className="grid grid-cols-4 px-1 py-0.5">
        {[{ icon: ThumbsUp, label: 'Like' }, { icon: MessageCircle, label: 'Comment' }, { icon: Repeat2, label: 'Repost' }, { icon: Send, label: 'Send' }].map(({ icon: Icon, label }) => (
          <button key={label} className="flex items-center justify-center gap-1 py-2.5 rounded text-[#00000099] font-semibold text-xs"><Icon className="w-4 h-4" /><span className="hidden sm:inline">{label}</span></button>
        ))}
      </div>
    </div>
  );
}

function TwitterMockup({ content, imageUrl }: { content: string; imageUrl?: string }) {
  return (
    <div className="bg-white rounded-xl p-3 text-[15px] border border-[#EFF3F4] max-w-md mx-auto">
      <div className="flex gap-2.5">
        <div className="w-10 h-10 rounded-full bg-[#1DA1F2] flex items-center justify-center text-white font-bold text-sm shrink-0">P</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-bold text-[#0F1419] text-[15px]">Your Account</span>
            <span className="text-[#536471] text-[15px]">@you · now</span>
          </div>
          <p className="mt-0.5 text-[#0F1419] whitespace-pre-wrap leading-snug">{content}</p>
          {imageUrl && (
            <div className="mt-2 rounded-2xl overflow-hidden border border-[#EFF3F4]">
              <img src={imageUrl} alt="Article" className="w-full h-44 object-cover" onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
            </div>
          )}
          <div className="flex items-center justify-between mt-3 max-w-[300px] text-[#536471]">
            {[MessageCircle, Repeat2, Heart, Share, Bookmark].map((Icon, i) => (
              <button key={i} className="flex items-center gap-1.5 text-[13px]"><Icon className="w-[18px] h-[18px]" />{i < 3 && '0'}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GenericMockup({ platform, content }: { platform: string; content: string }) {
  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-4 max-w-md mx-auto">
      <p className="text-xs text-zinc-500 uppercase font-medium mb-2">{platform}</p>
      <p className="text-zinc-900 text-sm whitespace-pre-wrap">{content}</p>
    </div>
  );
}
