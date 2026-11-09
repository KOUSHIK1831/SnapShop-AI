import type { Server } from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

const app = createApp();
let server: Server;

function start(): void {
  server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV, pid: process.pid },
      'SnapShop API listening',
    );
  });
}

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down');

  const forceExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  await new Promise<void>(resolve => {
    if (!server) {
      resolve();
      return;
    }
    server.close(() => resolve());
  });

  await prisma.$disconnect();
  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

process.on('unhandledRejection', reason => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', error => {
  logger.error({ err: error }, 'Uncaught exception');
  void shutdown('uncaughtException');
});

start();
