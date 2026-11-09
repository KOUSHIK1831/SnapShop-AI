import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { RequestHandler } from 'express';

const problem = (detail: string) => ({
  type: 'about:blank',
  title: 'Too Many Requests',
  status: 429,
  detail,
});

export const authLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res
      .status(429)
      .type('application/problem+json')
      .json(problem('Too many authentication attempts, try again later'));
  },
});

export const writeLimiter: RequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res
      .status(429)
      .type('application/problem+json')
      .json(problem('Too many requests, slow down'));
  },
});

export const aiLimiter: RequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: req =>
    req.actor?.id ?? (req.ip ? ipKeyGenerator(req.ip) : 'anonymous'),
  handler: (_req, res) => {
    res
      .status(429)
      .type('application/problem+json')
      .json(problem('AI rate limit reached, try again later'));
  },
});
