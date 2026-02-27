import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Volume2, Bot, Settings2, ShieldCheck, Brain, Sparkles, Info } from 'lucide-react';
import { useVoiceSettings, useSaveVoiceSettings, VOICE_DEFAULTS, VoiceMode, Tone, ContentLength, EmojiStyle, HashtagStrategy } from '@/hooks/useVoiceSettings';
import { useGlobalVoiceDefaults } from '@/hooks/useGlobalVoiceDefaults';
import { ContentPlayground } from './ContentPlayground';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const VOICE_MODES: { value: VoiceMode; label: string; shortDesc: string; icon: React.ReactNode }[] = [
  { value: 'default', label: 'Default', shortDesc: 'System defaults', icon: <Settings2 className="h-4 w-4" /> },
  { value: 'custom', label: 'Custom', shortDesc: 'Your rules', icon: <Volume2 className="h-4 w-4" /> },
  { value: 'custom_dynamic_ai', label: 'Dynamic AI', shortDesc: '60%+ confident', icon: <Bot className="h-4 w-4" /> },
  { value: 'custom_strict_ai', label: 'Strict AI', shortDesc: '90%+ confident', icon: <ShieldCheck className="h-4 w-4" /> },
  { value: 'ai_decides', label: 'AI Decides', shortDesc: 'Full autonomy', icon: <Brain className="h-4 w-4" /> },
];

const TONE_OPTIONS: { value: Tone; label: string; persona: string; emoji: string }[] = [
  { value: 'neutral', label: 'Professional', persona: 'The Anchor', emoji: '🎯' },
  { value: 'friendly', label: 'Friendly', persona: 'The Neighbor', emoji: '👋' },
  { value: 'urgent', label: 'Urgent', persona: 'The Town Crier', emoji: '🚨' },
  { value: 'engagement', label: 'Engaging', persona: 'The Instigator', emoji: '💬' },
];

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

export function BrandVoiceTab() {
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

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const isAIMode = ['custom_dynamic_ai', 'custom_strict_ai', 'ai_decides'].includes(form.voice_mode);
  const sectionsDisabled = form.voice_mode === 'default' || form.voice_mode === 'ai_decides';
  const showBrandTags = form.hashtag_strategy === 'brand_only' || form.hashtag_strategy === 'smart_and_brand';

  const handleSave = () => {
    saveMutation.mutate(form);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Voice Mode — Compact horizontal selector */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">AI Autonomy</CardTitle>
                <CardDescription className="mt-1">How much freedom does the AI have?</CardDescription>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs text-xs">
                  Controls whether AI follows your voice settings exactly, can deviate when confident, or decides everything autonomously.
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Horizontal pill selector */}
            <div className="flex flex-wrap gap-2">
              {VOICE_MODES.map(mode => (
                <button
                  key={mode.value}
                  onClick={() => setForm(p => ({ ...p, voice_mode: mode.value }))}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all border ${
                    form.voice_mode === mode.value
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
                  }`}
                >
                  {mode.icon}
                  <span>{mode.label}</span>
                </button>
              ))}
            </div>

            {/* Mode description */}
            <p className="text-xs text-muted-foreground pl-1">
              {VOICE_MODES.find(m => m.value === form.voice_mode)?.shortDesc}
              {form.voice_mode === 'default' && ' — No customization needed.'}
              {form.voice_mode === 'custom' && ' — AI follows your settings exactly.'}
              {form.voice_mode === 'custom_dynamic_ai' && ' — AI may adjust if it improves results.'}
              {form.voice_mode === 'custom_strict_ai' && ' — AI adjusts only with very high confidence.'}
              {form.voice_mode === 'ai_decides' && ' — AI picks the best approach per article.'}
            </p>

            {isAIMode && (
              <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
                <Checkbox
                  checked={form.require_ai_review}
                  onCheckedChange={(v) => setForm(p => ({ ...p, require_ai_review: !!v }))}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Require review before publishing</p>
                  <p className="text-xs text-muted-foreground">AI-modified posts become drafts for your approval.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings Grid — Two columns */}
        <div className={`grid gap-4 md:grid-cols-2 ${sectionsDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Tone */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {TONE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setForm(p => ({ ...p, tone: opt.value }))}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-all ${
                      form.tone === opt.value
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'hover:border-muted-foreground/30'
                    }`}
                  >
                    <span className="text-lg">{opt.emoji}</span>
                    <span className="text-xs font-medium">{opt.label}</span>
                    <span className="text-[10px] text-muted-foreground">{opt.persona}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Content Length */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Length</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={form.content_length} onValueChange={(v) => setForm(p => ({ ...p, content_length: v as ContentLength }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="headline">Headline Only</SelectItem>
                  <SelectItem value="bullets">Bullet List</SelectItem>
                  <SelectItem value="standard">Standard Summary</SelectItem>
                  <SelectItem value="full">Full Post</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                {form.content_length === 'headline' && 'Short form, fits character limits.'}
                {form.content_length === 'bullets' && 'Scannable key details with bullet points.'}
                {form.content_length === 'standard' && 'Medium-form paragraph summary.'}
                {form.content_length === 'full' && 'Extended form for long-form platforms.'}
              </p>
            </CardContent>
          </Card>

          {/* Emoji Style */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Emojis</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={form.emoji_style} onValueChange={(v) => setForm(p => ({ ...p, emoji_style: v as EmojiStyle }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Emojis</SelectItem>
                  <SelectItem value="minimalist">Minimalist</SelectItem>
                  <SelectItem value="contextual">Smart / Contextual</SelectItem>
                  <SelectItem value="heavy">Heavy</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                {form.emoji_style === 'none' && 'Strict, serious — no emojis.'}
                {form.emoji_style === 'minimalist' && 'Functional cues only.'}
                {form.emoji_style === 'contextual' && 'Icons match the topic.'}
                {form.emoji_style === 'heavy' && 'Frequent emojis for engagement.'}
              </p>
            </CardContent>
          </Card>

          {/* Hashtags */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Hashtags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
                <Switch
                  checked={form.extract_locations}
                  onCheckedChange={(v) => setForm(p => ({ ...p, extract_locations: v }))}
                />
                <Label className="text-xs">Extract locations</Label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Disabled overlay message */}
        {sectionsDisabled && (
          <p className="text-xs text-muted-foreground text-center -mt-2">
            {form.voice_mode === 'default'
              ? 'Using system defaults. Switch to "Custom" to customize settings.'
              : 'AI will choose the best settings for each article.'}
          </p>
        )}

        {/* Custom Instructions */}
        {!sectionsDisabled && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Custom Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={form.custom_instructions || ''}
                onChange={(e) => setForm(p => ({ ...p, custom_instructions: e.target.value || null }))}
                placeholder="Any additional brand voice guidance for the AI..."
                rows={2}
                className="text-sm"
              />
            </CardContent>
          </Card>
        )}

        {/* Save */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
        </div>

        {/* Playground */}
        <ContentPlayground currentSettings={form} />
      </div>
    </TooltipProvider>
  );
}
