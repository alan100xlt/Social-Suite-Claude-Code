import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Zap, Trash2 } from 'lucide-react';
import { useInboxAutoRules, useCreateAutoRule, useUpdateAutoRule, useDeleteAutoRule } from '@/hooks/useInboxAutomationRules';
import { useInboxCannedReplies } from '@/hooks/useInboxLabels';
import type { AutoRuleTriggerType, AutoRuleActionType, InboxAutoRule } from '@/lib/api/inbox';

interface RuleFormData {
  name: string;
  trigger_type: AutoRuleTriggerType;
  trigger_value: string;
  trigger_platform: string;
  trigger_conversation_type: string;
  action_type: AutoRuleActionType;
  canned_reply_id: string;
  ai_prompt_template: string;
}

const emptyForm: RuleFormData = {
  name: '',
  trigger_type: 'keyword',
  trigger_value: '',
  trigger_platform: '',
  trigger_conversation_type: '',
  action_type: 'canned_reply',
  canned_reply_id: '',
  ai_prompt_template: '',
};

export function AutomationRulesManager() {
  const { data: rules = [] } = useInboxAutoRules();
  const { data: cannedReplies = [] } = useInboxCannedReplies();
  const createRule = useCreateAutoRule();
  const updateRule = useUpdateAutoRule();
  const deleteRule = useDeleteAutoRule();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<RuleFormData>(emptyForm);

  const handleSave = () => {
    if (!form.name.trim()) return;
    createRule.mutate({
      name: form.name,
      enabled: true,
      trigger_type: form.trigger_type,
      trigger_value: form.trigger_value || null,
      trigger_platform: form.trigger_platform || null,
      trigger_conversation_type: form.trigger_conversation_type || null,
      action_type: form.action_type,
      canned_reply_id: form.canned_reply_id || null,
      ai_prompt_template: form.ai_prompt_template || null,
    }, {
      onSuccess: () => {
        setForm(emptyForm);
        setFormOpen(false);
      },
    });
  };

  const handleToggle = (rule: InboxAutoRule) => {
    updateRule.mutate({ id: rule.id, enabled: !rule.enabled });
  };

  const handleDelete = (id: string) => {
    deleteRule.mutate(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Automation Rules</h3>
          <p className="text-xs text-muted-foreground">Auto-respond to messages based on triggers.</p>
        </div>

        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-7 text-xs gap-1">
              <Plus className="h-3.5 w-3.5" />
              New Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Automation Rule</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <label className="text-xs font-medium">Rule Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Auto-reply to pricing questions"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Trigger Type</label>
                  <Select value={form.trigger_type} onValueChange={(v) => setForm(f => ({ ...f, trigger_type: v as AutoRuleTriggerType }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keyword">Keyword match</SelectItem>
                      <SelectItem value="regex">Regex pattern</SelectItem>
                      <SelectItem value="sentiment">Sentiment</SelectItem>
                      <SelectItem value="all_new">All new messages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium">Action Type</label>
                  <Select value={form.action_type} onValueChange={(v) => setForm(f => ({ ...f, action_type: v as AutoRuleActionType }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="canned_reply">Canned Reply</SelectItem>
                      <SelectItem value="ai_response">AI Response</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.trigger_type !== 'all_new' && (
                <div>
                  <label className="text-xs font-medium">
                    {form.trigger_type === 'keyword' ? 'Keywords (comma-separated)' :
                     form.trigger_type === 'regex' ? 'Regex Pattern' :
                     'Sentiment (positive/negative/neutral)'}
                  </label>
                  <Input
                    value={form.trigger_value}
                    onChange={(e) => setForm(f => ({ ...f, trigger_value: e.target.value }))}
                    placeholder={
                      form.trigger_type === 'keyword' ? 'pricing, cost, price' :
                      form.trigger_type === 'regex' ? '(?i)how much|price|cost' :
                      'negative'
                    }
                    className="mt-1"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Platform filter</label>
                  <Select value={form.trigger_platform || 'all'} onValueChange={(v) => setForm(f => ({ ...f, trigger_platform: v === 'all' ? '' : v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All platforms</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="twitter">Twitter/X</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">Conversation type</label>
                  <Select value={form.trigger_conversation_type || 'all'} onValueChange={(v) => setForm(f => ({ ...f, trigger_conversation_type: v === 'all' ? '' : v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="comment">Comments</SelectItem>
                      <SelectItem value="dm">DMs</SelectItem>
                      <SelectItem value="review">Reviews</SelectItem>
                      <SelectItem value="mention">Mentions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.action_type === 'canned_reply' ? (
                <div>
                  <label className="text-xs font-medium">Canned Reply</label>
                  <Select value={form.canned_reply_id} onValueChange={(v) => setForm(f => ({ ...f, canned_reply_id: v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a canned reply" />
                    </SelectTrigger>
                    <SelectContent>
                      {cannedReplies.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium">AI Prompt Template</label>
                  <Textarea
                    value={form.ai_prompt_template}
                    onChange={(e) => setForm(f => ({ ...f, ai_prompt_template: e.target.value }))}
                    placeholder="You are a helpful customer service agent. Respond to the following message professionally and concisely."
                    className="mt-1 min-h-[60px]"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={!form.name.trim() || createRule.isPending}>
                  Create Rule
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No automation rules yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule: InboxAutoRule) => (
            <div key={rule.id} className="flex items-center gap-3 p-3 rounded-md border bg-background">
              <Switch
                checked={rule.enabled}
                onCheckedChange={() => handleToggle(rule)}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{rule.name}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">{rule.trigger_type.replace('_', ' ')}</Badge>
                  <Badge variant="secondary" className="text-[10px] capitalize">{rule.action_type.replace('_', ' ')}</Badge>
                </div>
                {rule.trigger_value && (
                  <p className="text-xs text-muted-foreground mt-0.5">{rule.trigger_value}</p>
                )}
              </div>

              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(rule.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
