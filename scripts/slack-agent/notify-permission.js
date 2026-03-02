// scripts/slack-agent/notify-permission.js
// PreToolUse hook: reads tool input from stdin, checks if auto-approved,
// and if not, posts to Slack and blocks until the user responds.
// Uses per-session state files for concurrent session support.

import { readFileSync } from 'fs';
import { WebClient } from '@slack/web-api';
import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readState, writeState, cleanupStaleStates, STATUSES } from './state.js';
import { parseHookInput } from './stdin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

// Clean up stale state files from previous sessions on each invocation
cleanupStaleStates();

const input = await parseHookInput();

const permissionMode = input.permission_mode || 'default';
const sessionId = input.session_id || null;
const toolName = input.tool_name || '';
const toolInput = input.tool_input || {};

// -------------------------------------------------------------------
// Skip if no valid tool name (empty stdin / parse failure)
// -------------------------------------------------------------------
if (!toolName) {
  process.exit(0);
}

// -------------------------------------------------------------------
// Skip entirely if permissions are bypassed
// -------------------------------------------------------------------
if (permissionMode === 'bypassPermissions' || permissionMode === 'dontAsk' || permissionMode === 'acceptEdits') {
  process.exit(0);
}

// -------------------------------------------------------------------
// Read allow/deny patterns from settings.json at runtime
// -------------------------------------------------------------------
const SETTINGS_PATH = join(__dirname, '../../.claude/settings.json');

let allowPatterns = [];
let denyPatterns = [];

try {
  const settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'));
  allowPatterns = (settings.permissions?.allow || []);
  denyPatterns = (settings.permissions?.deny || []);
} catch {}

// Also read settings.local.json for local overrides
const LOCAL_SETTINGS_PATH = join(__dirname, '../../.claude/settings.local.json');
try {
  const local = JSON.parse(readFileSync(LOCAL_SETTINGS_PATH, 'utf8'));
  allowPatterns = allowPatterns.concat(local.permissions?.allow || []);
  denyPatterns = denyPatterns.concat(local.permissions?.deny || []);
} catch {}

/**
 * Convert a Claude Code permission pattern like "Bash(git diff *)"
 * into { tool, regex } for matching.
 */
function parsePattern(pattern) {
  // Format: "ToolName" or "ToolName(glob)"
  const match = pattern.match(/^(\w+)(?:\((.+)\))?$/);
  if (!match) return null;
  const tool = match[1];
  const glob = match[2] || null;

  if (!glob) return { tool, regex: null };

  // Convert glob to regex: * → .*, escape other regex chars
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  return { tool, regex: new RegExp(`^${escaped}$`) };
}

const parsedAllow = allowPatterns.map(parsePattern).filter(Boolean);
const parsedDeny = denyPatterns.map(parsePattern).filter(Boolean);

// Tools that never trigger permission prompts (read-only built-ins)
const NEVER_PROMPTS = new Set([
  'Read', 'Glob', 'Grep', 'Agent', 'TodoWrite', 'WebSearch', 'WebFetch',
  'AskUserQuestion', 'EnterPlanMode', 'ExitPlanMode', 'ToolSearch',
  'ListMcpResourcesTool', 'ReadMcpResourceTool', 'Skill',
  'EnterWorktree', 'TaskOutput', 'TaskStop',
]);

