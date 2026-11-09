import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export const healthRouter = Router();

/** Liveness — must never touch the database. */
healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'snapshop-api',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/** Readiness — returns 503 when a dependency is down. */
healthRouter.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ready',
      checks: { database: 'up' },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.warn({ err: error }, 'Readiness check failed');
    res.status(503).json({
      status: 'not_ready',
      checks: { database: 'down' },
      timestamp: new Date().toISOString(),
    });
  }
});
