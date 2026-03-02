#!/bin/bash
# Start the Slack listener and ngrok tunnel together
# Run this before starting autonomous Claude Code sessions

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGROK="/c/Users/alana/AppData/Local/ngrok/ngrok.exe"
NGROK_DOMAIN="sherika-halterlike-savanna.ngrok-free.dev"

echo "Starting Slack Agent Bridge..."

# Start the Express listener in background
node "$SCRIPT_DIR/slack-listener.js" &
LISTENER_PID=$!
echo "Listener started (PID: $LISTENER_PID)"

# Start the ngrok tunnel
echo "Starting ngrok tunnel ($NGROK_DOMAIN)..."
"$NGROK" http --url="$NGROK_DOMAIN" 3001

# If tunnel exits, kill the listener
kill $LISTENER_PID 2>/dev/null
echo "Slack Agent Bridge stopped."
