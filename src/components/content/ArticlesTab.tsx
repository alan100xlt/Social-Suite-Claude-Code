import { useState, useMemo, useCallback, useRef } from 'react';
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
import FlyoutEditor from './FlyoutEditor';
import { OgImagePreview } from './OgImagePreview';
import ContextualCardActions from './ContextualCardActions';
import type { PostState } from '@/hooks/usePostState';
import StatusBadge, { getStatusFromItem } from '@/components/ui/StatusBadge';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, type ColDef, type ICellRendererParams, type GridReadyEvent } from 'ag-grid-community';
import { gridTheme, gridThemeDark } from '@/lib/ag-grid-theme';
import { useTheme } from '@/contexts/ThemeContext';
import { DataGridToolbar } from '@/components/ui/data-grid-toolbar';

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

// --- Enriched row data for AG Grid ---
interface ArticleGridRow {
  item: RssFeedItem;
  platformStatuses: { platform: string; status: 'success' | 'error' | 'not_targeted'; url?: string }[];
  postState: PostState;
  isEditable: boolean;
  hasAnalytics: boolean;
  needsAction: boolean;
  existingDraft: { id: string; title: string | null } | undefined;
  analytics: PostAnalyticsInfo[];
}

// --- Compute post state (same logic as usePostState but without hooks) ---
function computePostState(item: RssFeedItem, isDraft: boolean): { state: PostState; isEditable: boolean; hasAnalytics: boolean; needsAction: boolean } {
  const isPublished = item.status === 'posted';
  const isProcessing = item.status === 'pending' && !isDraft;

  if (isDraft) return { state: 'draft', isEditable: true, hasAnalytics: false, needsAction: true };
  if (isPublished) return { state: 'published', isEditable: false, hasAnalytics: true, needsAction: false };
  if (isProcessing) return { state: 'processing', isEditable: false, hasAnalytics: false, needsAction: false };
  return { state: 'future', isEditable: true, hasAnalytics: false, needsAction: true };
}