// MCP tools that should never prompt — auto-approve all connected integrations
const NEVER_PROMPTS_MCP = new Set([
  // Linear (plugin) — all operations
  'mcp__plugin_linear_linear__get_issue',
  'mcp__plugin_linear_linear__get_issue_status',
  'mcp__plugin_linear_linear__get_project',
  'mcp__plugin_linear_linear__get_team',
  'mcp__plugin_linear_linear__get_user',
  'mcp__plugin_linear_linear__get_document',
  'mcp__plugin_linear_linear__get_attachment',
  'mcp__plugin_linear_linear__get_milestone',
  'mcp__plugin_linear_linear__list_issues',
  'mcp__plugin_linear_linear__list_projects',
  'mcp__plugin_linear_linear__list_teams',
  'mcp__plugin_linear_linear__list_users',
  'mcp__plugin_linear_linear__list_issue_labels',
  'mcp__plugin_linear_linear__list_issue_statuses',
  'mcp__plugin_linear_linear__list_cycles',
  'mcp__plugin_linear_linear__list_documents',
  'mcp__plugin_linear_linear__list_milestones',
  'mcp__plugin_linear_linear__list_project_labels',
  'mcp__plugin_linear_linear__list_customers',
  'mcp__plugin_linear_linear__list_comments',
  'mcp__plugin_linear_linear__search_documentation',
  'mcp__plugin_linear_linear__save_issue',
  'mcp__plugin_linear_linear__save_project',
  'mcp__plugin_linear_linear__save_milestone',
  'mcp__plugin_linear_linear__save_customer',
  'mcp__plugin_linear_linear__save_customer_need',
  'mcp__plugin_linear_linear__create_comment',
  'mcp__plugin_linear_linear__create_document',
  'mcp__plugin_linear_linear__create_issue_label',
  'mcp__plugin_linear_linear__create_attachment',
  'mcp__plugin_linear_linear__update_document',
  'mcp__plugin_linear_linear__delete_attachment',
  'mcp__plugin_linear_linear__delete_customer',
  'mcp__plugin_linear_linear__delete_customer_need',
  'mcp__plugin_linear_linear__extract_images',
  // Slack (plugin) — all operations
  'mcp__plugin_slack_slack__slack_read_channel',
  'mcp__plugin_slack_slack__slack_read_thread',
  'mcp__plugin_slack_slack__slack_read_user_profile',
  'mcp__plugin_slack_slack__slack_read_canvas',
  'mcp__plugin_slack_slack__slack_search_channels',
  'mcp__plugin_slack_slack__slack_search_public',
  'mcp__plugin_slack_slack__slack_search_public_and_private',
  'mcp__plugin_slack_slack__slack_search_users',
  'mcp__plugin_slack_slack__slack_send_message',
  'mcp__plugin_slack_slack__slack_send_message_draft',
  'mcp__plugin_slack_slack__slack_schedule_message',
  'mcp__plugin_slack_slack__slack_create_canvas',
  // Figma (plugin) — all operations
  'mcp__plugin_figma_figma__get_design_context',
  'mcp__plugin_figma_figma__get_screenshot',
  'mcp__plugin_figma_figma__get_metadata',
  'mcp__plugin_figma_figma__get_figjam',
  'mcp__plugin_figma_figma__get_code_connect_map',
  'mcp__plugin_figma_figma__get_code_connect_suggestions',
  'mcp__plugin_figma_figma__get_variable_defs',
  'mcp__plugin_figma_figma__whoami',
  'mcp__plugin_figma_figma__add_code_connect_map',
  'mcp__plugin_figma_figma__create_design_system_rules',
  'mcp__plugin_figma_figma__generate_diagram',
  'mcp__plugin_figma_figma__generate_figma_design',
  'mcp__plugin_figma_figma__send_code_connect_mappings',
  'mcp__plugin_figma_figma__extract_images',
  // Supabase (plugin) — all operations
  'mcp__plugin_supabase_supabase__list_tables',
  'mcp__plugin_supabase_supabase__list_projects',
  'mcp__plugin_supabase_supabase__list_organizations',
  'mcp__plugin_supabase_supabase__list_migrations',
  'mcp__plugin_supabase_supabase__list_extensions',
  'mcp__plugin_supabase_supabase__list_branches',
  'mcp__plugin_supabase_supabase__list_edge_functions',
  'mcp__plugin_supabase_supabase__get_project',
  'mcp__plugin_supabase_supabase__get_project_url',
  'mcp__plugin_supabase_supabase__get_organization',
  'mcp__plugin_supabase_supabase__get_edge_function',
  'mcp__plugin_supabase_supabase__get_logs',
  'mcp__plugin_supabase_supabase__get_advisors',
  'mcp__plugin_supabase_supabase__get_cost',
  'mcp__plugin_supabase_supabase__get_publishable_keys',
  'mcp__plugin_supabase_supabase__search_docs',
  'mcp__plugin_supabase_supabase__execute_sql',
  'mcp__plugin_supabase_supabase__generate_typescript_types',
  'mcp__plugin_supabase_supabase__apply_migration',
  'mcp__plugin_supabase_supabase__confirm_cost',
  'mcp__plugin_supabase_supabase__create_branch',
  'mcp__plugin_supabase_supabase__create_project',
  'mcp__plugin_supabase_supabase__delete_branch',
  'mcp__plugin_supabase_supabase__deploy_edge_function',
  'mcp__plugin_supabase_supabase__merge_branch',
  'mcp__plugin_supabase_supabase__pause_project',
  'mcp__plugin_supabase_supabase__rebase_branch',
  'mcp__plugin_supabase_supabase__reset_branch',
  'mcp__plugin_supabase_supabase__restore_project',
  // Playwright (plugin) — all operations
  'mcp__plugin_playwright_playwright__browser_navigate',
  'mcp__plugin_playwright_playwright__browser_click',
  'mcp__plugin_playwright_playwright__browser_snapshot',
  'mcp__plugin_playwright_playwright__browser_take_screenshot',
  'mcp__plugin_playwright_playwright__browser_fill_form',
  'mcp__plugin_playwright_playwright__browser_press_key',
  'mcp__plugin_playwright_playwright__browser_type',
  'mcp__plugin_playwright_playwright__browser_select_option',
  'mcp__plugin_playwright_playwright__browser_hover',
  'mcp__plugin_playwright_playwright__browser_drag',
  'mcp__plugin_playwright_playwright__browser_evaluate',
  'mcp__plugin_playwright_playwright__browser_handle_dialog',
  'mcp__plugin_playwright_playwright__browser_file_upload',
  'mcp__plugin_playwright_playwright__browser_install',
  'mcp__plugin_playwright_playwright__browser_close',
  'mcp__plugin_playwright_playwright__browser_console_messages',
  'mcp__plugin_playwright_playwright__browser_network_requests',
  'mcp__plugin_playwright_playwright__browser_navigate_back',
  'mcp__plugin_playwright_playwright__browser_resize',
  'mcp__plugin_playwright_playwright__browser_run_code',
  'mcp__plugin_playwright_playwright__browser_tabs',
  'mcp__plugin_playwright_playwright__browser_wait_for',
  // Claude.ai connector MCP tools
  'mcp__claude_ai_Linear__get_issue',
  'mcp__claude_ai_Linear__get_issue_status',
  'mcp__claude_ai_Linear__get_project',
  'mcp__claude_ai_Linear__get_team',
  'mcp__claude_ai_Linear__get_user',
  'mcp__claude_ai_Linear__get_document',
  'mcp__claude_ai_Linear__get_attachment',
  'mcp__claude_ai_Linear__get_milestone',
  'mcp__claude_ai_Linear__list_issues',
  'mcp__claude_ai_Linear__list_projects',
  'mcp__claude_ai_Linear__list_teams',
  'mcp__claude_ai_Linear__list_users',
  'mcp__claude_ai_Linear__list_issue_labels',
  'mcp__claude_ai_Linear__list_issue_statuses',
  'mcp__claude_ai_Linear__list_cycles',
  'mcp__claude_ai_Linear__list_documents',
  'mcp__claude_ai_Linear__list_milestones',
  'mcp__claude_ai_Linear__list_project_labels',
  'mcp__claude_ai_Linear__list_customers',
  'mcp__claude_ai_Linear__list_comments',
  'mcp__claude_ai_Linear__search_documentation',
  'mcp__claude_ai_Linear__save_issue',
  'mcp__claude_ai_Linear__save_project',
  'mcp__claude_ai_Linear__save_milestone',
  'mcp__claude_ai_Linear__create_comment',
  'mcp__claude_ai_Linear__create_document',
  'mcp__claude_ai_Linear__create_issue_label',
  'mcp__claude_ai_Linear__create_attachment',
  'mcp__claude_ai_Linear__update_document',
  'mcp__claude_ai_Slack__slack_read_channel',
  'mcp__claude_ai_Slack__slack_read_thread',
  'mcp__claude_ai_Slack__slack_read_user_profile',
  'mcp__claude_ai_Slack__slack_read_canvas',
  'mcp__claude_ai_Slack__slack_search_channels',
  'mcp__claude_ai_Slack__slack_search_public',
  'mcp__claude_ai_Slack__slack_search_public_and_private',
  'mcp__claude_ai_Slack__slack_search_users',
  'mcp__claude_ai_Slack__slack_send_message',
  'mcp__claude_ai_Slack__slack_send_message_draft',
  'mcp__claude_ai_Slack__slack_schedule_message',
  'mcp__claude_ai_Slack__slack_create_canvas',
  'mcp__claude_ai_Gmail__gmail_search_messages',
  'mcp__claude_ai_Gmail__gmail_read_message',
  'mcp__claude_ai_Gmail__gmail_read_thread',
  'mcp__claude_ai_Gmail__gmail_get_profile',
  'mcp__claude_ai_Gmail__gmail_list_drafts',
  'mcp__claude_ai_Gmail__gmail_create_draft',
  'mcp__claude_ai_Google_Calendar__gcal_list_events',
  'mcp__claude_ai_Google_Calendar__gcal_list_calendars',
  'mcp__claude_ai_Google_Calendar__gcal_get_event',
  'mcp__claude_ai_Google_Calendar__gcal_create_event',
  'mcp__claude_ai_Google_Calendar__gcal_update_event',
  'mcp__claude_ai_Google_Calendar__gcal_delete_event',
  'mcp__claude_ai_Google_Calendar__gcal_find_meeting_times',
  'mcp__claude_ai_Google_Calendar__gcal_find_my_free_time',
  'mcp__claude_ai_Google_Calendar__gcal_respond_to_event',
  'mcp__claude_ai_HubSpot__get_crm_objects',
  'mcp__claude_ai_HubSpot__search_crm_objects',
  'mcp__claude_ai_HubSpot__get_properties',
  'mcp__claude_ai_HubSpot__search_properties',
  'mcp__claude_ai_HubSpot__get_user_details',
  'mcp__claude_ai_HubSpot__search_owners',
  'mcp__claude_ai_HubSpot__manage_crm_objects',
  'mcp__claude_ai_Otter__search',
  'mcp__claude_ai_Otter__fetch',
  'mcp__claude_ai_Otter__get_user_info',
]);

