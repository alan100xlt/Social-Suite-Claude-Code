import { ExternalLink, Heart, MessageSquare, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { InboxConversation } from '@/lib/api/inbox';

interface SocialPostTabProps {
  conversation: InboxConversation;
}

export function SocialPostTab({ conversation }: SocialPostTabProps) {
  const isComment = conversation.type === 'comment';

  if (!isComment && !conversation.post_url) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        No social post linked to this conversation.
      </div>
    );
  }

  const postDate = conversation.created_at
    ? new Date(conversation.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  return (
    <div className="p-4 space-y-4">
      {/* Mini post preview */}
      <div>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-sm font-extrabold flex-shrink-0">
            {conversation.platform.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-[13px] font-bold capitalize">{conversation.platform}</p>
            <p className="text-[11px] text-muted-foreground">{postDate}</p>
          </div>
        </div>

        {conversation.last_message_preview && (
          <p className="text-[13px] leading-relaxed mb-3">
            {conversation.article_title || conversation.last_message_preview.slice(0, 200)}
          </p>
        )}

        {/* Image placeholder */}
        <div className="w-full h-[140px] rounded-lg bg-muted border flex items-center justify-center text-muted-foreground text-xs mb-3">
          {conversation.article_title || 'Social Post'}
        </div>

        {/* Engagement stats */}
        <div className="flex gap-3 text-[11.5px] text-muted-foreground pt-2.5 border-t">
          <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> —</span>
          <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> —</span>
          <span className="flex items-center gap-1"><Share2 className="h-3.5 w-3.5" /> —</span>
        </div>
      </div>

      <Separator />

      {/* Post Performance */}
      <div className="space-y-2">
        <h4 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Post Performance</h4>
        <div className="space-y-1.5 text-[11.5px]">
          <div className="flex justify-between"><span className="text-muted-foreground">Reach</span><span className="font-semibold">—</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Engagement</span><span className="font-semibold text-emerald-600">—</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Total comments</span><span className="font-semibold">—</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Shares</span><span className="font-semibold">—</span></div>
        </div>
      </div>

      <Separator />

      {/* Quick Actions */}
      <div className="space-y-2">
        <h4 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Quick Actions</h4>
        <div className="space-y-1.5">
          {conversation.post_url && (
            <Button variant="outline" size="sm" className="w-full justify-start text-xs gap-2 h-9" asChild>
              <a href={conversation.post_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> View on {conversation.platform.charAt(0).toUpperCase() + conversation.platform.slice(1)}
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
