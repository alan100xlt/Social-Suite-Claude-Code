import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { FaInstagram, FaTwitter, FaFacebook, FaLinkedin, FaTiktok, FaYoutube } from "react-icons/fa";
import { SiBluesky, SiThreads } from "react-icons/si";
import { OgImagePreview } from "@/components/content/OgImagePreview";
import { Newspaper } from "lucide-react";

/** Decode HTML entities like &#8220; &#8221; &amp; etc. */
function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

const platformIcons: Record<string, React.ElementType> = {
  instagram: FaInstagram,
  twitter: FaTwitter,
  facebook: FaFacebook,
  linkedin: FaLinkedin,
  tiktok: FaTiktok,
  youtube: FaYoutube,
  bluesky: SiBluesky,
  threads: SiThreads,
};

const statusColors: Record<string, string> = {
  posted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  posted_with_errors: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  draft: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  pending: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  skipped: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};

export interface ArticleRowData {
  id: string;
  title: string | null;
  link: string | null;
  feedName: string;
  byline?: string | null;
  publishedAt: string | null;
  status: string;
  imageUrl: string | null;
  ogImageUrl: string | null;
  ogTemplateId: string | null;
  ogAiReasoning: string | null;
  platformStatuses: Array<{
    platform: string;
    status: "success" | "error" | "not_targeted" | "draft";
    postText?: string;
    postUrl?: string;
  }>;
}

interface ArticleRowProps {
  article: ArticleRowData;
  onGeneratePosts?: (articleId: string) => void;
}

export function ArticleRow({ article, onGeneratePosts }: ArticleRowProps) {
  const [expanded, setExpanded] = useState(false);

  const hasPosts = article.platformStatuses.length > 0;

  return (
    <div className="border-b last:border-b-0">
      <div
        className={cn(
          "flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
          expanded && "bg-muted/30"
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="shrink-0 text-muted-foreground">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>

        {article.imageUrl ? (
          <img
            src={article.imageUrl}
            alt=""
            className="h-[50px] w-[50px] shrink-0 rounded-md object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-md bg-muted">
            <Newspaper className="h-5 w-5 text-muted-foreground/50" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-medium">
              {article.title ? decodeHtmlEntities(article.title) : "Untitled Article"}
            </h4>
            {article.link && (
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{article.feedName}</span>
            {article.byline && (
              <>
                <span>&middot;</span>
                <span>{article.byline}</span>
              </>
            )}
            {article.publishedAt && (
              <>
                <span>&middot;</span>
                <span>{formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}</span>
              </>
            )}
          </div>
        </div>

        <Badge variant="secondary" className={cn("shrink-0 text-xs", statusColors[article.status])}>
          {article.status.replace(/_/g, " ")}
        </Badge>

        <div className="flex shrink-0 items-center gap-1">
          {article.platformStatuses.map((ps) => {
            const Icon = platformIcons[ps.platform];
            if (!Icon) return null;
            return (
              <Icon
                key={ps.platform}
                className={cn(
                  "h-3.5 w-3.5",
                  ps.status === "success" && "text-emerald-500",
                  ps.status === "error" && "text-red-500",
                  ps.status === "draft" && "text-blue-400",
                  ps.status === "not_targeted" && "text-muted-foreground"
                )}
              />
            );
          })}
        </div>
      </div>

      {expanded && (
        <div className="border-t bg-muted/20 px-4 py-3 pl-11 space-y-4">
          {hasPosts ? (
            <div className="space-y-2">
              {article.platformStatuses.map((ps) => {
                const Icon = platformIcons[ps.platform];
                return (
                  <div key={ps.platform} className="flex items-start gap-2 text-sm">
                    {Icon && <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-muted-foreground">
                        {ps.postText || `${ps.platform} post`}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 text-xs",
                        ps.status === "success" && "border-emerald-300 text-emerald-600",
                        ps.status === "error" && "border-red-300 text-red-600"
                      )}
                    >
                      {ps.status}
                    </Badge>
                    {ps.postUrl && (
                      <a
                        href={ps.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onGeneratePosts?.(article.id);
                }}
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Generate Posts with AI
              </Button>
            </div>
          )}

          <OgImagePreview
            feedItemId={article.id}
            ogImageUrl={article.ogImageUrl}
            ogTemplateId={article.ogTemplateId}
            ogAiReasoning={article.ogAiReasoning}
            hasArticleImage={!!article.imageUrl}
          />
        </div>
      )}
    </div>
  );
}