function getToolArg() {
  if (toolName === 'Bash') return toolInput.command || '';
  if (toolName === 'Edit' || toolName === 'Write') return toolInput.file_path || '';
  if (toolName === 'NotebookEdit') return toolInput.notebook_path || '';
  return '';
}

function isDenied() {
  // Only deny-listed commands require Slack approval.
  // Everything else is auto-approved by this hook — Claude Code's
  // native permission system still applies as a second gate.
  const arg = getToolArg();

  for (const p of parsedDeny) {
    if (p.tool === toolName) {
      if (!p.regex || p.regex.test(arg)) return true;
    }
  }

  return false;
}

function isAutoApproved() {
  // Built-in read-only tools and known MCP tools — always skip
  if (NEVER_PROMPTS.has(toolName) || NEVER_PROMPTS_MCP.has(toolName)) return true;

  // Slack agent scripts should never trigger themselves
  if (toolName === 'Bash' && /slack-agent/.test(toolInput.command || '')) return true;

  // If explicitly denied, require Slack approval
  if (isDenied()) return false;

  // Everything else: auto-approve in this hook.
  // Claude Code's native permission system handles the rest.
  return true;
}

if (isAutoApproved()) {
  process.exit(0);
}

// -------------------------------------------------------------------
// Build description
// -------------------------------------------------------------------
let description;

