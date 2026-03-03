# Automation Rules

## Purpose

Rules link RSS feeds to post generation, automating the content pipeline.

## Table

`automation_rules`: `company_id`, `feed_id`, `name`, `objective`, `action`, `scheduling`, `approval_emails`, `account_ids`

## Actions

- `send_approval` — generate post, send for approval before publishing
- `auto_publish` — generate post and publish immediately

## Trigger Flow

1. RSS poll detects new feed item (`status = 'pending'`)
2. `run-automation-article` edge function triggered
3. Checks matching automation rules for the feed's company
4. If rule matches: generates post via `generate-social-post`
5. Based on action: sends approval email or auto-publishes

## Default Rule

Created automatically during company setup with:
- `objective: 'auto'`
- `action: 'send_approval'`
- `approval_emails: [user's email]`
- `account_ids: []` (no platforms connected yet)

## Note

The enterprise `AutomationService` (media company-level automation with templates, execution history) is stubbed — the tables and RPCs don't exist yet. The working automation system uses direct `automation_rules` table queries via `src/hooks/useAutomation.ts`.
