import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, FileText, Send, Rss, Zap, Target, MousePointerClick, Sparkles, Check, Clock } from 'lucide-react';
import { FaFacebook, FaInstagram } from 'react-icons/fa';

const mockFeeds = [
  { id: '1', name: 'Tech Blog' },
  { id: '2', name: 'Company News' },
];

const objectiveOptions = [
  { value: 'auto', label: 'AI Decides', description: 'Let AI pick the best strategy', icon: Sparkles },
  { value: 'reach', label: 'Reach', description: 'Maximize audience size', icon: Globe },
  { value: 'engagement', label: 'Engagement', description: 'Drive likes & shares', icon: Target },
  { value: 'clicks', label: 'Clicks', description: 'Drive traffic to your site', icon: MousePointerClick },
];

const actionOptions = [
  { value: 'publish_immediate', label: 'Publish immediately', description: 'Post goes live right away', icon: Globe },
  { value: 'publish_optimal', label: 'Optimal time', description: 'Coming soon', icon: Clock, disabled: true },
  { value: 'send_approval', label: 'Send for approval', description: 'Email reviewers first', icon: Send },
  { value: 'draft', label: 'Save as draft', description: 'Manual review later', icon: FileText },
];

// ─── Variation A: Numbered Steps with Left Border Accent ───
function VariationA() {
  const [active, setActive] = useState('source');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(['facebook']);
  const [selectedAction, setSelectedAction] = useState('publish_immediate');
  const [objective, setObjective] = useState('auto');

  const sections = [
    { value: 'source', num: '1', title: 'Content Source', summary: 'All feeds', icon: Rss },
    { value: 'platforms', num: '2', title: 'Platforms & Objective', summary: 'Facebook', icon: Globe },
    { value: 'finalize', num: '3', title: 'Action & Delivery', summary: 'Auto-publish', icon: Zap },
  ];

  return (
    <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'Space Grotesk' }}>
          Variation A: Numbered + Left Border
        </h2>
        <p className="text-sm text-muted-foreground">Numbered steps with colored left accent on active</p>
      </div>

      <div className="px-5 pb-2">
        <Accordion type="single" value={active} onValueChange={(v) => { if (v) setActive(v); }}>
          {sections.map((s) => {
            const isActive = active === s.value;
            const SIcon = s.icon;
            return (
              <AccordionItem
                key={s.value}
                value={s.value}
                className={cn(
                  'border rounded-lg mb-2 transition-all overflow-hidden',
                  isActive ? 'border-primary/30 bg-primary/[0.03] shadow-sm' : 'border-border'
                )}
                style={isActive ? { borderLeftWidth: '3px', borderLeftColor: 'hsl(224 71% 25%)' } : {}}
              >
                <AccordionTrigger className="hover:no-underline px-4 py-3">
                  <div className="flex items-center gap-3 text-left">
                    <span className={cn(
                      'flex items-center justify-center h-7 w-7 rounded-md text-xs font-bold shrink-0',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-foreground/70 border border-border'
                    )}>
                      {s.num}
                    </span>
                    <div>
                      <span className={cn('font-medium text-sm', isActive ? 'text-foreground' : 'text-foreground/80')}>{s.title}</span>
                      {!isActive && (
                        <p className="text-xs text-foreground/50 mt-0.5">{s.summary}</p>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="px-4 pb-3 space-y-4 animate-fade-in">
                    {s.value === 'source' && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-foreground/80 text-xs font-medium uppercase tracking-wide">RSS Feed Filter</Label>
                          <Select defaultValue="all">
                            <SelectTrigger><SelectValue placeholder="All feeds" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All feeds</SelectItem>
                              {mockFeeds.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end">
                          <Button size="sm" onClick={() => setActive('platforms')}>Continue</Button>
                        </div>
                      </>
                    )}
                    {s.value === 'platforms' && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-foreground/80 text-xs font-medium uppercase tracking-wide">Platforms</Label>
                          <div className="flex flex-wrap gap-2">
                            {[{ id: 'facebook', label: 'Facebook', Icon: FaFacebook }, { id: 'instagram', label: 'Instagram', Icon: FaInstagram }].map(p => {
                              const sel = selectedAccounts.includes(p.id);
                              return (
                                <button key={p.id} onClick={() => setSelectedAccounts(sel ? selectedAccounts.filter(x => x !== p.id) : [...selectedAccounts, p.id])}
                                  className={cn('flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all',
                                    sel ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-foreground/60 hover:border-primary/40')}>
                                  {sel && <Check className="h-3 w-3" />}
                                  <p.Icon className="h-3.5 w-3.5" />
                                  <span>{p.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground/80 text-xs font-medium uppercase tracking-wide">Objective</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {objectiveOptions.map(opt => {
                              const sel = objective === opt.value;
                              const O = opt.icon;
                              return (
                                <button key={opt.value} onClick={() => setObjective(opt.value)}
                                  className={cn('flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all',
                                    sel ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:border-primary/30')}>
                                  <div className="flex items-center gap-2">
                                    <O className={cn('h-4 w-4', sel ? 'text-primary' : 'text-foreground/40')} />
                                    <span className={cn('text-sm font-medium', sel ? 'text-primary' : 'text-foreground/80')}>{opt.label}</span>
                                  </div>
                                  <span className="text-xs text-foreground/50">{opt.description}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button size="sm" onClick={() => setActive('finalize')}>Continue</Button>
                        </div>
                      </>
                    )}
                    {s.value === 'finalize' && <FinalizeSection selectedAction={selectedAction} setSelectedAction={setSelectedAction} />}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <Button variant="ghost" size="sm">Cancel</Button>
        <Button size="sm">Create Rule</Button>
      </div>
    </div>
  );
}

// ─── Variation B: Icon Badges with Soft Cards ───
function VariationB() {
  const [active, setActive] = useState('source');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(['facebook']);
  const [selectedAction, setSelectedAction] = useState('publish_immediate');
  const [objective, setObjective] = useState('auto');

  const sections = [
    { value: 'source', title: 'Content Source', summary: 'All feeds', icon: Rss, color: 'hsl(201 100% 35%)' },
    { value: 'platforms', title: 'Platforms & Objective', summary: 'Facebook', icon: Globe, color: 'hsl(142 71% 45%)' },
    { value: 'finalize', title: 'Action & Delivery', summary: 'Auto-publish', icon: Zap, color: 'hsl(38 92% 50%)' },
  ];

  return (
    <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'Space Grotesk' }}>
          Variation B: Colored Icon Badges
        </h2>
        <p className="text-sm text-muted-foreground">Each section gets a unique color badge</p>
      </div>

      <div className="px-5 pb-2">
        <Accordion type="single" value={active} onValueChange={(v) => { if (v) setActive(v); }}>
          {sections.map((s) => {
            const isActive = active === s.value;
            const SIcon = s.icon;
            return (
              <AccordionItem key={s.value} value={s.value} className="border-b last:border-b-0">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3 text-left">
                    <div
                      className="flex items-center justify-center h-8 w-8 rounded-lg shrink-0"
                      style={{
                        backgroundColor: isActive ? s.color : undefined,
                        color: isActive ? 'white' : s.color,
                        border: isActive ? 'none' : `1.5px solid ${s.color}`,
                      }}
                    >
                      <SIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-medium text-sm text-foreground">{s.title}</span>
                      {!isActive && (
                        <p className="text-xs mt-0.5" style={{ color: s.color }}>{s.summary}</p>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 animate-fade-in pb-2 pl-11">
                    {s.value === 'source' && (
                      <>
                        <div className="space-y-2">
                          <Label>RSS Feed Filter</Label>
                          <p className="text-xs text-muted-foreground">Pick a feed or use all</p>
                          <Select defaultValue="all">
                            <SelectTrigger><SelectValue placeholder="All feeds" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All feeds</SelectItem>
                              {mockFeeds.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end">
                          <Button size="sm" onClick={() => setActive('platforms')}>Next →</Button>
                        </div>
                      </>
                    )}
                    {s.value === 'platforms' && (
                      <>
                        <div className="space-y-2">
                          <Label>Platforms</Label>
                          <div className="flex flex-wrap gap-2">
                            {[{ id: 'facebook', label: 'Facebook', Icon: FaFacebook }, { id: 'instagram', label: 'Instagram', Icon: FaInstagram }].map(p => {
                              const sel = selectedAccounts.includes(p.id);
                              return (
                                <button key={p.id} onClick={() => setSelectedAccounts(sel ? selectedAccounts.filter(x => x !== p.id) : [...selectedAccounts, p.id])}
                                  className={cn('flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all',
                                    sel ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-foreground/60 hover:border-primary/40')}>
                                  {sel && <Check className="h-3 w-3" />}
                                  <p.Icon className="h-3.5 w-3.5" />
                                  <span>{p.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Objective</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {objectiveOptions.map(opt => {
                              const sel = objective === opt.value;
                              const O = opt.icon;
                              return (
                                <button key={opt.value} onClick={() => setObjective(opt.value)}
                                  className={cn('flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all',
                                    sel ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:border-primary/30')}>
                                  <div className="flex items-center gap-2">
                                    <O className={cn('h-4 w-4', sel ? 'text-primary' : 'text-foreground/40')} />
                                    <span className={cn('text-sm font-medium', sel ? 'text-primary' : 'text-foreground/80')}>{opt.label}</span>
                                  </div>
                                  <span className="text-xs text-foreground/50">{opt.description}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button size="sm" onClick={() => setActive('finalize')}>Next →</Button>
                        </div>
                      </>
                    )}
                    {s.value === 'finalize' && <FinalizeSection selectedAction={selectedAction} setSelectedAction={setSelectedAction} />}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <Button variant="ghost" size="sm">Cancel</Button>
        <Button size="sm">Create Rule</Button>
      </div>
    </div>
  );
}

// ─── Variation C: Minimal with Check Circles ───
function VariationC() {
  const [active, setActive] = useState('source');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(['facebook']);
  const [selectedAction, setSelectedAction] = useState('publish_immediate');
  const [objective, setObjective] = useState('auto');

  const sections = [
    { value: 'source', title: 'Content Source', summary: 'All feeds' },
    { value: 'platforms', title: 'Platforms & Objective', summary: 'Facebook' },
    { value: 'finalize', title: 'Action & Delivery', summary: 'Auto-publish' },
  ];

  const isCompleted = (val: string) => {
    const order = ['source', 'platforms', 'finalize'];
    return order.indexOf(val) < order.indexOf(active);
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'Space Grotesk' }}>
          Variation C: Minimal + Check Circles
        </h2>
        <p className="text-sm text-muted-foreground">Clean lines with completion indicators</p>
      </div>

      <div className="px-5 pb-2">
        <Accordion type="single" value={active} onValueChange={(v) => { if (v) setActive(v); }}>
          {sections.map((s) => {
            const isActive = active === s.value;
            const done = isCompleted(s.value);
            return (
              <AccordionItem key={s.value} value={s.value} className="border-b last:border-b-0">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3 text-left">
                    <div className={cn(
                      'flex items-center justify-center h-6 w-6 rounded-full shrink-0 border-2 transition-all',
                      isActive && 'border-primary bg-primary text-primary-foreground',
                      done && 'border-primary bg-primary text-primary-foreground',
                      !isActive && !done && 'border-foreground/20 text-transparent'
                    )}>
                      {done ? <Check className="h-3 w-3" /> : isActive ? <div className="h-2 w-2 rounded-full bg-primary-foreground" /> : null}
                    </div>
                    <div>
                      <span className={cn(
                        'text-sm font-medium transition-colors',
                        isActive ? 'text-foreground' : done ? 'text-foreground/70' : 'text-foreground/50'
                      )}>
                        {s.title}
                      </span>
                      {!isActive && (
                        <p className={cn('text-xs mt-0.5', done ? 'text-primary' : 'text-foreground/40')}>{s.summary}</p>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 animate-fade-in pb-2 ml-9">
                    {s.value === 'source' && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-sm text-foreground/70">RSS Feed Filter</Label>
                          <Select defaultValue="all">
                            <SelectTrigger><SelectValue placeholder="All feeds" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All feeds</SelectItem>
                              {mockFeeds.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end">
                          <Button size="sm" variant="outline" onClick={() => setActive('platforms')}>
                            Continue
                          </Button>
                        </div>
                      </>
                    )}
                    {s.value === 'platforms' && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-sm text-foreground/70">Platforms</Label>
                          <div className="flex flex-wrap gap-2">
                            {[{ id: 'facebook', label: 'Facebook', Icon: FaFacebook }, { id: 'instagram', label: 'Instagram', Icon: FaInstagram }].map(p => {
                              const sel = selectedAccounts.includes(p.id);
                              return (
                                <button key={p.id} onClick={() => setSelectedAccounts(sel ? selectedAccounts.filter(x => x !== p.id) : [...selectedAccounts, p.id])}
                                  className={cn('flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all',
                                    sel ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-foreground/60 hover:border-primary/40')}>
                                  {sel && <Check className="h-3 w-3" />}
                                  <p.Icon className="h-3.5 w-3.5" />
                                  <span>{p.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm text-foreground/70">Objective</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {objectiveOptions.map(opt => {
                              const sel = objective === opt.value;
                              const O = opt.icon;
                              return (
                                <button key={opt.value} onClick={() => setObjective(opt.value)}
                                  className={cn('flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all',
                                    sel ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:border-primary/30')}>
                                  <div className="flex items-center gap-2">
                                    <O className={cn('h-4 w-4', sel ? 'text-primary' : 'text-foreground/40')} />
                                    <span className={cn('text-sm font-medium', sel ? 'text-primary' : 'text-foreground/80')}>{opt.label}</span>
                                  </div>
                                  <span className="text-xs text-foreground/50">{opt.description}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button size="sm" variant="outline" onClick={() => setActive('finalize')}>Continue</Button>
                        </div>
                      </>
                    )}
                    {s.value === 'finalize' && <FinalizeSection selectedAction={selectedAction} setSelectedAction={setSelectedAction} />}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <Button variant="ghost" size="sm">Cancel</Button>
        <Button size="sm">Create Rule</Button>
      </div>
    </div>
  );
}

// ─── Shared Finalize Section ───
function FinalizeSection({ selectedAction, setSelectedAction }: { selectedAction: string; setSelectedAction: (v: string) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label>Action</Label>
        <div className="grid gap-2">
          {actionOptions.map(opt => {
            const selected = selectedAction === opt.value;
            const OptIcon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={opt.disabled}
                onClick={() => !opt.disabled && setSelectedAction(opt.value)}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-3 text-left transition-all',
                  selected ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:border-primary/30',
                  opt.disabled && 'opacity-50 cursor-not-allowed hover:border-border hover:bg-transparent'
                )}
              >
                <div className={cn(
                  'flex items-center justify-center h-8 w-8 rounded-lg shrink-0',
                  selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground/50'
                )}>
                  <OptIcon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className={cn('text-sm font-medium', selected ? 'text-foreground' : 'text-foreground/80')}>{opt.label}</div>
                  <div className="text-xs text-foreground/50">{opt.description}</div>
                </div>
                {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Rule Name</Label>
        <Input defaultValue="Auto-publish Facebook posts from all feeds" />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div>
          <Label className="text-sm">Active</Label>
          <p className="text-xs text-foreground/50">Enable this rule immediately</p>
        </div>
        <Switch defaultChecked />
      </div>
    </>
  );
}

// ─── Main Comparison Page ───
export default function WizardVariations() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: 'Space Grotesk' }}>
          Wizard Variations
        </h1>
        <p className="text-muted-foreground mb-8">Compare three accordion styles side by side. Click through each to test interactions.</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <VariationA />
          <VariationB />
          <VariationC />
        </div>
      </div>
    </div>
  );
}
