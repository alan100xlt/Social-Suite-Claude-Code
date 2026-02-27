import { AutomationRule } from '@/hooks/useAutomationRules';
import { Badge } from '@/components/ui/badge';
import { Globe, FileText, Send, Clock, Sparkles, Target, MousePointerClick } from 'lucide-react';

interface FeedRuleBreakdownProps {
  rule: AutomationRule;
  accounts: { id: string; platform: string; displayName?: string; username: string }[];
}

const objectiveLabels: Record<string, { label: string; icon: React.ElementType }> = {
  auto: { label: 'AI Decides', icon: Sparkles },
  reach: { label: 'Reach', icon: Globe },
  engagement: { label: 'Engagement', icon: Target },
  clicks: { label: 'Clicks', icon: MousePointerClick },
};

const actionLabels: Record<string, { label: string; icon: React.ElementType }> = {
  publish: { label: 'Auto-publish', icon: Globe },
  send_approval: { label: 'Send for approval', icon: Send },
  draft: { label: 'Save as draft', icon: FileText },
};

export function FeedRuleBreakdown({ rule, accounts }: FeedRuleBreakdownProps) {
  const actionInfo = actionLabels[rule.action] || { label: rule.action, icon: Globe };
  const objectiveInfo = objectiveLabels[rule.objective] || { label: rule.objective, icon: Sparkles };
  const ActionIcon = actionInfo.icon;
  const ObjectiveIcon = objectiveInfo.icon;

  const selectedAccounts = accounts.filter(a => rule.account_ids.includes(a.id));
  const platformNames = [...new Set(selectedAccounts.map(a => a.platform))]
    .map(p => p.charAt(0).toUpperCase() + p.slice(1));

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-xs">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-foreground/70">
          <ActionIcon className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium">{actionInfo.label}</span>
        </div>
        <div className="flex items-center gap-1.5 text-foreground/70">
          <ObjectiveIcon className="h-3.5 w-3.5 text-primary" />
          <span>{objectiveInfo.label}</span>
        </div>
        {rule.scheduling === 'optimal' && (
          <div className="flex items-center gap-1.5 text-foreground/70">
            <Clock className="h-3.5 w-3.5" />
            <span>Optimal timing</span>
          </div>
        )}
      </div>
      {platformNames.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-muted-foreground">Platforms:</span>
          {platformNames.map(p => (
            <Badge key={p} variant="secondary" className="text-[10px] py-0 h-5">{p}</Badge>
          ))}
        </div>
      )}
      {rule.action === 'send_approval' && rule.approval_emails.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-muted-foreground">Approvers:</span>
          <span className="text-foreground/70">{rule.approval_emails.join(', ')}</span>
        </div>
      )}
      {!rule.is_active && (
        <Badge variant="outline" className="text-[10px] py-0 h-5 text-amber-600 border-amber-300">Rule is paused</Badge>
      )}
    </div>
  );
}
