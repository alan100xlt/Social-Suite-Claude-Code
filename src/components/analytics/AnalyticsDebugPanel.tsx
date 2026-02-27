import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronUp, Database, RefreshCw } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface AccountSnapshot {
  id: string;
  account_id: string;
  platform: string;
  followers: number;
  following: number;
  posts_count: number;
  impressions: number;
  reach: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagement_rate: number;
  snapshot_date: string;
  created_at: string;
  is_active: boolean;
}

interface PostSnapshot {
  id: string;
  post_id: string;
  platform: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagement_rate: number;
  snapshot_date: string;
  created_at: string;
}

export function AnalyticsDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: company } = useCompany();
  const companyId = company?.id;

  const {
    data: accountSnapshots,
    isLoading: accountsLoading,
    refetch: refetchAccounts,
  } = useQuery({
    queryKey: ["debug-account-snapshots", companyId],
    queryFn: async (): Promise<AccountSnapshot[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("account_analytics_snapshots")
        .select("*")
        .eq("company_id", companyId)
        .order("snapshot_date", { ascending: false })
        .order("platform", { ascending: true })
        .limit(50);

      if (error) throw error;
      return data as AccountSnapshot[];
    },
    enabled: !!companyId && isOpen,
  });

  const {
    data: postSnapshots,
    isLoading: postsLoading,
    refetch: refetchPosts,
  } = useQuery({
    queryKey: ["debug-post-snapshots", companyId],
    queryFn: async (): Promise<PostSnapshot[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("post_analytics_snapshots")
        .select("*")
        .eq("company_id", companyId)
        .order("snapshot_date", { ascending: false })
        .order("platform", { ascending: true })
        .limit(50);

      if (error) throw error;
      return data as PostSnapshot[];
    },
    enabled: !!companyId && isOpen,
  });

  const handleRefresh = () => {
    refetchAccounts();
    refetchPosts();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const lastAccountSync = accountSnapshots?.[0]?.created_at;
  const lastPostSync = postSnapshots?.[0]?.created_at;

  return (
    <Card className="border-dashed border-muted-foreground/30">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base font-medium">
                  Database Debug Panel
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  Dev
                </Badge>
              </div>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Refresh Button & Sync Info */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {lastAccountSync && (
                  <span>
                    Last account sync:{" "}
                    {formatDistanceToNow(new Date(lastAccountSync), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={accountsLoading || postsLoading}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${
                    accountsLoading || postsLoading ? "animate-spin" : ""
                  }`}
                />
                Refresh Data
              </Button>
            </div>

            {/* Account Snapshots Table */}
            <div>
              <h3 className="text-sm font-medium mb-2">
                Account Analytics Snapshots
                <Badge variant="secondary" className="ml-2">
                  {accountSnapshots?.length || 0} records
                </Badge>
              </h3>
              {accountsLoading ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  Loading...
                </div>
              ) : accountSnapshots && accountSnapshots.length > 0 ? (
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead>Account ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Followers</TableHead>
                        <TableHead className="text-right">Impr.</TableHead>
                        <TableHead className="text-right">Reach</TableHead>
                        <TableHead className="text-right">Views</TableHead>
                        <TableHead className="text-right">Likes</TableHead>
                        <TableHead className="text-right">Comments</TableHead>
                        <TableHead className="text-right">Shares</TableHead>
                        <TableHead className="text-right">Clicks</TableHead>
                        <TableHead className="text-right">Eng %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accountSnapshots.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs">
                            {format(new Date(row.snapshot_date), "MMM d")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {row.platform}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs truncate max-w-[100px]">
                            {row.account_id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={row.is_active ? "default" : "destructive"} 
                              className="text-xs"
                            >
                              {row.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatNumber(row.followers)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(row.impressions)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(row.reach)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(row.views)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(row.likes)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(row.comments)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(row.shares)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(row.clicks)}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.engagement_rate.toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
                  No account snapshots found
                </div>
              )}
            </div>

            {/* Post Snapshots Table */}
            <div>
              <h3 className="text-sm font-medium mb-2">
                Post Analytics Snapshots
                <Badge variant="secondary" className="ml-2">
                  {postSnapshots?.length || 0} records
                </Badge>
              </h3>
              {postsLoading ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  Loading...
                </div>
              ) : postSnapshots && postSnapshots.length > 0 ? (
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead>Post ID</TableHead>
                        <TableHead className="text-right">Impr.</TableHead>
                        <TableHead className="text-right">Reach</TableHead>
                        <TableHead className="text-right">Likes</TableHead>
                        <TableHead className="text-right">Comments</TableHead>
                        <TableHead className="text-right">Shares</TableHead>
                        <TableHead className="text-right">Clicks</TableHead>
                        <TableHead className="text-right">Eng %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {postSnapshots.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs">
                            {format(new Date(row.snapshot_date), "MMM d")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {row.platform}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs truncate max-w-[100px]">
                            {row.post_id.slice(0, 8)}...
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(row.impressions)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(row.reach)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(row.likes)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(row.comments)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(row.shares)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(row.clicks)}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.engagement_rate.toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
                  No post snapshots found
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
