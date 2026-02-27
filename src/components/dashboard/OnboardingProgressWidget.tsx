import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStatus, useCompleteOnboarding } from '@/hooks/useOnboardingStatus';
import { useCompany } from '@/hooks/useCompany';
import { useAccounts } from '@/hooks/useGetLateAccounts';
import { useVoiceSettings } from '@/hooks/useVoiceSettings';
import { useAutomationRules } from '@/hooks/useAutomationRules';
import { useRssFeeds } from '@/hooks/useRssFeeds';
import { InviteUserDialog } from '@/components/company/InviteUserDialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { posthog } from '@/lib/posthog';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle, Circle, Plug, Volume2, Zap, Rss,
  UserPlus, Building2, X, ChevronDown, PartyPopper,
} from 'lucide-react';

interface Step {
  id: string;
  label: string;
  description: string;
  cta: string;
  icon: React.ReactNode;
  completed: boolean;
  href?: string;
  action?: () => void;
  required: boolean;
}

/* ── Segmented progress dots ── */
function SegmentedProgress({ total, completed }: { total: number; completed: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => {
        const isDone = i < completed;
        const isCurrent = i === completed;
        return (
          <motion.div
            key={i}
            className={`h-2 flex-1 rounded-full transition-colors ${
              isDone
                ? 'bg-primary'
                : isCurrent
                  ? 'bg-primary/40'
                  : 'bg-muted'
            }`}
            {...(isDone && {
              initial: { scaleX: 0.6, opacity: 0.5 },
              animate: { scaleX: 1, opacity: 1 },
              transition: { duration: 0.3 },
            })}
            {...(isCurrent && {
              animate: { opacity: [0.4, 0.7, 0.4] },
              transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
            })}
          />
        );
      })}
    </div>
  );
}

