/**
 * Server entry point.
 *
 * Responsibilities:
 *  1. Connect to the database (fail fast on misconfiguration)
 *  2. Create the Express app
 *  3. Start listening on the configured PORT
 *  4. Handle SIGTERM / SIGINT for graceful shutdown
 *  5. Catch and log uncaught exceptions / unhandled rejections
 *
 * Do NOT import this file in tests — import app.ts directly.
 */

import { createApp } from './app';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './db/client';
import logger from './utils/logger';

async function bootstrap(): Promise<void> {
  // ── 1. Database ───────────────────────────────────────────────────────────
  await connectDatabase();

  // ── 2. Express app ────────────────────────────────────────────────────────
  const app = createApp();

  // ── 3. HTTP server ────────────────────────────────────────────────────────
  const server = app.listen(config.PORT, () => {
    logger.info(
      {
        port: config.PORT,
        env: config.NODE_ENV,
        health: `http://localhost:${config.PORT}/api/${config.API_VERSION}/health`,
      },
      `Server started`,
    );
  });

  // ── 4. Graceful shutdown ──────────────────────────────────────────────────
  async function shutdown(signal: string): Promise<void> {
    logger.info({ signal }, 'Shutdown signal received — closing gracefully');

    // Stop accepting new connections
    server.close(async () => {
      await disconnectDatabase();
      logger.info('Server and database closed');
      process.exit(0);
    });

    // Force-exit if graceful close takes too long
    setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, 10_000).unref(); // unref prevents the timer from keeping the process alive
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // ── 5. Safety nets ────────────────────────────────────────────────────────
  process.on('uncaughtException', (err: Error) => {
    // Log the full error (including stack) so the issue can be diagnosed
    logger.fatal({ err }, 'Uncaught exception — exiting');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.fatal({ reason }, 'Unhandled promise rejection — exiting');
    process.exit(1);
  });
}

bootstrap().catch((err: Error) => {
  // Console fallback in case the logger itself hasn't been initialised
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
