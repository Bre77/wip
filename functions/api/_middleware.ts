import type { Env, Session } from '../types';
import { getSession } from '../auth/session';

export interface AuthenticatedData extends Record<string, unknown> {
  session: Session;
}

export const onRequest: PagesFunction<Env, string, AuthenticatedData> = async (context) => {
  const { request, env, next, data } = context;

  const session = getSession(request, env.SESSION_SECRET);

  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Add session to data for downstream handlers
  data.session = session;

  return next();
};
