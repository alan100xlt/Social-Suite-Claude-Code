import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Loader2, Save, Anchor, MessageSquare, Zap, MessagesSquare,
  AlignLeft, List, FileText, BookOpen,
  Ban, Smile, Sparkles, SmilePlus,
  Settings2, Volume2, Bot, ShieldCheck, Brain,
  Hash, PenLine, Newspaper, Shuffle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useVoiceSettings, useSaveVoiceSettings, VOICE_DEFAULTS, VoiceMode, Tone, ContentLength, EmojiStyle, HashtagStrategy } from '@/hooks/useVoiceSettings';
import { useGlobalVoiceDefaults } from '@/hooks/useGlobalVoiceDefaults';
import { useAllFeedItems, FeedItemWithFeedName } from '@/hooks/useAllFeedItems';
import { useAccounts } from '@/hooks/useGetLateAccounts';
import { useGenerateSocialPost } from '@/hooks/useGenerateSocialPost';
import { FaInstagram, FaTwitter, FaTiktok, FaLinkedin, FaFacebook, FaYoutube } from 'react-icons/fa';
import { SiBluesky, SiThreads } from 'react-icons/si';

// ── Constants ──

const TONE_OPTIONS: { value: Tone; label: string; subtitle: string; icon: React.ReactNode }[] = [
  { value: 'neutral', label: 'The Anchor', subtitle: 'Professional & balanced', icon: <Anchor className="h-5 w-5" /> },
  { value: 'friendly', label: 'The Neighbor', subtitle: 'Warm & approachable', icon: <MessageSquare className="h-5 w-5" /> },
  { value: 'urgent', label: 'The Town Crier', subtitle: 'Urgent & attention-grabbing', icon: <Zap className="h-5 w-5" /> },
  { value: 'engagement', label: 'The Instigator', subtitle: 'Conversation starter', icon: <MessagesSquare className="h-5 w-5" /> },
];

const LENGTH_OPTIONS: { value: ContentLength; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'headline', label: 'Headline', desc: 'Short form — fits character limits. Great for X/Twitter.', icon: <AlignLeft className="h-4 w-4" /> },
  { value: 'bullets', label: 'Bullet List', desc: 'Scannable key details with bullet points for quick reads.', icon: <List className="h-4 w-4" /> },
  { value: 'standard', label: 'Standard', desc: 'Medium-form paragraph summary. Works well on most platforms.', icon: <FileText className="h-4 w-4" /> },
  { value: 'full', label: 'Full Post', desc: 'Extended form for long-form platforms like LinkedIn.', icon: <BookOpen className="h-4 w-4" /> },
];

const EMOJI_OPTIONS: { value: EmojiStyle; label: string; subtitle: string; icon: React.ReactNode }[] = [
  { value: 'none', label: 'None', subtitle: 'Strict, no emojis', icon: <Ban className="h-5 w-5" /> },
  { value: 'contextual', label: 'Smart', subtitle: 'Icons match the topic', icon: <Sparkles className="h-5 w-5" /> },
  { value: 'minimalist', label: 'Minimal', subtitle: 'Functional cues only', icon: <Smile className="h-5 w-5" /> },
  { value: 'heavy', label: 'Heavy', subtitle: 'Frequent for engagement', icon: <SmilePlus className="h-5 w-5" /> },
];

const VOICE_MODES: { value: VoiceMode; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'default', label: 'Default Mode', desc: 'Uses system defaults — no customization needed.', icon: <Settings2 className="h-4 w-4" /> },
  { value: 'custom', label: 'Custom', desc: 'AI follows your settings exactly.', icon: <Volume2 className="h-4 w-4" /> },
  { value: 'custom_dynamic_ai', label: 'Dynamic AI', desc: 'AI may adjust if 60%+ confident it improves results.', icon: <Bot className="h-4 w-4" /> },
  { value: 'custom_strict_ai', label: 'Strict AI', desc: 'AI adjusts only with 90%+ confidence.', icon: <ShieldCheck className="h-4 w-4" /> },
  { value: 'ai_decides', label: 'AI Decides', desc: 'Full autonomy — AI picks the best approach per article.', icon: <Brain className="h-4 w-4" /> },
];

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  twitter: <FaTwitter className="h-4 w-4" />,
  instagram: <FaInstagram className="h-4 w-4" />,
  facebook: <FaFacebook className="h-4 w-4" />,
  linkedin: <FaLinkedin className="h-4 w-4" />,
  tiktok: <FaTiktok className="h-4 w-4" />,
  youtube: <FaYoutube className="h-4 w-4" />,
  bluesky: <SiBluesky className="h-4 w-4" />,
  threads: <SiThreads className="h-4 w-4" />,
};

