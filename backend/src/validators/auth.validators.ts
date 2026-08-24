/**
 * Zod validation schemas for authentication endpoints.
 *
 * These schemas define the shape and constraints for request bodies.
 * They are used by route handlers to validate incoming data before
 * any database operations.
 *
 * IMPORTANT: The register schema intentionally does NOT accept a `role`
 * field — public registration always creates PATIENT accounts.
 */

import { z } from 'zod';

/**
 * Registration request body.
 *
 * Password policy:
 *  - Minimum 8 characters
 *  - At least one uppercase letter
 *  - At least one lowercase letter
 *  - At least one digit
 *
 * No `role` field — prevents role escalation via the registration endpoint.
 */
export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one digit'),

  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(100, 'First name must be 100 characters or fewer'),

  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be 100 characters or fewer'),

  phone: z
    .string()
    .trim()
    .min(7, 'Phone number must be at least 7 characters')
    .max(20, 'Phone number must be 20 characters or fewer')
    .optional()
    .nullable(),
});

/** Login request body */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address'),

  password: z
    .string()
    .min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
