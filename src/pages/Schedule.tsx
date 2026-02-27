import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FaInstagram, FaTwitter, FaLinkedin, FaFacebook, FaTiktok, FaYoutube } from "react-icons/fa";
import { SiBluesky, SiThreads } from "react-icons/si";
import { Loader2, Plus, Calendar } from "lucide-react";
import { usePosts } from "@/hooks/useGetLatePosts";
import { useAccounts } from "@/hooks/useGetLateAccounts";
import { useNavigate } from "react-router-dom";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { Platform, GetLatePost } from "@/lib/api/getlate";

const platformIcons: Record<Platform, React.ElementType> = {
  instagram: FaInstagram,
  twitter: FaTwitter,
  facebook: FaFacebook,
  linkedin: FaLinkedin,
  tiktok: FaTiktok,
  youtube: FaYoutube,
  pinterest: FaYoutube,
  reddit: FaYoutube,
  bluesky: SiBluesky,
  threads: SiThreads,
  "google-business": FaFacebook,
  telegram: FaFacebook,
  snapchat: FaFacebook,
};

const platformColors: Record<Platform, string> = {
  instagram: "bg-instagram",
  twitter: "bg-twitter",
  facebook: "bg-facebook",
  linkedin: "bg-linkedin",
  tiktok: "bg-tiktok",
  youtube: "bg-destructive",
  pinterest: "bg-destructive",
  reddit: "bg-destructive",
  bluesky: "bg-twitter",
  threads: "bg-foreground",
  "google-business": "bg-success",
  telegram: "bg-twitter",
  snapchat: "bg-warning",
};

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hours = Array.from({ length: 12 }, (_, i) => `${i + 6}:00`);

export default function SchedulePage() {
  const navigate = useNavigate();
  const { data: posts, isLoading: postsLoading } = usePosts({ status: 'scheduled' });
  const { data: accounts } = useAccounts();

  // Get the week dates starting from Monday
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Get platform for a post
  const getPostPlatform = (post: GetLatePost): Platform => {
    if (post.platformResults && post.platformResults.length > 0) {
      return post.platformResults[0].platform;
    }
    if (post.accountIds && post.accountIds.length > 0 && accounts) {
      const account = accounts.find(a => a.id === post.accountIds[0]);
      return (account?.platform as Platform) || "twitter";
    }
    return "twitter";
  };

  // Find post for a specific day and hour
  const getPostForSlot = (date: Date, hour: string): GetLatePost | undefined => {
    const hourNum = parseInt(hour.split(":")[0]);
    return posts?.find(post => {
      if (!post.scheduledFor) return false;
      const postDate = parseISO(post.scheduledFor);
      return isSameDay(postDate, date) && postDate.getHours() === hourNum;
    });
  };

  // Sort posts by scheduled date
  const sortedPosts = [...(posts || [])].sort((a, b) => {
    const dateA = new Date(a.scheduledFor || 0);
    const dateB = new Date(b.scheduledFor || 0);
    return dateA.getTime() - dateB.getTime();
  });

  const weekLabel = `${format(weekStart, "MMM d")} - ${format(addDays(weekStart, 6), "d, yyyy")}`;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Schedule
          </h1>
          <p className="text-muted-foreground mt-1">
            Plan and manage your content calendar
          </p>
        </div>
        <Button 
          className="gradient-accent"
          onClick={() => navigate('/create')}
        >
          <Plus size={18} className="mr-2" />
          Schedule Post
        </Button>
      </div>

      {postsLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar View */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>This Week</CardTitle>
                  <Badge variant="secondary" className="font-normal">
                    {weekLabel}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Week Grid */}
                <div className="overflow-x-auto">
                  <div className="min-w-[600px]">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-2 mb-4">
                      {weekDates.map((date, i) => {
                        const isToday = isSameDay(date, today);
                        return (
                          <div
                            key={i}
                            className={cn(
                              "text-center py-2 rounded-lg",
                              isToday && "bg-accent/10"
                            )}
                          >
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">
                              {daysOfWeek[i]}
                            </p>
                            <p className="text-lg font-semibold text-foreground">
                              {format(date, "d")}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Time Slots */}
                    <div className="space-y-2">
                      {hours.slice(0, 6).map((hour) => (
                        <div key={hour} className="grid grid-cols-7 gap-2">
                          {weekDates.map((date, i) => {
                            const post = getPostForSlot(date, hour);
                            const platform = post ? getPostPlatform(post) : null;
                            const Icon = platform ? platformIcons[platform] : null;
                            const colorClass = platform ? platformColors[platform] : "";
                            
                            return (
                              <div
                                key={`${i}-${hour}`}
                                className={cn(
                                  "h-12 rounded-lg border border-border/50 flex items-center justify-center text-xs",
                                  post && `${colorClass} text-white border-transparent`
                                )}
                              >
                                {post && Icon && (
                                  <div className="flex items-center gap-1 px-2">
                                    <Icon className="w-3 h-3" />
                                    <span className="truncate max-w-[60px]">
                                      {format(parseISO(post.scheduledFor!), "h:mm a")}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Posts */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Posts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sortedPosts.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No scheduled posts</p>
                    <Button 
                      variant="link" 
                      className="mt-2 text-primary"
                      onClick={() => navigate('/create')}
                    >
                      Schedule your first post
                    </Button>
                  </div>
                ) : (
                  sortedPosts.map((post) => {
                    const platform = getPostPlatform(post);
                    const Icon = platformIcons[platform];
                    const colorClass = platformColors[platform];
                    
                    return (
                      <div
                        key={post.id}
                        className="flex gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer animate-fade-in"
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                            colorClass
                          )}
                        >
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground line-clamp-1">
                            {post.text}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {post.scheduledFor 
                              ? format(parseISO(post.scheduledFor), "MMM d 'at' h:mm a")
                              : "Not scheduled"
                            }
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
