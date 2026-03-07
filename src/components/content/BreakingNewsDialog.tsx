import { useState } from "react";
import { Zap, Send, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { usePublishBreakingNews } from "@/hooks/useBreakingNews";

interface Account {
  id: string;
  platform: string;
  name: string;
}

interface BreakingNewsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
}

export function BreakingNewsDialog({ open, onOpenChange, accounts }: BreakingNewsDialogProps) {
  const [text, setText] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const publishBreakingNews = usePublishBreakingNews();

  const toggleAccount = (id: string) => {
    const next = new Set(selectedAccounts);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAccounts(next);
  };

  const selectAll = () => {
    if (selectedAccounts.size === accounts.length) {
      setSelectedAccounts(new Set());
    } else {
      setSelectedAccounts(new Set(accounts.map((a) => a.id)));
    }
  };

  const handlePublish = () => {
    if (!text.trim() || selectedAccounts.size === 0) return;
    publishBreakingNews.mutate(
      { text, accountIds: Array.from(selectedAccounts) },
      {
        onSuccess: () => {
          setText("");
          setSelectedAccounts(new Set());
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Zap className="h-5 w-5" />
            Breaking News
          </DialogTitle>
          <DialogDescription>
            Publish immediately to all selected platforms. This bypasses the scheduling queue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            This will publish instantly. Make sure the content is accurate.
          </div>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your breaking news post..."
            rows={4}
            className="resize-none"
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Publish to:</label>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={selectAll}>
                {selectedAccounts.size === accounts.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="space-y-2 max-h-40 overflow-auto">
              {accounts.map((account) => (
                <label
                  key={account.id}
                  className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedAccounts.has(account.id)}
                    onCheckedChange={() => toggleAccount(account.id)}
                  />
                  <span className="text-sm capitalize">{account.platform}</span>
                  <span className="text-xs text-muted-foreground">{account.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handlePublish}
            disabled={!text.trim() || selectedAccounts.size === 0 || publishBreakingNews.isPending}
          >
            <Send className="h-4 w-4 mr-1" />
            {publishBreakingNews.isPending ? "Publishing..." : "Publish Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
