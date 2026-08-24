/**
 * Centralised Express error handler.
 *
 * Rules:
 * - AppError  → return its statusCode + safe message as-is.
 * - ZodError  → 422 with structured field-level details (no internal paths).
 * - Prisma known errors → mapped to safe HTTP equivalents.
 * - Everything else     → generic 500; nothing internal is exposed.
 *
 * Stack traces are NEVER returned to clients.
 * Database credentials, SQL, and Prisma internals are NEVER exposed.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';
import { isProd } from '../config';

/** Shape of every error response sent to API clients */
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: number;
    details?: Array<{ field: string; message: string }>;
  };
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // ── Internal logging (full details, never sent to client) ─────────────────
  logger.error(
    {
      err: {
        name: err.name,
        message: err.message,
        // Only include stack in non-production logs
        ...(isProd ? {} : { stack: err.stack }),
      },
      req: {
        method: req.method,
        url: req.url,
        // IP for audit; avoid logging headers which may contain tokens
        ip: req.ip,
      },
    },
    'Unhandled request error',
  );

  // ── AppError — operational, message is safe for clients ──────────────────
  if (err instanceof AppError) {
    const body: ErrorResponse = {
      success: false,
      error: {
        message: err.message,
        code: err.code ?? 'APP_ERROR',
        statusCode: err.statusCode,
      },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  // ── ZodError — request validation failure ────────────────────────────────
  if (err instanceof ZodError) {
    const body: ErrorResponse = {
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        statusCode: 422,
        details: err.errors.map((e) => ({
          field: e.path.join('.') || 'root',
          message: e.message,
        })),
      },
    };
    res.status(422).json(body);
    return;
  }

  // ── Prisma known errors ───────────────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaErr = err as Prisma.PrismaClientKnownRequestError;
    switch (prismaErr.code) {
      case 'P2002': {
        // Unique constraint violation — expose field name only, not SQL
        const meta = prismaErr.meta as Record<string, unknown> | undefined;
        const fields = Array.isArray(meta?.['target'])
          ? (meta['target'] as string[]).join(', ')
          : 'field';
        res.status(409).json({
          success: false,
          error: {
            message: `A record with this ${fields} already exists`,
            code: 'DUPLICATE_ENTRY',
            statusCode: 409,
          },
        } satisfies ErrorResponse);
        return;
      }
      case 'P2025': {
        // Record not found
        res.status(404).json({
          success: false,
          error: {
            message: 'Record not found',
            code: 'NOT_FOUND',
            statusCode: 404,
          },
        } satisfies ErrorResponse);
        return;
      }
      case 'P2003': {
        // Foreign key constraint
        res.status(409).json({
          success: false,
          error: {
            message: 'Related record not found',
            code: 'FOREIGN_KEY_ERROR',
            statusCode: 409,
          },
        } satisfies ErrorResponse);
        return;
      }
    }
  }

  // ── Prisma connection / init errors — do NOT expose connection string ─────
  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError
  ) {
    res.status(503).json({
      success: false,
      error: {
        message: 'Service temporarily unavailable. Please try again later.',
        code: 'SERVICE_UNAVAILABLE',
        statusCode: 503,
      },
    } satisfies ErrorResponse);
    return;
  }

  // ── Unknown / programming error — generic 500 ─────────────────────────────
  res.status(500).json({
    success: false,
    error: {
      message: 'An unexpected error occurred. Please try again later.',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    },
  } satisfies ErrorResponse);
}
