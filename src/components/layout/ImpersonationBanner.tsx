import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ImpersonationBanner() {
  const { isImpersonating, impersonatingEmail, stopImpersonating } = useAuth();

  if (!isImpersonating) return null;

  return (
    <div className="sticky top-0 z-30 bg-warning text-warning-foreground px-4 py-2 flex items-center justify-between text-sm font-medium">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span>
          You are viewing as <strong>{impersonatingEmail}</strong>
        </span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 text-xs"
        onClick={stopImpersonating}
      >
        <X className="h-3 w-3 mr-1" />
        Return to Superadmin
      </Button>
    </div>
  );
}
