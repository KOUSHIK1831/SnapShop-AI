import { Router } from 'express';

export const apiRouter = Router();

/** GET /api/v1 — tiny discoverability payload for the client. */
apiRouter.get('/', (_req, res) => {
  res.json({
    name: 'SnapShop AI API',
    version: 'v1',
    docs: '/docs',
    openapi: '/openapi.json',
  });
});
