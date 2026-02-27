import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRssFeeds, useRssFeedItems, RssFeedItem } from '@/hooks/useRssFeeds';
import { useQuery } from '@tanstack/react-query';
import { usePollRssFeed } from '@/hooks/useRssArticles';
import { usePostDrafts } from '@/hooks/usePostDrafts';
import { AutomationPickerDialog } from './AutomationPickerDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Loader2, RefreshCw, ExternalLink, Send, FileText, CheckCircle2, XCircle, Clock, Newspaper, Globe, Rss, Eye, BarChart3, Filter } from 'lucide-react';
import { FaInstagram, FaTwitter, FaTiktok, FaLinkedin, FaFacebook, FaYoutube } from 'react-icons/fa';
import { SiBluesky, SiThreads } from 'react-icons/si';
import { format, formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// --- Platform icon map ---
const platformIconMap: Record<string, React.ElementType> = {
  instagram: FaInstagram,
  twitter: FaTwitter,
  facebook: FaFacebook,
  linkedin: FaLinkedin,
  tiktok: FaTiktok,
  youtube: FaYoutube,
  bluesky: SiBluesky,
  threads: SiThreads,
};

// --- Types for automation log enrichment ---
interface ArticleAutomationInfo {
  platforms: string[];
  result: string;
  action: string;
  draftId?: string;
}

interface PostAnalyticsInfo {
  platform: string;
  post_url: string | null;
  post_id: string;
}

export function ArticlesTab() {
  const navigate = useNavigate();
  const { data: feeds, isLoading: feedsLoading } = useRssFeeds();
  const { data: drafts } = usePostDrafts();
  const pollFeed = usePollRssFeed();

  const articleDraftMap = new Map<string, { id: string; title: string | null }>();
  drafts?.forEach(d => {
    if (d.selected_article_id) {
      articleDraftMap.set(d.selected_article_id, { id: d.id, title: d.title });
    }
  });

  const [selectedFeedId, setSelectedFeedId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewingArticle, setViewingArticle] = useState<RssFeedItem | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [automationArticle, setAutomationArticle] = useState<{ id: string; title: string } | null>(null);

  const handleScrapeArticle = async () => {
    if (!viewingArticle?.link) return;
    setIsScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-article', {
        body: { articleId: viewingArticle.id },
      });
      if (error || data?.error) {
        toast({ title: 'Scrape failed', description: data?.error || error?.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Article scraped', description: 'Content has been extracted successfully.' });
      setViewingArticle({ ...viewingArticle, full_content: data.content });
      refetchItems();
    } catch {
      toast({ title: 'Scrape failed', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsScraping(false);
    }
  };

  const activeFeedId = selectedFeedId || feeds?.[0]?.id || '';
  const activeFeed = feeds?.find(f => f.id === activeFeedId);
  const { data: feedItems, isLoading: itemsLoading, refetch: refetchItems } = useRssFeedItems(activeFeedId);

  // Fetch automation logs for feed items to get per-platform status
  const feedItemIds = feedItems?.map(i => i.id) || [];
  const { data: automationLogs } = useQuery({
    queryKey: ['article-automation-logs', feedItemIds],
    queryFn: async () => {
      if (feedItemIds.length === 0) return new Map<string, ArticleAutomationInfo[]>();
      const { data } = await supabase
        .from('automation_logs' as any)
        .select('feed_item_id, action, result, details, error_message')
        .in('feed_item_id', feedItemIds)
        .order('created_at', { ascending: false });

      const logMap = new Map<string, ArticleAutomationInfo[]>();
      (data || []).forEach((row: any) => {
        const feedItemId = row.feed_item_id as string;
        const details = row.details as Record<string, unknown> | null;
        const platforms = (details?.platforms as string[]) || [];
        const entry: ArticleAutomationInfo = {
          platforms,
          result: row.result,
          action: row.action,
          draftId: details?.draft_id as string | undefined,
        };
        if (!logMap.has(feedItemId)) {
          logMap.set(feedItemId, [entry]);
        } else {
          logMap.get(feedItemId)!.push(entry);
        }
      });
      return logMap;
    },
    enabled: feedItemIds.length > 0,
  });

  // Fetch post analytics for posted items
  const postedPostIds = feedItems?.filter(i => i.status === 'posted' && i.post_id).map(i => i.post_id!) || [];
  const { data: postAnalytics } = useQuery({
    queryKey: ['post-analytics-for-articles', postedPostIds],
    queryFn: async () => {
      if (postedPostIds.length === 0) return new Map<string, PostAnalyticsInfo[]>();
      const { data } = await supabase
        .from('post_analytics_snapshots')
        .select('post_id, post_url, platform')
        .in('post_id', postedPostIds);
      const analyticsMap = new Map<string, PostAnalyticsInfo[]>();
      data?.forEach(row => {
        const entry = { platform: row.platform, post_url: row.post_url, post_id: row.post_id };
        if (!analyticsMap.has(row.post_id)) {
          analyticsMap.set(row.post_id, [entry]);
        } else {
          analyticsMap.get(row.post_id)!.push(entry);
        }
      });
      return analyticsMap;
    },
    enabled: postedPostIds.length > 0,
  });

  const handlePollFeed = async () => {
    if (!activeFeedId) return;
    await pollFeed.mutateAsync(activeFeedId);
    refetchItems();
  };

  const handleCreatePost = (articleId: string, articleTitle?: string) => {
    setAutomationArticle({ id: articleId, title: articleTitle || 'Untitled Article' });
  };

  // Determine derived status for each item based on automation logs
  const getItemDisplayStatus = (item: RssFeedItem): string => {
    if (item.status === 'posted') {
      const logs = automationLogs?.get(item.id) || [];
      const hasError = logs.some(l => l.result === 'error');
      if (hasError) return 'posted_with_errors';
      return 'posted';
    }
    const existingDraft = articleDraftMap.get(item.id);
    if (existingDraft) return 'draft';
    return item.status; // pending, failed, skipped
  };

  // Filter items
  const filteredItems = useMemo(() => {
    if (!feedItems) return [];
    if (statusFilter === 'all') return feedItems;
    return feedItems.filter(item => getItemDisplayStatus(item) === statusFilter);
  }, [feedItems, statusFilter, automationLogs, articleDraftMap]);

  const pendingCount = feedItems?.filter(i => i.status === 'pending').length || 0;
  const postedCount = feedItems?.filter(i => i.status === 'posted').length || 0;
  const draftCount = feedItems?.filter(i => articleDraftMap.has(i.id)).length || 0;
  const failedCount = feedItems?.filter(i => i.status === 'failed').length || 0;

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex items-center justify-end gap-3 flex-wrap">
        {feeds && feeds.length > 1 && (
          <Select value={activeFeedId} onValueChange={setSelectedFeedId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select feed" />
            </SelectTrigger>
            <SelectContent>
              {feeds.map(feed => (
                <SelectItem key={feed.id} value={feed.id}>{feed.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="posted">Published</SelectItem>
            <SelectItem value="posted_with_errors">Published with Errors</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handlePollFeed} disabled={pollFeed.isPending || !activeFeedId}>
          {pollFeed.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Fetch Articles
        </Button>
        {activeFeed?.last_polled_at && (
          <span className="text-xs text-muted-foreground whitespace-nowrap" title={format(new Date(activeFeed.last_polled_at), 'PPpp')}>
            Last polled {formatDistanceToNow(new Date(activeFeed.last_polled_at), { addSuffix: true })}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Articles</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{feedItems?.length || 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{pendingCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Drafts</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{draftCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Posted</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{postedCount}</p></CardContent>
        </Card>
      </div>

      {/* Articles List */}
      {feedsLoading || itemsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !feeds || feeds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Newspaper className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No RSS Feeds</h3>
            <p className="text-muted-foreground text-center">
              Use the "Manage Feeds" button above to add your first RSS feed.
            </p>
          </CardContent>
        </Card>
      ) : !feedItems || feedItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Newspaper className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Articles Yet</h3>
            <p className="text-muted-foreground text-center mb-4">Click "Fetch Articles" to pull articles from this feed.</p>
            <Button onClick={handlePollFeed} disabled={pollFeed.isPending}>
              {pollFeed.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Fetch Articles
            </Button>
          </CardContent>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Filter className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Matching Articles</h3>
            <p className="text-muted-foreground text-center mb-4">No articles match the selected filter.</p>
            <Button variant="outline" onClick={() => setStatusFilter('all')}>Clear Filter</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-xs font-medium text-muted-foreground text-left px-4 py-2.5">Title</th>
                <th className="text-xs font-medium text-muted-foreground text-left px-4 py-2.5 w-[140px]">Published</th>
                <th className="text-xs font-medium text-muted-foreground text-center px-4 py-2.5 w-[140px]">Platforms</th>
                <th className="text-xs font-medium text-muted-foreground text-center px-4 py-2.5 w-[80px]">Actions</th>
                <th className="text-xs font-medium text-muted-foreground text-right px-4 py-2.5 w-[140px]"></th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, idx) => {
                const isPosted = item.status === 'posted';
                const existingDraft = articleDraftMap.get(item.id);
                const logs = automationLogs?.get(item.id) || [];
                const analytics = item.post_id ? postAnalytics?.get(item.post_id) || [] : [];

                // Collect all platforms from automation logs
                const allPlatforms = new Set<string>();
                logs.forEach(l => l.platforms.forEach(p => allPlatforms.add(p)));

                // Also add platforms from analytics
                analytics.forEach(a => allPlatforms.add(a.platform));

                // Determine per-platform status
                const platformStatuses: { platform: string; status: 'success' | 'error' | 'not_targeted'; url?: string }[] = [];
                allPlatforms.forEach(platform => {
                  const analyticsForPlatform = analytics.find(a => a.platform === platform);
                  const logForPlatform = logs.find(l => l.platforms.includes(platform));

                  if (analyticsForPlatform) {
                    platformStatuses.push({ platform, status: 'success', url: analyticsForPlatform.post_url || undefined });
                  } else if (isPosted && logForPlatform?.result === 'error') {
                    platformStatuses.push({ platform, status: 'error' });
                  } else if (isPosted && logForPlatform) {
                    platformStatuses.push({ platform, status: 'success' });
                  } else if (logForPlatform) {
                    // Has automation log but not posted yet (draft stage)
                    platformStatuses.push({ platform, status: 'not_targeted' });
                  }
                });

                return (
                  <tr key={item.id} className={cn("border-b border-border last:border-0 hover:bg-muted/30 transition-colors", idx % 2 === 0 && "bg-background")}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground leading-snug line-clamp-1">{item.title || 'Untitled Article'}</p>
                    </td>
                    <td className="px-4 py-3">
                      {item.published_at ? (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(item.published_at), 'MMM d, yyyy')}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <TooltipProvider>
                          {platformStatuses.length > 0 ? platformStatuses.map(ps => {
                            const Icon = platformIconMap[ps.platform];
                            if (!Icon) return null;
                            const colorClass = ps.status === 'success'
                              ? 'text-green-500'
                              : ps.status === 'error'
                                ? 'text-destructive'
                                : 'text-muted-foreground/40';
                            const label = ps.status === 'success'
                              ? `Published on ${ps.platform}`
                              : ps.status === 'error'
                                ? `Failed on ${ps.platform}`
                                : `Not targeted: ${ps.platform}`;
                            return (
                              <Tooltip key={ps.platform}>
                                <TooltipTrigger asChild>
                                  {ps.url ? (
                                    <a href={ps.url} target="_blank" rel="noopener noreferrer" className={cn("inline-flex items-center justify-center h-6 w-6 rounded transition-colors hover:opacity-80", colorClass)}>
                                      <Icon className="h-3.5 w-3.5" />
                                    </a>
                                  ) : (
                                    <span className={cn("inline-flex items-center justify-center h-6 w-6 rounded", colorClass)}>
                                      <Icon className="h-3.5 w-3.5" />
                                    </span>
                                  )}
                                </TooltipTrigger>
                                <TooltipContent side="top"><p className="text-xs capitalize">{label}</p></TooltipContent>
                              </Tooltip>
                            );
                          }) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TooltipProvider>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {item.link && (
                          <a href={item.link} target="_blank" rel="noopener noreferrer" title="Open article" className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button onClick={() => setViewingArticle(item)} title="Preview content" className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {isPosted && item.post_id && (
                          <button onClick={() => navigate(`/app/analytics?tab=posts&postId=${item.post_id}`)} title="View analytics" className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors">
                            <BarChart3 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isPosted ? (
                        <Badge variant="secondary" className="text-[10px] gap-1 h-6">
                          <CheckCircle2 className="h-3 w-3" />Posted
                        </Badge>
                      ) : item.status === 'failed' ? (
                        <Badge variant="destructive" className="text-[10px] gap-1 h-6">
                          <XCircle className="h-3 w-3" />Failed
                        </Badge>
                      ) : existingDraft ? (
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/app/posts?tab=compose&draft=${existingDraft.id}`)} className="h-7 text-xs gap-1.5">
                          <FileText className="h-3 w-3" />View Draft
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleCreatePost(item.id, item.title || undefined)} className="h-7 text-xs gap-1.5">
                          <Send className="h-3 w-3" />Create Post
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {/* Full content modal */}
      <Dialog open={!!viewingArticle} onOpenChange={(open) => !open && setViewingArticle(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-5 border-b border-border space-y-3">
            <DialogTitle className="leading-snug text-xl font-bold tracking-tight pr-8">{viewingArticle?.title || 'Article Content'}</DialogTitle>
            <div className="flex items-center gap-3 flex-wrap">
              {viewingArticle?.published_at && (
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {format(new Date(viewingArticle.published_at), 'MMMM d, yyyy · h:mm a')}
                </span>
              )}
              {viewingArticle?.full_content ? (
                <Badge variant="outline" className="text-[10px] py-0 h-5 gap-1 border-blue-500/30 text-blue-600">
                  <Globe className="h-2.5 w-2.5" />Scraped
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] py-0 h-5 gap-1 border-orange-500/30 text-orange-600">
                  <Rss className="h-2.5 w-2.5" />RSS
                </Badge>
              )}
              {viewingArticle?.link && (
                <a href={viewingArticle.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 ml-auto">
                  Open original <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          {/* Article image */}
          {viewingArticle?.image_url && (
            <div className="px-8 pt-6">
              <img
                src={viewingArticle.image_url}
                alt=""
                className="w-full max-h-56 object-cover rounded-xl"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}

          {/* Content */}
          <ScrollArea className="flex-1 min-h-0 max-h-[55vh]">
            <article className="px-8 py-6">
              <div className="prose prose-base dark:prose-invert max-w-none prose-headings:text-foreground prose-headings:font-bold prose-h1:text-xl prose-h1:mt-8 prose-h1:mb-3 prose-h2:text-lg prose-h2:mt-7 prose-h2:mb-3 prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2 prose-p:text-muted-foreground prose-p:leading-7 prose-p:mb-4 prose-strong:text-foreground prose-a:text-primary prose-li:text-muted-foreground prose-li:leading-7 prose-ul:my-3 prose-ol:my-3 prose-blockquote:border-primary/30 prose-blockquote:text-muted-foreground prose-hr:border-border prose-hr:my-6">
                {viewingArticle?.full_content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {viewingArticle.full_content}
                  </ReactMarkdown>
                ) : viewingArticle?.description ? (
                  <p className="text-muted-foreground leading-7">{viewingArticle.description}</p>
                ) : (
                  <p className="text-muted-foreground italic">No content available for this article.</p>
                )}
              </div>
            </article>
          </ScrollArea>

          {/* Footer */}
          <div className="px-8 py-5 border-t border-border flex items-center justify-between bg-muted/30">
            <div>
              {viewingArticle?.link && (
                <Button variant="outline" size="sm" onClick={handleScrapeArticle} disabled={isScraping} className="gap-1.5">
                  {isScraping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
                  {isScraping ? 'Scraping…' : viewingArticle?.full_content ? 'Re-scrape' : 'Scrape Content'}
                </Button>
              )}
            </div>
            <Button onClick={() => { if (viewingArticle) { handleCreatePost(viewingArticle.id, viewingArticle.title || undefined); setViewingArticle(null); } }}>
              <Send className="h-4 w-4 mr-2" />Create Post
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <AutomationPickerDialog
        articleId={automationArticle?.id || ''}
        articleTitle={automationArticle?.title || ''}
        open={!!automationArticle}
        onOpenChange={(open) => { if (!open) setAutomationArticle(null); }}
        onComplete={() => refetchItems()}
      />
    </div>
  );
}
