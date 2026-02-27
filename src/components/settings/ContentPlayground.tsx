import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shuffle, Sparkles, Newspaper, PenLine } from 'lucide-react';
import { useAllFeedItems, FeedItemWithFeedName } from '@/hooks/useAllFeedItems';
import { useAccounts } from '@/hooks/useGetLateAccounts';
import { useGenerateSocialPost } from '@/hooks/useGenerateSocialPost';
import { VoiceSettings } from '@/hooks/useVoiceSettings';
import { FaInstagram, FaTwitter, FaTiktok, FaLinkedin, FaFacebook, FaYoutube } from 'react-icons/fa';
import { SiBluesky, SiThreads } from 'react-icons/si';

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  twitter: <FaTwitter className="h-3.5 w-3.5" />,
  instagram: <FaInstagram className="h-3.5 w-3.5" />,
  facebook: <FaFacebook className="h-3.5 w-3.5" />,
  linkedin: <FaLinkedin className="h-3.5 w-3.5" />,
  tiktok: <FaTiktok className="h-3.5 w-3.5" />,
  youtube: <FaYoutube className="h-3.5 w-3.5" />,
  bluesky: <SiBluesky className="h-3.5 w-3.5" />,
  threads: <SiThreads className="h-3.5 w-3.5" />,
};

interface ContentPlaygroundProps {
  currentSettings: Omit<VoiceSettings, 'id' | 'company_id'>;
}

export function ContentPlayground({ currentSettings }: ContentPlaygroundProps) {
  const { data: feedItems, isLoading: feedItemsLoading } = useAllFeedItems();
  const { data: accounts } = useAccounts();

  const [sourceMode, setSourceMode] = useState<'rss' | 'manual'>('rss');
  const [manualContent, setManualContent] = useState('');
  const [selectedArticleIndex, setSelectedArticleIndex] = useState(0);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [generatedPosts, setGeneratedPosts] = useState<Record<string, string> | null>(null);
  const [settingsChanged, setSettingsChanged] = useState(false);

  const { generateStrategy, generatePosts, isGeneratingStrategy, isGeneratingPosts } = useGenerateSocialPost();
  const isGenerating = isGeneratingStrategy || isGeneratingPosts;

  const connectedPlatforms = useMemo(() => {
    if (!accounts) return [];
    const unique = new Set(accounts.map(a => a.platform));
    return Array.from(unique);
  }, [accounts]);

  const recentItems = useMemo(() => (feedItems || []).slice(0, 5), [feedItems]);
  const currentArticle: FeedItemWithFeedName | null = recentItems[selectedArticleIndex] || null;

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
    setSettingsChanged(true);
  };

  const handleShuffle = () => {
    if (recentItems.length <= 1) return;
    let next = selectedArticleIndex;
    while (next === selectedArticleIndex) {
      next = Math.floor(Math.random() * recentItems.length);
    }
    setSelectedArticleIndex(next);
    setGeneratedPosts(null);
    setSettingsChanged(false);
  };

  const handleGenerate = async () => {
    if (selectedPlatforms.length === 0) return;
    const title = sourceMode === 'rss' ? currentArticle?.title || null : 'Manual Content';
    const description = sourceMode === 'rss' ? currentArticle?.description || null : manualContent;
    const link = sourceMode === 'rss' ? currentArticle?.link || null : null;
    const fullContent = sourceMode === 'rss' ? currentArticle?.full_content || null : manualContent;
    const imageUrl = sourceMode === 'rss' ? currentArticle?.image_url || null : null;

    const strategy = await generateStrategy({
      title, description, link, fullContent, objective: 'reach', platforms: selectedPlatforms,
    });
    if (!strategy) return;

    const posts = await generatePosts({
      title, description, link, fullContent, imageUrl, objective: 'reach', platforms: selectedPlatforms, approvedStrategy: strategy,
    });
    if (posts) {
      setGeneratedPosts(posts);
      setSettingsChanged(false);
    }
  };

  const hasSource = sourceMode === 'rss' ? !!currentArticle : manualContent.trim().length > 0;
  const canGenerate = hasSource && selectedPlatforms.length > 0 && !isGenerating;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <CardTitle className="text-lg">Playground</CardTitle>
          </div>
          {settingsChanged && generatedPosts && (
            <Badge variant="outline" className="text-[10px] text-warning border-warning/40">
              Settings changed — regenerate
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Source + Platforms in a compact row */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Source */}
          <div className="space-y-2">
            <div className="flex gap-1">
              <button
                onClick={() => { setSourceMode('rss'); setGeneratedPosts(null); }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  sourceMode === 'rss' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Newspaper className="h-3 w-3" /> RSS Feed
              </button>
              <button
                onClick={() => { setSourceMode('manual'); setGeneratedPosts(null); }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  sourceMode === 'manual' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <PenLine className="h-3 w-3" /> Manual
              </button>
            </div>

            {sourceMode === 'rss' ? (
              feedItemsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : recentItems.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4">No articles found. Add RSS feeds first.</p>
              ) : (
                <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-start gap-3">
                    {currentArticle?.image_url && (
                      <img src={currentArticle.image_url} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2 leading-tight">{currentArticle?.title || 'Untitled'}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{currentArticle?.feed_name}</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={handleShuffle} disabled={recentItems.length <= 1} className="h-7 text-xs px-2">
                      <Shuffle className="h-3 w-3 mr-1" />
                      {selectedArticleIndex + 1}/{recentItems.length}
                    </Button>
                  </div>
                </div>
              )
            ) : (
              <Textarea
                value={manualContent}
                onChange={(e) => { setManualContent(e.target.value); setSettingsChanged(true); }}
                placeholder="Paste content to test..."
                rows={3}
                className="text-xs"
              />
            )}
          </div>

          {/* Platforms */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Platforms</Label>
            {connectedPlatforms.length === 0 ? (
              <p className="text-xs text-muted-foreground">No connected accounts.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {connectedPlatforms.map(platform => (
                  <button
                    key={platform}
                    onClick={() => togglePlatform(platform)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      selectedPlatforms.includes(platform)
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border text-muted-foreground hover:border-muted-foreground/50'
                    }`}
                  >
                    {PLATFORM_ICONS[platform]}
                    <span className="capitalize">{platform}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Generate */}
        <Button onClick={handleGenerate} disabled={!canGenerate} size="sm" className="w-full">
          {isGenerating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              {isGeneratingStrategy ? 'Creating strategy…' : 'Generating posts…'}
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 mr-2" />
              Generate Preview
            </>
          )}
        </Button>

        {/* Results */}
        {generatedPosts && (
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(generatedPosts).map(([platform, content]) => (
              <div key={platform} className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center gap-2 mb-2">
                  {PLATFORM_ICONS[platform]}
                  <span className="text-xs font-medium capitalize">{platform}</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">{content.length} chars</Badge>
                </div>
                <p className="text-xs leading-relaxed whitespace-pre-wrap">{content}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
