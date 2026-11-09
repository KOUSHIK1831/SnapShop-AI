import type { Request, Response } from 'express';
import { env, isProduction } from '../config/env';
import { parseDuration } from '../lib/tokens';

const cookiePath = '/api/v1/auth';

function cookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: cookiePath,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(env.REFRESH_COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: parseDuration(env.REFRESH_TTL) * 1000,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(env.REFRESH_COOKIE_NAME, cookieOptions());
}

export function readRefreshCookie(req: Request): string | undefined {
  const value = req.cookies?.[env.REFRESH_COOKIE_NAME];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
