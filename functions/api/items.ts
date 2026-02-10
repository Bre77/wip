import type { CombinedItem, Env, GitHubItem, PriorityValue, WorkItem } from '../types';
import { PRIORITY_LEVELS, PRIORITY_NAMES } from '../types';
import type { AuthenticatedData } from './_middleware';
import { fetchPullRequests, fetchIssues, invalidateCache } from './github';

function makeItemId(type: 'pr' | 'issue', repo: string, number: number): string {
  return `${type}:${repo}#${number}`;
}

// Auto-assign priority based on repo rules
function getAutoPriority(repo: string, title: string): PriorityValue {
  const repoLower = repo.toLowerCase();
  const titleLower = title.toLowerCase();

  // Teslemetry integration in Home Assistant core = uber
  if (repoLower === 'home-assistant/core' && titleLower.includes('teslemetry')) {
    return PRIORITY_LEVELS.uber;
  }

  // Teslemetry repos = high
  if (repoLower.startsWith('teslemetry/')) {
    return PRIORITY_LEVELS.high;
  }

  // Other Home Assistant items = normal
  if (repoLower.startsWith('home-assistant/')) {
    return PRIORITY_LEVELS.normal;
  }

  // Everything else = low
  return PRIORITY_LEVELS.low;
}

function extractCiStatus(gh: GitHubItem): CombinedItem['ciStatus'] {
  const rollup = gh.commits?.nodes?.[0]?.commit?.statusCheckRollup;
  if (!rollup) return null;
  const state = rollup.state;
  if (state === 'SUCCESS') return 'success';
  if (state === 'FAILURE') return 'failure';
  if (state === 'PENDING' || state === 'EXPECTED') return 'pending';
  if (state === 'ERROR') return 'error';
  return null;
}

function extractMergeable(gh: GitHubItem): CombinedItem['mergeable'] {
  if (!gh.mergeable) return null;
  if (gh.mergeable === 'MERGEABLE') return 'mergeable';
  if (gh.mergeable === 'CONFLICTING') return 'conflicting';
  return 'unknown';
}

function extractReviewStatus(gh: GitHubItem): CombinedItem['reviewStatus'] {
  if (gh.reviewDecision === 'APPROVED') return 'approved';
  if (gh.reviewDecision === 'CHANGES_REQUESTED') return 'changes_requested';
  if (gh.reviewDecision === 'REVIEW_REQUIRED') return 'review_required';
  // If there are pending review requests but no decision yet
  if (gh.reviewRequests && gh.reviewRequests.totalCount > 0) return 'pending_review';
  return null;
}

function combineItems(
  githubItems: GitHubItem[],
  type: 'pr' | 'issue',
  workItems: Map<string, WorkItem>
): CombinedItem[] {
  return githubItems.map((gh) => {
    const id = makeItemId(type, gh.repository.nameWithOwner, gh.number);
    const work = workItems.get(id);
    const repo = gh.repository.nameWithOwner;

    // Use user override if it exists (0-4 are valid priority levels), otherwise auto-assign
    const hasOverride = work !== undefined && work.priority >= 0 && work.priority <= 4;
    const priority = (hasOverride ? work.priority : getAutoPriority(repo, gh.title)) as PriorityValue;

    return {
      id,
      type,
      title: gh.title,
      body: gh.body,
      number: gh.number,
      url: gh.url,
      repo,
      isDraft: gh.isDraft ?? false,
      createdAt: gh.createdAt,
      updatedAt: gh.updatedAt,
      priority,
      priorityName: PRIORITY_NAMES[priority],
      notes: work?.notes ?? null,
      hidden: work?.hidden === 1,
      ciStatus: type === 'pr' ? extractCiStatus(gh) : null,
      mergeable: type === 'pr' ? extractMergeable(gh) : null,
      reviewStatus: type === 'pr' ? extractReviewStatus(gh) : null,
    };
  });
}

// Sort: by priority (ascending), then newest first within same priority
function sortItems(items: CombinedItem[]): CombinedItem[] {
  return items.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export const onRequestGet: PagesFunction<Env, string, AuthenticatedData> = async (context) => {
  const { env, data } = context;
  const { session } = data;
  const { DB, CACHE } = env;

  // Fetch from GitHub in parallel
  const [prs, issues] = await Promise.all([
    fetchPullRequests(session.accessToken, CACHE, session.userId),
    fetchIssues(session.accessToken, CACHE, session.userId),
  ]);

  // Fetch work items from D1
  const { results } = await DB.prepare(
    'SELECT * FROM work_items WHERE user_id = ?'
  ).bind(session.userId).all<WorkItem>();

  const workItemsMap = new Map<string, WorkItem>();
  for (const item of results ?? []) {
    workItemsMap.set(item.id, item);
  }

  // Combine GitHub data with D1 customizations
  const combinedPrs = combineItems(prs, 'pr', workItemsMap);
  const combinedIssues = combineItems(issues, 'issue', workItemsMap);

  // Merge all items into a single sorted list
  const allItems = sortItems([...combinedPrs, ...combinedIssues]);

  // Also store snapshot in KV for MCP endpoint
  await CACHE.put(`mcp:${session.userId}`, JSON.stringify(allItems), { expirationTtl: 3600 });

  return Response.json({
    items: allItems,
  });
};

// Refresh endpoint - invalidates cache
export const onRequestPost: PagesFunction<Env, string, AuthenticatedData> = async (context) => {
  const { env, data } = context;
  const { session } = data;
  const { CACHE } = env;

  await invalidateCache(CACHE, session.userId);

  return Response.json({ success: true });
};
