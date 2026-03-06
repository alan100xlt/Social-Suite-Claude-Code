import { cn } from '@/lib/utils';
import type { MessageCategory } from '@/lib/api/inbox';

const categoryConfig: Record<MessageCategory, { label: string; bg: string; text: string }> = {
  editorial: { label: 'Editorial', bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  business: { label: 'Business', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  support: { label: 'Support', bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400' },
  community: { label: 'Community', bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
  noise: { label: 'Noise', bg: 'bg-muted', text: 'text-muted-foreground' },
  general: { label: 'General', bg: 'bg-muted', text: 'text-muted-foreground' },
};

const subcategoryLabels: Record<string, string> = {
  news_tip: 'News Tip',
  story_idea: 'Story Idea',
  source_offer: 'Source Offer',
  correction_request: 'Correction',
  editorial_complaint: 'Editorial Complaint',
  advertising_inquiry: 'Advertising',
  pr_pitch: 'PR Pitch',
  partnership_proposal: 'Partnership',
  event_invitation: 'Event Invite',
  subscription_access_issue: 'Subscription',
  technical_problem: 'Technical',
  general_question: 'Question',
  positive_engagement: 'Engagement',
  discussion: 'Discussion',
  user_generated_content: 'UGC',
  spam_bot: 'Spam',
  trolling_harassment: 'Trolling',
  off_topic: 'Off Topic',
  greeting_chat: 'Chat',
  unclassifiable: 'Unclassified',
};

interface ClassificationBadgeProps {
  category: MessageCategory | null;
  subcategory?: string | null;
  showSubcategory?: boolean;
  size?: 'sm' | 'md';
}

export function ClassificationBadge({ category, subcategory, showSubcategory = false, size = 'sm' }: ClassificationBadgeProps) {
  if (!category) return null;

  const config = categoryConfig[category] || categoryConfig.general;
  const label = showSubcategory && subcategory
    ? subcategoryLabels[subcategory] || subcategory
    : config.label;

  return (
    <span className={cn(
      'inline-flex items-center font-semibold rounded-full whitespace-nowrap',
      config.bg, config.text,
      size === 'sm' ? 'text-[11px] px-2.5 py-0.5' : 'text-xs px-3 py-1'
    )}>
      {label}
    </span>
  );
}
