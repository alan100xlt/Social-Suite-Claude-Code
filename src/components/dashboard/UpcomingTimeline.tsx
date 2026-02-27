import { usePosts } from "@/hooks/useGetLatePosts";
import { usePostDrafts } from "@/hooks/usePostDrafts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, FileEdit, CheckCircle } from "lucide-react";
import { FaInstagram, FaTwitter, FaLinkedin, FaFacebook, FaTiktok } from "react-icons/fa";
import { SiBluesky } from "react-icons/si";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const platformIcons: Record<string, React.ElementType> = {
  instagram: FaInstagram, twitter: FaTwitter, linkedin: FaLinkedin,
  facebook: FaFacebook, tiktok: FaTiktok, bluesky: SiBluesky,
};

interface TimelineItem {
  id: string;
  rawId: string;
  type: "scheduled" | "approval" | "draft";
  time: Date;
  content: string;
  platforms: string[];
  approvalToken?: string;
}

export function UpcomingTimeline() {
  const navigate = useNavigate();
  const { data: company } = useCompany();
  const companyId = company?.id;
  const { data: scheduledPosts, isLoading: postsLoading } = usePosts({ status: "scheduled" });
  const { data: drafts, isLoading: draftsLoading } = usePostDrafts();

  const { data: pendingApprovals, isLoading: approvalsLoading } = useQuery({
    queryKey: ["pending-approvals-timeline", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("post_approvals")
        .select("id, created_at, platform_contents, selected_account_ids, status, expires_at, token")
        .eq("company_id", companyId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) return [];
      return data || [];
    },
    enabled: !!companyId,
  });

  const isLoading = postsLoading || draftsLoading || approvalsLoading;

  const items: TimelineItem[] = [];

  for (const post of scheduledPosts || []) {
    if (post.scheduledFor) {
      items.push({
        id: `sched-${post.id}`,
        rawId: post.id,
        type: "scheduled",
        time: new Date(post.scheduledFor),
        content: post.text?.slice(0, 100) || "Scheduled post",
        platforms: post.platformResults?.map((p) => p.platform) || [],
      });
    }
  }

  for (const approval of pendingApprovals || []) {
    const contents = approval.platform_contents as any;
    let preview = "Post awaiting approval";
    if (Array.isArray(contents) && contents.length > 0) {
      preview = contents[0]?.content?.slice(0, 100) || preview;
    }
    items.push({
      id: `approval-${approval.id}`,
      rawId: approval.id,
      type: "approval",
      time: new Date(approval.created_at),
      content: preview,
      platforms: [],
      approvalToken: approval.token,
    });
  }

  for (const draft of (drafts || []).slice(0, 5)) {
    items.push({
      id: `draft-${draft.id}`,
      rawId: draft.id,
      type: "draft",
      time: new Date(draft.updated_at || draft.created_at),
      content: draft.title || "Untitled draft",
      platforms: (draft.selected_account_ids || []).length > 0 ? ["multiple"] : [],
    });
  }

  items.sort((a, b) => a.time.getTime() - b.time.getTime());
  const displayItems = items.slice(0, 7);

  const actionCount = (pendingApprovals?.length || 0) + (drafts?.length || 0);

  const handleItemClick = (item: TimelineItem) => {
    switch (item.type) {
      case "scheduled":
        navigate("/app/posts?tab=calendar");
        break;
      case "draft":
        navigate(`/app/posts?tab=compose&draft=${item.rawId}`);
        break;
      case "approval":
        if (item.approvalToken) {
          navigate(`/approve/${item.approvalToken}`);
        }
        break;
    }
  };

  const statusConfig = {
    scheduled: { icon: Clock, label: "Scheduled", className: "bg-primary/10 text-primary" },
    approval: { icon: CheckCircle, label: "Awaiting Approval", className: "bg-warning/10 text-warning" },
    draft: { icon: FileEdit, label: "Draft", className: "bg-muted text-muted-foreground" },
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-display font-semibold text-sm text-card-foreground">What's Coming Next</h3>
        </div>
        {actionCount > 0 && (
          <Badge variant="secondary" className="text-[10px] bg-warning/10 text-warning border-0">
            {actionCount} item{actionCount !== 1 ? "s" : ""} need attention
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-1 h-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : displayItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center mb-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Nothing scheduled</p>
          <p className="text-xs text-muted-foreground mt-0.5">Time to plan some content!</p>
        </div>
      ) : (
        <div className="space-y-0">
          {displayItems.map((item, idx) => {
            const config = statusConfig[item.type];
            const StatusIcon = config.icon;
            const isLast = idx === displayItems.length - 1;
            return (
              <div key={item.id} className="flex gap-3 cursor-pointer hover:bg-muted/50 rounded-lg transition-colors -mx-1 px-1" onClick={() => handleItemClick(item)}>
                {/* Timeline line + dot */}
                <div className="flex flex-col items-center">
                  <div className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-1.5", 
                    item.type === "scheduled" ? "bg-primary" : 
                    item.type === "approval" ? "bg-warning" : "bg-muted-foreground"
                  )} />
                  {!isLast && <div className="w-px flex-1 bg-border min-h-[24px]" />}
                </div>
                {/* Content */}
                <div className={cn("pb-4 min-w-0 flex-1", isLast && "pb-0")}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {format(item.time, "MMM d, h:mm a")}
                    </span>
                    <Badge variant="secondary" className={cn("text-[10px] border-0 py-0 h-4", config.className)}>
                      {config.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.platforms.slice(0, 3).map((p, pi) => {
                      const PIcon = platformIcons[p];
                      return PIcon ? <PIcon key={pi} className="w-3 h-3 text-muted-foreground" /> : null;
                    })}
                    <p className="text-sm text-card-foreground line-clamp-1">{item.content}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