if (toolName === 'Bash') {
  const cmd = toolInput.command || '(empty command)';
  description = cmd.length > 300 ? cmd.slice(0, 300) + '...' : cmd;
} else if (toolName === 'Edit') {
  description = `Edit ${toolInput.file_path || '(unknown file)'}`;
} else if (toolName === 'Write') {
  description = `Write ${toolInput.file_path || '(unknown file)'}`;
} else if (toolName.startsWith('mcp__')) {
  const parts = toolName.split('__');
  const server = parts.slice(1, -1).join('/');
  const tool = parts[parts.length - 1];
  const params = Object.entries(toolInput)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v.slice(0, 100) : JSON.stringify(v).slice(0, 100)}`)
    .join(', ');
  description = `MCP ${server}/${tool}${params ? ` — ${params}` : ''}`;
} else {
  description = `${toolName}: ${JSON.stringify(toolInput).slice(0, 200)}`;
}

// -------------------------------------------------------------------
// Send Slack notification + block
// -------------------------------------------------------------------
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const CHANNEL = process.env.SLACK_CHANNEL_ID;
const POLL_INTERVAL_MS = 1000;
const TIMEOUT_MS = parseInt(process.env.APPROVAL_TIMEOUT_MS || '600000', 10);

try {
  const result = await slack.chat.postMessage({
    channel: CHANNEL,
    text: `⚠️ PERMISSION PROMPT: ${description}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `⚠️ *PERMISSION PROMPT*${sessionId ? ` _(session ${sessionId.slice(0, 8)})_` : ''}\n\`\`\`${description}\`\`\``,
        },
      },
      {
        type: 'actions',
        block_id: 'approval_actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '✅ Approve' },
            style: 'primary',
            action_id: 'approve',
            value: 'approved',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '❌ Reject' },
            style: 'danger',
            action_id: 'reject',
            value: 'rejected',
          },
        ],
      },
    ],
    attachments: [{ color: '#FFA500' }],
    metadata: sessionId ? { event_type: 'approval', event_payload: { session_id: sessionId } } : undefined,
  });

  writeState(sessionId, {
    status: STATUSES.WAITING,
    event: 'permission_prompt',
    context: description,
    thread_ts: result.ts,
  });

  // Poll for approval
  const start = Date.now();
  while (Date.now() - start < TIMEOUT_MS) {
    const state = readState(sessionId);

    if (state.status === STATUSES.APPROVED) {
      console.log('Approved:', state.message || '(no message)');
      process.exit(0);
    }
    if (state.status === STATUSES.ANSWERED) {
      console.log('Reply from Slack:', state.message || '(no message)');
      process.exit(0);
    }
    if (state.status === STATUSES.REJECTED) {
      console.error('Rejected:', state.message || '(no message)');
      process.exit(1);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  console.error('Approval timed out');
  process.exit(1);
} catch (err) {
  console.error('notify-permission error:', err.message);
  process.exit(0); // Don't block Claude if Slack is unreachable
}
