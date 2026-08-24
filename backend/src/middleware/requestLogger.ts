/**
 * HTTP request logger middleware.
 *
 * Logs method, path, status code, duration, and client IP on response finish.
 * Log level is escalated automatically:
 *   5xx → error   4xx → warn   2xx/3xx → info
 *
 * NEVER logs: request body, Authorization headers, cookies, or query params
 * (query params may contain patient IDs or appointment details).
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startedAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const status = res.statusCode;

    const level =
      status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

    logger[level](
      {
        method: req.method,
        path: req.path,     // path only — excludes raw query string
        status,
        durationMs,
        ip: req.ip,
        // User-agent helps diagnose client issues; contains no patient data
        ua: req.get('user-agent'),
      },
      `${req.method} ${req.path} ${status}`,
    );
  });

  next();
}
