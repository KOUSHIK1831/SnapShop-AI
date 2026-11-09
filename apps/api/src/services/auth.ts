import { randomUUID } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { OAuth2Client } from 'google-auth-library';
import type { Prisma, Role } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  serviceUnavailable,
  unauthorized,
} from '../lib/http-error';
import {
  generateRefreshToken,
  parseDuration,
  randomToken,
  sha256,
  signAccessToken,
} from '../lib/tokens';
import type { Actor } from '../auth/actor';
import { logger } from '../lib/logger';
import { sendPasswordResetEmail, sendVerificationEmail } from './mailer';

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

const userInclude = {
  seller: {
    select: {
      id: true,
      storeName: true,
      storeSlug: true,
      verificationStatus: true,
      status: true,
      aiDailyLimit: true,
    },
  },
} satisfies Prisma.UserInclude;

type UserWithSeller = Prisma.UserGetPayload<{ include: typeof userInclude }>;

export function publicUser(user: UserWithSeller) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    onboarded: user.onboarded,
    emailVerified: user.emailVerified,
    provider: user.provider,
    isBlocked: user.isBlocked,
    createdAt: user.createdAt,
    seller: user.seller
      ? {
          id: user.seller.id,
          store_name: user.seller.storeName,
          store_slug: user.seller.storeSlug,
          verification_status: user.seller.verificationStatus,
          status: user.seller.status,
          ai_daily_limit: user.seller.aiDailyLimit,
        }
      : null,
  };
}

const argonOptions = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

const hashPassword = (password: string) => hash(password, argonOptions);

async function checkPassword(hashValue: string, password: string) {
  try {
    return await verify(hashValue, password);
  } catch {
    return false;
  }
}

function devToken(token: string): string | undefined {
  return env.NODE_ENV !== 'production' && env.EMAIL_DRIVER === 'console'
    ? token
    : undefined;
}

async function issueSession(
  user: UserWithSeller,
  meta: RequestMeta,
  family: string = randomUUID(),
) {
  const { token, hash: tokenHash } = generateRefreshToken();
  const refreshSeconds = parseDuration(env.REFRESH_TTL);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      family,
      userAgent: meta.userAgent?.slice(0, 512),
      ip: meta.ip?.slice(0, 64),
      expiresAt: new Date(Date.now() + refreshSeconds * 1000),
    },
  });

  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    ver: user.tokenVersion,
  });

  return {
    accessToken,
    refreshToken: token,
    refreshMaxAge: refreshSeconds * 1000,
    user: publicUser(user),
  };
}

async function createEmailVerificationToken(userId: string) {
  await prisma.emailVerificationToken.deleteMany({
    where: { userId, usedAt: null },
  });
  const token = randomToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  return token;
}

export async function register(
  input: { email: string; password: string; name?: string },
  meta: RequestMeta,
) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw conflict('An account with this email already exists', 'email_in_use');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: input.name?.trim() || null,
    },
    include: userInclude,
  });

  const token = await createEmailVerificationToken(user.id);
  void sendVerificationEmail(user.email, user.name, token);

  const session = await issueSession(user, meta);
  return { ...session, verificationToken: devToken(token) };
}

export async function login(
  input: { email: string; password: string },
  meta: RequestMeta,
) {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    include: userInclude,
  });

  if (!user)
    throw unauthorized('Invalid email or password', 'invalid_credentials');
  if (user.isBlocked) throw forbidden('This account has been blocked');
  if (!user.passwordHash) {
    throw unauthorized('Use Google to sign in to this account', 'use_google');
  }

  const valid = await checkPassword(user.passwordHash, input.password);
  if (!valid)
    throw unauthorized('Invalid email or password', 'invalid_credentials');

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return issueSession(user, meta);
}

