import { headers } from 'next/headers';

/** Every cookie of the app (sessions, the active app, the API key) lasts a year. */
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Whether cookies get the `Secure` flag. A browser drops a secure cookie that
 * arrives over plain HTTP, so on a home network without TLS every login
 * would silently fail. `COOKIE_SECURE=true|false` decides; without it, the
 * flag is set when the request came in over HTTPS (directly or through a
 * proxy that sets `X-Forwarded-Proto`, like Coolify's Traefik).
 */
async function isSecure(): Promise<boolean> {
  const setting = process.env.COOKIE_SECURE?.toLowerCase();
  if (setting === 'true') return true;
  if (setting === 'false') return false;
  if (process.env.NODE_ENV !== 'production') return false;

  const headerStore = await headers();
  const forwarded = headerStore.get('x-forwarded-proto')?.split(',')[0]?.trim();
  return forwarded === 'https';
}

/** Options for every cookie the app sets. */
export async function cookieOptions() {
  return {
    httpOnly: true,
    secure: await isSecure(),
    sameSite: 'strict' as const,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  };
}
