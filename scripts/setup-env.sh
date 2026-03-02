#!/usr/bin/env bash
# ============================================================
# setup-env.sh — Distribute secrets from .env.local
# ============================================================
# Reads the single .env.local at the repo root and generates:
#   1. Root .env          (Vite frontend vars)
#   2. scripts/slack-agent/.env  (Slack bot vars)
#   3. Registers MCP servers with `claude mcp add` (if CLI present)
#   4. Patches ensure-listener.sh ngrok path for current OS
#
# Usage:
#   bash scripts/setup-env.sh            # interactive — prompts for empty vars
#   bash scripts/setup-env.sh --ci       # non-interactive — skip prompts
# ============================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_LOCAL="$REPO_ROOT/.env.local"
CI_MODE=false
[[ "${1:-}" == "--ci" ]] && CI_MODE=true

# ── Helpers ──────────────────────────────────────────────────

red()    { printf '\033[0;31m%s\033[0m\n' "$*"; }
green()  { printf '\033[0;32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[0;33m%s\033[0m\n' "$*"; }
bold()   { printf '\033[1m%s\033[0m\n' "$*"; }

# Read a var from .env.local (strips quotes)
env_get() {
  local key="$1"
  local val
  val=$(grep -E "^${key}=" "$ENV_LOCAL" 2>/dev/null | head -1 | cut -d'=' -f2-)
  # Strip surrounding quotes
  val="${val%\"}"
  val="${val#\"}"
  echo "$val"
}

# Prompt for a missing value (skipped in --ci mode)
prompt_if_empty() {
  local key="$1"
  local desc="$2"
  local val
  val=$(env_get "$key")

  if [[ -z "$val" ]]; then
    if $CI_MODE; then
      yellow "  SKIP  $key (empty, --ci mode)"
      return
    fi
    printf "  %s (%s): " "$key" "$desc"
    read -r val
    if [[ -n "$val" ]]; then
      # Write back to .env.local
      if grep -q "^${key}=" "$ENV_LOCAL"; then
        sed -i "s|^${key}=.*|${key}=\"${val}\"|" "$ENV_LOCAL"
      else
        echo "${key}=\"${val}\"" >> "$ENV_LOCAL"
      fi
    fi
  fi
}

# ── Pre-flight ───────────────────────────────────────────────

if [[ ! -f "$ENV_LOCAL" ]]; then
  red "ERROR: $ENV_LOCAL not found."
  echo "Copy .env.example to .env.local and fill in your secrets, then re-run."
  exit 1
fi

bold "=== Social Suite — Environment Setup ==="
echo ""

# ── 1. Prompt for any empty required vars ────────────────────

bold "Checking required secrets..."
prompt_if_empty "VITE_SUPABASE_URL"            "Supabase project URL"
prompt_if_empty "VITE_SUPABASE_PUBLISHABLE_KEY" "Supabase anon/publishable key"
prompt_if_empty "VITE_SUPABASE_PROJECT_ID"      "Supabase project ID"
prompt_if_empty "SLACK_BOT_TOKEN"               "Slack bot token (xoxb-...)"
prompt_if_empty "SLACK_SIGNING_SECRET"          "Slack app signing secret"
prompt_if_empty "SLACK_CHANNEL_ID"              "Slack channel ID (C...)"
echo ""

# ── 2. Generate root .env (Vite vars) ───────────────────────

bold "Generating .env (Vite frontend)..."

cat > "$REPO_ROOT/.env" << EOF
VITE_SUPABASE_PROJECT_ID="$(env_get VITE_SUPABASE_PROJECT_ID)"
VITE_SUPABASE_PUBLISHABLE_KEY="$(env_get VITE_SUPABASE_PUBLISHABLE_KEY)"
VITE_SUPABASE_URL="$(env_get VITE_SUPABASE_URL)"
EOF

FIGMA_TOKEN=$(env_get VITE_FIGMA_ACCESS_TOKEN)
if [[ -n "$FIGMA_TOKEN" ]]; then
  echo "VITE_FIGMA_ACCESS_TOKEN=\"${FIGMA_TOKEN}\"" >> "$REPO_ROOT/.env"
fi

green "  ✓ .env written"

# ── 3. Generate scripts/slack-agent/.env ─────────────────────

bold "Generating scripts/slack-agent/.env..."

SLACK_BOT_TOKEN=$(env_get SLACK_BOT_TOKEN)
SLACK_SIGNING_SECRET=$(env_get SLACK_SIGNING_SECRET)
SLACK_CHANNEL_ID=$(env_get SLACK_CHANNEL_ID)
SLACK_NGROK_DOMAIN=$(env_get SLACK_NGROK_DOMAIN)

if [[ -n "$SLACK_BOT_TOKEN" ]]; then
  cat > "$REPO_ROOT/scripts/slack-agent/.env" << EOF
SLACK_BOT_TOKEN=${SLACK_BOT_TOKEN}
SLACK_SIGNING_SECRET=${SLACK_SIGNING_SECRET}
SLACK_CHANNEL_ID=${SLACK_CHANNEL_ID}
EOF
  green "  ✓ scripts/slack-agent/.env written"
