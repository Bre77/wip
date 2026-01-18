// Cloudflare environment bindings
export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  SESSION_SECRET: string;
}

// Work item stored in D1
export interface WorkItem {
  id: string;
  user_id: string;
  item_type: 'pr' | 'issue';
  priority: number;
  notes: string | null;
  hidden: number;
  created_at: string;
  updated_at: string;
}

// GitHub item from API
export interface GitHubItem {
  id: string;
  title: string;
  body: string | null;
  number: number;
  url: string;
  createdAt: string;
  updatedAt: string;
  repository: {
    nameWithOwner: string;
  };
}

// Combined item for frontend
export interface CombinedItem {
  id: string;
  type: 'pr' | 'issue';
  title: string;
  body: string | null;
  number: number;
  url: string;
  repo: string;
  createdAt: string;
  updatedAt: string;
  priority: number;
  notes: string | null;
  hidden: boolean;
}

// Session data stored in cookie
export interface Session {
  accessToken: string;
  userId: string;
  username: string;
}
