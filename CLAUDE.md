# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (builds frontend, then runs Wrangler Pages dev server)
pnpm dev

# Build frontend only
pnpm build

# Lint
pnpm lint

# Deploy to Cloudflare Pages
pnpm deploy

# Apply D1 schema to local database (find the actual .sqlite file in .wrangler/state/v3/d1/miniflare-D1DatabaseObject/)
sqlite3 <path-to-sqlite-file> < schema.sql
```

**Note:** The dev server builds the frontend once at startup. To see frontend changes, restart the dev server.

## Architecture

This is a **Cloudflare Pages** project with:
- React/Vite frontend (built to `dist/`)
- Pages Functions for the API (`functions/` directory with file-based routing)
- D1 database for user customizations (priority, notes, hidden state)
- KV namespace for GitHub API response caching

### Data Flow

1. User authenticates via GitHub OAuth (`/auth/login` → GitHub → `/auth/callback`)
2. Session stored in encrypted HTTP-only cookie
3. Frontend fetches all items from `/api/items`:
   - Backend fetches PRs and issues from GitHub GraphQL API (cached in KV for 5 min)
   - PRs include CI/CD status, merge conflict state, and review status
   - Merges with user customizations from D1
   - Auto-assigns priority based on repo rules (Teslemetry, Home Assistant, etc.)
   - Returns single unified list sorted by priority, then newest first
   - Stores snapshot in KV for MCP endpoint access
4. User actions (change priority, notes, hide) update D1 via `/api/items/[id]`
5. MCP endpoint at `/mcp` provides unauthenticated access to cached items

### Priority System

Named priority levels (uber > high > normal > low > meh). Auto-assigned by repo:
- `home-assistant/core` + "Teslemetry" in title → **uber**
- `Teslemetry/*` repos → **high**
- `home-assistant/*` repos → **normal**
- Everything else → **low**
- **meh** is manual-only

Users can override priority manually. Items within the same priority are sorted newest first.

### Key Files

- `functions/types.ts` - Shared types for Env bindings, database models, API responses, priority levels
- `functions/api/_middleware.ts` - Auth middleware that validates session for all `/api/*` routes
- `functions/api/github.ts` - GitHub GraphQL queries (PRs with CI/merge/review status) and caching
- `functions/api/items.ts` - Main items endpoint with auto-priority and MCP snapshot caching
- `functions/mcp.ts` - Unauthenticated MCP endpoint (JSON-RPC 2.0 over HTTP)
- `functions/auth/session.ts` - Cookie-based session encryption/decryption
- `src/lib/types.ts` - Frontend types (mirrors backend CombinedItem)
- `src/hooks/useItems.ts` - Main data fetching and mutation logic

### Environment Variables

Set in `.dev.vars` for local development:
- `GITHUB_CLIENT_ID` - GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth app client secret
- `SESSION_SECRET` - Random string for session encryption

### GitHub API Queries

PRs are fetched via `viewer.pullRequests` and include `mergeable`, `reviewDecision`, `reviewRequests`, `reviews`, and `commits.statusCheckRollup`.

Issues are fetched with two separate searches merged together:
- `is:issue is:open assignee:{login}` - Issues assigned to user
- `is:issue is:open user:{login}` - Issues in repos user owns
