import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Loader2, Check, RefreshCw, Cloud, Database, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface SyncingIndicatorProps {
  isSyncing: boolean;
  lastSyncResult?: {
    accountSnapshots?: number;
    postSnapshots?: number;
    companiesSynced?: number;
  } | null;
}

const syncSteps = [
  { id: "connect", label: "Connecting to data source", icon: Cloud },
  { id: "accounts", label: "Syncing account metrics", icon: Database },
  { id: "posts", label: "Fetching post analytics", icon: BarChart3 },
  { id: "complete", label: "Finalizing sync", icon: Check },
];

export function SyncingIndicator({ isSyncing, lastSyncResult }: SyncingIndicatorProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isSyncing) {
      setCurrentStep(0);
      setProgress(0);
      return;
    }

    // Simulate progress through steps
    const stepDuration = 2000; // 2 seconds per step
    const progressInterval = 50; // Update every 50ms
    const progressPerTick = 100 / (syncSteps.length * (stepDuration / progressInterval));

    const timer = setInterval(() => {
      setProgress((prev) => {
        const newProgress = Math.min(prev + progressPerTick, 95); // Cap at 95% until actually complete
        const newStep = Math.min(Math.floor(newProgress / 25), syncSteps.length - 1);
        if (newStep !== currentStep) {
          setCurrentStep(newStep);
        }
        return newProgress;
      });
    }, progressInterval);

    return () => clearInterval(timer);
  }, [isSyncing, currentStep]);

  // When sync completes, show 100%
  useEffect(() => {
    if (!isSyncing && lastSyncResult) {
      setProgress(100);
      setCurrentStep(syncSteps.length - 1);
    }
  }, [isSyncing, lastSyncResult]);

  if (!isSyncing && !lastSyncResult) return null;

  const CurrentIcon = syncSteps[currentStep]?.icon || RefreshCw;

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 w-80 rounded-xl border bg-card shadow-lg transition-all duration-300",
        isSyncing ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <div className="p-2 rounded-lg bg-primary/10">
              <CurrentIcon className={cn(
                "w-5 h-5 text-primary",
                isSyncing && "animate-pulse"
              )} />
            </div>
            {isSyncing && (
              <div className="absolute -top-1 -right-1">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                </span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">Syncing Analytics</p>
            <p className="text-xs text-muted-foreground">
              {syncSteps[currentStep]?.label}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-between mt-4 px-2">
          {syncSteps.map((step, index) => {
            const StepIcon = step.icon;
            const isComplete = index < currentStep || (!isSyncing && progress === 100);
            const isCurrent = index === currentStep && isSyncing;

            return (
              <div
                key={step.id}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                    isComplete && "bg-success/20 text-success",
                    isCurrent && "bg-primary/20 text-primary",
                    !isComplete && !isCurrent && "bg-muted text-muted-foreground"
                  )}
                >
                  {isComplete ? (
                    <Check className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <StepIcon className="w-4 h-4" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
