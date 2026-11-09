import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { corsOrigins, env } from './config/env';
import { logger } from './lib/logger';
import { errorHandler, notFoundHandler } from './middleware/error';
import { apiRouter } from './routes';
import { healthRouter } from './routes/health';
import { openApiSpec } from './docs/openapi';
import { localDownloadHandler, localUploadHandler } from './routes/files';

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

  const apiRateLimiter = rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: req => req.method === 'OPTIONS',
  });

  // Local-driver signed uploads need the raw body before JSON parsing.
  if (env.STORAGE_DRIVER === 'local') {
    app.put(
      '/api/v1/files/local-upload',
      apiRateLimiter,
      express.raw({ type: '*/*', limit: '20mb' }),
      localUploadHandler,
    );
    app.get(
      '/api/v1/files/local-download',
      apiRateLimiter,
      localDownloadHandler,
    );
  }

  // Webhooks need the raw body and must be mounted before express.json().

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  // Health lives outside the versioned API so monitors never hit the limiter.
  app.use(healthRouter);

  app.get('/openapi.json', (_req, res) => {
    res.json(openApiSpec);
  });

  app.get('/docs', (_req, res) => {
    res.type('html').send(`<!DOCTYPE html>
<html>
<head>
  <title>SnapShop AI API Documentation</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
      });
    };
  </script>
</body>
</html>`);
  });

  app.use('/api/v1', apiRateLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
