// Combined item from API
export interface WorkItem {
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

// Auth state
export interface User {
  authenticated: boolean;
  userId?: string;
  username?: string;
}

// API responses
export interface ItemsResponse {
  pullRequests: WorkItem[];
  issues: WorkItem[];
}
