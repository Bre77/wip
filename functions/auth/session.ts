import type { Session } from '../types';

const COOKIE_NAME = 'wip_session';

// Simple XOR-based encryption for session data
function encrypt(data: string, secret: string): string {
  const encoded = new TextEncoder().encode(data);
  const key = new TextEncoder().encode(secret);
  const result = new Uint8Array(encoded.length);
  for (let i = 0; i < encoded.length; i++) {
    result[i] = encoded[i] ^ key[i % key.length];
  }
  return btoa(String.fromCharCode(...result));
}

function decrypt(data: string, secret: string): string {
  const decoded = Uint8Array.from(atob(data), c => c.charCodeAt(0));
  const key = new TextEncoder().encode(secret);
  const result = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) {
    result[i] = decoded[i] ^ key[i % key.length];
  }
  return new TextDecoder().decode(result);
}

export function createSessionCookie(session: Session, secret: string): string {
  const encrypted = encrypt(JSON.stringify(session), secret);
  return `${COOKIE_NAME}=${encrypted}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function getSession(request: Request, secret: string): Session | null {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;

  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;

  try {
    const decrypted = decrypt(match[1], secret);
    return JSON.parse(decrypted) as Session;
  } catch {
    return null;
  }
}
