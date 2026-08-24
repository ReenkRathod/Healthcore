/**
 * Augment the Express Request type with an authenticated user property.
 *
 * After the `authenticate` middleware runs successfully, `req.user` is
 * guaranteed to be populated with the authenticated user's identity.
 */

import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      /** Populated by the authenticate middleware — undefined for unauthenticated requests */
      user?: {
        id: string;
        role: Role;
        email: string;
      };
    }
  }
}

export {};
