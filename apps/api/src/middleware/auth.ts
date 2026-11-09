import type { RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyAccessToken } from '../lib/tokens';
import { forbidden, unauthorized } from '../lib/http-error';
import type { Actor } from '../auth/actor';

async function actorFromHeader(
  authorization: string | undefined,
): Promise<Actor> {
  if (!authorization?.startsWith('Bearer ')) {
    throw unauthorized();
  }

  let claims;
  try {
    claims = await verifyAccessToken(
      authorization.slice('Bearer '.length).trim(),
    );
  } catch {
    throw unauthorized('Invalid or expired token', 'invalid_token');
  }

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: {
      id: true,
      email: true,
      role: true,
      isBlocked: true,
      tokenVersion: true,
    },
  });

  if (!user) throw unauthorized('Account no longer exists', 'invalid_token');
  if (user.isBlocked) throw forbidden('This account has been blocked');
  if (user.tokenVersion !== claims.ver) {
    throw unauthorized(
      'Session revoked, please sign in again',
      'session_revoked',
    );
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
  };
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  req.actor = await actorFromHeader(req.headers.authorization);
  next();
};

export const optionalAuth: RequestHandler = async (req, _res, next) => {
  if (!req.headers.authorization) {
    next();
    return;
  }

  try {
    req.actor = await actorFromHeader(req.headers.authorization);
  } catch {
    req.actor = undefined;
  }
  next();
};

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.actor?.role || !roles.includes(req.actor.role)) {
      next(forbidden());
      return;
    }
    next();
  };

export const requireActor = (req: { actor?: Actor }): Actor => {
  if (!req.actor) throw unauthorized();
  return req.actor;
};
