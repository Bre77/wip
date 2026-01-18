import type { Env, Session } from '../types';
import { createSessionCookie } from './session';

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

interface GitHubUser {
  id: number;
  login: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response('Missing authorization code', { status: 400 });
  }

  // Exchange code for access token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = await tokenResponse.json<GitHubTokenResponse>();

  if (tokenData.error || !tokenData.access_token) {
    return new Response(`OAuth error: ${tokenData.error_description || tokenData.error}`, { status: 400 });
  }

  // Fetch user info
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'WIP-Tracker',
    },
  });

  if (!userResponse.ok) {
    return new Response('Failed to fetch user info', { status: 500 });
  }

  const user = await userResponse.json<GitHubUser>();

  // Create session
  const session: Session = {
    accessToken: tokenData.access_token,
    userId: String(user.id),
    username: user.login,
  };

  const cookie = createSessionCookie(session, env.SESSION_SECRET);

  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/',
      'Set-Cookie': cookie,
    },
  });
};
