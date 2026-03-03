import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getlateConnect, Platform } from "@/lib/api/getlate";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";
import { useQueryClient } from "@tanstack/react-query";

interface PageOption {
  id: string;
  name: string;
  pictureUrl?: string;
}

interface UserProfile {
  id?: string;
  name?: string;
  profilePicture?: string;
}

interface PageSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: Platform | null;
  tempToken: string | null;
  pendingDataToken?: string | null;
  userProfile?: UserProfile | null;
  onComplete: () => void;
}

export function PageSelectionDialog({
  open,
  onOpenChange,
  platform,
  tempToken,
  pendingDataToken,
  userProfile,
  onComplete,
}: PageSelectionDialogProps) {
  const { toast } = useToast();
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const [options, setOptions] = useState<PageOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Resolved token/profile from pendingDataToken (LinkedIn new flow)
  const [resolvedToken, setResolvedToken] = useState<string | null>(null);
  const [resolvedProfile, setResolvedProfile] = useState<UserProfile | null>(null);

  // The effective tempToken is either the direct one or the resolved one
  const effectiveToken = tempToken || resolvedToken;
  const effectiveProfile = userProfile || resolvedProfile;

  // Fetch available pages/accounts when dialog opens
  useEffect(() => {
    if (!open || !platform) return;
    // Need either a tempToken or a pendingDataToken to proceed
    if (!tempToken && !pendingDataToken) return;

    const fetchOptions = async () => {
      setLoading(true);
      setError(null);
      setOptions([]);
      setSelectedId(null);
      setResolvedToken(null);
      setResolvedProfile(null);

      try {
        let tokenToUse = tempToken;

        // If we have a pendingDataToken (LinkedIn new flow), resolve it first
        if (!tokenToUse && pendingDataToken) {
          const pendingResult = await getlateConnect.getPendingData(pendingDataToken);
          if (!pendingResult.success || !pendingResult.data?.tempToken) {
            setError(pendingResult.error || "Failed to resolve LinkedIn token. It may have expired (10 min limit).");
            return;
          }
          tokenToUse = pendingResult.data.tempToken;
          setResolvedToken(tokenToUse);
          if (pendingResult.data.userProfile) {
            setResolvedProfile(pendingResult.data.userProfile as UserProfile);
          }
        }

        if (!tokenToUse) {
          setError("No token available. Please try connecting again.");
          return;
        }

        const profileId = company?.getlate_profile_id || undefined;
        const result = await getlateConnect.getOptions(platform, tokenToUse, profileId);

        if (!result.success) {
          setError(result.error || "Failed to load pages");
          return;
        }

        const pageOptions = result.data?.options || [];
        setOptions(pageOptions);

        if (pageOptions.length === 0) {
          setError("No pages found. Make sure you have admin access to at least one page.");
        }
      } catch (err) {
        console.error("Error fetching page options:", err);
        setError("Failed to load available pages");
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, [open, platform, tempToken, pendingDataToken]);

  const handleSelect = async () => {
    if (!platform || !effectiveToken || !selectedId) return;

    const selectedOption = options.find((o) => o.id === selectedId);
    if (!selectedOption) return;

    setSelecting(true);

    try {
      const result = await getlateConnect.select(
        platform,
        effectiveToken,
        { id: selectedOption.id, name: selectedOption.name },
        company?.getlate_profile_id || undefined,
        effectiveProfile || undefined
      );

      if (!result.success) {
        toast({
          title: "Connection Failed",
          description: result.error || "Failed to connect the selected page",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Page Connected",
        description: `Successfully connected ${selectedOption.name}`,
      });

      // Invalidate accounts query to refresh the list
      const profileId = company?.getlate_profile_id;
      queryClient.invalidateQueries({ queryKey: ["getlate-accounts", profileId] });

      onComplete();
      onOpenChange(false);
    } catch (err) {
      console.error("Error selecting page:", err);
      toast({
        title: "Connection Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSelecting(false);
    }
  };

  const getPlatformLabel = () => {
    switch (platform) {
      case "facebook":
        return "Facebook Page";
      case "linkedin":
        return "LinkedIn Page";
      case "instagram":
        return "Instagram Account";
      case "youtube":
        return "YouTube Channel";
      default:
        return "Account";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select {getPlatformLabel()}</DialogTitle>
          <DialogDescription>
            Choose which {getPlatformLabel().toLowerCase()} you want to connect to this company.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading pages...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive">{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedId(option.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left",
                      selectedId === option.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={option.pictureUrl} alt={option.name} />
                      <AvatarFallback>
                        {option.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {option.name}
                      </p>
                    </div>
                    {selectedId === option.id && (
                      <Check className="w-5 h-5 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={selecting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSelect}
                  disabled={!selectedId || selecting}
                >
                  {selecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Connecting...
                    </>
                  ) : (
                    "Connect"
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}