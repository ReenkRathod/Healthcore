/**
 * Health-check endpoint.
 *
 * GET /api/v1/health
 *
 * Returns 200 when all checks pass, 503 when any check fails.
 * Clients (load balancers, monitoring) should use HTTP status — not body fields —
 * to determine health.
 *
 * Response shape:
 * {
 *   success: boolean,
 *   status: "healthy" | "degraded",
 *   timestamp: string,
 *   uptime: number,       // seconds
 *   environment: string,
 *   version: string,
 *   checks: {
 *     server:   { status: "ok" | "error" },
 *     database: { status: "ok" | "error", latencyMs?: number, error?: string }
 *   }
 * }
 *
 * NOTE: The `error` field in checks contains only generic messages —
 *       never database connection strings or Prisma internals.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../db/client';
import logger from '../utils/logger';

const router = Router();

type CheckStatus = 'ok' | 'error';

interface CheckResult {
  status: CheckStatus;
  latencyMs?: number;
  error?: string;
}

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const checks: Record<string, CheckResult> = {
    server: { status: 'ok' },
    database: { status: 'ok' },
  };

  // ── Database connectivity probe ─────────────────────────────────────────
  const dbStart = Date.now();
  try {
    // Lightweight round-trip — no table access required
    await prisma.$queryRaw`SELECT 1 AS ping`;
    checks['database'] = {
      status: 'ok',
      latencyMs: Date.now() - dbStart,
    };
  } catch (err) {
    // Warn internally; send only a safe message to callers
    logger.warn({ err }, 'Health check: database probe failed');
    checks['database'] = {
      status: 'error',
      error: 'Database unreachable',
    };
  }

  const allHealthy = Object.values(checks).every((c) => c.status === 'ok');

  res.status(allHealthy ? 200 : 503).json({
    success: allHealthy,
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env['NODE_ENV'],
    version: process.env['npm_package_version'] ?? '1.0.0',
    checks,
  });
});

export default router;
