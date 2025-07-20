#!/bin/sh

# Discord MCP Server Startup Script
# This script ensures proper stdio handling and networking for the MCP server

set -e

# Check if required environment variables are set
if [ -z "$DISCORD_TOKEN" ]; then
    echo "ERROR: DISCORD_TOKEN environment variable is not set" >&2
    exit 1
fi

# Set up proper signal handling for stdio transport
trap 'echo "Received shutdown signal, stopping Discord MCP server..." >&2; exit 0' TERM INT

# Ensure proper stdio buffering
export NODE_OPTIONS="--max-old-space-size=512"

# Start the Discord MCP server with proper stdio handling
echo "Starting Discord MCP server..." >&2
exec node dist/index.js