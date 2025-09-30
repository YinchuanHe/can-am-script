# MCP Server Setup Guide

This document explains how to configure and use the Can-Am Court Reservation MCP server with different AI assistants.

## Prerequisites

1. **Start the Next.js application** first:
   ```bash
   npm run dev
   ```
   The MCP server connects to the local API at `http://localhost:3000/api`

2. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

## Configuration for Claude Desktop

Add this configuration to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "can-am-court-reservation": {
      "command": "npm",
      "args": ["run", "mcp"],
      "env": {
        "NEXT_PUBLIC_API_URL": "http://localhost:3000/api"
      }
    }
  }
}
```

**Location of config file:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

## Configuration for ChatGPT with MCP Support

If you're using a ChatGPT client that supports MCP (like some third-party tools), use this configuration:

```json
{
  "server": {
    "name": "can-am-court-reservation",
    "command": ["npm", "run", "mcp"],
    "args": [],
    "env": {
      "NEXT_PUBLIC_API_URL": "http://localhost:3000/api"
    },
    "cwd": "/path/to/can-am-script"
  }
}
```

## Manual MCP Server Testing

You can test the MCP server directly:

```bash
# Start the MCP server
npm run mcp

# In another terminal, test with stdio communication
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | npm run mcp
```

## Available Tools

The MCP server exposes these tools:

### 1. `list_available_courts`
- **Description**: Get a list of courts available for reservation
- **Parameters**: None
- **Example**: "List all available courts"

### 2. `start_single_court_automation`
- **Description**: Start automation for a single court
- **Parameters**:
  - `courtId` (string): MongoDB ObjectId of the court
  - `durationHours` (number): Duration in hours (1-24)
- **Example**: "Start automation for court 6841fbeda6e050ee8a23c8f7 for 3 hours"

### 3. `start_multi_court_automation`
- **Description**: Start automation for multiple courts
- **Parameters**:
  - `courtIds` (array): Array of court IDs
  - `durationHours` (number): Duration in hours (1-24)
- **Example**: "Start automation for courts [id1, id2, id3] for 2 hours"

### 4. `stop_automation`
- **Description**: Stop any running automation
- **Parameters**: None
- **Example**: "Stop the current automation"

### 5. `get_automation_status`
- **Description**: Get current automation status
- **Parameters**: None
- **Example**: "What's the current automation status?"

### 6. `get_court_details`
- **Description**: Get detailed court information from Can-Am API
- **Parameters**:
  - `courtId` (string, optional): Specific court ID
- **Example**: "Get details for all courts" or "Get details for court 6841fbeda6e050ee8a23c8f7"

## Example AI Assistant Conversations

### Starting Single Court Automation
**User**: "Start automation for court 6841fbeda6e050ee8a23c8f7 for 4 hours"

**AI Assistant**: Will use `start_single_court_automation` tool with:
- courtId: "6841fbeda6e050ee8a23c8f7"
- durationHours: 4

### Checking Status
**User**: "What's the current status of my court automation?"

**AI Assistant**: Will use `get_automation_status` tool to get current state, showing:
- Active automation details
- Current user groups
- Rotation schedule
- Time remaining

### Multi-Court Setup
**User**: "Set up automation for courts 11, 12, and 13 for the next 3 hours"

**AI Assistant**: Will first use `list_available_courts` to find the court IDs, then use `start_multi_court_automation`.

## Troubleshooting

1. **"API call failed"**: Ensure the Next.js app is running on `http://localhost:3000`
2. **"MCP server not found"**: Check the configuration file path and syntax
3. **"Permission denied"**: Ensure Node.js and npm are properly installed
4. **"Tool not available"**: Restart Claude Desktop after configuration changes

## Environment Variables

You can customize the API URL:

```bash
export NEXT_PUBLIC_API_URL="http://localhost:3000/api"
npm run mcp
```

Or set it in your MCP configuration's `env` section.