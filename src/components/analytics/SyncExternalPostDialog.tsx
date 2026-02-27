import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useAccounts } from "@/hooks/useGetLateAccounts";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Loader2, Link2, Plus, CheckCircle, AlertCircle, FileText, Info, 
  Sparkles, Download, Eye 
} from "lucide-react";
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaYoutube, FaTiktok } from "react-icons/fa";
import { cn } from "@/lib/utils";

const platformIcons: Record<string, React.ElementType> = {
  facebook: FaFacebook,
  instagram: FaInstagram,
  twitter: FaTwitter,
  linkedin: FaLinkedin,
  youtube: FaYoutube,
  tiktok: FaTiktok,
};

// URL validation patterns for different platforms
const urlPatterns: Record<string, RegExp> = {
  facebook: /^https?:\/\/(www\.)?(facebook\.com|fb\.com|fb\.watch)\/.+/i,
  instagram: /^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/.+/i,
  twitter: /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/.+\/status\/.+/i,
  linkedin: /^https?:\/\/(www\.)?linkedin\.com\/(posts|feed\/update)\/.+/i,
  youtube: /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/i,
  tiktok: /^https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com)\/.+/i,
};

const singleFormSchema = z.object({
  accountId: z.string().min(1, "Please select an account"),
  postUrl: z
    .string()
    .trim()
    .min(1, "Post URL is required")
    .max(2048, "URL is too long")
    .url("Please enter a valid URL"),
});

const bulkFormSchema = z.object({
  accountId: z.string().min(1, "Please select an account"),
  postUrls: z
    .string()
    .trim()
    .min(1, "At least one URL is required")
    .max(50000, "Too many URLs"),
});

type SingleFormValues = z.infer<typeof singleFormSchema>;
type BulkFormValues = z.infer<typeof bulkFormSchema>;

interface SyncResult {
  url: string;
  success: boolean;
  postId?: string;
  error?: string;
}

interface DiscoveredPost {
  id: string;
  url: string;
  message: string;
  createdAt: string;
  type?: string;
  thumbnail?: string;
  selected: boolean;
}

