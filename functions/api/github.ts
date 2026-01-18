import type { GitHubItem } from '../types';

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';
const CACHE_TTL = 300; // 5 minutes

// GraphQL query to fetch user's open PRs
const PULL_REQUESTS_QUERY = `
  query {
    viewer {
      pullRequests(first: 100, states: OPEN) {
        nodes {
          id
          title
          body
          number
          url
          createdAt
          updatedAt
          repository {
            nameWithOwner
          }
        }
      }
    }
  }
`;

// GraphQL query to search for issues assigned to user OR in repos they own
const ISSUES_SEARCH_QUERY = `
  query($searchQuery: String!) {
    search(query: $searchQuery, type: ISSUE, first: 100) {
      nodes {
        ... on Issue {
          id
          title
          body
          number
          url
          createdAt
          updatedAt
          repository {
            nameWithOwner
          }
        }
      }
    }
  }
`;

// Query to get the viewer's login
const VIEWER_LOGIN_QUERY = `
  query {
    viewer {
      login
    }
  }
`;

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

interface PullRequestsData {
  viewer: {
    pullRequests: {
      nodes: GitHubItem[];
    };
  };
}

interface IssuesSearchData {
  search: {
    nodes: GitHubItem[];
  };
}

interface ViewerLoginData {
  viewer: {
    login: string;
  };
}

async function graphqlRequest<T>(
  token: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T | null> {
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'WIP-Tracker',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    console.error('GitHub API error:', response.status);
    return null;
  }

  const result = await response.json<GraphQLResponse<T>>();

  if (result.errors) {
    console.error('GraphQL errors:', result.errors);
    return null;
  }

  return result.data ?? null;
}

export async function fetchPullRequests(
  token: string,
  cache: KVNamespace,
  userId: string
): Promise<GitHubItem[]> {
  const cacheKey = `prs:${userId}`;

  // Try cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const data = await graphqlRequest<PullRequestsData>(token, PULL_REQUESTS_QUERY);
  const prs = data?.viewer.pullRequests.nodes ?? [];

  // Cache result
  await cache.put(cacheKey, JSON.stringify(prs), { expirationTtl: CACHE_TTL });

  return prs;
}

export async function fetchIssues(
  token: string,
  cache: KVNamespace,
  userId: string
): Promise<GitHubItem[]> {
  const cacheKey = `issues:${userId}`;

  // Try cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Get the viewer's login first
  const viewerData = await graphqlRequest<ViewerLoginData>(token, VIEWER_LOGIN_QUERY);
  const login = viewerData?.viewer.login;

  if (!login) {
    console.error('Could not get viewer login');
    return [];
  }

  // Make two separate searches and merge results:
  // 1. Issues assigned to the user (on any repo)
  // 2. Issues in repos owned by the user
  const [assignedData, ownedData] = await Promise.all([
    graphqlRequest<IssuesSearchData>(
      token,
      ISSUES_SEARCH_QUERY,
      { searchQuery: `is:issue is:open assignee:${login}` }
    ),
    graphqlRequest<IssuesSearchData>(
      token,
      ISSUES_SEARCH_QUERY,
      { searchQuery: `is:issue is:open user:${login}` }
    ),
  ]);

  // Merge and deduplicate results
  const issuesMap = new Map<string, GitHubItem>();
  for (const issue of assignedData?.search.nodes ?? []) {
    if (issue?.id) {
      issuesMap.set(issue.id, issue);
    }
  }
  for (const issue of ownedData?.search.nodes ?? []) {
    if (issue?.id) {
      issuesMap.set(issue.id, issue);
    }
  }
  const issues = Array.from(issuesMap.values());

  // Cache result
  await cache.put(cacheKey, JSON.stringify(issues), { expirationTtl: CACHE_TTL });

  return issues;
}

export async function invalidateCache(cache: KVNamespace, userId: string): Promise<void> {
  await Promise.all([
    cache.delete(`prs:${userId}`),
    cache.delete(`issues:${userId}`),
  ]);
}
