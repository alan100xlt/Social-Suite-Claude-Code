import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { AutomationRule } from '@/hooks/useAutomationRules';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Settings2, ChevronDown } from 'lucide-react';
import { FeedRuleBreakdown } from './FeedRuleBreakdown';

export interface FeedFormValues {
  name: string;
  url: string;
  enableScraping: boolean;
  selectedRuleId: string; // 'none' | 'new' | rule.id
}

interface FeedFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  initialValues: FeedFormValues;
  onSubmit: (values: FeedFormValues) => Promise<void>;
  isPending: boolean;
  submitLabel: string;
  rules: AutomationRule[] | undefined;
  accounts: { id: string; platform: string; displayName?: string; username: string }[];
}

export function FeedFormDialog({
  open,
  onOpenChange,
  title,
  description,
  initialValues,
  onSubmit,
  isPending,
  submitLabel,
  rules,
  accounts,
}: FeedFormDialogProps) {
  const [name, setName] = useState(initialValues.name);
  const [url, setUrl] = useState(initialValues.url);
  const [enableScraping, setEnableScraping] = useState(initialValues.enableScraping);
  const [selectedRuleId, setSelectedRuleId] = useState(initialValues.selectedRuleId);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Reset form when dialog opens with new values
  useEffect(() => {
    if (open) {
      setName(initialValues.name);
      setUrl(initialValues.url);
      setEnableScraping(initialValues.enableScraping);
      setSelectedRuleId(initialValues.selectedRuleId);
      setAdvancedOpen(false);
    }
  }, [open, initialValues.name, initialValues.url, initialValues.enableScraping, initialValues.selectedRuleId]);

  const selectedRule = rules?.find(r => r.id === selectedRuleId);

  const handleSubmit = async () => {
    await onSubmit({ name, url, enableScraping, selectedRuleId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="feedName">Feed Name</Label>
            <Input id="feedName" placeholder="My Blog Feed" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedUrl">Feed URL</Label>
            <Input id="feedUrl" type="url" placeholder="https://example.com/feed.xml" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>

          {/* Automation Rule Selection */}
          <div className="space-y-2">
            <Label>Automation Rule</Label>
            <p className="text-xs text-muted-foreground">
              Choose how new articles from this feed should be handled
            </p>
            <Select value={selectedRuleId} onValueChange={setSelectedRuleId}>
              <SelectTrigger>
                <SelectValue placeholder="No automation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No automation — just collect articles</SelectItem>
                {rules?.map(rule => (
                  <SelectItem key={rule.id} value={rule.id}>
                    {rule.name}
                  </SelectItem>
                ))}
                <SelectItem value="new">+ Create new automation rule</SelectItem>
              </SelectContent>
            </Select>

            {/* Rule breakdown preview */}
            {selectedRule && (
              <FeedRuleBreakdown rule={selectedRule} accounts={accounts} />
            )}
          </div>

          {/* Advanced Options */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground px-0">
                <span className="flex items-center gap-2 text-sm"><Settings2 className="h-4 w-4" />Advanced Options</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                <Checkbox
                  id="enableScraping"
                  checked={enableScraping}
                  onCheckedChange={(checked) => setEnableScraping(checked === true)}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <Label htmlFor="enableScraping" className="text-sm font-medium cursor-pointer">Enable content scraping</Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong>Only enable this if you know what you're doing.</strong> This will scrape each article's page to extract full content using AI. 
                    Most RSS feeds already provide enough content for quality post generation. 
                    Only enable if your feed descriptions are very short or incomplete.
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || !name.trim() || !url.trim()}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
