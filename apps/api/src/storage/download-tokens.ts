import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';

const DOWNLOAD_TOKEN_KEY = env.JWT_ACCESS_SECRET;

export function signDownloadToken(key: string, ttlSeconds = 5 * 60): string {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const signature = createHmac('sha256', DOWNLOAD_TOKEN_KEY)
    .update(`download:${key}:${expires}`)
    .digest('base64url');
  return `${expires}.${signature}`;
}

export function verifyDownloadToken(key: string, token: string): boolean {
  const [expiresRaw, signature] = token.split('.');
  const expires = Number(expiresRaw);
  if (!expiresRaw || !signature || !Number.isFinite(expires)) return false;
  if (expires < Math.floor(Date.now() / 1000)) return false;

  const expected = createHmac('sha256', DOWNLOAD_TOKEN_KEY)
    .update(`download:${key}:${expires}`)
    .digest('base64url');
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  return (
    actualBytes.length === expectedBytes.length &&
    timingSafeEqual(actualBytes, expectedBytes)
  );
}
