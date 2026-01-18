import type { Env } from '../types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  const url = new URL(request.url);
  const redirectUri = `${url.origin}/auth/callback`;

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'repo read:org',
    state: crypto.randomUUID(),
  });

  return Response.redirect(`https://github.com/login/oauth/authorize?${params}`, 302);
};
