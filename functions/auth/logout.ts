import type { Env } from '../types';
import { clearSessionCookie } from './session';

export const onRequestPost: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/',
      'Set-Cookie': clearSessionCookie(),
    },
  });
};
