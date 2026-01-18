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
3. Frontend fetches PRs/issues from `/api/items`:
   - Backend fetches from GitHub GraphQL API (cached in KV for 5 min)
   - Merges with user customizations from D1
   - Returns combined data sorted by priority
4. User actions (reorder, notes, hide) update D1 via `/api/items/[id]`

### Key Files

- `functions/types.ts` - Shared types for Env bindings, database models, API responses
- `functions/api/_middleware.ts` - Auth middleware that validates session for all `/api/*` routes
- `functions/api/github.ts` - GitHub GraphQL queries and caching logic
- `functions/auth/session.ts` - Cookie-based session encryption/decryption
- `src/lib/types.ts` - Frontend types (mirrors backend CombinedItem)
- `src/hooks/useItems.ts` - Main data fetching and mutation logic

### Environment Variables

Set in `.dev.vars` for local development:
- `GITHUB_CLIENT_ID` - GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth app client secret
- `SESSION_SECRET` - Random string for session encryption

### GitHub API Queries

Issues are fetched with two separate searches merged together:
- `is:issue is:open assignee:{login}` - Issues assigned to user
- `is:issue is:open user:{login}` - Issues in repos user owns
