/**
 * Authentication middleware.
 *
 * Extracts and verifies the JWT access token from:
 *  1. `Authorization: Bearer <token>` header (preferred for API clients)
 *  2. `access_token` httpOnly cookie (used by browser-based frontend)
 *
 * On success, attaches `req.user` with `{ id, role, email }`.
 * On failure, responds with a generic 401 — never reveals why auth failed
 * (expired token vs. invalid token vs. missing token are all the same to the client).
 *
 * Also verifies that the user account is active — deactivated users
 * receive 403 even with a valid token.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/auth.service';
import { prisma } from '../db/client';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // ── 1. Extract token ──────────────────────────────────────────────────
    let token: string | undefined;

    // Check Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }

    // Fall back to httpOnly cookie
    if (!token && req.cookies?.access_token) {
      token = req.cookies.access_token as string;
    }

    if (!token) {
      throw AppError.unauthorized('Authentication required');
    }

    // ── 2. Verify JWT ─────────────────────────────────────────────────────
    const payload = verifyAccessToken(token);

    // ── 3. Load user & check active status ────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, email: true, isActive: true },
    });

    if (!user) {
      throw AppError.unauthorized('Authentication required');
    }

    if (!user.isActive) {
      throw AppError.forbidden('Account has been deactivated');
    }

    // ── 4. Attach user to request ─────────────────────────────────────────
    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
    };

    next();
  } catch (err) {
    // Log internally for diagnostics — never expose details to client
    if (!(err instanceof AppError)) {
      logger.debug({ errName: (err as Error).name }, 'Auth token verification failed');
    }

    // All auth failures get the same generic message
    next(AppError.unauthorized('Authentication required'));
  }
}
