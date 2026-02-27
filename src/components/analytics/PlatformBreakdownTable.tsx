import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Platform } from "@/lib/api/getlate";
import { FaInstagram, FaTwitter, FaLinkedin, FaFacebook, FaTiktok, FaYoutube, FaPinterest, FaReddit, FaTelegram, FaSnapchat } from "react-icons/fa";
import { SiBluesky, SiThreads } from "react-icons/si";
import { Users, FileText, Eye, Heart, MessageCircle, Share2, MousePointerClick, TrendingUp } from "lucide-react";

interface PlatformMetrics {
  platform: Platform;
  followers: number;
  following: number;
  postsCount: number;
  impressions: number;
  reach: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagementRate: number;
  totalEngagement: number;
}

interface PlatformBreakdownTableProps {
  data: PlatformMetrics[];
  isLoading?: boolean;
}

const platformConfig: Record<Platform, { 
  icon: React.ElementType; 
  name: string; 
  colorClass: string;
  bgClass: string;
}> = {
  instagram: { icon: FaInstagram, name: "Instagram", colorClass: "text-pink-500", bgClass: "bg-pink-500/10" },
  twitter: { icon: FaTwitter, name: "Twitter", colorClass: "text-sky-500", bgClass: "bg-sky-500/10" },
  facebook: { icon: FaFacebook, name: "Facebook", colorClass: "text-blue-600", bgClass: "bg-blue-600/10" },
  linkedin: { icon: FaLinkedin, name: "LinkedIn", colorClass: "text-blue-700", bgClass: "bg-blue-700/10" },
  tiktok: { icon: FaTiktok, name: "TikTok", colorClass: "text-foreground", bgClass: "bg-foreground/10" },
  youtube: { icon: FaYoutube, name: "YouTube", colorClass: "text-red-600", bgClass: "bg-red-600/10" },
  pinterest: { icon: FaPinterest, name: "Pinterest", colorClass: "text-red-500", bgClass: "bg-red-500/10" },
  reddit: { icon: FaReddit, name: "Reddit", colorClass: "text-orange-500", bgClass: "bg-orange-500/10" },
  bluesky: { icon: SiBluesky, name: "Bluesky", colorClass: "text-sky-400", bgClass: "bg-sky-400/10" },
  threads: { icon: SiThreads, name: "Threads", colorClass: "text-foreground", bgClass: "bg-foreground/10" },
  "google-business": { icon: FaFacebook, name: "Google", colorClass: "text-green-500", bgClass: "bg-green-500/10" },
  telegram: { icon: FaTelegram, name: "Telegram", colorClass: "text-blue-400", bgClass: "bg-blue-400/10" },
  snapchat: { icon: FaSnapchat, name: "Snapchat", colorClass: "text-yellow-400", bgClass: "bg-yellow-400/10" },
};

const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

export function PlatformBreakdownTable({ data, isLoading }: PlatformBreakdownTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading platform data...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No platform data available</p>
        <p className="text-sm text-muted-foreground mt-1">
          Connect accounts and sync analytics to see breakdown
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[180px]">Platform</TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Followers
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Posts
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                Views
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                Impressions
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <Heart className="w-3.5 h-3.5" />
                Likes
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" />
                Comments
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <Share2 className="w-3.5 h-3.5" />
                Shares
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <MousePointerClick className="w-3.5 h-3.5" />
                Clicks
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Eng. Rate
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const config = platformConfig[row.platform] || {
              icon: Users,
              name: row.platform,
              colorClass: "text-muted-foreground",
              bgClass: "bg-muted",
            };
            const Icon = config.icon;

            return (
              <TableRow key={row.platform}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", config.bgClass)}>
                      <Icon className={cn("w-4 h-4", config.colorClass)} />
                    </div>
                    <span className="font-medium">{config.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatNumber(row.followers)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatNumber(row.postsCount)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatNumber(row.views || 0)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatNumber(row.impressions)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatNumber(row.likes)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatNumber(row.comments)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatNumber(row.shares)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatNumber(row.clicks)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "font-medium",
                      row.engagementRate >= 3 && "bg-success/10 text-success",
                      row.engagementRate >= 1 && row.engagementRate < 3 && "bg-warning/10 text-warning",
                      row.engagementRate < 1 && "bg-muted text-muted-foreground"
                    )}
                  >
                    {row.engagementRate.toFixed(2)}%
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
