import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface AccountSnapshot {
  id: string;
  account_id: string;
  platform: string;
  followers: number;
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
  content: string | null;
}

interface DataStatsDialogProps {
  children: React.ReactNode;
}

export function DataStatsDialog({ children }: DataStatsDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: company } = useCompany();
  const companyId = company?.id;

  const {
    data: accountSnapshots,
    isLoading: accountsLoading,
    refetch: refetchAccounts,
  } = useQuery({
    queryKey: ["dialog-account-snapshots", companyId],
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
    enabled: !!companyId && open,
  });

  const {
    data: postSnapshots,
    isLoading: postsLoading,
    refetch: refetchPosts,
  } = useQuery({
    queryKey: ["dialog-post-snapshots", companyId],
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
    enabled: !!companyId && open,
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

  const isLoading = accountsLoading || postsLoading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-muted-foreground" />
              <DialogTitle>Raw Analytics Data</DialogTitle>
              <Badge variant="outline" className="text-xs">
                Dev
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="mr-8"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="posts" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="flex-shrink-0">
            <TabsTrigger value="posts">
              Post Snapshots
              <Badge variant="secondary" className="ml-2 text-xs">
                {postSnapshots?.length || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="accounts">
              Account Snapshots
              <Badge variant="secondary" className="ml-2 text-xs">
                {accountSnapshots?.length || 0}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="flex-1 overflow-auto mt-4">
            {postsLoading ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                Loading...
              </div>
            ) : postSnapshots && postSnapshots.length > 0 ? (
              <div className="border rounded-lg">
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
                          {row.engagement_rate.toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-8 text-center border rounded-lg">
                No post snapshots found
              </div>
            )}
          </TabsContent>

          <TabsContent value="accounts" className="flex-1 overflow-auto mt-4">
            {accountsLoading ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                Loading...
              </div>
            ) : accountSnapshots && accountSnapshots.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Account ID</TableHead>
                      <TableHead className="text-right">Followers</TableHead>
                      <TableHead className="text-right">Impr.</TableHead>
                      <TableHead className="text-right">Reach</TableHead>
                      <TableHead className="text-right">Likes</TableHead>
                      <TableHead className="text-right">Comments</TableHead>
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
                          {formatNumber(row.likes)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(row.comments)}
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
              <div className="text-sm text-muted-foreground py-8 text-center border rounded-lg">
                No account snapshots found
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
