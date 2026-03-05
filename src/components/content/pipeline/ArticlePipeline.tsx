import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ArticleRow, type ArticleRowData } from "./ArticleRow";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "needs_attention", label: "Needs Attention" },
  { key: "no_posts", label: "No Posts" },
  { key: "draft", label: "Has Drafts" },
  { key: "scheduled", label: "Scheduled" },
  { key: "posted", label: "Published" },
  { key: "failed", label: "Errored" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

interface ArticlePipelineProps {
  articles: ArticleRowData[];
  onGeneratePosts?: (articleId: string) => void;
}

export function ArticlePipeline({ articles, onGeneratePosts }: ArticlePipelineProps) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = articles;

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.title?.toLowerCase().includes(q) ||
          a.feedName.toLowerCase().includes(q)
      );
    }

    // Filter
    switch (filter) {
      case "needs_attention":
        result = result.filter(
          (a) => a.status === "failed" || a.status === "posted_with_errors"
        );
        break;
      case "no_posts":
        result = result.filter((a) => a.platformStatuses.length === 0);
        break;
      case "draft":
        result = result.filter((a) => a.status === "draft");
        break;
      case "scheduled":
        result = result.filter((a) =>
          a.platformStatuses.some((ps) => ps.status === "draft")
        );
        break;
      case "posted":
        result = result.filter((a) => a.status === "posted");
        break;
      case "failed":
        result = result.filter((a) => a.status === "failed");
        break;
    }

    // Sort by urgency: failed → pending → draft → posted → skipped
    const priority: Record<string, number> = {
      failed: 0,
      posted_with_errors: 1,
      pending: 2,
      draft: 3,
      posted: 4,
      skipped: 5,
    };
    result.sort((a, b) => (priority[a.status] ?? 9) - (priority[b.status] ?? 9));

    return result;
  }, [articles, filter, search]);

  return (
    <div className="flex flex-col">
      {/* Filter bar */}
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <div className="flex items-center gap-1">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 w-48 text-xs"
          />
        </div>
      </div>

      {/* Article list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            No articles match your filter.
          </div>
        ) : (
          filtered.map((article) => (
            <ArticleRow
              key={article.id}
              article={article}
              onGeneratePosts={onGeneratePosts}
            />
          ))
        )}
      </div>
    </div>
  );
}
