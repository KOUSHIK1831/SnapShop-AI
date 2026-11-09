import { Router } from 'express';
import { z } from 'zod';
import { emailSchema, passwordSchema } from '@snapshop/shared';
import { requireAuth } from '../middleware/auth';
import { authLimiter, writeLimiter } from '../middleware/rate-limit';
import { validate } from '../middleware/validate';
import { unauthorized } from '../lib/http-error';
import * as auth from '../services/auth';
import {
  clearRefreshCookie,
  readRefreshCookie,
  setRefreshCookie,
} from '../auth/cookies';
import type { Request } from 'express';

export const authRouter = Router();

const meta = (req: Request) => ({
  ip: req.ip,
  userAgent: req.get('user-agent') ?? undefined,
});

function sendSession(
  res: Parameters<typeof setRefreshCookie>[0],
  session: Awaited<ReturnType<typeof auth.login>>,
) {
  const { refreshToken, refreshMaxAge: _refreshMaxAge, ...payload } = session;
  setRefreshCookie(res, refreshToken);
  return payload;
}

const registerBody = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(2).max(100).optional(),
});

authRouter.post(
  '/register',
  authLimiter,
  validate({ body: registerBody }),
  async (req, res) => {
    const session = await auth.register(req.valid.body, meta(req));
    res.status(201).json(sendSession(res, session));
  },
);

const loginBody = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

authRouter.post(
  '/login',
  authLimiter,
  validate({ body: loginBody }),
  async (req, res) => {
    const session = await auth.login(req.valid.body, meta(req));
    res.json(sendSession(res, session));
  },
);

const googleBody = z.object({
  credential: z.string().min(20).max(10_000),
});

authRouter.post(
  '/google',
  authLimiter,
  validate({ body: googleBody }),
  async (req, res) => {
    const session = await auth.loginWithGoogle(
      req.valid.body.credential,
      meta(req),
    );
    res.json(sendSession(res, session));
  },
);

authRouter.post('/refresh', writeLimiter, async (req, res) => {
  const token = readRefreshCookie(req);
  if (!token) throw unauthorized('No refresh token', 'no_refresh_token');

  const session = await auth.rotateRefresh(token, meta(req));
  res.json(sendSession(res, session));
});

authRouter.post('/logout', writeLimiter, async (req, res) => {
  const token = readRefreshCookie(req);
  if (token) await auth.revokeRefreshToken(token);
  clearRefreshCookie(res);
  res.status(204).send();
});

authRouter.post('/logout-all', requireAuth, async (req, res) => {
  await auth.logoutAll(req.actor!);
  clearRefreshCookie(res);
  res.status(204).send();
});

authRouter.get('/me', requireAuth, async (req, res) => {
  res.json({ user: await auth.getMe(req.actor!) });
});

const updateMeBody = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{6,20}$/)
    .optional(),
});

authRouter.patch(
  '/me',
  requireAuth,
  validate({ body: updateMeBody }),
  async (req, res) => {
    res.json({ user: await auth.updateMe(req.actor!, req.valid.body) });
  },
);

const roleBody = z.object({ role: z.enum(['seller', 'buyer']) });

authRouter.patch(
  '/role',
  requireAuth,
  validate({ body: roleBody }),
  async (req, res) => {
    res.json({ user: await auth.updateRole(req.actor!, req.valid.body.role) });
  },
);

const tokenBody = z.object({ token: z.string().min(10).max(500) });

authRouter.post(
  '/verify-email',
  authLimiter,
  validate({ body: tokenBody }),
  async (req, res) => {
    res.json(await auth.verifyEmail(req.valid.body.token));
  },
);

authRouter.post('/resend-verification', requireAuth, async (req, res) => {
  res.json(await auth.resendVerification(req.actor!));
});

authRouter.post(
  '/forgot-password',
  authLimiter,
  validate({ body: z.object({ email: emailSchema }) }),
  async (req, res) => {
    res.json(await auth.forgotPassword(req.valid.body.email));
  },
);

const resetBody = z.object({
  token: z.string().min(10).max(500),
  password: passwordSchema,
});

authRouter.post(
  '/reset-password',
  authLimiter,
  validate({ body: resetBody }),
  async (req, res) => {
    res.json(
      await auth.resetPassword(req.valid.body.token, req.valid.body.password),
    );
  },
);

const changeBody = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

authRouter.post(
  '/change-password',
  requireAuth,
  validate({ body: changeBody }),
  async (req, res) => {
    res.json(
      await auth.changePassword(
        req.actor!,
        req.valid.body.currentPassword,
        req.valid.body.newPassword,
      ),
    );
  },
);
