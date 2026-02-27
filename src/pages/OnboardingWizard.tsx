import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompany';
import { useUpdateOnboardingStep, useFinishWizard } from '@/hooks/useOnboardingStatus';
import { posthog } from '@/lib/posthog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { InviteUserDialog } from '@/components/company/InviteUserDialog';
import { ConnectSocialsStep } from '@/components/onboarding/steps/ConnectSocialsStep';
import { BrandVoiceStep } from '@/components/onboarding/steps/BrandVoiceStep';
import { AutomationStep } from '@/components/onboarding/steps/AutomationStep';
import { Check, ChevronRight, SkipForward, UserPlus, Loader2 } from 'lucide-react';

const STEPS = [
  { id: 'socials', label: 'Connect Accounts', number: 1 },
  { id: 'voice', label: 'Brand Voice', number: 2 },
  { id: 'automation', label: 'Setup Automation', number: 3 },
];

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: company, isLoading: companyLoading } = useCompany();
  const updateStep = useUpdateOnboardingStep();
  const finishWizard = useFinishWizard();

  const [currentStep, setCurrentStep] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [wizardStartTime] = useState(Date.now());

  // Track wizard start
  useEffect(() => {
    if (company?.id) {
      posthog.capture('onboarding_wizard_started', { companyId: company.id, step: currentStep });
    }
  }, [company?.id]);

  // Track step views
  useEffect(() => {
    posthog.capture('onboarding_wizard_step_viewed', {
      step: currentStep,
      stepName: STEPS[currentStep]?.id,
    });
  }, [currentStep]);

  const handleNext = (skipped = false) => {
    posthog.capture('onboarding_wizard_step_completed', {
      step: currentStep,
      stepName: STEPS[currentStep]?.id,
      skipped,
    });

    if (currentStep < STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      updateStep.mutate(nextStep);
    } else {
      // Wizard complete
      finishWizard.mutate(undefined, {
        onSuccess: () => {
          posthog.capture('onboarding_wizard_completed', {
            companyId: company?.id,
            totalTimeSeconds: Math.round((Date.now() - wizardStartTime) / 1000),
          });
          navigate('/app');
        },
      });
    }
  };

  const handleSkip = () => handleNext(true);

  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

  if (companyLoading || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-bold text-foreground">Setup {company.name}</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInviteOpen(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Invite colleague</span>
              <span className="sm:hidden">Invite</span>
            </Button>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-1 mb-2">
            {STEPS.map((step, i) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      i < currentStep
                        ? 'bg-primary text-primary-foreground'
                        : i === currentStep
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {i < currentStep ? <Check className="w-3.5 h-3.5" /> : step.number}
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:block ${
                      i <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 mx-1" />
                )}
              </div>
            ))}
          </div>
          <Progress value={progressPercent} className="h-1" />
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {currentStep === 0 && (
          <ConnectSocialsStep
            onInvite={() => setInviteOpen(true)}
          />
        )}
        {currentStep === 1 && <BrandVoiceStep />}
        {currentStep === 2 && <AutomationStep />}

        {/* Bottom actions */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
            <SkipForward className="w-4 h-4 mr-1.5" />
            Skip for now
          </Button>
          <Button onClick={() => handleNext(false)} className="min-w-[140px]">
            {currentStep === STEPS.length - 1 ? 'Finish Setup' : 'Continue'}
            <ChevronRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>

      {/* Persistent invite dialog */}
      {company && (
        <InviteUserDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          companyId={company.id}
          companyName={company.name}
        />
      )}

      {/* Mobile sticky invite button */}
      <div className="sm:hidden fixed bottom-20 right-4 z-40">
        <Button
          size="icon"
          variant="secondary"
          className="rounded-full w-12 h-12 shadow-lg"
          onClick={() => setInviteOpen(true)}
        >
          <UserPlus className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
