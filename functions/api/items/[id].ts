import type { Env } from '../../types';
import type { AuthenticatedData } from '../_middleware';

interface UpdateItemRequest {
  priority?: number;
  notes?: string | null;
  hidden?: boolean;
}

export const onRequestPut: PagesFunction<Env, string, AuthenticatedData> = async (context) => {
  const { env, data, request, params } = context;
  const { session } = data;
  const { DB } = env;

  // The ID comes URL-encoded since it contains special chars like : # /
  const id = decodeURIComponent(params.id as string);
  const body = await request.json<UpdateItemRequest>();

  // Extract item type from ID (format: "pr:owner/repo#123" or "issue:owner/repo#123")
  const itemType = id.startsWith('pr:') ? 'pr' : 'issue';

  // Build the upsert query dynamically based on what fields are provided
  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (body.priority !== undefined) {
    updates.push('priority = ?');
    values.push(body.priority);
  }

  if (body.notes !== undefined) {
    updates.push('notes = ?');
    values.push(body.notes);
  }

  if (body.hidden !== undefined) {
    updates.push('hidden = ?');
    values.push(body.hidden ? 1 : 0);
  }

  if (updates.length === 0) {
    return Response.json({ error: 'No fields to update' }, { status: 400 });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');

  // Use INSERT OR REPLACE to upsert
  const existingItem = await DB.prepare(
    'SELECT * FROM work_items WHERE id = ? AND user_id = ?'
  ).bind(id, session.userId).first();

  if (existingItem) {
    // Update existing
    await DB.prepare(
      `UPDATE work_items SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
    ).bind(...values, id, session.userId).run();
  } else {
    // Insert new with defaults
    const priority = body.priority ?? 1000;
    const notes = body.notes ?? null;
    const hidden = body.hidden ? 1 : 0;

    await DB.prepare(
      `INSERT INTO work_items (id, user_id, item_type, priority, notes, hidden)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(id, session.userId, itemType, priority, notes, hidden).run();
  }

  return Response.json({ success: true });
};

// Batch update priorities (for drag-and-drop reordering)
export const onRequestPost: PagesFunction<Env, string, AuthenticatedData> = async (context) => {
  const { env, data, request, params } = context;

  // Check if this is a batch operation
  const id = decodeURIComponent(params.id as string);
  if (id !== 'batch-priority') {
    return Response.json({ error: 'Invalid operation' }, { status: 400 });
  }

  const { session } = data;
  const { DB } = env;
  const body = await request.json<{ items: Array<{ id: string; priority: number }> }>();

  if (!Array.isArray(body.items)) {
    return Response.json({ error: 'Invalid items array' }, { status: 400 });
  }

  // Update all priorities in a batch
  const stmt = DB.prepare(
    `INSERT INTO work_items (id, user_id, item_type, priority, notes, hidden)
     VALUES (?, ?, ?, ?, NULL, 0)
     ON CONFLICT(id) DO UPDATE SET priority = excluded.priority, updated_at = CURRENT_TIMESTAMP`
  );

  const batch = body.items.map(item => {
    const itemType = item.id.startsWith('pr:') ? 'pr' : 'issue';
    return stmt.bind(item.id, session.userId, itemType, item.priority);
  });

  await DB.batch(batch);

  return Response.json({ success: true });
};
