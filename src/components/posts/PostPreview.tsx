import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Platform, GetLateAccount } from "@/lib/api/getlate";
import { FaInstagram, FaTwitter, FaTiktok, FaLinkedin, FaFacebook } from "react-icons/fa";
import { SiBluesky } from "react-icons/si";
import { Heart, MessageCircle, Repeat2, Share, Send, ThumbsUp, Globe, MoreHorizontal, Bookmark, Move } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PostPreviewProps {
  content: string;
  imageUrl: string | null;
  accounts: GetLateAccount[];
  selectedAccountIds: string[];
  editable?: boolean;
  onContentChange?: (content: string) => void;
  platform?: Platform;
  showPlatformSelector?: boolean;
  platformContents?: Record<string, string>;
  onPlatformContentChange?: (platform: string, content: string) => void;
}

const platformOptions: { value: Platform; label: string; icon: React.ElementType }[] = [
  { value: "facebook", label: "Facebook", icon: FaFacebook },
  { value: "instagram", label: "Instagram", icon: FaInstagram },
  { value: "twitter", label: "Twitter / X", icon: FaTwitter },
  { value: "linkedin", label: "LinkedIn", icon: FaLinkedin },
  { value: "tiktok", label: "TikTok", icon: FaTiktok },
  { value: "bluesky", label: "Bluesky", icon: SiBluesky },
];

const platformCharLimits: Record<string, number> = {
  twitter: 280, bluesky: 300, linkedin: 3000, facebook: 63206,
  instagram: 2200, tiktok: 2200, threads: 500, pinterest: 500,
};

// Where each platform truncates with a "See More" / "Read More" button
const platformTruncationPoints: Record<string, number> = {
  facebook: 140,
  instagram: 125,
  linkedin: 140,
  tiktok: 150,
};