export function SyncExternalPostDialog() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"single" | "bulk" | "auto">("single");
  const [syncing, setSyncing] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [results, setResults] = useState<SyncResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [discoveredPosts, setDiscoveredPosts] = useState<DiscoveredPost[]>([]);
  const [autoAccountId, setAutoAccountId] = useState("");
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const singleForm = useForm<SingleFormValues>({
    resolver: zodResolver(singleFormSchema),
    defaultValues: { accountId: "", postUrl: "" },
  });

  const bulkForm = useForm<BulkFormValues>({
    resolver: zodResolver(bulkFormSchema),
    defaultValues: { accountId: "", postUrls: "" },
  });

  const selectedAccountSingle = accounts?.find((a) => a.id === singleForm.watch("accountId"));
  const selectedAccountBulk = accounts?.find((a) => a.id === bulkForm.watch("accountId"));
  const selectedAccountAuto = accounts?.find((a) => a.id === autoAccountId);
  
  // Filter Facebook accounts for auto-discover
  const facebookAccounts = accounts?.filter((a) => a.platform === "facebook") || [];

  // Auto-select if only one Facebook account
  useEffect(() => {
    if (facebookAccounts.length === 1 && !autoAccountId) {
      const firstId = facebookAccounts[0]?.id;
      if (firstId) {
        setAutoAccountId(firstId);
        console.log('[SyncDialog] Auto-selected Facebook account:', firstId);
      }
    }
  }, [facebookAccounts, autoAccountId]);
  
  // Debug: log when autoAccountId changes
  useEffect(() => {
    if (autoAccountId) {
      const resolved = accounts?.find((a) => a.id === autoAccountId);
      console.log('[SyncDialog] autoAccountId changed:', autoAccountId, 'resolved account:', resolved?.id);
    }
  }, [autoAccountId, accounts]);

  const validateUrlForPlatform = (url: string, platform: string): boolean => {
    const pattern = urlPatterns[platform];
    if (!pattern) return true;
    return pattern.test(url);
  };

  const parseUrls = (text: string): string[] => {
    const urlRegex = /https?:\/\/[^\s,]+/gi;
    const matches = text.match(urlRegex) || [];
    return [...new Set(matches.map(url => url.trim()).filter(url => url.length > 0))];
  };

  const syncSinglePost = async (accountId: string, postUrl: string): Promise<SyncResult> => {
    try {
      const { data, error } = await supabase.functions.invoke("getlate-analytics", {
        body: { action: "sync", accountId, postUrl },
      });

      if (error || !data.success) {
        return { url: postUrl, success: false, error: error?.message || data?.error || "Failed to sync" };
      }
      return { url: postUrl, success: true, postId: data.analytics?.postId || data.analytics?.id };
    } catch (err) {
      return { url: postUrl, success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  };

  const onSingleSubmit = async (values: SingleFormValues) => {
    // Guardrail: block if accountId is missing
    if (!values.accountId) {
      toast({ variant: "destructive", title: "Select an account first" });
      return;
    }
    
    if (!selectedAccountSingle) {
      toast({ variant: "destructive", title: "Account not found", description: "Please reselect an account" });
      return;
    }

    if (!validateUrlForPlatform(values.postUrl, selectedAccountSingle.platform)) {
      singleForm.setError("postUrl", {
        type: "manual",
        message: `This doesn't look like a valid ${selectedAccountSingle.platform} post URL`,
      });
      return;
    }

    console.log('[SyncDialog] Single sync starting with accountId:', values.accountId);
    setSyncing(true);
    const result = await syncSinglePost(values.accountId, values.postUrl);
    setResults((prev) => [...prev, result]);

    if (result.success) {
      toast({ title: "Post synced successfully" });
      singleForm.setValue("postUrl", "");
      invalidateQueries();
    } else {
      toast({ variant: "destructive", title: "Sync failed", description: result.error });
    }
    setSyncing(false);
  };

  const onBulkSubmit = async (values: BulkFormValues) => {
    // Guardrail: block if accountId is missing
    if (!values.accountId) {
      toast({ variant: "destructive", title: "Select an account first" });
      return;
    }
    
    if (!selectedAccountBulk) {
      toast({ variant: "destructive", title: "Account not found", description: "Please reselect an account" });
      return;
    }

    const urls = parseUrls(values.postUrls);
    if (urls.length === 0) {
      bulkForm.setError("postUrls", { type: "manual", message: "No valid URLs found" });
      return;
    }

    if (urls.length > 100) {
      bulkForm.setError("postUrls", { type: "manual", message: "Maximum 100 URLs per batch" });
      return;
    }

    console.log('[SyncDialog] Bulk sync starting with accountId:', values.accountId, 'URLs:', urls.length);
    setSyncing(true);
    setProgress({ current: 0, total: urls.length });
    setResults([]);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      
      if (!validateUrlForPlatform(url, selectedAccountBulk.platform)) {
        setResults((prev) => [...prev, { url, success: false, error: `Invalid ${selectedAccountBulk.platform} URL` }]);
        failCount++;
      } else {
        const result = await syncSinglePost(values.accountId, url);
        setResults((prev) => [...prev, result]);
        if (result.success) successCount++;
        else failCount++;
      }

      setProgress({ current: i + 1, total: urls.length });
      if (i < urls.length - 1) await new Promise((resolve) => setTimeout(resolve, 200));
    }

    setSyncing(false);
    invalidateQueries();
    toast({ title: "Bulk sync complete", description: `${successCount} succeeded, ${failCount} failed` });
  };

  const discoverPosts = async () => {
    if (!autoAccountId) {
      toast({ variant: "destructive", title: "Please select a Facebook account" });
      return;
    }

    setDiscovering(true);
    setDiscoveredPosts([]);

    try {
      const { data, error } = await supabase.functions.invoke("facebook-posts", {
        body: { action: "discover", accountId: autoAccountId, limit: 50 },
      });

      if (error || !data.success) {
        toast({
          variant: "destructive",
          title: "Discovery failed",
          description: error?.message || data?.error || "Failed to fetch posts from Facebook",
        });
        setDiscovering(false);
        return;
      }

      const posts: DiscoveredPost[] = data.posts.map((p: any) => ({
        ...p,
        selected: true,
      }));

      setDiscoveredPosts(posts);
      toast({ title: `Found ${posts.length} posts`, description: "Select posts to sync" });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Discovery failed",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setDiscovering(false);
    }
  };

  const syncSelectedPosts = async () => {
    const selectedPosts = discoveredPosts.filter((p) => p.selected);
    if (selectedPosts.length === 0) {
      toast({ variant: "destructive", title: "No posts selected" });
      return;
    }

    setSyncing(true);
    setProgress({ current: 0, total: selectedPosts.length });
    setResults([]);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedPosts.length; i++) {
      const post = selectedPosts[i];
      const result = await syncSinglePost(autoAccountId, post.url);
      setResults((prev) => [...prev, result]);
      
      if (result.success) successCount++;
      else failCount++;

      setProgress({ current: i + 1, total: selectedPosts.length });
      if (i < selectedPosts.length - 1) await new Promise((resolve) => setTimeout(resolve, 200));
    }

    setSyncing(false);
    invalidateQueries();
    toast({ title: "Sync complete", description: `${successCount} synced, ${failCount} failed` });
  };

  const togglePostSelection = (postId: string) => {
    setDiscoveredPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, selected: !p.selected } : p))
    );
  };

  const toggleAllPosts = (selected: boolean) => {
    setDiscoveredPosts((prev) => prev.map((p) => ({ ...p, selected })));
  };

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["debug-post-snapshots"] });
    queryClient.invalidateQueries({ queryKey: ["platform-breakdown"] });
    queryClient.invalidateQueries({ queryKey: ["historical-analytics"] });
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen && !syncing && !discovering) {
      singleForm.reset();
      bulkForm.reset();
      setResults([]);
      setProgress({ current: 0, total: 0 });
      setDiscoveredPosts([]);
      setAutoAccountId("");
    }
    if (!syncing && !discovering) setOpen(isOpen);
  };

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const selectedPostCount = discoveredPosts.filter((p) => p.selected).length;

  const AccountSelect = ({ form, name }: { form: typeof singleForm | typeof bulkForm; name: "accountId" }) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Account</FormLabel>
          <Select
            onValueChange={(value) => {
              if (value !== "_placeholder") field.onChange(value);
            }}
            value={field.value}
            disabled={syncing}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select a connected account" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {accountsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : accounts && accounts.length > 0 ? (
                <>
                  <SelectItem value="_placeholder" disabled>
                    Select an account...
                  </SelectItem>
                  {accounts.map((account) => {
                    // Display Facebook page name if available, fallback to username/displayName
                    const metadata = account.metadata as Record<string, unknown> | undefined;
                    const label = (metadata?.selectedPageName as string) || account.displayName || account.username || account.platform;
                    return (
                      <SelectItem key={account.id} value={account.id}>
                        {label} ({account.platform})
                      </SelectItem>
                    );
                  })}
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">No accounts connected</div>
              )}
            </SelectContent>
          </Select>
          <FormDescription>Choose the account that owns the posts</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link2 className="w-4 h-4 mr-2" />
          Sync External Posts
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Sync External Posts</DialogTitle>
          <DialogDescription>
            Import analytics from posts made directly on social media platforms.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "single" | "bulk" | "auto")} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="auto" disabled={syncing || discovering}>
              <Sparkles className="w-4 h-4 mr-2" />
              Auto-Discover
            </TabsTrigger>
            <TabsTrigger value="single" disabled={syncing || discovering}>
              <Link2 className="w-4 h-4 mr-2" />
              Single URL
            </TabsTrigger>
            <TabsTrigger value="bulk" disabled={syncing || discovering}>
              <FileText className="w-4 h-4 mr-2" />
              Bulk Import
            </TabsTrigger>
          </TabsList>

          {/* Auto-Discover Mode */}
          <TabsContent value="auto" className="mt-4 flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Account Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Facebook Account</label>
              <Select
                value={autoAccountId}
                onValueChange={(value) => {
                  if (value !== "_placeholder") setAutoAccountId(value);
                }}
                disabled={syncing || discovering}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a Facebook page" />
                </SelectTrigger>
                <SelectContent>
                  {accountsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : facebookAccounts.length > 0 ? (
                    <>
                      <SelectItem value="_placeholder" disabled>
                        Select a Facebook page...
                      </SelectItem>
                      {facebookAccounts.map((account) => {
                        // Display Facebook page name from metadata if available
                        const metadata = account.metadata as Record<string, unknown> | undefined;
                        const pageName = (metadata?.selectedPageName as string) || account.displayName || account.username || "Facebook Page";
                        return (
                          <SelectItem key={account.id} value={account.id}>
                            {pageName}
                          </SelectItem>
                        );
                      })}
                    </>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No Facebook pages connected
                    </div>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {facebookAccounts.length > 0 
                  ? `${facebookAccounts.length} Facebook account(s) available`
                  : "Connect a Facebook page in Connections to enable auto-discovery"}
              </p>
            </div>

            {/* Discover Button */}
            {discoveredPosts.length === 0 && (
              <Button 
                onClick={discoverPosts} 
                disabled={!autoAccountId || discovering}
                className="w-full"
              >
                {discovering ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Discovering posts...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Discover Posts from Facebook
                  </>
                )}
              </Button>
            )}

            {/* Discovered Posts List */}
            {discoveredPosts.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Found {discoveredPosts.length} posts ({selectedPostCount} selected)
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => toggleAllPosts(true)}>
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleAllPosts(false)}>
                      Deselect All
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 border rounded-lg max-h-[200px]">
                  <div className="p-2 space-y-1">
                    {discoveredPosts.map((post) => (
                      <div
                        key={post.id}
                        className={cn(
                          "flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                          post.selected ? "bg-primary/10" : "hover:bg-muted"
                        )}
                        onClick={() => togglePostSelection(post.id)}
                      >
                        <Checkbox checked={post.selected} className="mt-1" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{post.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Progress */}
                {syncing && progress.total > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Syncing posts...</span>
                      <span>{progress.current} / {progress.total}</span>
                    </div>
                    <Progress value={(progress.current / progress.total) * 100} />
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDiscoveredPosts([])} disabled={syncing}>
                    Clear
                  </Button>
                  <Button onClick={syncSelectedPosts} disabled={syncing || selectedPostCount === 0}>
                    {syncing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Sync {selectedPostCount} Posts
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}

            {facebookAccounts.length === 0 && (
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <FaFacebook className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Connect a Facebook page to use auto-discovery
                </p>
              </div>
            )}
          </TabsContent>

          {/* Single URL Mode */}
          <TabsContent value="single" className="mt-4">
            <Form {...singleForm}>
              <form onSubmit={singleForm.handleSubmit(onSingleSubmit)} className="space-y-4">
                <AccountSelect form={singleForm} name="accountId" />

                <FormField
                  control={singleForm.control}
                  name="postUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Post URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={
                            selectedAccountSingle?.platform === "facebook"
                              ? "https://facebook.com/..."
                              : selectedAccountSingle?.platform === "instagram"
                              ? "https://instagram.com/p/..."
                              : "https://..."
                          }
                          disabled={syncing}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>The public URL of the post</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={syncing}>
                    Done
                  </Button>
                  <Button type="submit" disabled={syncing || !singleForm.watch("accountId")}>
                    {syncing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Sync Post
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* Bulk Import Mode */}
          <TabsContent value="bulk" className="mt-4">
            <Form {...bulkForm}>
              <form onSubmit={bulkForm.handleSubmit(onBulkSubmit)} className="space-y-4">
                <AccountSelect form={bulkForm} name="accountId" />

                <FormField
                  control={bulkForm.control}
                  name="postUrls"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Post URLs</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Paste multiple URLs here, one per line:&#10;&#10;https://facebook.com/post1&#10;https://facebook.com/post2"
                          className="min-h-[120px] font-mono text-sm"
                          disabled={syncing}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Up to 100 URLs (one per line or comma-separated)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {bulkForm.watch("postUrls") && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="w-4 h-4" />
                    <span>{parseUrls(bulkForm.watch("postUrls")).length} URLs detected</span>
                  </div>
                )}

                {syncing && progress.total > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Syncing posts...</span>
                      <span>{progress.current} / {progress.total}</span>
                    </div>
                    <Progress value={(progress.current / progress.total) * 100} />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={syncing}>
                    Done
                  </Button>
                  <Button type="submit" disabled={syncing || !bulkForm.watch("accountId")}>
                    {syncing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Sync All
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>

        {/* Results Summary */}
        {results.length > 0 && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="secondary" className="bg-success/10 text-success">
                <CheckCircle className="w-3 h-3 mr-1" />
                {successCount} succeeded
              </Badge>
              {failCount > 0 && (
                <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {failCount} failed
                </Badge>
              )}
            </div>

            {failCount > 0 && (
              <ScrollArea className="max-h-24">
                <div className="space-y-1">
                  {results
                    .filter((r) => !r.success)
                    .map((result, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 text-xs p-2 rounded bg-destructive/10 text-destructive"
                      >
                        <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="truncate font-mono">{result.url}</p>
                          <p className="text-destructive/80">{result.error}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
