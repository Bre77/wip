import type { Env } from '../types';
import { getSession } from './session';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const session = getSession(request, env.SESSION_SECRET);

  if (!session) {
    return Response.json({ authenticated: false });
  }

  return Response.json({
    authenticated: true,
    userId: session.userId,
    username: session.username,
  });
};