function truncateText(text: string, max: number) {
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

function getAccountForPlatform(accounts: GetLateAccount[], selectedIds: string[], platform: Platform) {
  return accounts.find(a => selectedIds.includes(a.id) && a.platform === platform)
    || accounts.find(a => selectedIds.includes(a.id))
    || accounts[0];
}

// Editable text overlay component
function EditableText({ content, editable, onContentChange, placeholder, className, truncationPoint }: {
  content: string;
  editable?: boolean;
  onContentChange?: (c: string) => void;
  placeholder: string;
  className?: string;
  truncationPoint?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [content, isEditing]);

  // Show cutoff line at the "See More" truncation point
  const showCutoff = truncationPoint && content.length > truncationPoint;

  // Editable mode: show split preview, click to edit via textarea
  if (editable) {
    if (isEditing) {
      return (
        <textarea
          ref={textareaRef}
          autoFocus
          value={content}
          onChange={(e) => onContentChange?.(e.target.value)}
          onBlur={() => setIsEditing(false)}
          placeholder={placeholder}
          className={cn(
            className,
            "bg-transparent border-none outline-none resize-none w-full focus:ring-0 p-0 m-0 overflow-hidden"
          )}
        />
      );
    }

    // Show the split preview with truncation indicator, click to edit
    if (showCutoff) {
      return (
        <div className="cursor-text" onClick={() => setIsEditing(true)}>
          <span className={className}>{content.slice(0, truncationPoint)}</span>
          <div className="relative my-2">
            <hr className="border-t-2 border-dotted border-muted-foreground/40" />
            <span className="absolute -top-2.5 right-0 bg-white dark:bg-black text-muted-foreground text-[10px] font-medium px-1.5">See more after {truncationPoint} chars</span>
          </div>
          <span className={cn(className, "opacity-50")}>{content.slice(truncationPoint)}</span>
        </div>
      );
    }

    return (
      <div className="cursor-text" onClick={() => setIsEditing(true)}>
        <span className={className}>
          {content || <span className="italic opacity-50">{placeholder}</span>}
        </span>
      </div>
    );
  }

  // Non-editable mode
  if (showCutoff) {
    return (
      <div>
        <span className={className}>{content.slice(0, truncationPoint)}</span>
        <div className="relative my-2">
          <hr className="border-t-2 border-dotted border-muted-foreground/40" />
          <span className="absolute -top-2.5 right-0 bg-white dark:bg-black text-muted-foreground text-[10px] font-medium px-1.5">See more after {truncationPoint} chars</span>
        </div>
        <span className={cn(className, "opacity-50")}>{content.slice(truncationPoint)}</span>
      </div>
    );
  }
  return (
    <span className={className}>
      {content || <span className="italic opacity-50">{placeholder}</span>}
    </span>
  );
}

function FacebookPreview({ content, imageUrl, account, editable, onContentChange, truncationPoint }: { content: string; imageUrl: string | null; account?: GetLateAccount; editable?: boolean; onContentChange?: (c: string) => void; truncationPoint?: number }) {
  const name = account?.displayName || account?.username || "Your Page";
  return (
    <div className="bg-white dark:bg-[#242526] rounded-lg shadow-sm overflow-hidden text-[13px]">
      <div className="p-3 flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#050505] dark:text-[#E4E6EB] text-sm leading-tight">{name}</p>
          <div className="flex items-center gap-1 text-[#65676B] dark:text-[#B0B3B8] text-xs">
            <span>Just now</span><span>·</span><Globe className="w-3 h-3" />
          </div>
        </div>
        <MoreHorizontal className="w-5 h-5 text-[#65676B] dark:text-[#B0B3B8]" />
      </div>
      <div className="px-3 pb-2">
        <EditableText
          content={content}
          editable={editable}
          onContentChange={onContentChange}
          placeholder="What's on your mind?"
          className="text-[#050505] dark:text-[#E4E6EB] text-[15px] whitespace-pre-wrap leading-snug block"
          truncationPoint={truncationPoint}
        />
      </div>
      {imageUrl && (
        <img src={imageUrl} alt="" className="w-full object-contain max-h-[300px] bg-black/5 dark:bg-white/5" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      )}
      <div className="px-3 py-2 flex items-center justify-between text-[#65676B] dark:text-[#B0B3B8] text-xs border-b border-[#CED0D4] dark:border-[#3E4042]">
        <div className="flex items-center gap-1">
          <div className="w-[18px] h-[18px] rounded-full bg-[#1877F2] flex items-center justify-center"><ThumbsUp className="w-2.5 h-2.5 text-white" /></div>
          <span>0</span>
        </div>
        <span>0 comments</span>
      </div>
      <div className="grid grid-cols-3 px-1 py-1">
        {[
          { icon: ThumbsUp, label: "Like" },
          { icon: MessageCircle, label: "Comment" },
          { icon: Share, label: "Share" },
        ].map(({ icon: Icon, label }) => (
          <button key={label} className="flex items-center justify-center gap-1.5 py-2 rounded-md hover:bg-[#F0F2F5] dark:hover:bg-[#3A3B3C] text-[#65676B] dark:text-[#B0B3B8] font-semibold text-[13px] transition-colors">
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>
    </div>
  );
}

function InstagramPreview({ content, imageUrl, account, editable, onContentChange, truncationPoint }: { content: string; imageUrl: string | null; account?: GetLateAccount; editable?: boolean; onContentChange?: (c: string) => void; truncationPoint?: number }) {
  const name = account?.username || "yourpage";
  const [objectPos, setObjectPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!editable) return;
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [editable]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setObjectPos({ x, y });
  }, []);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div className="bg-white dark:bg-black rounded-lg overflow-hidden text-[13px] border border-[#DBDBDB] dark:border-[#262626]">
      <div className="p-3 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-[2px]">
          <div className="w-full h-full rounded-full bg-white dark:bg-black flex items-center justify-center text-xs font-bold text-[#262626] dark:text-white">
            {name.charAt(0)}
          </div>
        </div>
        <span className="font-semibold text-sm text-[#262626] dark:text-white">{name}</span>
        <MoreHorizontal className="w-5 h-5 ml-auto text-[#262626] dark:text-white" />
      </div>
      {imageUrl ? (
        <div
          ref={containerRef}
          className={cn("relative w-full aspect-square bg-black select-none", editable && "cursor-grab active:cursor-grabbing")}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <img
            src={imageUrl}
            alt=""
            className="w-full aspect-square object-cover pointer-events-none"
            style={{ objectPosition: `${objectPos.x}% ${objectPos.y}%` }}
            draggable={false}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          {editable && (
            <div className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
              <Move className="w-3 h-3" />
              Drag to reposition
            </div>
          )}
          <div className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
            1:1 crop
          </div>
        </div>
      ) : (
        <div className="w-full aspect-square bg-[#FAFAFA] dark:bg-[#121212] flex items-center justify-center text-[#8E8E8E]">
          <span className="text-sm">No image</span>
        </div>
      )}
      <div className="p-3 flex items-center gap-4">
        <Heart className="w-6 h-6 text-[#262626] dark:text-white" />
        <MessageCircle className="w-6 h-6 text-[#262626] dark:text-white" />
        <Send className="w-6 h-6 text-[#262626] dark:text-white" />
        <Bookmark className="w-6 h-6 ml-auto text-[#262626] dark:text-white" />
      </div>
      <div className="px-3 pb-3">
        <div className="text-[#262626] dark:text-white text-sm">
          <span className="font-semibold mr-1">{name}</span>
          <EditableText
            content={content}
            editable={editable}
            onContentChange={onContentChange}
            placeholder="Write a caption…"
            className="whitespace-pre-wrap inline"
            truncationPoint={truncationPoint}
          />
        </div>
      </div>
    </div>
  );
}

function TwitterPreview({ content, imageUrl, account, editable, onContentChange, truncationPoint }: { content: string; imageUrl: string | null; account?: GetLateAccount; editable?: boolean; onContentChange?: (c: string) => void; truncationPoint?: number }) {
  const name = account?.displayName || account?.username || "Your Account";
  const handle = account?.username || "yourhandle";
  return (
    <div className="bg-white dark:bg-black rounded-xl p-3 text-[15px] border border-[#EFF3F4] dark:border-[#2F3336]">
      <div className="flex gap-2.5">
        <div className="w-10 h-10 rounded-full bg-[#1DA1F2] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-bold text-[#0F1419] dark:text-[#E7E9EA] text-[15px]">{name}</span>
            <span className="text-[#536471] dark:text-[#71767B] text-[15px]">@{handle} · now</span>
          </div>
          <div className="mt-0.5">
            <EditableText
              content={content}
              editable={editable}
              onContentChange={onContentChange}
              placeholder="What is happening?!"
              className="text-[#0F1419] dark:text-[#E7E9EA] whitespace-pre-wrap leading-snug block"
              truncationPoint={truncationPoint}
            />
          </div>
          {imageUrl && (
            <img src={imageUrl} alt="" className="w-full rounded-2xl mt-2.5 object-contain max-h-[280px] bg-black/5 dark:bg-white/5 border border-[#EFF3F4] dark:border-[#2F3336]" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          )}
          <div className="flex items-center justify-between mt-3 max-w-[300px] text-[#536471] dark:text-[#71767B]">
            {[
              { icon: MessageCircle, count: "0" },
              { icon: Repeat2, count: "0" },
              { icon: Heart, count: "0" },
              { icon: Share, count: "" },
            ].map(({ icon: Icon, count }, i) => (
              <button key={i} className="flex items-center gap-1.5 hover:text-[#1DA1F2] transition-colors text-[13px]">
                <Icon className="w-[18px] h-[18px]" />{count && <span>{count}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkedInPreview({ content, imageUrl, account, editable, onContentChange, truncationPoint }: { content: string; imageUrl: string | null; account?: GetLateAccount; editable?: boolean; onContentChange?: (c: string) => void; truncationPoint?: number }) {
  const name = account?.displayName || account?.username || "Your Name";
  return (
    <div className="bg-white dark:bg-[#1B1F23] rounded-lg shadow-sm overflow-hidden text-[14px] border border-[#E0E0E0] dark:border-[#333]">
      <div className="p-3 flex items-center gap-2">
        <div className="w-12 h-12 rounded-full bg-[#0A66C2] flex items-center justify-center text-white font-bold text-base flex-shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#000000E6] dark:text-[#FFFFFFE6] text-sm leading-tight">{name}</p>
          <p className="text-[#00000099] dark:text-[#FFFFFF99] text-xs leading-tight mt-0.5">Headline</p>
          <p className="text-[#00000099] dark:text-[#FFFFFF99] text-xs leading-tight">Just now · <Globe className="w-3 h-3 inline" /></p>
        </div>
      </div>
      <div className="px-3 pb-2">
        <EditableText
          content={content}
          editable={editable}
          onContentChange={onContentChange}
          placeholder="Share your thoughts…"
          className="text-[#000000E6] dark:text-[#FFFFFFE6] text-[14px] whitespace-pre-wrap leading-snug block"
          truncationPoint={truncationPoint}
        />
      </div>
      {imageUrl && (
        <img src={imageUrl} alt="" className="w-full object-contain max-h-[300px] bg-black/5 dark:bg-white/5" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      )}
      <div className="px-3 py-1.5 border-b border-[#E0E0E0] dark:border-[#333] text-xs text-[#00000099] dark:text-[#FFFFFF99]">
        <span>0 reactions</span>
      </div>
      <div className="grid grid-cols-4 px-1 py-0.5">
        {[
          { icon: ThumbsUp, label: "Like" },
          { icon: MessageCircle, label: "Comment" },
          { icon: Repeat2, label: "Repost" },
          { icon: Send, label: "Send" },
        ].map(({ icon: Icon, label }) => (
          <button key={label} className="flex items-center justify-center gap-1 py-2.5 rounded hover:bg-[#F0F0F0] dark:hover:bg-[#333] text-[#00000099] dark:text-[#FFFFFF99] font-semibold text-xs transition-colors">
            <Icon className="w-4 h-4" /><span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function GenericPreview({ content, imageUrl, account, platformName, editable, onContentChange, truncationPoint }: { content: string; imageUrl: string | null; account?: GetLateAccount; platformName: string; editable?: boolean; onContentChange?: (c: string) => void; truncationPoint?: number }) {
  const name = account?.displayName || account?.username || "Your Account";
  return (
    <div className="bg-white dark:bg-[#18181B] rounded-lg border border-border overflow-hidden text-sm">
      <div className="p-3 flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-muted-foreground/20 flex items-center justify-center font-bold text-sm flex-shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">{name}</p>
          <p className="text-xs text-muted-foreground">{platformName} · Just now</p>
        </div>
      </div>
      <div className="px-3 pb-2">
        <EditableText
          content={content}
          editable={editable}
          onContentChange={onContentChange}
          placeholder="Start typing…"
          className="text-foreground whitespace-pre-wrap text-sm leading-snug block"
          truncationPoint={truncationPoint}
        />
      </div>
      {imageUrl && (
        <img src={imageUrl} alt="" className="w-full object-contain max-h-[280px] bg-black/5 dark:bg-white/5" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      )}
      <div className="px-3 py-2.5 border-t border-border flex items-center gap-4 text-muted-foreground">
        <Heart className="w-4 h-4" /><MessageCircle className="w-4 h-4" /><Share className="w-4 h-4" />
      </div>
    </div>
  );
}

export function PostPreview({ content, imageUrl, accounts, selectedAccountIds, editable, onContentChange, platform: fixedPlatform, showPlatformSelector = true, platformContents, onPlatformContentChange }: PostPreviewProps) {
  const [previewPlatform, setPreviewPlatform] = useState<Platform>(fixedPlatform || "facebook");
  const activePlatform = fixedPlatform || previewPlatform;

  const selectedPlatforms = platformOptions.filter(p =>
    accounts.some(a => selectedAccountIds.includes(a.id) && a.platform === p.value)
  );
  const availablePlatforms = selectedPlatforms.length > 0 ? selectedPlatforms : platformOptions;
  const account = getAccountForPlatform(accounts, selectedAccountIds, activePlatform);

  // Use platform-specific content if available
  const activeContent = platformContents?.[activePlatform] ?? content;
  const handleContentChange = (c: string) => {
    if (onPlatformContentChange) {
      onPlatformContentChange(activePlatform, c);
    } else {
      onContentChange?.(c);
    }
  };

  const charLimit = platformCharLimits[activePlatform] || 5000;
  const charCount = activeContent.length;
  const isOverLimit = charCount > charLimit;

  const renderPreview = () => {
    const truncationPoint = platformTruncationPoints[activePlatform];
    const props = { content: activeContent, imageUrl, account, editable, onContentChange: handleContentChange, truncationPoint };
    switch (activePlatform) {
      case "facebook": return <FacebookPreview {...props} />;
      case "instagram": return <InstagramPreview {...props} />;
      case "twitter": return <TwitterPreview {...props} />;
      case "linkedin": return <LinkedInPreview {...props} />;
      default: {
        const pName = platformOptions.find(p => p.value === activePlatform)?.label || activePlatform;
        return <GenericPreview {...props} platformName={pName} />;
      }
    }
  };

  return (
    <div className="space-y-3">
      {showPlatformSelector && !fixedPlatform && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Preview</p>
          <Select value={activePlatform} onValueChange={(v) => setPreviewPlatform(v as Platform)}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availablePlatforms.map(p => {
                const Icon = p.icon;
                return (
                  <SelectItem key={p.value} value={p.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" /><span>{p.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="bg-[#F0F2F5] dark:bg-[#18191A] rounded-xl p-3">
        {renderPreview()}
      </div>

      {/* Character count */}
      {editable && (
        <div className="flex items-center justify-end">
          <span className={cn("text-xs font-medium tabular-nums", isOverLimit ? "text-destructive" : "text-muted-foreground")}>
            {charCount}/{charLimit}
          </span>
        </div>
      )}
    </div>
  );
}
