// Priority levels matching backend
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

export const PRIORITY_COLORS: Record<PriorityName, string> = {
  uber: 'text-red-400 bg-red-950 border-red-800',
  high: 'text-orange-400 bg-orange-950 border-orange-800',
  normal: 'text-blue-400 bg-blue-950 border-blue-800',
  low: 'text-gray-400 bg-gray-800 border-gray-700',
  meh: 'text-gray-500 bg-gray-900 border-gray-800',
};

export const PRIORITY_HEADER_COLORS: Record<PriorityName, string> = {
  uber: 'bg-red-950/50 border-red-800 text-red-300',
  high: 'bg-orange-950/50 border-orange-800 text-orange-300',
  normal: 'bg-blue-950/50 border-blue-800 text-blue-300',
  low: 'bg-gray-800/50 border-gray-700 text-gray-300',
  meh: 'bg-gray-900/50 border-gray-800 text-gray-500',
};

// Combined item from API
export interface WorkItem {
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

// Auth state
export interface User {
  authenticated: boolean;
  userId?: string;
  username?: string;
}

// API response - single unified list
export interface ItemsResponse {
  items: WorkItem[];
}