export function ArticlesTab() {
  const navigate = useNavigate();
  const { data: feeds, isLoading: feedsLoading } = useRssFeeds();
  const { data: drafts } = usePostDrafts();
  const pollFeed = usePollRssFeed();
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark-pro' || currentTheme === 'aurora';

  const articleDraftMap = useMemo(() => {
    const map = new Map<string, { id: string; title: string | null }>();
    drafts?.forEach(d => {
      if (d.selected_article_id) {
        map.set(d.selected_article_id, { id: d.id, title: d.title });
      }
    });
    return map;
  }, [drafts]);

  const [selectedFeedId, setSelectedFeedId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewingArticle, setViewingArticle] = useState<RssFeedItem | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [automationArticle, setAutomationArticle] = useState<{ id: string; title: string } | null>(null);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState('');
  const gridRef = useRef<AgGridReact<ArticleGridRow>>(null);

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
    return item.status;
  };

  // Build enriched row data
  const rowData = useMemo<ArticleGridRow[]>(() => {
    if (!feedItems) return [];
    const items = statusFilter === 'all' ? feedItems : feedItems.filter(item => getItemDisplayStatus(item) === statusFilter);

    return items.map(item => {
      const isPosted = item.status === 'posted';
      const existingDraft = articleDraftMap.get(item.id);
      const logs = automationLogs?.get(item.id) || [];
      const analytics = item.post_id ? postAnalytics?.get(item.post_id) || [] : [];

      const allPlatforms = new Set<string>();
      logs.forEach(l => l.platforms.forEach(p => allPlatforms.add(p)));
      analytics.forEach(a => allPlatforms.add(a.platform));

      const platformStatuses: ArticleGridRow['platformStatuses'] = [];
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
          platformStatuses.push({ platform, status: 'not_targeted' });
        }
      });

      const isDraft = !!existingDraft;
      const postStateData = computePostState(item, isDraft);

      return {
        item,
        platformStatuses,
        ...postStateData,
        existingDraft,
        analytics,
      };
    });
  }, [feedItems, statusFilter, automationLogs, postAnalytics, articleDraftMap]);

  const pendingCount = feedItems?.filter(i => i.status === 'pending').length || 0;
  const postedCount = feedItems?.filter(i => i.status === 'posted').length || 0;
  const draftCount = feedItems?.filter(i => articleDraftMap.has(i.id)).length || 0;

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  const onExportCsv = useCallback(() => {
    gridRef.current?.api?.exportDataAsCsv({ fileName: 'articles.csv' });
  }, []);

  const colDefs = useMemo<ColDef<ArticleGridRow>[]>(
    () => [
      {
        headerName: 'Title',
        flex: 2,
        minWidth: 250,
        cellRenderer: (params: ICellRendererParams<ArticleGridRow>) => {
          const row = params.data;
          if (!row) return null;
          return (
            <p className="text-sm font-medium text-foreground leading-snug line-clamp-1">
              {row.item.title || 'Untitled Article'}
            </p>
          );
        },
        filter: 'agTextColumnFilter',
        filterValueGetter: (params) => params.data?.item.title || '',
        keyCreator: (params) => params.data?.item.title || '',
      },
      {
        headerName: 'Published',
        width: 130,
        cellRenderer: (params: ICellRendererParams<ArticleGridRow>) => {
          const date = params.data?.item.published_at;
          if (!date) return <span className="text-xs text-muted-foreground">{'\u2014'}</span>;
          return (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {format(new Date(date), 'MMM d, yyyy')}
            </span>
          );
        },
        comparator: (_a: unknown, _b: unknown, nodeA, nodeB) => {
          const ta = nodeA.data?.item.published_at ? new Date(nodeA.data.item.published_at).getTime() : 0;
          const tb = nodeB.data?.item.published_at ? new Date(nodeB.data.item.published_at).getTime() : 0;
          return ta - tb;
        },
      },
      {
        headerName: 'Platforms',
        width: 140,
        cellRenderer: (params: ICellRendererParams<ArticleGridRow>) => {
          const row = params.data;
          if (!row) return null;
          if (row.platformStatuses.length === 0) return <span className="text-xs text-muted-foreground">{'\u2014'}</span>;
          return (
            <div className="flex items-center gap-1.5">
              <TooltipProvider>
                {row.platformStatuses.map(ps => {
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
                          <a href={ps.url} target="_blank" rel="noopener noreferrer" className={cn("inline-flex items-center justify-center h-6 w-6 rounded transition-colors hover:opacity-80", colorClass)} onClick={(e) => e.stopPropagation()}>
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
                })}
              </TooltipProvider>
            </div>
          );
        },
        sortable: false,
        filter: false,
      },
      {
        headerName: 'Actions',
        width: 100,
        cellRenderer: (params: ICellRendererParams<ArticleGridRow>) => {
          const row = params.data;
          if (!row) return null;
          const { item } = row;
          const isPosted = item.status === 'posted';
          return (
            <div className="flex items-center gap-1">
              {item.link && (
                <a href={item.link} target="_blank" rel="noopener noreferrer" title="Open article" className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors" onClick={(e) => e.stopPropagation()}>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <button
                onClick={() => { setViewingArticle(item); setFlyoutOpen(true); }}
                title="Preview content with platform tabs"
                className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              {isPosted && item.post_id && (
                <button onClick={() => navigate(`/app/analytics?tab=posts&postId=${item.post_id}`)} title="View analytics" className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors">
                  <BarChart3 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        },
        sortable: false,
        filter: false,
      },
      {
        headerName: 'Status',
        width: 140,
        cellRenderer: (params: ICellRendererParams<ArticleGridRow>) => {
          const row = params.data;
          if (!row) return null;
          const { item } = row;
          return (
            <div className="flex items-center gap-1">
              {!row.needsAction ? (
                row.hasAnalytics ? (
                  <button
                    onClick={() => navigate(`/app/analytics?tab=posts&postId=${item.post_id}`)}
                    title="View analytics"
                    className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                  </button>
                ) : null
              ) : (
                <ContextualCardActions
                  postState={row.postState}
                  postId={item.post_id}
                  analytics={row.analytics[0]}
                  onEdit={() => {
                    if (row.isEditable) {
                      setViewingArticle(item);
                      setFlyoutOpen(true);
                    }
                  }}
                  onSchedule={() => {
                    toast({ title: 'Scheduling', description: 'Scheduling functionality coming soon!' });
                  }}
                  onPublish={() => {
                    toast({ title: 'Publishing', description: 'Publishing functionality coming soon!' });
                  }}
                  onViewAnalytics={() => {
                    if (item.post_id) {
                      navigate(`/app/analytics?tab=posts&postId=${item.post_id}`);
                    }
                  }}
                />
              )}
              <StatusBadge
                status={getStatusFromItem(item)}
                size="sm"
                showIcon={true}
              />
            </div>
          );
        },
        sortable: false,
        filter: false,
      },
    ],
    [navigate, postAnalytics]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      resizable: true,
      cellStyle: { display: 'flex', alignItems: 'center', overflow: 'hidden' },
    }),
    []
  );

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

      {/* Articles Grid */}
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
      ) : rowData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Filter className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Matching Articles</h3>
            <p className="text-muted-foreground text-center mb-4">No articles match the selected filter.</p>
            <Button variant="outline" onClick={() => setStatusFilter('all')}>Clear Filter</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <DataGridToolbar
            quickFilter={quickFilter}
            onQuickFilterChange={setQuickFilter}
            onExport={onExportCsv}
            quickFilterPlaceholder="Search articles..."
          />
          <div className="relative">
            <style>{`.ag-cell-wrapper { width: 100%; } .ag-cell-value { width: 100%; }`}</style>
            <AgGridReact<ArticleGridRow>
              ref={gridRef}
              theme={isDark ? gridThemeDark : gridTheme}
              modules={[AllCommunityModule]}
              rowData={rowData}
              columnDefs={colDefs}
              defaultColDef={defaultColDef}
              quickFilterText={quickFilter}
              domLayout="autoHeight"
              suppressCellFocus
              animateRows
              onGridReady={onGridReady}
              getRowId={(params) => params.data.item.id}
            />
          </div>
        </>
      )}

      {/* Full content modal */}
      <Dialog open={!!viewingArticle} onOpenChange={(open) => !open && setViewingArticle(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
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

          {viewingArticle && (
            <div className="px-8 pt-4">
              <OgImagePreview
                feedItemId={viewingArticle.id}
                ogImageUrl={viewingArticle.og_image_url}
                ogTemplateId={viewingArticle.og_template_id}
                ogAiReasoning={viewingArticle.og_ai_reasoning}
                hasArticleImage={!!viewingArticle.image_url}
              />
            </div>
          )}

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

          <div className="px-8 py-5 border-t border-border flex items-center justify-between bg-muted/30">
            <div>
              {viewingArticle?.link && (
                <Button variant="outline" size="sm" onClick={handleScrapeArticle} disabled={isScraping} className="gap-1.5">
                  {isScraping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
                  {isScraping ? 'Scraping\u2026' : viewingArticle?.full_content ? 'Re-scrape' : 'Scrape Content'}
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

      <FlyoutEditor
        isOpen={flyoutOpen}
        onClose={() => setFlyoutOpen(false)}
        article={{
          id: viewingArticle?.id || '',
          title: viewingArticle?.title || '',
          content: viewingArticle?.full_content || '',
          media: viewingArticle?.image_url ? [{
            type: 'image',
            url: viewingArticle.image_url,
            alt: viewingArticle.title
          }] : undefined
        }}
      />
    </div>
  );
}
