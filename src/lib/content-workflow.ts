export type ContentStatus =
  | 'draft'
  | 'awaiting_approval'
  | 'approved'
  | 'rejected'
  | 'scheduled'
  | 'published'
  | 'pulled'
  | 'archived';

export const VALID_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  draft: ['awaiting_approval'],
  awaiting_approval: ['approved', 'rejected'],
  rejected: ['draft'],
  approved: ['scheduled'],
  scheduled: ['published', 'draft'],
  published: ['pulled', 'archived'],
  pulled: ['archived'],
  archived: [],
};

export function canTransition(from: ContentStatus, to: ContentStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canApprove(permissions: Record<string, boolean>): boolean {
  return permissions['publish'] === true;
}