else
  yellow "  ⚠ Slack vars empty — skipping scripts/slack-agent/.env"
fi

# ── 4. Patch ensure-listener.sh ngrok path ───────────────────

bold "Patching ngrok path for current OS..."

LISTENER_SH="$REPO_ROOT/scripts/slack-agent/ensure-listener.sh"

if [[ -f "$LISTENER_SH" ]]; then
  # Detect ngrok binary
  NGROK_BIN=""
  if command -v ngrok &>/dev/null; then
    NGROK_BIN="$(command -v ngrok)"
  elif [[ -f "/c/Users/alana/AppData/Local/ngrok/ngrok.exe" ]]; then
    NGROK_BIN="/c/Users/alana/AppData/Local/ngrok/ngrok.exe"
  fi

  if [[ -n "$NGROK_BIN" ]]; then
    sed -i "s|^NGROK=.*|NGROK=\"${NGROK_BIN}\"|" "$LISTENER_SH"
    green "  ✓ ngrok path → $NGROK_BIN"
  else
    yellow "  ⚠ ngrok not found in PATH — leaving ensure-listener.sh unchanged"
  fi

  # Patch ngrok domain if provided
  if [[ -n "$SLACK_NGROK_DOMAIN" ]]; then
    sed -i "s|^NGROK_DOMAIN=.*|NGROK_DOMAIN=\"${SLACK_NGROK_DOMAIN}\"|" "$LISTENER_SH"
    green "  ✓ ngrok domain → $SLACK_NGROK_DOMAIN"
  fi
fi

# ── 5. Register MCP servers ─────────────────────────────────

bold "Registering MCP servers..."

if ! command -v claude &>/dev/null; then
  yellow "  ⚠ 'claude' CLI not in PATH — skipping MCP registration."
  echo "    Run these manually after installing Claude CLI:"
  echo ""
  echo "    claude mcp add --scope user context7 -- npx -y @upstash/context7-mcp"
  echo "    claude mcp add --scope user playwright -- npx -y @playwright/mcp"
  echo "    claude mcp add --scope user --transport http figma https://mcp.figma.com/mcp"
  echo ""

  SUPABASE_TOKEN=$(env_get SUPABASE_ACCESS_TOKEN)
  if [[ -n "$SUPABASE_TOKEN" ]]; then
    echo "    SUPABASE_ACCESS_TOKEN=$SUPABASE_TOKEN claude mcp add --scope user supabase -- npx -y @supabase/mcp-server"
  else
    echo "    claude mcp add --scope user supabase -- npx -y @supabase/mcp-server"
  fi

  LINEAR_KEY=$(env_get LINEAR_API_KEY)
  if [[ -n "$LINEAR_KEY" ]]; then
    echo "    LINEAR_API_KEY=$LINEAR_KEY claude mcp add --scope user linear -- npx -y @linear/mcp-server"
  fi
  echo ""
else
  # context7 — library docs
  claude mcp add --scope user context7 -- npx -y @upstash/context7-mcp 2>/dev/null && \
    green "  ✓ context7" || yellow "  ⚠ context7 (may already exist)"

  # Playwright — browser automation
  claude mcp add --scope user playwright -- npx -y @playwright/mcp 2>/dev/null && \
    green "  ✓ playwright" || yellow "  ⚠ playwright (may already exist)"

  # Figma — design context
  claude mcp add --scope user --transport http figma https://mcp.figma.com/mcp 2>/dev/null && \
    green "  ✓ figma" || yellow "  ⚠ figma (may already exist)"

  # Supabase — schema inspection
  SUPABASE_TOKEN=$(env_get SUPABASE_ACCESS_TOKEN)
  if [[ -n "$SUPABASE_TOKEN" ]]; then
    SUPABASE_ACCESS_TOKEN="$SUPABASE_TOKEN" claude mcp add --scope user supabase -- npx -y @supabase/mcp-server 2>/dev/null && \
      green "  ✓ supabase" || yellow "  ⚠ supabase (may already exist)"
  else
    yellow "  ⚠ supabase — SUPABASE_ACCESS_TOKEN empty, skipping"
  fi

  # Linear — issue tracking
  LINEAR_KEY=$(env_get LINEAR_API_KEY)
  if [[ -n "$LINEAR_KEY" ]]; then
    LINEAR_API_KEY="$LINEAR_KEY" claude mcp add --scope user linear -- npx -y @linear/mcp-server 2>/dev/null && \
      green "  ✓ linear" || yellow "  ⚠ linear (may already exist)"
  else
    yellow "  ⚠ linear — LINEAR_API_KEY empty, skipping"
  fi
fi

# ── 6. Summary ───────────────────────────────────────────────

echo ""
bold "=== Setup Complete ==="
echo ""
echo "Generated files (all gitignored):"
echo "  • .env                      → Vite frontend vars"
echo "  • scripts/slack-agent/.env  → Slack bot credentials"
echo ""
echo "Next steps:"
echo "  1. Fill in any empty values in .env.local"
echo "  2. Re-run this script after adding new secrets"
echo "  3. Start the dev server:  npm run dev"
echo ""
