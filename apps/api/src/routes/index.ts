import { Router } from 'express';
import { authRouter } from './auth';
import { sellersRouter } from './sellers';
import { productsRouter } from './products';
import { ordersRouter } from './orders';
import { cartRouter } from './cart';
import { filesRouter } from './files';

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

apiRouter.use('/auth', authRouter);
apiRouter.use('/sellers', sellersRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/cart', cartRouter);
apiRouter.use('/files', filesRouter);
