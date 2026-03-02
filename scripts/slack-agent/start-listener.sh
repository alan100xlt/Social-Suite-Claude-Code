#!/bin/bash
# Start the Slack listener and Cloudflare tunnel together
# Run this before starting autonomous Claude Code sessions

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting Slack Agent Bridge..."

# Start the Express listener in background
node "$SCRIPT_DIR/slack-listener.js" &
LISTENER_PID=$!
echo "Listener started (PID: $LISTENER_PID)"

# Start the Cloudflare tunnel
echo "Starting Cloudflare tunnel..."
cloudflared tunnel run claude-agent-bridge

# If tunnel exits, kill the listener
kill $LISTENER_PID 2>/dev/null
echo "Slack Agent Bridge stopped."
