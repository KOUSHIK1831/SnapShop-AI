import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { corsOrigins, env, isProduction } from './config/env';
import { logger } from './lib/logger';
import { errorHandler, notFoundHandler } from './middleware/error';
import { apiRouter } from './routes';
import { healthRouter } from './routes/health';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origin not allowed by CORS: ${origin}`));
      },
      credentials: true,
    }),
  );
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: req => req.url === '/health' || req.url === '/ready',
      },
    }),
  );

  // Webhooks need the raw body and must be mounted before express.json().
  // (Phase 4: /api/v1/whatsapp/webhook)

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  app.use(
    '/media',
    express.static(path.resolve(process.cwd(), env.STORAGE_LOCAL_DIR), {
      fallthrough: false,
      maxAge: isProduction ? '7d' : 0,
    }),
  );

  // Health lives outside the versioned API so monitors never hit the limiter.
  app.use(healthRouter);

  app.use(
    '/api/v1',
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      skip: req => req.method === 'OPTIONS',
    }),
    apiRouter,
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
