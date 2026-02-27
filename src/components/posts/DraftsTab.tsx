import { usePostDrafts, useDeleteDraft, PostDraft } from "@/hooks/usePostDrafts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FileText, Trash2, Clock, PenLine, Newspaper } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DraftsTabProps {
  onOpenDraft: (draftId: string) => void;
}

export function DraftsTab({ onOpenDraft }: DraftsTabProps) {
  const { data: drafts, isLoading } = usePostDrafts();
  const deleteDraft = useDeleteDraft();

  if (isLoading) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  if (!drafts || drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-1">No drafts yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Drafts are saved automatically as you compose posts. Start a new post and your progress will appear here.
        </p>
      </div>
    );
  }

  const stepLabels: Record<string, string[]> = {
    article: ["Source", "Article", "Objective", "Channels", "Compose"],
    scratch: ["Source", "Objective", "Channels", "Compose"],
  };

  return (
    <div className="space-y-3 mt-4">
      {drafts.map((draft) => {
        const steps = stepLabels[draft.post_source || "scratch"] || stepLabels.scratch;
        const currentStepLabel = steps[draft.current_step] || steps[0];
        const platformCount = Object.keys(draft.platform_contents || {}).length;
        const title = draft.title || draft.post_source === "article" ? "Article Post" : "Post from Scratch";

        return (
          <Card key={draft.id} className="hover:border-primary/30 transition-colors cursor-pointer group" onClick={() => onOpenDraft(draft.id)}>
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {draft.post_source === "article" ? (
                    <Newspaper className="w-4 h-4 text-primary" />
                  ) : (
                    <PenLine className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {draft.title || (draft.post_source === "article" ? "Article Post" : "Post from Scratch")}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      Step: {currentStepLabel}
                    </Badge>
                    {draft.objective && (
                      <Badge variant="secondary" className="text-xs capitalize">
                        {draft.objective}
                      </Badge>
                    )}
                    {platformCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {platformCount} platform{platformCount !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Updated {formatDistanceToNow(new Date(draft.updated_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button size="sm" variant="default" className="gap-1.5">
                  Continue
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete draft?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this draft. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteDraft.mutate(draft.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
