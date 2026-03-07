import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Kanban, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePosts, useDeletePost } from "@/hooks/useGetLatePosts";
import { useBestTimeToPost } from "@/hooks/useBestTimeToPost";
import { useAllFeedItems } from "@/hooks/useAllFeedItems";
import { GetLatePost } from "@/lib/api/getlate";
import { ContentCalendar } from "@/components/content/calendar/ContentCalendar";
import { PostEditPanel } from "@/components/content/calendar/PostEditPanel";
import { ArticlePipeline } from "@/components/content/pipeline/ArticlePipeline";
import { PipelineStats } from "@/components/content/pipeline/PipelineStats";
import { QueueGrid } from "@/components/content/queue/QueueGrid";
import type { ArticleRowData } from "@/components/content/pipeline/ArticleRow";
import type { ArticleItem } from "@/components/content/calendar/CalendarArticleCard";
import { isToday, parseISO } from "date-fns";

type ViewType = "calendar" | "pipeline" | "queue";

const VIEWS: { key: ViewType; label: string; icon: React.ElementType }[] = [
  { key: "calendar", label: "Calendar", icon: Calendar },
  { key: "pipeline", label: "Pipeline", icon: Kanban },
  { key: "queue", label: "Queue", icon: List },
];

export default function ContentV2() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = (searchParams.get("view") as ViewType) || "calendar";
  const [selectedPost, setSelectedPost] = useState<GetLatePost | null>(null);

  const setView = useCallback(
    (view: ViewType) => {
      setSearchParams(view === "calendar" ? {} : { view }, { replace: true });
    },
    [setSearchParams]
  );

  // Data fetching
  const { data: posts = [] } = usePosts();
  const { data: bestTimeSlots = [] } = useBestTimeToPost();
  const { data: feedItems = [] } = useAllFeedItems();
  const deletePost = useDeletePost();

  // Compute stats
  const stats = useMemo(() => {
    const today = new Date();
    const articlesToday = feedItems.filter(
      (fi) => fi.published_at && isToday(parseISO(fi.published_at))
    ).length;
    const postsGenerated = posts.length;
    const scheduled = posts.filter((p) => p.status === "scheduled").length;
    const published = posts.filter((p) => p.status === "published").length;
    const needsAttention = posts.filter(
      (p) => p.status === "failed" || p.status === "partial"
    ).length;

    return { articlesToday, postsGenerated, scheduled, published, needsAttention };
  }, [posts, feedItems]);

  // Map feed items to ArticleRowData for pipeline
  const articleRows: ArticleRowData[] = useMemo(() => {
    return feedItems.map((fi) => {
      // Find posts linked to this article
      const linkedPosts = posts.filter((p) =>
        p.text?.includes(fi.title || "__never_match__")
      );

      let status = fi.status || "pending";
      const platformStatuses = linkedPosts.flatMap((p) =>
        (p.platformResults || []).map((pr) => ({
          platform: pr.platform,
          status: pr.status === "success" ? ("success" as const) : ("error" as const),
          postText: p.text?.slice(0, 100),
        }))
      );

      if (fi.status === "posted" && platformStatuses.some((ps) => ps.status === "error")) {
        status = "posted_with_errors";
      }

      return {
        id: fi.id,
        title: fi.title,
        link: fi.link,
        feedName: fi.feed_name,
        byline: (fi as any).byline || null,
        publishedAt: fi.published_at,
        status,
        imageUrl: fi.image_url,
        ogImageUrl: fi.og_image_url,
        ogTemplateId: fi.og_template_id,
        ogAiReasoning: fi.og_ai_reasoning,
        platformStatuses,
      };
    });
  }, [feedItems, posts]);

  // Map feed items to ArticleItem for calendar article layer
  const calendarArticles: ArticleItem[] = useMemo(() => {
    return feedItems.map((fi) => {
      const linkedPosts = posts.filter((p) =>
        p.text?.includes(fi.title || "__never_match__")
      );
      return {
        id: fi.id,
        title: fi.title,
        link: fi.link,
        image_url: fi.image_url,
        byline: (fi as any).byline || null,
        published_at: fi.published_at,
        feed_name: fi.feed_name,
        post_id: fi.post_id,
        status: fi.status || 'pending',
        content_classification: (fi as any).content_classification || null,
        posts: linkedPosts.map((p) => ({
          id: p.id,
          text: p.text || '',
          status: p.status || 'draft',
          platform: p.platformResults?.[0]?.platform || 'unknown',
        })),
      };
    });
  }, [feedItems, posts]);

  const handlePostClick = useCallback((post: GetLatePost) => {
    setSelectedPost(post);
  }, []);

  const handleDeletePost = useCallback(
    (postId: string) => {
      deletePost.mutate(postId);
    },
    [deletePost]
  );

  return (
    <DashboardLayout>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-3">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Content</h1>
            <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
              {VIEWS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    currentView === key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Button size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Post
          </Button>
        </div>

        {/* Stats bar */}
        <PipelineStats {...stats} />

        {/* View content */}
        <div className="flex-1 overflow-hidden">
          {currentView === "calendar" && (
            <ContentCalendar
              posts={posts}
              articles={calendarArticles}
              bestTimeSlots={bestTimeSlots}
              onPostClick={handlePostClick}
            />
          )}
          {currentView === "pipeline" && (
            <ArticlePipeline articles={articleRows} />
          )}
          {currentView === "queue" && (
            <QueueGrid
              posts={posts}
              onEditPost={handlePostClick}
              onDeletePost={handleDeletePost}
            />
          )}
        </div>
      </div>

      {/* Edit panel slide-over */}
      <PostEditPanel
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
      />
    </DashboardLayout>
  );
}
