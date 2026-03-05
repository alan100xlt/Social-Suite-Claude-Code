#!/bin/bash
# Start the Slack listener and ngrok tunnel together
# Run this before starting autonomous Claude Code sessions

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load config from .env
if [ -f "$SCRIPT_DIR/.env" ]; then
  export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
fi

NGROK="${NGROK_PATH:-$(which ngrok 2>/dev/null || echo ngrok)}"
NGROK_DOMAIN="${NGROK_DOMAIN:-}"

echo "Starting Slack Agent Bridge..."

# Start the Express listener in background
node "$SCRIPT_DIR/slack-listener.js" &
LISTENER_PID=$!
echo "Listener started (PID: $LISTENER_PID)"

# Start the ngrok tunnel
if [ -n "$NGROK_DOMAIN" ]; then
  echo "Starting ngrok tunnel ($NGROK_DOMAIN)..."
  "$NGROK" http --url="$NGROK_DOMAIN" 3001
else
  echo "Starting ngrok tunnel (random domain)..."
  "$NGROK" http 3001
fi

# If tunnel exits, kill the listener
kill $LISTENER_PID 2>/dev/null
echo "Slack Agent Bridge stopped."
