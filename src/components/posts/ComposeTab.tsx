import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon, Clock, Send, Sparkles, Loader2, AlertCircle,
  Newspaper, ExternalLink, ImageIcon, Upload, X, RefreshCw, Megaphone, MessageCircle, MousePointerClick,
  ArrowLeft, ArrowRight, Check, PenLine, ChevronRight, ThumbsUp, MessageSquare, ShieldCheck, Mail,
  FileText, Trash2, Plus,
} from "lucide-react";
import { FaInstagram, FaTwitter, FaTiktok, FaLinkedin, FaFacebook } from "react-icons/fa";
import { SiBluesky } from "react-icons/si";
import { useAccounts } from "@/hooks/useGetLateAccounts";
import { useCreatePost } from "@/hooks/useGetLatePosts";
import { useGenerateSocialPost } from "@/hooks/useGenerateSocialPost";
import { useAllFeedItems } from "@/hooks/useAllFeedItems";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Platform } from "@/lib/api/getlate";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PostPreview } from "@/components/posts/PostPreview";
import { useSaveDraft, usePostDraft, usePostDrafts, useDeleteDraft } from "@/hooks/usePostDrafts";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";
import { useSelectedCompany } from "@/contexts/SelectedCompanyContext";

const platformIcons: Partial<Record<Platform, React.ElementType>> = {
  instagram: FaInstagram, twitter: FaTwitter, tiktok: FaTiktok, linkedin: FaLinkedin,
  facebook: FaFacebook, bluesky: SiBluesky,
};

const platformColors: Partial<Record<Platform, string>> = {
  instagram: "bg-pink-500", twitter: "bg-sky-500", tiktok: "bg-foreground",
  linkedin: "bg-blue-700", facebook: "bg-blue-600", bluesky: "bg-sky-400",
};

const examplePlatforms: { id: string; platform: Platform; name: string }[] = [
  { id: "example-facebook", platform: "facebook", name: "Facebook Page" },
  { id: "example-instagram", platform: "instagram", name: "Instagram Account" },
  { id: "example-twitter", platform: "twitter", name: "X (Twitter)" },
  { id: "example-linkedin", platform: "linkedin", name: "LinkedIn Profile" },
  { id: "example-bluesky", platform: "bluesky", name: "Bluesky" },
  { id: "example-tiktok", platform: "tiktok", name: "TikTok" },
];

const objectives = [
  { value: "reach", label: "Reach", description: "Maximize visibility and shares", icon: Megaphone },
  { value: "engagement", label: "Engagement", description: "Spark conversation and interaction", icon: MessageCircle },
  { value: "clicks", label: "Clicks", description: "Drive traffic to your link", icon: MousePointerClick },
];

type PostSource = "article" | "scratch" | "automation" | null;
type ComposePhase = "strategy" | "generating" | "checking" | "editing";

const quickActions = [
  "Make it more casual",
  "Add more urgency",
  "Focus on data/stats",
  "Shorter and punchier",
];

interface ComposeTabProps {
  draftId?: string | null;
  onOpenDraft?: (draftId: string) => void;
}

