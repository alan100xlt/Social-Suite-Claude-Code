#!/bin/bash
# Ensure the Slack listener is running. Called by SessionStart hook.
# Starts the listener + ngrok if not already active.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load config from .env
if [ -f "$SCRIPT_DIR/.env" ]; then
  export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
fi

NGROK="/c/Users/alana/AppData/Local/Microsoft/WinGet/Packages/Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe/ngrok"
NGROK_DOMAIN="${NGROK_DOMAIN:-}"
PID_FILE="$SCRIPT_DIR/.listener.pid"

# Clean up stale state files (older than 24h)
find "$SCRIPT_DIR/../../.claude" -name "approval-state*.json" -mmin +1440 -delete 2>/dev/null || true

# Check if listener is already running on port 3001
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "Slack listener already running."
  exit 0
fi

echo "Starting Slack Agent Bridge..."

# Start the Express listener in background
node "$SCRIPT_DIR/slack-listener.js" &
LISTENER_PID=$!
echo "$LISTENER_PID" > "$PID_FILE"
echo "Listener started (PID: $LISTENER_PID)"

# Start ngrok in background (detached)
if [ -n "$NGROK_DOMAIN" ]; then
  "$NGROK" http --url="$NGROK_DOMAIN" 3001 > /dev/null 2>&1 &
else
  "$NGROK" http 3001 > /dev/null 2>&1 &
fi
NGROK_PID=$!
echo "ngrok started (PID: $NGROK_PID)"

# Give them a moment to bind
sleep 2

# Verify
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "Slack Agent Bridge is ready."
else
  echo "Warning: Listener may not have started. Check manually."
fi

exit 0
