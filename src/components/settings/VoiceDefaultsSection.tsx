import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Save, Volume2 } from 'lucide-react';
import { useGlobalVoiceDefaults, useSaveGlobalVoiceDefaults, GlobalVoiceDefaults } from '@/hooks/useGlobalVoiceDefaults';

const TONE_OPTIONS = [
  { value: 'neutral', label: 'Neutral / Professional', persona: 'The Anchor', desc: 'Objective, trustworthy, journalistic' },
  { value: 'friendly', label: 'Friendly / Local', persona: 'The Neighbor', desc: 'Inviting, community-focused, warm' },
  { value: 'urgent', label: 'Urgent / Alert', persona: 'The Town Crier', desc: 'Breaking news, scroll-stopping, urgent' },
  { value: 'engagement', label: 'Conversation Starter', persona: 'The Instigator', desc: 'Question-driven, comment-boosting, engaging' },
];

export function VoiceDefaultsSection() {
  const { data: defaults, isLoading } = useGlobalVoiceDefaults();
  const saveMutation = useSaveGlobalVoiceDefaults();

  const [form, setForm] = useState<Omit<GlobalVoiceDefaults, 'id'>>({
    tone: 'neutral',
    content_length: 'standard',
    emoji_style: 'contextual',
    hashtag_strategy: 'smart',
    brand_tags: [],
    extract_locations: false,
    custom_instructions: null,
  });

  useEffect(() => {
    if (defaults) {
      setForm({
        tone: defaults.tone,
        content_length: defaults.content_length,
        emoji_style: defaults.emoji_style,
        hashtag_strategy: defaults.hashtag_strategy,
        brand_tags: defaults.brand_tags || [],
        extract_locations: defaults.extract_locations,
        custom_instructions: defaults.custom_instructions,
      });
    }
  }, [defaults]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const showBrandTags = form.hashtag_strategy === 'brand_only' || form.hashtag_strategy === 'smart_and_brand';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-primary" />
          <CardTitle>Voice Defaults</CardTitle>
        </div>
        <CardDescription>
          These are the system-wide default voice settings used when a company selects "Default" mode.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tone */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Tone / Persona</Label>
          <RadioGroup value={form.tone} onValueChange={(v) => setForm(p => ({ ...p, tone: v }))}>
            <div className="grid gap-3 sm:grid-cols-2">
              {TONE_OPTIONS.map(opt => (
                <label key={opt.value} className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${form.tone === opt.value ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/30'}`}>
                  <RadioGroupItem value={opt.value} className="mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.persona} — {opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </RadioGroup>
        </div>

        {/* Content Length */}
        <div className="space-y-2">
          <Label>Content Length</Label>
          <Select value={form.content_length} onValueChange={(v) => setForm(p => ({ ...p, content_length: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="headline">Headline Only</SelectItem>
              <SelectItem value="bullets">Bullet List</SelectItem>
              <SelectItem value="standard">Standard Summary</SelectItem>
              <SelectItem value="full">Full Post</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Emoji Style */}
        <div className="space-y-2">
          <Label>Emoji Style</Label>
          <Select value={form.emoji_style} onValueChange={(v) => setForm(p => ({ ...p, emoji_style: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Emojis</SelectItem>
              <SelectItem value="minimalist">Minimalist</SelectItem>
              <SelectItem value="contextual">Smart / Contextual</SelectItem>
              <SelectItem value="heavy">Heavy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Hashtag Strategy */}
        <div className="space-y-2">
          <Label>Hashtag Strategy</Label>
          <Select value={form.hashtag_strategy} onValueChange={(v) => setForm(p => ({ ...p, hashtag_strategy: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="smart">Smart Tags</SelectItem>
              <SelectItem value="brand_only">Brand Tags Only</SelectItem>
              <SelectItem value="smart_and_brand">Smart + Brand Tags</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showBrandTags && (
          <div className="space-y-2">
            <Label>Fixed Brand Tags</Label>
            <Input
              value={(form.brand_tags || []).join(', ')}
              onChange={(e) => setForm(p => ({ ...p, brand_tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
              placeholder="#YourBrand, #AlwaysInclude"
            />
            <p className="text-xs text-muted-foreground">Comma-separated tags that will always be included</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Switch checked={form.extract_locations} onCheckedChange={(v) => setForm(p => ({ ...p, extract_locations: v }))} />
          <Label>Extract location hashtags from content</Label>
        </div>

        <div className="space-y-2">
          <Label>Custom Instructions</Label>
          <Textarea
            value={form.custom_instructions || ''}
            onChange={(e) => setForm(p => ({ ...p, custom_instructions: e.target.value || null }))}
            placeholder="Any additional guidance for AI content generation..."
            rows={3}
          />
        </div>

        <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Voice Defaults
        </Button>
      </CardContent>
    </Card>
  );
}
