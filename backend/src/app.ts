/**
 * Express application factory.
 *
 * `createApp()` is separated from `server.ts` so the app can be imported
 * in tests without binding to a port.
 *
 * Security layers (in order):
 *  1. Helmet      — secure HTTP headers
 *  2. CORS        — allow only the configured frontend origin
 *  3. Rate limiter — brute-force / DoS protection
 *  4. JSON parser  — request body size capped at 10 KB
 *  5. Request logger
 *  6. Routes
 *  7. 404 handler
 *  8. Error handler  (must be last — 4 args)
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config, isDev } from './config';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import router from './routes';
import logger from './utils/logger';

export function createApp(): express.Application {
  const app = express();

  // ── Disable Express's "X-Powered-By: Express" header ─────────────────────
  app.disable('x-powered-by');

  // ── Helmet: secure HTTP response headers ─────────────────────────────────
  app.use(
    helmet({
      // Disable CSP in development for easier local debugging; enable in production
      contentSecurityPolicy: isDev ? false : undefined,
      // Prevent browser from interpreting files as a different MIME type
      noSniff: true,
      // Prevent clickjacking
      frameguard: { action: 'deny' },
    }),
  );

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g., server-to-server, curl)
        if (!origin) {
          callback(null, true);
          return;
        }
        // In development allow all origins; in production allow FRONTEND_URL & .vercel.app origins
        if (isDev || origin === config.FRONTEND_URL || origin.endsWith('.vercel.app')) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin '${origin}' not allowed`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      // Cache preflight result for 1 hour
      maxAge: 3600,
    }),
  );

  // ── Global rate limiter ───────────────────────────────────────────────────
  // Per-route tighter limits (e.g., on /auth/login) will be added later.
  const globalLimiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,   // Return RateLimit-* headers (RFC 6585)
    legacyHeaders: false,    // Disable X-RateLimit-* legacy headers
    message: {
      success: false,
      error: {
        message: 'Too many requests — please slow down and try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        statusCode: 429,
      },
    },
  });
  app.use(globalLimiter);

  // ── Body parsers — cap request size to limit DoS risk ─────────────────────
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // ── Request logging ───────────────────────────────────────────────────────
  app.use(requestLogger);

  // ── Cookie parser — required for httpOnly auth token cookies ─────────────
  app.use(cookieParser());

  // ── API routes ────────────────────────────────────────────────────────────
  app.use(`/api/${config.API_VERSION}`, router);

  // ── 404 for unmatched routes ──────────────────────────────────────────────
  app.use(notFound);

  // ── Centralised error handler (must have 4 params and be last) ───────────
  app.use(errorHandler);

  logger.info(
    { env: config.NODE_ENV, apiVersion: config.API_VERSION },
    'Express app created',
  );

  return app;
}
