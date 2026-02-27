import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Anchor, MessageSquare, Zap, MessagesSquare, AlignLeft, List, FileText, BookOpen, Ban, Smile, Sparkles, SmilePlus, Hash, PenLine } from 'lucide-react';
import { useVoiceSettings, useSaveVoiceSettings, VOICE_DEFAULTS, Tone, ContentLength, EmojiStyle, HashtagStrategy } from '@/hooks/useVoiceSettings';
import { posthog } from '@/lib/posthog';

const TONE_OPTIONS: { value: Tone; label: string; subtitle: string; icon: React.ReactNode }[] = [
  { value: 'neutral', label: 'The Anchor', subtitle: 'Professional & balanced', icon: <Anchor className="h-5 w-5" /> },
  { value: 'friendly', label: 'The Neighbor', subtitle: 'Warm & approachable', icon: <MessageSquare className="h-5 w-5" /> },
  { value: 'urgent', label: 'The Town Crier', subtitle: 'Urgent & attention-grabbing', icon: <Zap className="h-5 w-5" /> },
  { value: 'engagement', label: 'The Instigator', subtitle: 'Conversation starter', icon: <MessagesSquare className="h-5 w-5" /> },
];

const LENGTH_OPTIONS: { value: ContentLength; label: string; icon: React.ReactNode }[] = [
  { value: 'headline', label: 'Headline', icon: <AlignLeft className="h-4 w-4" /> },
  { value: 'bullets', label: 'Bullets', icon: <List className="h-4 w-4" /> },
  { value: 'standard', label: 'Standard', icon: <FileText className="h-4 w-4" /> },
  { value: 'full', label: 'Full Post', icon: <BookOpen className="h-4 w-4" /> },
];

const EMOJI_OPTIONS: { value: EmojiStyle; label: string; icon: React.ReactNode }[] = [
  { value: 'none', label: 'None', icon: <Ban className="h-4 w-4" /> },
  { value: 'contextual', label: 'Smart', icon: <Sparkles className="h-4 w-4" /> },
  { value: 'minimalist', label: 'Minimal', icon: <Smile className="h-4 w-4" /> },
  { value: 'heavy', label: 'Heavy', icon: <SmilePlus className="h-4 w-4" /> },
];

interface FormState {
  tone: Tone;
  content_length: ContentLength;
  emoji_style: EmojiStyle;
  hashtag_strategy: HashtagStrategy;
  brand_tags: string[];
  extract_locations: boolean;
  custom_instructions: string | null;
}

export function BrandVoiceStep() {
  const { data: settings, isLoading } = useVoiceSettings();
  const saveMutation = useSaveVoiceSettings();

  const [form, setForm] = useState<FormState>({
    tone: 'neutral',
    content_length: 'standard',
    emoji_style: 'contextual',
    hashtag_strategy: 'smart',
    brand_tags: [],
    extract_locations: false,
    custom_instructions: null,
  });

  useEffect(() => {
    if (settings) {
      setForm({
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

  const handleSave = () => {
    saveMutation.mutate({
      ...form,
      voice_mode: 'custom',
      require_ai_review: false,
    });
    posthog.capture('onboarding_voice_saved', { tone: form.tone, voiceMode: 'custom' });
  };

  const showBrandTags = form.hashtag_strategy === 'brand_only' || form.hashtag_strategy === 'smart_and_brand';

  if (isLoading) {
    return <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Brand Voice & Formatting</h2>
        <p className="text-muted-foreground mt-1">
          Choose how AI generates content for your brand. These defaults work great — customize if you'd like.
        </p>
      </div>

      {/* Tone */}
      <section>
        <Label className="text-sm font-semibold mb-3 block">Tone / Persona</Label>
        <div className="grid grid-cols-2 gap-2">
          {TONE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setForm(p => ({ ...p, tone: opt.value }))}
              className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                form.tone === opt.value
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border hover:border-muted-foreground/40'
              }`}
            >
              <span className={form.tone === opt.value ? 'text-primary' : 'text-muted-foreground'}>{opt.icon}</span>
              <div>
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-[10px] text-muted-foreground">{opt.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <Separator />

      {/* Content Length */}
      <section>
        <Label className="text-sm font-semibold mb-3 block">Content Length</Label>
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
      </section>

      <Separator />

      {/* Emoji */}
      <section>
        <Label className="text-sm font-semibold mb-3 block">Emoji Style</Label>
        <div className="grid grid-cols-4 gap-2">
          {EMOJI_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setForm(p => ({ ...p, emoji_style: opt.value }))}
              className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-all ${
                form.emoji_style === opt.value
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border hover:border-muted-foreground/40'
              }`}
            >
              <span className={form.emoji_style === opt.value ? 'text-primary' : 'text-muted-foreground'}>{opt.icon}</span>
              <p className="text-xs font-medium">{opt.label}</p>
            </button>
          ))}
        </div>
      </section>

      <Separator />

      {/* Hashtags */}
      <section>
        <Label className="text-sm font-semibold mb-3 block">Hashtags</Label>
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
          <div className="mt-2">
            <Input
              value={(form.brand_tags || []).join(', ')}
              onChange={(e) => setForm(p => ({ ...p, brand_tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
              placeholder="#YourBrand, #AlwaysInclude"
              className="text-xs"
            />
            {form.brand_tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {form.brand_tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <Separator />

      {/* Custom Instructions */}
      <section>
        <Label className="text-sm font-semibold mb-3 block">Custom Instructions (optional)</Label>
        <Textarea
          value={form.custom_instructions || ''}
          onChange={(e) => setForm(p => ({ ...p, custom_instructions: e.target.value || null }))}
          placeholder="Any additional brand voice guidance for the AI..."
          rows={3}
          className="text-sm"
        />
      </section>

      <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full sm:w-auto">
        {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Save Voice Settings
      </Button>
    </div>
  );
}
