import type { CombinedItem, Env, GitHubItem, WorkItem } from '../types';
import type { AuthenticatedData } from './_middleware';
import { fetchPullRequests, fetchIssues, invalidateCache } from './github';

function makeItemId(type: 'pr' | 'issue', repo: string, number: number): string {
  return `${type}:${repo}#${number}`;
}

function combineItems(
  githubItems: GitHubItem[],
  type: 'pr' | 'issue',
  workItems: Map<string, WorkItem>
): CombinedItem[] {
  return githubItems.map((gh, index) => {
    const id = makeItemId(type, gh.repository.nameWithOwner, gh.number);
    const work = workItems.get(id);

    return {
      id,
      type,
      title: gh.title,
      body: gh.body,
      number: gh.number,
      url: gh.url,
      repo: gh.repository.nameWithOwner,
      isDraft: gh.isDraft ?? false,
      createdAt: gh.createdAt,
      updatedAt: gh.updatedAt,
      priority: work?.priority ?? index + 1000, // Default priority for new items
      notes: work?.notes ?? null,
      hidden: work?.hidden === 1,
    };
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

  // Sort by priority
  combinedPrs.sort((a, b) => a.priority - b.priority);
  combinedIssues.sort((a, b) => a.priority - b.priority);

  return Response.json({
    pullRequests: combinedPrs,
    issues: combinedIssues,
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