interface FormState {
  voice_mode: VoiceMode;
  require_ai_review: boolean;
  tone: Tone;
  content_length: ContentLength;
  emoji_style: EmojiStyle;
  hashtag_strategy: HashtagStrategy;
  brand_tags: string[];
  extract_locations: boolean;
  custom_instructions: string | null;
}

// ── Section Header ──

function SectionHeader({ icon, label, number }: { icon: React.ReactNode; label: string; number?: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-primary">{icon}</span>
      <h3 className="text-sm font-semibold text-foreground">
        {number != null && <span className="text-muted-foreground mr-1">Epic {number}:</span>}
        {label}
      </h3>
    </div>
  );
}

// ── Selectable Card ──

function SelectableCard({ selected, onClick, icon, label, subtitle, compact }: {
  selected: boolean; onClick: () => void; icon: React.ReactNode; label: string; subtitle: string; compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all flex-1 min-w-0 ${
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
          : 'border-border hover:border-muted-foreground/40'
      } ${compact ? 'p-2.5' : ''}`}
    >
      <span className={selected ? 'text-primary' : 'text-muted-foreground'}>{icon}</span>
      <div className="min-w-0">
        <p className={`font-medium leading-tight ${compact ? 'text-xs' : 'text-sm'}`}>{label}</p>
        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">{subtitle}</p>
      </div>
    </button>
  );
}

// ── Main Component ──

export function BrandVoiceTabV2() {
  const { data: settings, isLoading } = useVoiceSettings();
  const { data: globalDefaults } = useGlobalVoiceDefaults();
  const saveMutation = useSaveVoiceSettings();

  const [form, setForm] = useState<FormState>({ ...VOICE_DEFAULTS } as FormState);

  useEffect(() => {
    if (settings) {
      setForm({
        voice_mode: settings.voice_mode,
        require_ai_review: settings.require_ai_review,
        tone: settings.tone,
        content_length: settings.content_length,
        emoji_style: settings.emoji_style,
        hashtag_strategy: settings.hashtag_strategy,
        brand_tags: settings.brand_tags || [],
        extract_locations: settings.extract_locations,
        custom_instructions: settings.custom_instructions,
      });
    }
  }, [settings]);

  // Playground state
  const { data: feedItems, isLoading: feedItemsLoading } = useAllFeedItems();
  const { data: accounts } = useAccounts();
  const { generateStrategy, generatePosts, isGeneratingStrategy, isGeneratingPosts } = useGenerateSocialPost();
  const isGenerating = isGeneratingStrategy || isGeneratingPosts;

  const [sourceMode, setSourceMode] = useState<'rss' | 'manual'>('rss');
  const [manualContent, setManualContent] = useState('');
  const [selectedArticleIndex, setSelectedArticleIndex] = useState(0);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [generatedPosts, setGeneratedPosts] = useState<Record<string, string> | null>(null);
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [playgroundOpen, setPlaygroundOpen] = useState(true);

  const connectedPlatforms = useMemo(() => {
    if (!accounts) return [];
    return Array.from(new Set(accounts.map(a => a.platform)));
  }, [accounts]);

  const recentItems = useMemo(() => (feedItems || []).slice(0, 5), [feedItems]);
  const currentArticle: FeedItemWithFeedName | null = recentItems[selectedArticleIndex] || null;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const isAIMode = ['custom_dynamic_ai', 'custom_strict_ai', 'ai_decides'].includes(form.voice_mode);
  const sectionsDisabled = form.voice_mode === 'default' || form.voice_mode === 'ai_decides';
  const showBrandTags = form.hashtag_strategy === 'brand_only' || form.hashtag_strategy === 'smart_and_brand';

  const handleSave = () => saveMutation.mutate(form);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]);
    setSettingsChanged(true);
  };

  const handleShuffle = () => {
    if (recentItems.length <= 1) return;
    let next = selectedArticleIndex;
    while (next === selectedArticleIndex) next = Math.floor(Math.random() * recentItems.length);
    setSelectedArticleIndex(next);
    setGeneratedPosts(null);
  };

  const handleGenerate = async () => {
    if (selectedPlatforms.length === 0) return;
    const title = sourceMode === 'rss' ? currentArticle?.title || null : 'Manual Content';
    const description = sourceMode === 'rss' ? currentArticle?.description || null : manualContent;
    const link = sourceMode === 'rss' ? currentArticle?.link || null : null;
    const fullContent = sourceMode === 'rss' ? currentArticle?.full_content || null : manualContent;
    const imageUrl = sourceMode === 'rss' ? currentArticle?.image_url || null : null;

    const strategy = await generateStrategy({ title, description, link, fullContent, objective: 'reach', platforms: selectedPlatforms });
    if (!strategy) return;
    const posts = await generatePosts({ title, description, link, fullContent, imageUrl, objective: 'reach', platforms: selectedPlatforms, approvedStrategy: strategy });
    if (posts) { setGeneratedPosts(posts); setSettingsChanged(false); }
  };

  const hasSource = sourceMode === 'rss' ? !!currentArticle : manualContent.trim().length > 0;
  const canGenerate = hasSource && selectedPlatforms.length > 0 && !isGenerating;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* ── Left Panel: Settings ── */}
      <div className="flex-1 min-w-0 space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">Brand Voice & Formatting</h2>
          <p className="text-sm text-muted-foreground mt-1">Define how AI generates content for your brand.</p>
        </div>

        {/* Epic 1: Tone */}
        <section>
          <SectionHeader icon={<Anchor className="h-4 w-4" />} label="Tone / Persona" number={1} />
          <div className={`flex flex-wrap gap-2 ${sectionsDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
            {TONE_OPTIONS.map(opt => (
              <SelectableCard
                key={opt.value}
                selected={form.tone === opt.value}
                onClick={() => setForm(p => ({ ...p, tone: opt.value }))}
                icon={opt.icon}
                label={opt.label}
                subtitle={opt.subtitle}
              />
            ))}
          </div>
        </section>

        <Separator />

        {/* Epic 2: Content Length */}
        <section>
          <SectionHeader icon={<FileText className="h-4 w-4" />} label="Content Length & Structure" number={2} />
          <div className={sectionsDisabled ? 'opacity-50 pointer-events-none' : ''}>
            <div className="flex border rounded-lg overflow-hidden">
              {LENGTH_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setForm(p => ({ ...p, content_length: opt.value }))}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-r last:border-r-0 ${
                    form.content_length === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="mt-3 rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">
                {LENGTH_OPTIONS.find(o => o.value === form.content_length)?.desc}
              </p>
            </div>
          </div>
        </section>

        <Separator />

        {/* Epic 3: Emoji Logic */}
        <section>
          <SectionHeader icon={<Smile className="h-4 w-4" />} label="Emoji Logic" number={3} />
          <div className={`flex flex-wrap gap-2 ${sectionsDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
            {EMOJI_OPTIONS.map(opt => (
              <SelectableCard
                key={opt.value}
                selected={form.emoji_style === opt.value}
                onClick={() => setForm(p => ({ ...p, emoji_style: opt.value }))}
                icon={opt.icon}
                label={opt.label}
                subtitle={opt.subtitle}
                compact
              />
            ))}
          </div>
        </section>

        <Separator />

        {/* Epic 4: Voice Mode / AI Autonomy */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionHeader icon={<Brain className="h-4 w-4" />} label="Voice Mode / AI Autonomy" number={4} />
            {isAIMode && (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Require Review</Label>
                <Switch
                  checked={form.require_ai_review}
                  onCheckedChange={(v) => setForm(p => ({ ...p, require_ai_review: v }))}
                />
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            {VOICE_MODES.map(mode => (
              <button
                key={mode.value}
                onClick={() => setForm(p => ({ ...p, voice_mode: mode.value }))}
                className={`w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
                  form.voice_mode === mode.value
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border hover:border-muted-foreground/40'
                }`}
              >
                <div className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                  form.voice_mode === mode.value ? 'border-primary' : 'border-muted-foreground/40'
                }`}>
                  {form.voice_mode === mode.value && <div className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <span className={form.voice_mode === mode.value ? 'text-primary' : 'text-muted-foreground'}>{mode.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{mode.label}</p>
                  <p className="text-[11px] text-muted-foreground">{mode.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <Separator />

        {/* Hashtags */}
        <section className={sectionsDisabled ? 'opacity-50 pointer-events-none' : ''}>
          <SectionHeader icon={<Hash className="h-4 w-4" />} label="Hashtags" />
          <div className="space-y-3">
            <Select value={form.hashtag_strategy} onValueChange={(v) => setForm(p => ({ ...p, hashtag_strategy: v as HashtagStrategy }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="smart">Smart Tags</SelectItem>
                <SelectItem value="brand_only">Brand Tags Only</SelectItem>
                <SelectItem value="smart_and_brand">Smart + Brand Tags</SelectItem>
              </SelectContent>
            </Select>

            {showBrandTags && (
              <div className="space-y-2">
                <Input
                  value={(form.brand_tags || []).join(', ')}
                  onChange={(e) => setForm(p => ({ ...p, brand_tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
                  placeholder="#YourBrand, #AlwaysInclude"
                  className="text-xs"
                />
                {form.brand_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {form.brand_tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">
                        {tag.startsWith('#') ? tag : `#${tag}`}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch checked={form.extract_locations} onCheckedChange={(v) => setForm(p => ({ ...p, extract_locations: v }))} />
              <Label className="text-xs">Extract locations from content</Label>
            </div>
          </div>
        </section>

        <Separator />

        {/* Custom Instructions */}
        {!sectionsDisabled && (
          <section>
            <SectionHeader icon={<PenLine className="h-4 w-4" />} label="Custom Instructions" />
            <Textarea
              value={form.custom_instructions || ''}
              onChange={(e) => setForm(p => ({ ...p, custom_instructions: e.target.value || null }))}
              placeholder="Any additional brand voice guidance for the AI..."
              rows={3}
              className="text-sm"
            />
          </section>
        )}

        {sectionsDisabled && (
          <p className="text-xs text-muted-foreground text-center">
            {form.voice_mode === 'default'
              ? 'Using system defaults. Switch to "Custom" to customize settings.'
              : 'AI will choose the best settings for each article.'}
          </p>
        )}

        {/* Save */}
        <div className="flex justify-end pb-4">
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
        </div>
      </div>

      {/* ── Right Panel: Content Playground ── */}
      <div className="lg:w-[380px] flex-shrink-0">
        <div className="lg:sticky lg:top-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Content Playground</h3>
            </div>
            <button onClick={() => setPlaygroundOpen(p => !p)} className="text-muted-foreground hover:text-foreground">
              {playgroundOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {playgroundOpen && (
            <div className="rounded-xl border bg-card p-4 space-y-4">
              {/* Test with Latest Article */}
              {sourceMode === 'rss' && currentArticle && (
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleShuffle} disabled={recentItems.length <= 1}>
                  <Newspaper className="h-3.5 w-3.5 mr-2" />
                  Test with Latest Article
                  <Shuffle className="h-3 w-3 ml-auto" />
                </Button>
              )}

              {/* Source toggle */}
              <div className="flex gap-1 rounded-lg border p-0.5">
                <button
                  onClick={() => { setSourceMode('rss'); setGeneratedPosts(null); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                    sourceMode === 'rss' ? 'bg-secondary text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <Newspaper className="h-3 w-3" /> RSS
                </button>
                <button
                  onClick={() => { setSourceMode('manual'); setGeneratedPosts(null); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                    sourceMode === 'manual' ? 'bg-secondary text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <PenLine className="h-3 w-3" /> Manual
                </button>
              </div>

              {/* Source content */}
              {sourceMode === 'rss' ? (
                feedItemsLoading ? (
                  <div className="flex items-center justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                ) : recentItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No articles found. Add RSS feeds first.</p>
                ) : (
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <div className="flex items-start gap-3">
                      {currentArticle?.image_url && (
                        <img src={currentArticle.image_url} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium line-clamp-2 leading-tight">{currentArticle?.title || 'Untitled'}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{currentArticle?.feed_name}</p>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <Textarea
                  value={manualContent}
                  onChange={(e) => { setManualContent(e.target.value); setSettingsChanged(true); }}
                  placeholder="Paste content to test..."
                  rows={4}
                  className="text-xs"
                />
              )}

              {/* Platforms */}
              {connectedPlatforms.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Platforms</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {connectedPlatforms.map(platform => (
                      <button
                        key={platform}
                        onClick={() => togglePlatform(platform)}
                        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
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
                </div>
              )}

              {/* Generate */}
              <Button onClick={handleGenerate} disabled={!canGenerate} className="w-full">
                {isGenerating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    {isGeneratingStrategy ? 'Strategy…' : 'Generating…'}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 mr-2" />
                    Generate Preview
                  </>
                )}
              </Button>

              {/* Live Previews */}
              {generatedPosts && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Live Previews</h4>
                    {settingsChanged && (
                      <span className="flex items-center gap-1 text-[10px] text-destructive">
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                        Regenerate Required
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    {Object.entries(generatedPosts).map(([platform, content]) => (
                      <div key={platform} className="rounded-lg border bg-card shadow-sm p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          {PLATFORM_ICONS[platform]}
                          <span className="text-xs font-medium capitalize">{platform}</span>
                          <Badge variant="outline" className="text-[10px] ml-auto">{content.length}c</Badge>
                        </div>
                        <p className="text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">{content}</p>
                        {sourceMode === 'rss' && currentArticle?.image_url && (
                          <img src={currentArticle.image_url} alt="" className="w-full h-32 rounded-md object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
