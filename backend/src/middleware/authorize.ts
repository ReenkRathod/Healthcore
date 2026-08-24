/**
 * Role-based authorization middleware factory.
 *
 * Usage:
 *   router.get('/admin-only', authenticate, authorize('ADMIN'), handler);
 *   router.get('/staff', authenticate, authorize('DOCTOR', 'ADMIN'), handler);
 *
 * Must be placed AFTER the `authenticate` middleware so that `req.user`
 * is guaranteed to exist.
 *
 * Returns 403 FORBIDDEN if the user's role is not in the allowed list.
 */

import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AppError } from '../utils/AppError';

/**
 * Create a middleware that restricts access to the listed roles.
 *
 * @param allowedRoles — one or more Role values that may access the route
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized('Authentication required'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(AppError.forbidden('You do not have permission to perform this action'));
      return;
    }

    next();
  };
}
