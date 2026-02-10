// Cloudflare environment bindings
export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  SESSION_SECRET: string;
}

// Named priority levels (numeric value = sort order)
export const PRIORITY_LEVELS = {
  uber: 0,
  high: 1,
  normal: 2,
  low: 3,
  meh: 4,
} as const;

export type PriorityName = keyof typeof PRIORITY_LEVELS;
export type PriorityValue = (typeof PRIORITY_LEVELS)[PriorityName];

export const PRIORITY_NAMES: Record<number, PriorityName> = {
  0: 'uber',
  1: 'high',
  2: 'normal',
  3: 'low',
  4: 'meh',
};

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

// GitHub item from API (enhanced with PR metadata)
export interface GitHubItem {
  id: string;
  title: string;
  body: string | null;
  number: number;
  url: string;
  isDraft?: boolean;
  createdAt: string;
  updatedAt: string;
  repository: {
    nameWithOwner: string;
  };
  // PR-specific fields
  mergeable?: 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN';
  reviewDecision?: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null;
  reviewRequests?: {
    totalCount: number;
  };
  reviews?: {
    nodes: Array<{
      state: string;
      author: { login: string } | null;
    }>;
  };
  commits?: {
    nodes: Array<{
      commit: {
        statusCheckRollup: {
          state: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'ERROR' | 'EXPECTED';
        } | null;
      };
    }>;
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
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  priority: PriorityValue;
  priorityName: PriorityName;
  notes: string | null;
  hidden: boolean;
  // PR-specific metadata
  ciStatus: 'success' | 'failure' | 'pending' | 'error' | null;
  mergeable: 'mergeable' | 'conflicting' | 'unknown' | null;
  reviewStatus: 'approved' | 'changes_requested' | 'review_required' | 'pending_review' | null;
}

// Session data stored in cookie
export interface Session {
  accessToken: string;
  userId: string;
  username: string;
}
