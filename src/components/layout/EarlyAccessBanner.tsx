import { useState } from "react";
import { X, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { posthog } from "@/lib/posthog";

const FEEDBACK_SURVEY_ID = "019c89a8-32e2-0000-a0fe-912a1792298e";

export function EarlyAccessBanner() {
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem("early-access-dismissed") === "true";
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem("early-access-dismissed", "true");
    setDismissed(true);
  };

  return (
    <div className="relative z-50 bg-gradient-to-r from-purple-600/90 to-fuchsia-500/90 text-white text-sm">
      <div className="flex items-center justify-center gap-2 px-4 py-2">
        <Rocket className="h-4 w-4 shrink-0" />
        <span>
          You're one of our early explorers! 🚀 Things may break — we'd love your{" "}
          <button
            onClick={() => posthog.capture("survey shown", { $survey_id: FEEDBACK_SURVEY_ID })}
            className="underline underline-offset-2 font-medium hover:text-white/80 cursor-pointer bg-transparent border-none text-white p-0"
          >
            feedback
          </button>.
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0 text-white/80 hover:text-white hover:bg-white/10 ml-2"
          onClick={handleDismiss}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