export function ComposeTab({ draftId, onOpenDraft }: ComposeTabProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isSuperAdmin, user } = useAuth();
  const { setSelectedCompanyId } = useSelectedCompany();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: company } = useCompany();
  const saveDraftMutation = useSaveDraft();
  const { data: loadedDraft } = usePostDraft(draftId || null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftId || null);
  const { data: drafts } = usePostDrafts();
  const deleteDraftMutation = useDeleteDraft();
  const createPostMutation = useCreatePost();
  const { generateStrategy, generatePosts, checkCompliance, isGeneratingStrategy, isGeneratingPosts, isCheckingCompliance } = useGenerateSocialPost();
  const { data: feedItems } = useAllFeedItems();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [postSource, setPostSource] = useState<PostSource>(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("09:00");
  const [selectedArticleId, setSelectedArticleId] = useState<string>("");
  const [objective, setObjective] = useState("reach");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Strategy-first compose state
  const [composePhase, setComposePhase] = useState<ComposePhase>("strategy");
  const [strategy, setStrategy] = useState<string | null>(null);
  const [strategyApproved, setStrategyApproved] = useState(false);
  const [platformContents, setPlatformContents] = useState<Record<string, string>>({});
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [strategyRequested, setStrategyRequested] = useState(false);
  const [approvalEmails, setApprovalEmails] = useState<string[]>([]);
  const [approvalEmailInput, setApprovalEmailInput] = useState("");
  const [approvalMemberDropdownOpen, setApprovalMemberDropdownOpen] = useState(false);
  const [isSendingApproval, setIsSendingApproval] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [activePlatformTab, setActivePlatformTab] = useState<Platform>("facebook");
  const [linkAsComment, setLinkAsComment] = useState<Record<string, boolean>>({ instagram: true, facebook: false });

  // Reset selections when company changes (prevents cross-company posting)
  const prevCompanyIdRef = useRef(company?.id);
  useEffect(() => {
    if (company?.id && prevCompanyIdRef.current && company.id !== prevCompanyIdRef.current) {
      console.log('[ComposeTab] Company switched, clearing selections');
      setSelectedAccountIds([]);
      setPlatformContents({});
      setStrategy(null);
      setStrategyRequested(false);
      setStrategyApproved(false);
      setComposePhase("strategy");
      setCurrentDraftId(null);
      setStep(0);
      setPostSource(null);
    }
    prevCompanyIdRef.current = company?.id;
  }, [company?.id]);

  // Load draft data when draftId changes
  useEffect(() => {
    if (loadedDraft) {
      // If draft belongs to a different company, auto-switch for superadmin or block
      if (company?.id && loadedDraft.company_id !== company.id) {
        if (isSuperAdmin) {
          // Auto-switch to the draft's company
          setSelectedCompanyId(loadedDraft.company_id);
          return; // Will re-run after company switches
        }
        console.warn('[ComposeTab] Draft company mismatch, ignoring draft');
        toast({
          title: 'Draft Not Available',
          description: 'This draft belongs to a different company.',
          variant: 'destructive',
        });
        return;
      }

      setPostSource(loadedDraft.post_source as PostSource);
      setSelectedArticleId(loadedDraft.selected_article_id || "");
      setObjective(loadedDraft.objective || "reach");
      setSelectedAccountIds(loadedDraft.selected_account_ids || []);
      setPlatformContents(loadedDraft.platform_contents || {});
      // Restore linkAsComment from draft's platform_contents JSON
      const draftContents = loadedDraft.platform_contents as Record<string, any> || {};
      if (draftContents.link_as_comment && typeof draftContents.link_as_comment === 'object') {
        setLinkAsComment({ instagram: true, facebook: false, ...draftContents.link_as_comment });
      }
      setStrategy(loadedDraft.strategy || null);
      setImageUrl(loadedDraft.image_url || null);
      setStep(loadedDraft.current_step || 0);
      const phase = loadedDraft.compose_phase === "review" ? "editing" : (loadedDraft.compose_phase as ComposePhase) || "strategy";
      setComposePhase(phase);
      setCurrentDraftId(loadedDraft.id);
      if (loadedDraft.strategy) {
        setStrategyRequested(true);
      }
      if (loadedDraft.compose_phase === "editing" || loadedDraft.compose_phase === "review") {
        setStrategyApproved(true);
      }
    }
  }, [loadedDraft, company?.id]);

  // Pre-select article from URL param
  useEffect(() => {
    const articleId = searchParams.get("article");
    if (articleId && feedItems) {
      const found = feedItems.find(i => i.id === articleId);
      if (found) {
        setPostSource("article");
        setSelectedArticleId(articleId);
        if (found.image_url) setImageUrl(found.image_url);
        setStep(2);
      }
    }
  }, [searchParams, feedItems]);

  const selectedArticle = feedItems?.find(i => i.id === selectedArticleId) || null;
  const connectedAccounts = accounts || [];
  const hasAccounts = connectedAccounts.length > 0;
  const isUsingExampleAccounts = !hasAccounts && selectedAccountIds.some(id => id.startsWith('example-'));

  // Auto-save draft when progressing past step 0
  const saveDraft = useCallback(async (overrides?: Record<string, any>) => {
    if (!company) return;
    // Don't save if still on source selection with no source chosen
    if (!postSource && !overrides?.post_source) return;

    const draftData = {
      id: currentDraftId || undefined,
      title: selectedArticle?.title || (postSource === "scratch" ? "Post from Scratch" : null),
      post_source: postSource,
      selected_article_id: selectedArticleId || null,
      objective,
      selected_account_ids: selectedAccountIds,
      platform_contents: { ...platformContents, link_as_comment: linkAsComment },
      strategy,
      image_url: imageUrl,
      current_step: step,
      compose_phase: composePhase,
      ...overrides,
    };

    const result = await saveDraftMutation.mutateAsync(draftData);
    if (result && !currentDraftId) {
      setCurrentDraftId(result.id);
    }
    return result;
  }, [company, currentDraftId, postSource, selectedArticle, selectedArticleId, objective, selectedAccountIds, platformContents, strategy, imageUrl, step, composePhase, saveDraftMutation]);

  // Auto-save when step changes (after step 0)
  const prevStepRef = useRef(step);
  useEffect(() => {
    if (step > 0 && step !== prevStepRef.current) {
      saveDraft();
    }
    prevStepRef.current = step;
  }, [step]);

  // Auto-save when compose phase reaches editing (content generated)
  useEffect(() => {
    if (composePhase === "editing" && Object.keys(platformContents).length > 0) {
      saveDraft();
    }
  }, [composePhase]);

  const steps = useMemo(() => {
    if (postSource === "article" || postSource === "automation") {
      return [
        { key: "source", label: "Source" },
        { key: "article", label: "Article" },
        { key: "objective", label: "Objective" },
        { key: "channels", label: "Channels" },
        { key: "compose", label: "Compose & Preview" },
      ];
    }
    if (postSource === "scratch") {
      return [
        { key: "source", label: "Source" },
        { key: "objective", label: "Objective" },
        { key: "channels", label: "Channels" },
        { key: "compose", label: "Compose & Preview" },
      ];
    }
    return [{ key: "source", label: "Source" }];
  }, [postSource]);

  const currentStepKey = steps[step]?.key || "source";

  const selectedPlatforms = useMemo(() => {
    // From real accounts
    const realPlatforms = connectedAccounts
      .filter(a => selectedAccountIds.includes(a.id))
      .map(a => a.platform);
    // From example platforms (when no real accounts)
    const examplePlats = examplePlatforms
      .filter(e => selectedAccountIds.includes(e.id))
      .map(e => e.platform);
    // From dummy/automation account IDs (e.g. dummy-facebook -> facebook)
    const dummyPlats = selectedAccountIds
      .filter(id => id.startsWith('dummy-'))
      .map(id => id.replace('dummy-', '') as Platform);
    return [...new Set([...realPlatforms, ...examplePlats, ...dummyPlats])];
  }, [connectedAccounts, selectedAccountIds]);

  // Set active platform tab to first selected platform when platforms change
  useEffect(() => {
    if (selectedPlatforms.length > 0 && !selectedPlatforms.includes(activePlatformTab)) {
      setActivePlatformTab(selectedPlatforms[0]);
    }
  }, [selectedPlatforms]);

  // Auto-trigger strategy generation when entering compose step
  useEffect(() => {
    if (currentStepKey === "compose" && !strategyRequested && !strategy) {
      setStrategyRequested(true);
      triggerStrategyGeneration();
    }
  }, [currentStepKey]);

  const triggerStrategyGeneration = useCallback(async (messages?: Array<{ role: string; content: string }>) => {
    const title = selectedArticle?.title || null;
    const description = selectedArticle?.description || null;
    const link = selectedArticle?.link || null;
    const fullContent = selectedArticle?.full_content || null;

    const result = await generateStrategy({
      title, description, link, objective,
      platforms: selectedPlatforms,
      chatMessages: messages,
      fullContent,
    });

    if (result) {
      setStrategy(result);
    }
  }, [selectedArticle, objective, selectedPlatforms, generateStrategy]);

  const handleApproveStrategy = useCallback(async () => {
    if (!strategy) return;
    setStrategyApproved(true);
    setComposePhase("generating");

    const title = selectedArticle?.title || null;
    const description = selectedArticle?.description || null;
    const link = selectedArticle?.link || null;
    const fullContent = selectedArticle?.full_content || null;

    const posts = await generatePosts({
      title, description, link, imageUrl, objective,
      platforms: selectedPlatforms,
      approvedStrategy: strategy,
      fullContent,
    });

    if (posts) {
      // Run compliance check
      setComposePhase("checking");
      const compliantPosts = await checkCompliance(posts);
      setPlatformContents(compliantPosts || posts);
      setComposePhase("editing");
    } else {
      setComposePhase("strategy");
      setStrategyApproved(false);
    }
  }, [strategy, selectedArticle, imageUrl, objective, selectedPlatforms, generatePosts, checkCompliance]);

  const handleRegenerateAll = useCallback(async () => {
    if (!strategy) return;
    setComposePhase("generating");

    const title = selectedArticle?.title || null;
    const description = selectedArticle?.description || null;
    const link = selectedArticle?.link || null;
    const fullContent = selectedArticle?.full_content || null;

    const posts = await generatePosts({
      title, description, link, imageUrl, objective,
      platforms: selectedPlatforms,
      approvedStrategy: strategy,
      fullContent,
    });

    if (posts) {
      setComposePhase("checking");
      const compliantPosts = await checkCompliance(posts);
      setPlatformContents(compliantPosts || posts);
      setComposePhase("editing");
    } else {
      setComposePhase("editing");
    }
  }, [strategy, selectedArticle, imageUrl, objective, selectedPlatforms, generatePosts, checkCompliance]);

  const handleBackToStrategy = useCallback(() => {
    setComposePhase("strategy");
    setStrategyApproved(false);
  }, []);

  const handleQuickAction = useCallback(async (action: string) => {
    const newMessages = [
      ...chatMessages,
      { role: "user" as const, content: action },
    ];
    setChatMessages(newMessages);
    setStrategy(null);

    const title = selectedArticle?.title || null;
    const description = selectedArticle?.description || null;
    const link = selectedArticle?.link || null;

    const fullMessages = [
      { role: "user", content: `Article Title: ${title || "Untitled"}\nArticle Description: ${description || "No description"}\nArticle Link: ${link || "No link"}\nObjective: ${objective}\nPlatforms: ${selectedPlatforms.join(", ")}\n\nGenerate the content strategy.` },
      ...(strategy ? [{ role: "assistant", content: strategy }] : []),
      { role: "user", content: action },
    ];

    const result = await generateStrategy({
      title, description, link, objective,
      platforms: selectedPlatforms,
      chatMessages: fullMessages,
    });

    if (result) {
      setStrategy(result);
      setChatMessages(prev => [...prev, { role: "assistant", content: result }]);
    }
  }, [chatMessages, strategy, selectedArticle, objective, selectedPlatforms, generateStrategy]);

  const handleChatSubmit = useCallback(async () => {
    if (!chatInput.trim()) return;
    const input = chatInput.trim();
    setChatInput("");
    await handleQuickAction(input);
  }, [chatInput, handleQuickAction]);

  const updatePlatformContent = useCallback((platform: string, content: string) => {
    setPlatformContents(prev => ({ ...prev, [platform]: content }));
  }, []);

  // Approval email helpers
  const addApprovalEmail = useCallback(() => {
    const emails = approvalEmailInput
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(e => e && e.includes('@') && !approvalEmails.includes(e));
    if (emails.length > 0) {
      setApprovalEmails(prev => [...prev, ...emails]);
      setApprovalEmailInput('');
    }
  }, [approvalEmailInput, approvalEmails]);

  const addApprovalMemberEmail = useCallback((email: string) => {
    if (email && !approvalEmails.includes(email)) {
      setApprovalEmails(prev => [...prev, email]);
    }
    setApprovalMemberDropdownOpen(false);
  }, [approvalEmails]);

  const removeApprovalEmail = useCallback((email: string) => {
    const currentUserEmail = user?.email;
    if (email === currentUserEmail) return; // Can't remove yourself
    setApprovalEmails(prev => prev.filter(e => e !== email));
  }, [user?.email]);

  // Auto-add current user when dialog opens
  useEffect(() => {
    if (approvalDialogOpen && user?.email && !approvalEmails.includes(user.email)) {
      setApprovalEmails(prev => prev.includes(user.email!) ? prev : [...prev, user.email!]);
    }
  }, [approvalDialogOpen, user?.email]);

  // Fetch company members for approval picker
  const { data: companyMembers } = useQuery({
    queryKey: ['company-members', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('company_id', company.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id && approvalDialogOpen,
  });

  const handleSendApproval = useCallback(async () => {
    if (approvalEmails.length === 0) return;
    setIsSendingApproval(true);
    try {
      let failCount = 0;
      for (const email of approvalEmails) {
        const { data, error } = await supabase.functions.invoke("send-post-approval", {
          body: {
            recipientEmail: email,
            platformContents,
            articleTitle: selectedArticle?.title || null,
            articleLink: selectedArticle?.link || null,
            articleImageUrl: selectedArticle?.image_url || null,
            objective,
            imageUrl,
            selectedAccountIds,
            linkAsComment,
          },
        });
        if (error || data?.error) {
          failCount++;
          console.error(`Failed to send approval to ${email}:`, error?.message || data?.error);
        }
      }
      if (failCount === 0) {
        toast({ title: "Approval emails sent!", description: `Sent to ${approvalEmails.length} recipient${approvalEmails.length > 1 ? 's' : ''}` });
      } else if (failCount < approvalEmails.length) {
        toast({ title: "Partially sent", description: `${approvalEmails.length - failCount} sent, ${failCount} failed`, variant: "destructive" });
      } else {
        toast({ title: "Failed to send", description: "All approval emails failed to send.", variant: "destructive" });
      }
      setApprovalEmails([]);
      setApprovalDialogOpen(false);
    } catch (e) {
      toast({ title: "Failed to send", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSendingApproval(false);
    }
  }, [approvalEmails, platformContents, selectedArticle, objective, imageUrl, selectedAccountIds, linkAsComment]);

  const toggleAccount = (accountId: string) => {
    setSelectedAccountIds(prev =>
      prev.includes(accountId) ? prev.filter(id => id !== accountId) : [...prev, accountId]
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("post-images").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("post-images").getPublicUrl(path);
      setImageUrl(publicUrl);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (publishNow: boolean) => {
    if (selectedAccountIds.length === 0) return;

    let scheduledFor: string | undefined;
    if (!publishNow && date) {
      const [hours, minutes] = time.split(":").map(Number);
      const scheduledDate = new Date(date);
      scheduledDate.setHours(hours, minutes, 0, 0);
      scheduledFor = scheduledDate.toISOString();
    }

    const mediaItems = imageUrl ? [{ url: imageUrl, type: "image" as const }] : undefined;

    for (const accountId of selectedAccountIds) {
      const account = connectedAccounts.find(a => a.id === accountId);
      if (!account) continue;
      const text = platformContents[account.platform] || Object.values(platformContents)[0] || "";
      if (!text.trim()) continue;

      // For Instagram/Facebook accounts with an article link, add firstComment if linkAsComment is enabled
      const articleLink = selectedArticle?.link;
      const shouldFirstComment = linkAsComment[account.platform] && articleLink;
      const platforms = shouldFirstComment
        ? [{
            platform: account.platform,
            accountId,
            content: text,
            platformSpecificData: {
              firstComment: `Read the full article here: ${articleLink}`,
            },
          }]
        : undefined;

      try {
        await createPostMutation.mutateAsync({
          accountIds: [accountId],
          text,
          mediaItems,
          publishNow,
          scheduledFor,
          source: "getlate",
          objective: postSource === "article" ? objective : undefined,
          platforms,
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[Post Error] Account ${accountId} (${account.platform}):`, {
          error: errMsg,
          imageUrl: imageUrl,
          platform: account.platform,
          accountName: account.username || account.displayName,
        });
        // Don't rethrow - continue posting to remaining accounts
      }
    }

    // Mark draft as published if it exists
    if (currentDraftId) {
      await saveDraftMutation.mutateAsync({
        id: currentDraftId,
        status: 'published' as any,
      });
    }

    handleReset();
  };

  const handleReset = () => {
    setStep(0);
    setPostSource(null);
    setSelectedAccountIds([]);
    setDate(undefined);
    setSelectedArticleId("");
    setImageUrl(null);
    setObjective("reach");
    setComposePhase("strategy");
    setStrategy(null);
    setStrategyApproved(false);
    setPlatformContents({});
    setChatMessages([]);
    setChatInput("");
    setShowChat(false);
    setStrategyRequested(false);
    setApprovalEmails([]);
    setApprovalDialogOpen(false);
    setCurrentDraftId(null);
    setLinkAsComment({ instagram: true, facebook: false });
    // Clear draft param from URL
    setSearchParams({ tab: 'compose' }, { replace: true });
  };

  const canProceed = (() => {
    switch (currentStepKey) {
      case "source": return postSource !== null;
      case "article": return !!selectedArticleId;
      case "objective": return !!objective;
      case "channels": return selectedAccountIds.length > 0;
      case "compose": return Object.values(platformContents).some(c => c.trim().length > 0);
      default: return false;
    }
  })();

  const isLastStep = step === steps.length - 1;

  const selectSource = (source: PostSource) => {
    setPostSource(source);
    if (source === "scratch") {
      setSelectedArticleId("");
      setImageUrl(null);
    }
    setStep(1);
  };

  const selectArticle = (articleId: string) => {
    setSelectedArticleId(articleId);
    const article = feedItems?.find(i => i.id === articleId);
    if (article?.image_url) setImageUrl(article.image_url);
    else setImageUrl(null);
    setPlatformContents({});
    setStrategy(null);
    setStrategyRequested(false);
  };

  // Debounced auto-save when platformContents change during editing phase
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (composePhase === "editing" && Object.keys(platformContents).length > 0) {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        saveDraft();
      }, 1500);
    }
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [platformContents, imageUrl]);

  const renderSummary = () => {
    const selectedAccounts = connectedAccounts.filter(a => selectedAccountIds.includes(a.id));
    const selectedObj = objectives.find(o => o.value === objective);

    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Progress</h3>
          <div className="space-y-1">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2.5 py-1.5">
                <span className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                  i < step ? "bg-primary text-primary-foreground"
                    : i === step ? "bg-primary/20 text-primary border border-primary"
                    : "bg-muted text-muted-foreground"
                )}>
                  {i < step ? <Check className="w-3 h-3" /> : i + 1}
                </span>
                <span className={cn(
                  "text-sm",
                  i === step ? "font-medium text-foreground" : i < step ? "text-muted-foreground" : "text-muted-foreground/60"
                )}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Summary</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Source</p>
              <p className="text-sm font-medium text-foreground capitalize">{postSource === "article" ? "From Article" : "From Scratch"}</p>
            </div>
            {postSource === "article" && selectedArticle && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Article</p>
                <div className="flex items-start gap-2">
                  {selectedArticle.image_url && (
                    <img src={selectedArticle.image_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  )}
                  <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight">{selectedArticle.title}</p>
                </div>
              </div>
            )}
            {selectedObj && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Objective</p>
                <div className="flex items-center gap-1.5">
                  <selectedObj.icon className="w-3.5 h-3.5 text-primary" />
                  <p className="text-sm font-medium text-foreground">{selectedObj.label}</p>
                </div>
              </div>
            )}
            {selectedAccounts.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Channels ({selectedAccounts.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAccounts.map(account => {
                    const Icon = platformIcons[account.platform] || FaTwitter;
                    const colorClass = platformColors[account.platform] || "bg-muted";
                    return (
                      <Badge key={account.id} variant="secondary" className={cn("text-xs gap-1", colorClass, "text-white")}>
                        <Icon className="w-3 h-3" />
                        {account.username || account.platform}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Compose step: Strategy Phase
  const renderStrategyPhase = () => (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-foreground">Content Strategy</h2>
        <p className="text-muted-foreground text-sm mt-1">AI is crafting a strategy for your post. Review and approve it.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          {isGeneratingStrategy || !strategy ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating strategy...
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3 mt-4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-4">
                {strategy.split(/\n\n+/).map((section, i) => {
                  const lines = section.split('\n').filter(l => l.trim());
                  const headerLine = lines[0];
                  const isHeader = headerLine?.startsWith('**');
                  const headerText = isHeader ? headerLine.replace(/\*\*/g, '').trim() : null;
                  const bullets = isHeader ? lines.slice(1) : lines;

                  return (
                    <div key={i} className={i > 0 ? "pt-3 border-t border-border" : ""}>
                      {headerText && (
                        <h4 className="text-sm font-semibold text-foreground mb-2">{headerText}</h4>
                      )}
                      <ul className="space-y-1.5">
                        {bullets.map((bullet, j) => {
                          const text = bullet.replace(/^[•\-\*]\s*/, '').trim();
                          if (!text) return null;
                          return (
                            <li key={j} className="flex items-start gap-2 text-sm text-foreground/90 leading-relaxed">
                              <span className="text-primary mt-1 flex-shrink-0">•</span>
                              <span>{text}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleApproveStrategy} className="gap-2">
                  <Check className="w-4 h-4" />
                  Approve & Generate Posts
                </Button>
                <Button variant="outline" onClick={() => setShowChat(!showChat)} className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Refine
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {strategy && !isGeneratingStrategy && (
        <div className="flex flex-wrap gap-2">
          {quickActions.map(action => (
            <Button
              key={action}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction(action)}
              disabled={isGeneratingStrategy}
              className="text-xs"
            >
              {action}
            </Button>
          ))}
        </div>
      )}

      {showChat && strategy && (
        <Card>
          <CardContent className="p-4 space-y-3">
            {chatMessages.length > 0 && (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn("text-sm rounded-lg px-3 py-2", msg.role === "user" ? "bg-primary/10 text-foreground ml-8" : "bg-muted text-foreground mr-8")}>
                    {msg.content}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="What would you like to change about the strategy?"
                className="min-h-[60px] resize-none"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSubmit(); } }}
              />
              <Button onClick={handleChatSubmit} disabled={!chatInput.trim() || isGeneratingStrategy} size="icon" className="flex-shrink-0 self-end">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Compose step: Generating Phase
  const renderGeneratingPhase = () => (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-foreground">Generating Posts</h2>
        <p className="text-muted-foreground text-sm mt-1">Creating optimized content for each platform...</p>
      </div>

      <div className="space-y-4">
        {selectedPlatforms.map(platform => {
          const Icon = platformIcons[platform] || FaTwitter;
          const colorClass = platformColors[platform] || "bg-muted";
          return (
            <Card key={platform}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white", colorClass)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-foreground capitalize">{platform}</span>
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-auto" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 mt-2" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  // Compose step: Compliance Check Phase
  const renderCheckingPhase = () => (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-foreground">Checking Compliance</h2>
        <p className="text-muted-foreground text-sm mt-1">Verifying posts meet platform rules and guidelines...</p>
      </div>

      <Card>
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-primary animate-pulse" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Running platform compliance checks</p>
            <p className="text-xs text-muted-foreground mt-0.5">Character limits, hashtag rules, tone guidelines...</p>
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  );

  // Compose step: Editing Phase — generic overview + single platform preview with selector
  const renderEditingPhase = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Edit & Publish</h2>
          <p className="text-muted-foreground text-sm mt-1">Edit each platform's post inline. Changes auto-save.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleBackToStrategy} className="gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Refine Strategy
          </Button>
          <Button variant="outline" size="sm" onClick={handleRegenerateAll} disabled={isGeneratingPosts || isCheckingCompliance} className="gap-1.5">
            <RefreshCw className={cn("w-3.5 h-3.5", (isGeneratingPosts || isCheckingCompliance) && "animate-spin")} />
            Regenerate All
          </Button>
        </div>
      </div>

      {/* Platform sidebar + preview layout */}
      {selectedPlatforms.length > 0 && (
        <div className="flex gap-4">
          {/* Vertical platform list */}
          <div className="flex flex-col gap-1 w-40 flex-shrink-0">
            {selectedPlatforms.map(platform => {
              const Icon = platformIcons[platform] || FaTwitter;
              const colorClass = platformColors[platform] || "bg-muted";
              const isActive = activePlatformTab === platform;
              return (
                <button
                  key={platform}
                  onClick={() => setActivePlatformTab(platform)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div className={cn("w-6 h-6 rounded flex items-center justify-center text-white flex-shrink-0", colorClass)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="capitalize">{platform}</span>
                </button>
              );
            })}
          </div>

          {/* Preview area */}
          <div className="flex-1 max-w-lg">
            <PostPreview
              content={platformContents[activePlatformTab] || ""}
              imageUrl={imageUrl}
              accounts={connectedAccounts}
              selectedAccountIds={selectedAccountIds}
              editable
              platform={activePlatformTab}
              showPlatformSelector={false}
              platformContents={platformContents}
              onPlatformContentChange={updatePlatformContent}
            />
          </div>
        </div>
      )}

      {/* Link as First Comment toggle for Instagram/Facebook */}
      {postSource === "article" && selectedArticle?.link && (activePlatformTab === "instagram" || activePlatformTab === "facebook") && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Send link as first comment
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activePlatformTab === "instagram"
                    ? "Recommended for Instagram — captions don't support clickable links."
                    : "First comments on Facebook can boost engagement."}
                </p>
              </div>
              <Switch
                checked={linkAsComment[activePlatformTab] ?? false}
                onCheckedChange={(checked) =>
                  setLinkAsComment(prev => ({ ...prev, [activePlatformTab]: checked }))
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image management — minimal with label */}
      <div className="flex items-center gap-3 px-1">
        {imageUrl ? (
          <>
            <ImageIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-foreground">Article image attached</span>
            <div className="flex gap-1 ml-auto flex-shrink-0">
              <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="h-7 px-2 text-xs text-muted-foreground">
                Replace
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setImageUrl(null)} className="h-7 px-2 text-xs text-destructive hover:text-destructive">
                Remove
              </Button>
            </div>
          </>
        ) : (
          <>
            <ImageIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground">No image attached</span>
            <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="h-7 px-2 text-xs ml-auto">
              {isUploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Add image
            </Button>
          </>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
      </div>

      {/* Schedule */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Schedule (Optional)</p>
          <div className="flex flex-wrap gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />{date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus disabled={(d) => d < new Date()} />
              </PopoverContent>
            </Popover>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-muted-foreground" />
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="px-2 py-1.5 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            {date && <Button variant="ghost" size="sm" onClick={() => setDate(undefined)}>Clear</Button>}
          </div>
        </CardContent>
      </Card>

      {/* Send for Approval */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Need approval first?</p>
              <p className="text-xs text-muted-foreground mt-0.5">Email a preview to someone for review. They can approve with one click.</p>
            </div>
            <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Send for Approval
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
                <div className="px-6 pt-6 pb-4 border-b border-border">
                  <DialogHeader>
                    <DialogTitle>Send Posts for Approval</DialogTitle>
                    <DialogDescription>
                      The recipient will receive an email like the preview below with a one-click approval button.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 space-y-3">
                    <label className="text-sm font-medium text-foreground">Recipients</label>
                    <p className="text-xs text-muted-foreground">
                      You're automatically included. Add team members or external reviewers.
                    </p>

                    {companyMembers && companyMembers.length > 0 && (
                      <div className="relative">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-muted-foreground"
                          onClick={() => setApprovalMemberDropdownOpen(!approvalMemberDropdownOpen)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-2" />
                          Add team member
                        </Button>
                        {approvalMemberDropdownOpen && (
                          <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border border-border bg-popover shadow-md max-h-40 overflow-y-auto">
                            {companyMembers
                              .filter(m => m.email && !approvalEmails.includes(m.email))
                              .map(member => (
                                <button
                                  key={member.id}
                                  type="button"
                                  onClick={() => addApprovalMemberEmail(member.email!)}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
                                >
                                  <span className="font-medium text-foreground">{member.full_name || member.email}</span>
                                  {member.full_name && (
                                    <span className="text-xs text-muted-foreground">{member.email}</span>
                                  )}
                                </button>
                              ))}
                            {companyMembers.filter(m => m.email && !approvalEmails.includes(m.email)).length === 0 && (
                              <div className="px-3 py-2 text-sm text-muted-foreground">All members added</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Add emails (comma-separated)"
                        value={approvalEmailInput}
                        onChange={(e) => setApprovalEmailInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addApprovalEmail(); } }}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={addApprovalEmail}>Add</Button>
                    </div>

                    {approvalEmails.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {approvalEmails.map(email => {
                          const isCurrentUser = email === user?.email;
                          return (
                            <Badge key={email} variant="secondary" className="gap-1">
                              {email}
                              {isCurrentUser && <span className="text-[10px] text-muted-foreground">(you)</span>}
                              {!isCurrentUser && (
                                <button onClick={() => removeApprovalEmail(email)} className="ml-1 hover:text-destructive">×</button>
                              )}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Email Preview */}
                <ScrollArea className="h-[50vh] border-t border-border" type="always">
                  <div className="px-6 py-5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Email Preview</p>
                    <div className="rounded-xl border border-border overflow-hidden shadow-sm">
                      {/* Email header gradient */}
                      <div className="px-6 py-5 text-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                        <h3 className="text-white font-semibold text-base m-0">Post Approval Request 📋</h3>
                      </div>
                      {/* Email body */}
                      <div className="bg-white p-5 space-y-4">
                        <p className="text-sm text-gray-700">
                          A team member has requested your approval for the following social media posts.
                        </p>
                        {selectedArticle?.title && (
                          <p className="text-sm text-gray-500">
                            Article: <strong className="text-gray-700">{selectedArticle.title}</strong>
                          </p>
                        )}
                        {/* Post previews */}
                        <div className="space-y-3">
                          {Object.entries(platformContents).map(([platform, content]) => (
                            <div key={platform} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                              <p className="text-xs font-semibold capitalize text-gray-600 mb-2">{platform}</p>
                              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed m-0">{content}</p>
                            </div>
                          ))}
                        </div>
                        {/* Approve button preview */}
                        <div className="text-center pt-2 pb-1">
                          <span className="inline-block px-8 py-3 rounded-lg text-white font-semibold text-sm" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                            Review & Approve
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 text-center">This link expires in 7 days.</p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-end">
                  <Button
                    onClick={handleSendApproval}
                    disabled={approvalEmails.length === 0 || isSendingApproval}
                    className="gap-2"
                  >
                    {isSendingApproval ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send Approval Email
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">

      {/* Step 0: Source Selection */}
      {currentStepKey === "source" && (
        <div className="space-y-4">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-bold text-foreground">Create a New Post</h2>
            <p className="text-muted-foreground mt-1">How would you like to start?</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <button
              onClick={() => selectSource("article")}
              className={cn(
                "group relative flex flex-col items-center gap-4 p-8 rounded-xl border-2 transition-all duration-200 text-center",
                "border-border hover:border-primary hover:shadow-lg bg-card"
              )}
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Newspaper className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">From Article</h3>
                <p className="text-sm text-muted-foreground mt-1">Select an RSS article and let AI generate your post</p>
              </div>
            </button>
            <button
              onClick={() => selectSource("scratch")}
              className={cn(
                "group relative flex flex-col items-center gap-4 p-8 rounded-xl border-2 transition-all duration-200 text-center",
                "border-border hover:border-primary hover:shadow-lg bg-card"
              )}
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <PenLine className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">From Scratch</h3>
                <p className="text-sm text-muted-foreground mt-1">Write your own post content manually</p>
              </div>
            </button>
          </div>

          {/* Saved Drafts Accordion */}
          {drafts && drafts.length > 0 && (
            <div className="max-w-2xl mx-auto mt-6">
              <Accordion type="single" collapsible>
                <AccordionItem value="drafts" className="border rounded-xl bg-card">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Saved Drafts</span>
                      <Badge variant="secondary" className="text-xs">{drafts.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-2">
                      {drafts.map((draft) => {
                        const stepLabels = draft.post_source === "article"
                          ? ["Source", "Article", "Objective", "Channels", "Compose"]
                          : ["Source", "Objective", "Channels", "Compose"];
                        const currentStepLabel = stepLabels[draft.current_step] || stepLabels[0];
                        const platformCount = Object.keys(draft.platform_contents || {}).length;

                        return (
                          <div
                            key={draft.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer group"
                            onClick={() => onOpenDraft?.(draft.id)}
                          >
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                {draft.post_source === "article" ? (
                                  <Newspaper className="w-3.5 h-3.5 text-primary" />
                                ) : (
                                  <PenLine className="w-3.5 h-3.5 text-primary" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {draft.title || (draft.post_source === "article" ? "Article Post" : "Post from Scratch")}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  <Badge variant="outline" className="text-[10px] py-0 h-5">
                                    {currentStepLabel}
                                  </Badge>
                                  {draft.objective && (
                                    <Badge variant="secondary" className="text-[10px] py-0 h-5 capitalize">
                                      {draft.objective}
                                    </Badge>
                                  )}
                                  {platformCount > 0 && (
                                    <Badge variant="secondary" className="text-[10px] py-0 h-5">
                                      {platformCount} platform{platformCount !== 1 ? "s" : ""}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(draft.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <Button size="sm" variant="default" className="h-7 text-xs gap-1">
                                Continue
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteDraftMutation.mutate(draft.id);
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}
        </div>
      )}

      {/* Step: Article Selection */}
      {currentStepKey === "article" && (
        <div className="space-y-6 max-w-3xl">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Select an Article</h2>
            <p className="text-muted-foreground text-sm mt-1">Choose the article you'd like to create a post for</p>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {(!feedItems || feedItems.length === 0) ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Newspaper className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No articles available. Add an RSS feed first.</p>
                </CardContent>
              </Card>
            ) : (
              feedItems.map(item => {
                const isSelected = selectedArticleId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => selectArticle(item.id)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-start gap-3",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-muted-foreground/30 bg-card"
                    )}
                  >
                    {item.image_url && (
                      <img src={item.image_url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground text-sm leading-tight truncate">{item.title || "Untitled"}</h3>
                        {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{item.feed_name}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Step: Objective Selection */}
      {currentStepKey === "objective" && (
        <div className="space-y-6 max-w-3xl">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">What's your objective?</h2>
            <p className="text-muted-foreground text-sm mt-1">This helps {postSource === "article" ? "AI tailor your post" : "guide your content strategy"}</p>
          </div>

          {postSource === "article" && selectedArticle && (
            <Card>
              <CardContent className="p-4 flex items-start gap-3">
                {selectedArticle.image_url && (
                  <img src={selectedArticle.image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{selectedArticle.title}</p>
                  {selectedArticle.link && (
                    <a href={selectedArticle.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5 w-fit">
                      View article <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <RadioGroup value={objective} onValueChange={setObjective} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {objectives.map(obj => {
              const Icon = obj.icon;
              return (
                <Label
                  key={obj.value}
                  htmlFor={`obj-${obj.value}`}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-xl border-2 p-6 cursor-pointer transition-all text-center",
                    objective === obj.value
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-muted-foreground/30 bg-card"
                  )}
                >
                  <RadioGroupItem value={obj.value} id={`obj-${obj.value}`} className="sr-only" />
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                    objective === obj.value ? "bg-primary/20" : "bg-muted"
                  )}>
                    <Icon className={cn("h-6 w-6", objective === obj.value ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div>
                    <span className="text-base font-semibold text-foreground">{obj.label}</span>
                    <p className="text-xs text-muted-foreground mt-1">{obj.description}</p>
                  </div>
                </Label>
              );
            })}
          </RadioGroup>
        </div>
      )}

      {/* Step: Channel Selection */}
      {currentStepKey === "channels" && (
        <div className="space-y-6 max-w-3xl">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Where do you want to post?</h2>
            <p className="text-muted-foreground text-sm mt-1">Select one or more channels to publish to</p>
          </div>

          {accountsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !hasAccounts ? (
            <div className="space-y-6">
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="w-10 h-10 text-muted-foreground mb-3" />
                  <h3 className="font-semibold text-foreground">No Accounts Connected</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">Connect your social media accounts to publish posts directly.</p>
                  <Button onClick={() => navigate("/app/connections")}>Go to Connections</Button>
                </CardContent>
              </Card>

              <div>
                <p className="text-sm font-medium text-foreground mb-1">Or try with example platforms</p>
                <p className="text-xs text-muted-foreground mb-3">Select platforms to preview the content creation flow. Posts won't actually be published.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {examplePlatforms.map(ep => {
                    const isSelected = selectedAccountIds.includes(ep.id);
                    const Icon = platformIcons[ep.platform] || FaTwitter;
                    const colorClass = platformColors[ep.platform] || "bg-muted";
                    return (
                      <button
                        key={ep.id}
                        onClick={() => toggleAccount(ep.id)}
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200",
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-muted-foreground/30 bg-card"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-colors text-white flex-shrink-0",
                          isSelected ? colorClass : "bg-muted text-muted-foreground"
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="font-medium text-foreground text-sm">{ep.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{ep.platform}</p>
                        </div>
                        {isSelected && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="outline" className="text-[10px]">Example</Badge>
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-primary-foreground" />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {connectedAccounts.map(account => {
                const isSelected = selectedAccountIds.includes(account.id);
                const Icon = platformIcons[account.platform] || FaTwitter;
                const colorClass = platformColors[account.platform] || "bg-muted";
                return (
                  <button
                    key={account.id}
                    onClick={() => toggleAccount(account.id)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-muted-foreground/30 bg-card"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors text-white flex-shrink-0",
                      isSelected ? colorClass : "bg-muted text-muted-foreground"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-foreground text-sm">{account.username || account.displayName || account.platform}</p>
                      <p className="text-xs text-muted-foreground capitalize">{account.platform}</p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <Check className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step: Compose & Preview - multi phase flow */}
      {currentStepKey === "compose" && (
        <div className="flex gap-6">
          {/* Summary Sidebar */}
          <div className="hidden lg:block w-56 flex-shrink-0">
            <div className="sticky top-6 p-4 rounded-xl border border-border bg-card">
              {renderSummary()}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {composePhase === "strategy" && renderStrategyPhase()}
            {composePhase === "generating" && renderGeneratingPhase()}
            {composePhase === "checking" && renderCheckingPhase()}
            {composePhase === "editing" && renderEditingPhase()}
          </div>
        </div>
      )}

      {/* Navigation footer */}
      {steps.length > 1 && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <div>
            {step > 0 ? (
              <Button variant="ghost" onClick={() => { setStep(s => s - 1); if (currentStepKey === "compose") { setComposePhase("strategy"); setStrategyApproved(false); } }} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            ) : (
              <div />
            )}
          </div>
          <div className="flex gap-3">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground">
                Start over
              </Button>
            )}
            {isLastStep ? (
              composePhase === "editing" && (
                <div className="flex items-center gap-3">
                  {isUsingExampleAccounts && (
                    <p className="text-xs text-muted-foreground">Example mode — connect accounts to publish</p>
                  )}
                  <Button
                    variant="outline"
                    onClick={async () => {
                      await saveDraft({ compose_phase: composePhase });
                      toast({ title: "Draft saved", description: "Your progress has been saved." });
                    }}
                    disabled={saveDraftMutation.isPending}
                  >
                    {saveDraftMutation.isPending ? <Loader2 size={16} className="animate-spin mr-1" /> : null}
                    Save Draft
                  </Button>
                  {!isUsingExampleAccounts && (
                    <Button
                      className="gradient-accent shadow-glow hover:shadow-lg transition-shadow gap-2"
                      onClick={() => handleSubmit(!date)}
                      disabled={!Object.values(platformContents).some(c => c.trim()) || createPostMutation.isPending}
                    >
                      {createPostMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      {date ? "Schedule Post" : "Post Now"}
                    </Button>
                  )}
                </div>
              )
            ) : (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed}
                className="gap-2"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
