# Post Generation & Publishing

## AI Post Generation

- `generate-social-post` edge function (Gemini API)
- Inputs: article data, company voice settings, target platforms
- Voice settings: tone, emoji_style, hashtag_strategy, content_length
- Autonomy modes: `dynamic`, `strict`, `decides`

## Post Drafts

- Saved to `post_drafts` table
- Fields: `company_id`, `content`, `platforms`, `scheduled_for`, `status`

## Approval Workflow

- `post_approvals` table with token-based external approval
- External approval page: `/approve/:token` (no auth required)
- Approver can approve/reject with comments

## Publishing

- `getlate-posts` edge function (GetLate API)
- Cross-company posting prevention (security check in the edge function)

## RLS

- Drafts and approvals scoped by `user_is_member(auth.uid(), company_id)`
- Service role has full access for edge functions