export async function rotateRefresh(rawToken: string, meta: RequestMeta) {
  const tokenHash = sha256(rawToken);
  const row = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { include: userInclude } },
  });

  if (!row) throw unauthorized('Invalid refresh token', 'invalid_refresh');

  if (row.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { family: row.family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    logger.warn(
      { userId: row.userId, family: row.family },
      'Refresh token reuse detected — family revoked',
    );
    throw unauthorized('Refresh token reuse detected', 'refresh_reuse');
  }

  if (row.expiresAt.getTime() <= Date.now()) {
    throw unauthorized('Refresh token expired', 'refresh_expired');
  }

  if (row.user.isBlocked) throw forbidden('This account has been blocked');

  const revoked = await prisma.refreshToken.updateMany({
    where: { id: row.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (revoked.count === 0) {
    await prisma.refreshToken.updateMany({
      where: { family: row.family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw unauthorized('Refresh token reuse detected', 'refresh_reuse');
  }

  return issueSession(row.user, meta, row.family);
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = sha256(rawToken);
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!row) return;

  await prisma.refreshToken.updateMany({
    where: { family: row.family, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function logoutAll(actor: Actor): Promise<void> {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: actor.id },
      data: { tokenVersion: { increment: 1 } },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: actor.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function getMe(actor: Actor) {
  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    include: userInclude,
  });
  if (!user) throw notFound('User not found');
  return publicUser(user);
}

export async function updateMe(
  actor: Actor,
  input: { name?: string; phone?: string },
) {
  const user = await prisma.user.update({
    where: { id: actor.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
    },
    include: userInclude,
  });
  return publicUser(user);
}

export async function updateRole(actor: Actor, role: 'seller' | 'buyer') {
  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    include: userInclude,
  });
  if (!user) throw notFound('User not found');
  if (user.isBlocked) throw forbidden('This account has been blocked');

  if (user.onboarded && user.role) {
    throw conflict('Your role has already been selected', 'role_already_set');
  }

  await prisma.$transaction(async tx => {
    await tx.user.update({
      where: { id: user.id },
      data: { role: role as Role, onboarded: true },
    });

    if (role === 'seller' && !user.seller) {
      await tx.seller.create({
        data: { userId: user.id, fullName: user.name },
      });
    }
  });

  const updated = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    include: userInclude,
  });

  return publicUser(updated);
}

export async function verifyEmail(token: string) {
  const tokenHash = sha256(token);
  const row = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
  });

  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    throw badRequest('This verification link is invalid or has expired');
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { emailVerified: true },
    }),
    prisma.emailVerificationToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
    prisma.emailVerificationToken.updateMany({
      where: { userId: row.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return { verified: true };
}

export async function resendVerification(actor: Actor) {
  const user = await prisma.user.findUnique({ where: { id: actor.id } });
  if (!user) throw notFound('User not found');
  if (user.emailVerified) throw conflict('Email is already verified');

  const token = await createEmailVerificationToken(user.id);
  void sendVerificationEmail(user.email, user.name, token);
  return { sent: true, verificationToken: devToken(token) };
}

export async function forgotPassword(emailInput: string) {
  const email = emailInput.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // Always succeed so the endpoint cannot be used to enumerate accounts.
  if (!user || user.isBlocked) return { sent: true };

  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  const token = randomToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  void sendPasswordResetEmail(user.email, user.name, token);
  return { sent: true, resetToken: devToken(token) };
}

export async function resetPassword(token: string, password: string) {
  const tokenHash = sha256(token);
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    throw badRequest('This reset link is invalid or has expired');
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    }),
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: row.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: row.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return { reset: true };
}

export async function changePassword(
  actor: Actor,
  currentPassword: string,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({ where: { id: actor.id } });
  if (!user) throw notFound('User not found');
  if (!user.passwordHash) {
    throw badRequest('This account does not use a password (Google sign-in)');
  }

  const valid = await checkPassword(user.passwordHash, currentPassword);
  if (!valid)
    throw unauthorized('Current password is incorrect', 'invalid_password');

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return { changed: true };
}

export async function loginWithGoogle(credential: string, meta: RequestMeta) {
  if (!env.GOOGLE_CLIENT_ID) {
    throw serviceUnavailable('Google sign-in is not configured');
  }

  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (error) {
    logger.warn({ err: error }, 'Google ID token verification failed');
    throw unauthorized('Invalid Google credential', 'invalid_google_token');
  }

  if (!payload?.email || !payload.email_verified || !payload.sub) {
    throw unauthorized(
      'Google account email is not verified',
      'google_email_unverified',
    );
  }

  const email = payload.email.trim().toLowerCase();

  const existingAccount = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerUserId: {
        provider: 'google',
        providerUserId: payload.sub,
      },
    },
    include: { user: { include: userInclude } },
  });

  if (existingAccount) {
    if (existingAccount.user.isBlocked) {
      throw forbidden('This account has been blocked');
    }
    await prisma.user.update({
      where: { id: existingAccount.user.id },
      data: { lastLoginAt: new Date() },
    });
    return issueSession(existingAccount.user, meta);
  }

  let user = await prisma.user.findUnique({
    where: { email },
    include: userInclude,
  });

  if (user && user.isBlocked) throw forbidden('This account has been blocked');

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: payload.name ?? null,
        provider: 'google',
        emailVerified: true,
        lastLoginAt: new Date(),
      },
      include: userInclude,
    });
  } else {
    if (!user.emailVerified) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, lastLoginAt: new Date() },
        include: userInclude,
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }
  }

  await prisma.oAuthAccount
    .create({
      data: {
        userId: user.id,
        provider: 'google',
        providerUserId: payload.sub,
      },
    })
    .catch(error => {
      if (
        error instanceof Object &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002'
      ) {
        return;
      }
      throw error;
    });

  return issueSession(user, meta);
}
