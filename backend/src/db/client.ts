/**
 * Prisma client singleton.
 *
 * A single PrismaClient instance is shared across the application.
 * In development, the instance is stored on `globalThis` to survive
 * hot-reload without exhausting database connection limits.
 *
 * Do NOT import this module in test files — mock it instead:
 *   jest.mock('../db/client', () => ({ prisma: { ... } }))
 */

import { PrismaClient, Prisma } from '@prisma/client';
import logger from '../utils/logger';

// Prevent multiple instances during development hot-reload
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Create the client with event-mode logging so we can pipe events through pino. */
function createPrismaClient(): PrismaClient {
  if (process.env['NODE_ENV'] === 'development') {
    // In development, capture query events so we can warn on slow queries
    return new PrismaClient({
      log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'query' },
      ],
    });
  }

  // In production / test — only error and warn (no query events)
  return new PrismaClient({
    log: [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

// ── Event listeners ──────────────────────────────────────────────────────────

// These casts satisfy TypeScript: the event names match what was declared in the
// respective `log` arrays above. We cast to the extended client type to access
// typed overloads.
type PrismaWithQueryLog = PrismaClient<
  Prisma.PrismaClientOptions & {
    log: [
      { emit: 'event'; level: 'error' },
      { emit: 'event'; level: 'warn' },
      { emit: 'event'; level: 'query' },
    ];
  }
>;

// Error / warn listeners are safe to attach on all environments
(prisma as PrismaWithQueryLog).$on('error', (e: Prisma.LogEvent) => {
  // Log target only — never log the full query which may contain patient data
  logger.error({ target: e.target, message: e.message }, 'Prisma error');
});

(prisma as PrismaWithQueryLog).$on('warn', (e: Prisma.LogEvent) => {
  logger.warn({ target: e.target, message: e.message }, 'Prisma warning');
});

if (process.env['NODE_ENV'] === 'development') {
  (prisma as PrismaWithQueryLog).$on('query', (e: Prisma.QueryEvent) => {
    // Flag slow queries; omit params/query string to avoid logging patient data
    if (e.duration > 500) {
      logger.warn({ duration: e.duration }, 'Slow Prisma query (>500 ms)');
    }
  });
}

// ── Singleton preservation for hot-reload ────────────────────────────────────
if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma;
}

// ── Lifecycle helpers ─────────────────────────────────────────────────────────

/**
 * Open the database connection.
 * Called once at server startup — throws if the database is unreachable.
 */
export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info('Database connected');
}

/**
 * Gracefully close the database connection.
 * Called during SIGTERM / SIGINT shutdown.
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
