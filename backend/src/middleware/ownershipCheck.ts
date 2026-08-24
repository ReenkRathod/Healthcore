/**
 * Object-level authorization helpers.
 *
 * These middleware functions enforce that an authenticated user can only
 * access resources they own. They prevent IDOR (Insecure Direct Object
 * Reference) attacks where a user changes an ID in the URL to access
 * another user's data.
 *
 * Usage examples:
 *   // Inline check in a handler:
 *   assertOwnership(req.user!.id, resource.userId);
 *
 *   // As middleware — checks :userId param matches authenticated user:
 *   router.get('/:userId/profile', authenticate, requireSelfOrRole('ADMIN'), handler);
 */

import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AppError } from '../utils/AppError';

/**
 * Assert that the requesting user owns the resource.
 * Throws 403 if the IDs don't match.
 *
 * @param authenticatedUserId — from `req.user.id`
 * @param resourceOwnerId — the `userId` field on the resource being accessed
 */
export function assertOwnership(
  authenticatedUserId: string,
  resourceOwnerId: string,
): void {
  if (authenticatedUserId !== resourceOwnerId) {
    throw AppError.forbidden('You do not have permission to access this resource');
  }
}

/**
 * Middleware factory: require that the `:userId` route param matches
 * the authenticated user, OR that the user has one of the specified
 * elevated roles (e.g. ADMIN).
 *
 * This allows admins to access any user's resources while restricting
 * patients/doctors to their own.
 *
 * @param elevatedRoles — roles that bypass the ownership check
 */
export function requireSelfOrRole(...elevatedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized('Authentication required'));
      return;
    }

    // Elevated roles (e.g. ADMIN) bypass the self-check
    if (elevatedRoles.includes(req.user.role)) {
      next();
      return;
    }

    // For normal users, the :userId param must match their own ID
    const paramUserId = req.params['userId'];
    if (!paramUserId || paramUserId !== req.user.id) {
      next(
        AppError.forbidden('You do not have permission to access this resource'),
      );
      return;
    }

    next();
  };
}
