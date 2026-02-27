import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutomationRules, AutomationRule } from '@/hooks/useAutomationRules';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Zap, Pencil, Loader2, CheckCircle2, XCircle, ArrowRight, FileText, Send, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface AutomationPickerDialogProps {
  articleId: string;
  articleTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

type ProgressStep = {
  step: string;
  message: string;
  action?: string;
  draftId?: string;
  platforms?: string[];
};

const stepOrder = ['loading', 'strategy', 'strategy_done', 'posts', 'posts_done', 'action', 'complete'];

function getProgressPercent(step: string) {
  const idx = stepOrder.indexOf(step);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / stepOrder.length) * 100);
}

const actionLabels: Record<string, { label: string; icon: React.ElementType }> = {
  publish: { label: 'Auto-publish', icon: Globe },
  draft: { label: 'Save as Draft', icon: FileText },
  send_approval: { label: 'Send for Approval', icon: Send },
};

export function AutomationPickerDialog({ articleId, articleTitle, open, onOpenChange, onComplete }: AutomationPickerDialogProps) {
  const navigate = useNavigate();
  const { data: rules, isLoading } = useAutomationRules();
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [result, setResult] = useState<ProgressStep | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeRules = rules?.filter(r => r.is_active) || [];

  const handleRunAutomation = async (rule: AutomationRule) => {
    setRunning(true);
    setSteps([]);
    setCurrentStep('loading');
    setResult(null);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-automation-article`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ articleId, ruleId: rule.id }),
        }
      );

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6)) as ProgressStep;
            setSteps(prev => [...prev, data]);
            setCurrentStep(data.step);

            if (data.step === 'complete') {
              setResult(data);
            } else if (data.step === 'error') {
              setError(data.message);
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setRunning(false);
    }
  };

  const handleCustom = () => {
    onOpenChange(false);
    navigate(`/app/posts?tab=compose&article=${articleId}`);
  };

  const handleClose = () => {
    if (!running) {
      setSteps([]);
      setCurrentStep('');
      setResult(null);
      setError(null);
      onOpenChange(false);
      if (result) onComplete?.();
    }
  };

  const isProcessing = running || !!result || !!error;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isProcessing ? 'Running Automation' : 'Create Post'}</DialogTitle>
        </DialogHeader>

        {!isProcessing ? (
          <div className="space-y-1 py-2">
            <p className="text-sm text-muted-foreground mb-3">
              Choose an automation rule or create a custom post for "<span className="font-medium text-foreground">{articleTitle}</span>"
            </p>

            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {activeRules.map((rule) => {
                  const actionInfo = actionLabels[rule.action] || actionLabels.draft;
                  const ActionIcon = actionInfo.icon;
                  return (
                    <button
                      key={rule.id}
                      onClick={() => handleRunAutomation(rule)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left group"
                    >
                      <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                        <Zap className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{rule.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <ActionIcon className="h-3 w-3" />
                          {actionInfo.label}
                          {rule.objective !== 'auto' && <> · {rule.objective}</>}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}

                {activeRules.length > 0 && (
                  <div className="border-t border-border my-2" />
                )}

                <button
                  onClick={handleCustom}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left group"
                >
                  <div className="p-1.5 rounded-md bg-secondary text-foreground">
                    <Pencil className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Custom</p>
                    <p className="text-xs text-muted-foreground">Manually compose your social post</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Progress bar */}
            {!result && !error && (
              <Progress value={getProgressPercent(currentStep)} className="h-2" />
            )}

            {/* Steps list */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {steps.map((s, i) => {
                const isLast = i === steps.length - 1;
                const isPastStep = !isLast && s.step !== 'error' && s.step !== 'complete';
                return (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center gap-2 text-sm',
                      s.step === 'error' ? 'text-destructive' : s.step === 'complete' ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {s.step === 'error' ? (
                      <XCircle className="h-4 w-4 flex-shrink-0" />
                    ) : s.step === 'complete' || s.step.endsWith('_done') || isPastStep ? (
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                    ) : (
                      <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin" />
                    )}
                    <span>{s.message}</span>
                  </div>
                );
              })}
              {running && !error && !result && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Processing...</span>
                </div>
              )}
            </div>

            {/* Result actions */}
            {result && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                {result.draftId && (
                  <Button
                    size="sm"
                    onClick={() => {
                      handleClose();
                      navigate(`/app/posts?tab=compose&draft=${result.draftId}`);
                    }}
                  >
                    View Draft
                  </Button>
                )}
                {result.action === 'send_approval' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      handleClose();
                      navigate(`/app/posts?tab=compose`);
                    }}
                  >
                    View Posts
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={handleClose}>
                  Close
                </Button>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button size="sm" variant="outline" onClick={handleClose}>
                  Close
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
