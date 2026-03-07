import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { FileText, User, ExternalLink, Pencil, Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface ArticleItem {
  id: string;
  title: string | null;
  link: string | null;
  image_url: string | null;
  byline: string | null;
  published_at: string | null;
  feed_name?: string;
  post_id: string | null;
  status: string;
  content_classification?: {
    type?: string;
    is_evergreen?: boolean;
    evergreen_score?: number;
  } | null;
  posts?: Array<{
    id: string;
    text: string;
    status: string;
    platform: string;
  }>;
}

interface CalendarArticleCardProps {
  article: ArticleItem;
  onArticleClick?: (article: ArticleItem) => void;
  onPostAction?: (postId: string, action: 'edit' | 'approve' | 'publish') => void;
  highlighted?: boolean;
}

const classificationColors: Record<string, string> = {
  evergreen: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  timely: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  seasonal: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export function CalendarArticleCard({
  article,
  onArticleClick,
  onPostAction,
  highlighted,
}: CalendarArticleCardProps) {
  const timeStr = article.published_at
    ? format(parseISO(article.published_at), "h:mm a")
    : null;

  const classificationType = article.content_classification?.type;

  return (
    <HoverCard openDelay={300} closeDelay={150}>
      <HoverCardTrigger asChild>
        <div
          onClick={() => onArticleClick?.(article)}
          className={cn(
            "cursor-pointer rounded-lg border bg-card p-2 shadow-sm transition-all",
            "border-l-[3px] border-l-indigo-500",
            "hover:shadow-md hover:ring-1 hover:ring-indigo-300/50",
            highlighted && "ring-2 ring-indigo-400 shadow-md",
          )}
        >
          <div className="flex items-start gap-2">
            {article.image_url && (
              <img
                src={article.image_url}
                alt=""
                className="h-8 w-8 rounded object-cover shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 mb-0.5">
                <FileText className="h-3 w-3 text-indigo-500 shrink-0" />
                {timeStr && (
                  <span className="text-[10px] text-muted-foreground">{timeStr}</span>
                )}
                {classificationType && (
                  <Badge variant="secondary" className={cn("h-4 text-[9px] px-1", classificationColors[classificationType])}>
                    {classificationType}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] font-medium leading-snug line-clamp-2 text-foreground/90">
                {article.title || "Untitled article"}
              </p>
              {article.byline && (
                <div className="flex items-center gap-1 mt-0.5">
                  <User className="h-2.5 w-2.5 text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground">{article.byline}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent side="right" align="start" className="w-80 p-0 overflow-hidden">
        {article.image_url && (
          <img src={article.image_url} alt="" className="h-32 w-full object-cover" />
        )}
        <div className="p-3 space-y-2">
          <p className="text-sm font-semibold leading-snug">
            {article.title || "Untitled article"}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {article.byline && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {article.byline}
              </span>
            )}
            {article.feed_name && (
              <span>via {article.feed_name}</span>
            )}
          </div>
          {article.link && (
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              View article
            </a>
          )}
          {/* Generated posts */}
          {article.posts && article.posts.length > 0 ? (
            <div className="border-t pt-2 space-y-1.5">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Generated Posts ({article.posts.length})
              </span>
              {article.posts.map((post) => (
                <div key={post.id} className="rounded border bg-muted/30 p-2">
                  <p className="text-[11px] line-clamp-2 mb-1">{post.text}</p>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[9px] h-4">
                      {post.status}
                    </Badge>
                    <div className="flex-1" />
                    {onPostAction && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={(e) => { e.stopPropagation(); onPostAction(post.id, 'edit'); }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        {post.status === 'draft' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={(e) => { e.stopPropagation(); onPostAction(post.id, 'approve'); }}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={(e) => { e.stopPropagation(); onPostAction(post.id, 'publish'); }}
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-t pt-2">
              <span className="text-[10px] text-muted-foreground">No posts generated yet</span>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
