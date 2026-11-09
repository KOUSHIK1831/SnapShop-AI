import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '../config/env';

export interface AccessClaims {
  sub: string;
  email: string;
  role: string | null;
  ver: number;
  exp: number;
  jti: string;
}

const accessKey = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

export async function signAccessToken(input: {
  sub: string;
  email: string;
  role: string | null;
  ver: number;
}): Promise<string> {
  return new SignJWT({ email: input.email, role: input.role, ver: input.ver })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(input.sub)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt()
    .setJti(randomUUID())
    .setExpirationTime(env.ACCESS_TTL)
    .sign(accessKey);
}

export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, accessKey, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });

  if (
    typeof payload.sub !== 'string' ||
    typeof payload.email !== 'string' ||
    typeof payload.ver !== 'number' ||
    typeof payload.jti !== 'string' ||
    typeof payload.exp !== 'number'
  ) {
    throw new Error('Malformed access token');
  }

  return {
    sub: payload.sub,
    email: payload.email,
    role: typeof payload.role === 'string' ? payload.role : null,
    ver: payload.ver,
    exp: payload.exp,
    jti: payload.jti,
  };
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function generateRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(48).toString('base64url');
  return { token, hash: sha256(token) };
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Parses durations like `15m`, `30d`, `12h`, `45s`, or a plain number of seconds. */
export function parseDuration(value: string): number {
  const match = /^(\d+)\s*(s|m|h|d|w)?$/i.exec(value.trim());
  if (!match) throw new Error(`Invalid duration: ${value}`);

  const amount = Number(match[1]);
  const unit = (match[2] ?? 's').toLowerCase();
  const multiplier: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
    w: 7 * 24 * 60 * 60,
  };

  return amount * (multiplier[unit] ?? 1);
}

const uploadKey = env.JWT_ACCESS_SECRET;

/** Self-authenticating token for local-driver uploads (stands in for a presigned PUT). */
export function signUploadToken(key: string, ttlSeconds = 15 * 60): string {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const signature = createHmac('sha256', uploadKey)
    .update(`${key}:${expires}`)
    .digest('base64url');
  return `${expires}.${signature}`;
}

export function verifyUploadToken(key: string, token: string): boolean {
  const [expiresRaw, signature] = token.split('.');
  const expires = Number(expiresRaw);

  if (!expiresRaw || !signature || !Number.isFinite(expires)) return false;
  if (expires < Math.floor(Date.now() / 1000)) return false;

  const expected = createHmac('sha256', uploadKey)
    .update(`${key}:${expires}`)
    .digest('base64url');

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
