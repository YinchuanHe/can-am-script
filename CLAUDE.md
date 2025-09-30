# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Court Reservation Automation System** that automatically manages court reservations with continuous rotation of user groups. The system creates 12 users, splits them into 3 groups of 4, and rotates court access every 30 minutes.

## Commands

### Development
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build the Next.js application
- `npm start` - Start production server (uses custom Node.js server)
- `npm run lint` - Run ESLint for code linting
- `npm run mcp` - Start MCP server for AI assistant integration

### Production
- Server runs on Railway with Redis database
- Uses `server.js` for custom Node.js server instead of Next.js default

## Architecture

### Core Components

**Frontend**: Next.js 15 with React 19, mobile-optimized interface for iPhone control
**Backend**: Custom Node.js server (`server.js`) with Redis-based storage
**Database**: Redis for session state, user data, and automation persistence
**Automation**: Built-in cron service (`src/lib/cron-service.ts`) handles 30-minute rotations

### Key Modules

- **`src/lib/court-api.ts`**: Core API integration for court reservation system
  - User registration and approval with random phone numbers and animal names
  - Court reservation logic with 4-user groups and waitlist management
  - Rotation system that moves groups every 30 minutes
  - User reuse with 6-hour expiration to avoid conflicts

- **`src/lib/storage.ts`**: Redis-based state management
  - Single court automation state (`AutomationState`)
  - Multi-court automation state (`MultiCourtAutomationState`)
  - Session management with 6-hour TTL
  - User group organization (3 groups of 4 users each)

- **`src/lib/cron-service.ts`**: Automated rotation service
  - Runs every 30 minutes to rotate court reservations
  - Handles both single and multi-court scenarios
  - Automatic cleanup when automation duration expires

### Data Flow

1. **Setup Phase**: Creates 12 users with unique phone numbers and animal names
2. **Initial Reservation**: First group (4 users) books court, other 8 join waitlist in groups
3. **Rotation Cycle**: Every 30 minutes, current group moves to waitlist, next waitlist group gets court
4. **State Persistence**: All automation state stored in Redis with 6-hour expiration

### API Structure

- `/api/start-automation` - Initialize single court automation
- `/api/stop-automation` - Stop running automation
- `/api/status` - Get current automation status and user groups
- `/api/list-courts` - Fetch available courts from queue system
- Built-in cron handles rotations automatically (no external dependencies)

### MCP Server Integration

The project includes a **Model Context Protocol (MCP) server** (`src/mcp-server.ts`) that exposes court reservation functionality to AI assistants like ChatGPT and Claude Desktop.

**Available MCP Tools:**
- `list_available_courts` - Get courts available for reservation
- `start_single_court_automation` - Start automation for one court (courtId, durationHours)
- `start_multi_court_automation` - Start automation for multiple courts (courtIds[], durationHours)
- `stop_automation` - Stop any running automation
- `get_automation_status` - Check current automation status and details
- `get_court_details` - Get detailed court information from external API

**Usage:**
1. Start the Next.js app: `npm run dev`
2. Start the MCP server: `npm run mcp`
3. Configure your AI assistant (see `MCP_SETUP.md` for details)

**Configuration Files:**
- `mcp.json` - Basic MCP server configuration
- `MCP_SETUP.md` - Comprehensive setup guide for different AI assistants

The MCP server uses stdio transport and connects to the local API at `http://localhost:3000/api`.

### Multi-Court Support

The system supports running automation on multiple courts simultaneously:
- Each court gets its own set of 12 users to avoid conflicts
- Independent rotation timers for each court
- Unified status monitoring across all courts

### User Management

- **User Creation**: Random 5-digit phone numbers with animal names
- **Approval**: Automatic approval after registration
- **Reuse Strategy**: 6-hour expiration prevents stale user conflicts
- **Multi-Court**: Fresh users created for each court to avoid reservation conflicts

### Redis Connection

- Auto-configured on Railway with `REDIS_URL`
- Includes Railway DNS delays and dual-stack resolution
- Graceful fallback when Redis unavailable (optional `REQUIRE_REDIS=true`)
- Connection testing available via `/api/health`

## External Dependencies

- **Queue System API**: `https://queuesystem-be.onrender.com/api`
- **Admin Password**: Uses `canamadmin` for admin operations
- **Referer**: Points to `https://can-am.vercel.app/` for API authentication