export function OnboardingProgressWidget() {
  const navigate = useNavigate();
  const { data: status } = useOnboardingStatus();
  const { data: company } = useCompany();
  const { data: accounts } = useAccounts();
  const { data: voiceSettings } = useVoiceSettings();
  const { data: automationRules } = useAutomationRules();
  const { data: feeds } = useRssFeeds();
  const completeOnboarding = useCompleteOnboarding();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('onboarding-widget-dismissed') === 'true');
  const [collapsed, setCollapsed] = useState(() => sessionStorage.getItem('onboarding-widget-collapsed') === 'true');
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    sessionStorage.setItem('onboarding-widget-dismissed', 'true');
    setDismissed(true);
  };

  const handleCollapseChange = (open: boolean) => {
    const isCollapsed = !open;
    sessionStorage.setItem('onboarding-widget-collapsed', String(isCollapsed));
    setCollapsed(isCollapsed);
  };

  // Don't show if onboarding is complete or dismissed
  if (!status || status.onboarding_status === 'complete' || dismissed) return null;
  if (status.onboarding_status !== 'in_progress' && status.onboarding_status !== 'wizard_complete') return null;

  const hasSocials = (accounts?.length || 0) > 0;
  const hasVoice = voiceSettings?.voice_mode !== 'default';
  const hasAutomation = (automationRules?.length || 0) > 0 && automationRules?.some(r => r.is_active);
  const hasFeeds = (feeds?.length || 0) > 0;

  const steps: Step[] = [
    { id: 'socials', label: 'Connect social accounts', description: 'Link your Facebook, Instagram, or LinkedIn pages to start publishing.', cta: 'Connect accounts', icon: <Plug className="w-4 h-4" />, completed: hasSocials, href: '/app/connections', required: true },
    { id: 'voice', label: 'Setup brand voice', description: 'Define your tone and style so AI-generated content sounds like you.', cta: 'Configure voice', icon: <Volume2 className="w-4 h-4" />, completed: hasVoice, href: '/app/settings?tab=voice', required: true },
    { id: 'automation', label: 'Setup automation', description: 'Create rules to automatically generate posts from new articles.', cta: 'Create automation', icon: <Zap className="w-4 h-4" />, completed: hasAutomation, href: '/app/automations', required: true },
    { id: 'feeds', label: 'Review RSS feeds', description: 'Check and manage the content sources feeding your pipeline.', cta: 'Manage feeds', icon: <Rss className="w-4 h-4" />, completed: hasFeeds, href: '/app/content', required: false },
    { id: 'company', label: 'Review company info', description: 'Verify your company name, logo, and details are correct.', cta: 'Review settings', icon: <Building2 className="w-4 h-4" />, completed: false, href: '/app/settings?tab=company', required: false },
    { id: 'invite', label: 'Invite team members', description: 'Bring your team on board to collaborate on content.', cta: 'Send invites', icon: <UserPlus className="w-4 h-4" />, completed: false, action: () => setInviteOpen(true), required: false },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const allRequiredDone = steps.filter(s => s.required).every(s => s.completed);

  // Default expanded step = first incomplete
  const firstIncomplete = steps.find(s => !s.completed);
  const activeExpanded = expandedStep ?? firstIncomplete?.id ?? null;

  const handleMarkComplete = () => {
    posthog.capture('onboarding_marked_complete', {
      completedSteps: steps.filter(s => s.completed).map(s => s.id),
      skippedSteps: steps.filter(s => !s.completed).map(s => s.id),
    });
    completeOnboarding.mutate();
  };

  const handleStepClick = (step: Step) => {
    if (step.completed) return;
    setExpandedStep(prev => (prev === step.id ? null : step.id));
  };

  const handleStepAction = (step: Step) => {
    if (step.action) step.action();
    else if (step.href) navigate(step.href);
  };

  return (
    <>
      <Card className="border-primary/20 bg-primary/5 overflow-hidden">
        <Collapsible open={!collapsed} onOpenChange={(open) => handleCollapseChange(open)}>
          {/* ── Header ── */}
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center gap-3 p-4 sm:p-5 text-left group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground text-sm">Setup guide</h3>
                  <span className="text-xs text-muted-foreground">
                    {completedCount} of {steps.length} tasks complete
                  </span>
                </div>
                <SegmentedProgress total={steps.length} completed={completedCount} />
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${!collapsed ? 'rotate-180' : ''}`} />
              <span
                role="button"
                tabIndex={0}
                onClick={handleDismiss}
                onKeyDown={(e) => e.key === 'Enter' && handleDismiss(e as any)}
                className="p-1 rounded-md hover:bg-background/60 text-muted-foreground hover:text-foreground transition-colors"
                title="Dismiss for this session"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            </button>
          </CollapsibleTrigger>

          {/* ── Content ── */}
          <CollapsibleContent>
            <div className="px-4 sm:px-5 pb-4 sm:pb-5">
              {/* Celebration state */}
              {allRequiredDone ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center py-6 gap-3 text-center"
                >
                  <PartyPopper className="w-8 h-8 text-primary" />
                  <p className="font-semibold text-foreground">You're all set!</p>
                  <p className="text-xs text-muted-foreground max-w-xs">All required steps are complete. You can finish the remaining optional steps or dismiss this guide.</p>
                  <Button size="sm" onClick={handleMarkComplete}>Dismiss guide</Button>
                </motion.div>
              ) : (
                <>
                  {/* Step list */}
                  <div className="space-y-0.5">
                    {steps.map(step => {
                      const isExpanded = activeExpanded === step.id && !step.completed;
                      return (
                        <div key={step.id}>
                          <button
                            onClick={() => handleStepClick(step)}
                            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                              isExpanded ? 'bg-background/80' : 'hover:bg-background/50'
                            } ${step.completed ? 'cursor-default' : 'cursor-pointer'}`}
                          >
                            {step.completed ? (
                              <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                              >
                                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                              </motion.div>
                            ) : (
                              <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                            )}
                            <span className="flex-shrink-0">{step.icon}</span>
                            <span className={`text-sm flex-1 ${step.completed ? 'text-muted-foreground line-through' : 'text-foreground font-medium'}`}>
                              {step.label}
                            </span>
                            {!step.required && (
                              <span className="text-[10px] text-muted-foreground/60">optional</span>
                            )}
                          </button>

                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                <div className="pl-[3.25rem] pr-3 pb-3 pt-1">
                                  <p className="text-xs text-muted-foreground mb-3">{step.description}</p>
                                  <Button size="sm" onClick={() => handleStepAction(step)}>
                                    {step.cta}
                                  </Button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-end mt-3 pt-3 border-t border-border/50">
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleMarkComplete}>
                      Skip setup
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {company && (
        <InviteUserDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          companyId={company.id}
          companyName={company.name}
        />
      )}
    </>
  );
}
