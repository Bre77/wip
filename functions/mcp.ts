import type { Env, CombinedItem } from './types';
import { PRIORITY_NAMES } from './types';

// MCP Streamable HTTP endpoint - unauthenticated
// Exposes work items for a user via MCP protocol (JSON-RPC 2.0)

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string };
}

function jsonRpcResponse(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id: string | number | null, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

const SERVER_INFO = {
  name: 'wip-tracker',
  version: '1.0.0',
};

const TOOLS = [
  {
    name: 'get_work_items',
    description: 'Get all work-in-progress items (PRs and issues) sorted by priority. Returns items grouped by priority level: uber, high, normal, low, meh. Each item includes title, repo, URL, type (PR/issue), CI status, merge conflict status, and review status.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        user_id: {
          type: 'string',
          description: 'GitHub user ID to fetch items for',
        },
      },
      required: ['user_id'],
    },
  },
];

async function handleGetWorkItems(cache: KVNamespace, userId: string): Promise<unknown> {
  const cached = await cache.get(`mcp:${userId}`);
  if (!cached) {
    return {
      content: [
        {
          type: 'text',
          text: 'No cached items found for this user. The user needs to log in and load their items first.',
        },
      ],
    };
  }

  const items: CombinedItem[] = JSON.parse(cached);
  const visible = items.filter(i => !i.hidden);

  // Format as readable text grouped by priority
  const groups = new Map<string, CombinedItem[]>();
  for (const item of visible) {
    const name = PRIORITY_NAMES[item.priority] ?? 'unknown';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name)!.push(item);
  }

  let text = '# Work In Progress\n\n';
  for (const level of ['uber', 'high', 'normal', 'low', 'meh']) {
    const groupItems = groups.get(level);
    if (!groupItems || groupItems.length === 0) continue;

    text += `## ${level.charAt(0).toUpperCase() + level.slice(1)} Priority\n\n`;
    for (const item of groupItems) {
      const typeLabel = item.type === 'pr' ? 'PR' : 'Issue';
      const badges: string[] = [];
      if (item.isDraft) badges.push('Draft');
      if (item.ciStatus === 'failure' || item.ciStatus === 'error') badges.push('CI Failing');
      else if (item.ciStatus === 'pending') badges.push('CI Pending');
      else if (item.ciStatus === 'success') badges.push('CI Passing');
      if (item.mergeable === 'conflicting') badges.push('Merge Conflicts');
      if (item.reviewStatus === 'changes_requested') badges.push('Changes Requested');
      else if (item.reviewStatus === 'approved') badges.push('Approved');
      else if (item.reviewStatus === 'review_required' || item.reviewStatus === 'pending_review') badges.push('Pending Review');

      const badgeStr = badges.length > 0 ? ` [${badges.join(', ')}]` : '';
      text += `- [${typeLabel}] **${item.title}** (${item.repo}#${item.number})${badgeStr}\n  ${item.url}\n`;
      if (item.notes) text += `  Notes: ${item.notes}\n`;
    }
    text += '\n';
  }

  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

async function handleMcpRequest(request: JsonRpcRequest, cache: KVNamespace): Promise<JsonRpcResponse> {
  const id = request.id ?? null;

  switch (request.method) {
    case 'initialize':
      return jsonRpcResponse(id, {
        protocolVersion: '2025-03-26',
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });

    case 'notifications/initialized':
      // This is a notification, no response needed, but we return one for HTTP
      return jsonRpcResponse(id, {});

    case 'tools/list':
      return jsonRpcResponse(id, { tools: TOOLS });

    case 'tools/call': {
      const toolName = request.params?.name as string;
      if (toolName !== 'get_work_items') {
        return jsonRpcError(id, -32602, `Unknown tool: ${toolName}`);
      }
      const args = request.params?.arguments as Record<string, string> | undefined;
      const userId = args?.user_id;
      if (!userId) {
        return jsonRpcError(id, -32602, 'user_id is required');
      }
      const result = await handleGetWorkItems(cache, userId);
      return jsonRpcResponse(id, result);
    }

    case 'ping':
      return jsonRpcResponse(id, {});

    default:
      return jsonRpcError(id, -32601, `Method not found: ${request.method}`);
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const { CACHE } = env;

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return Response.json(
      jsonRpcError(null, -32700, 'Content-Type must be application/json'),
      { status: 400 }
    );
  }

  const body = await request.json<JsonRpcRequest>();

  if (!body.jsonrpc || body.jsonrpc !== '2.0' || !body.method) {
    return Response.json(
      jsonRpcError(body.id ?? null, -32600, 'Invalid JSON-RPC request'),
      { status: 400 }
    );
  }

  const result = await handleMcpRequest(body, CACHE);

  return Response.json(result, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

// Handle GET for SSE (Server-Sent Events) - optional for MCP
export const onRequestGet: PagesFunction<Env> = async () => {
  return new Response('MCP endpoint. Use POST with JSON-RPC 2.0 messages.', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
};
