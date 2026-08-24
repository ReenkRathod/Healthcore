/**
 * Authentication service — core auth logic separated from Express.
 *
 * Handles:
 *  - Password hashing (bcrypt)
 *  - JWT token generation & verification
 *  - User data sanitisation (stripping sensitive fields)
 *
 * NEVER logs plaintext passwords, tokens, or hashes.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role, User } from '@prisma/client';
import { config } from '../config';

// ─── Types ──────────────────────────────────────────────────────────────────────

/** Minimal JWT payload — keep claims lean to minimise token size */
export interface JwtPayload {
  sub: string;   // userId
  role: Role;
}

/** Safe user object returned to clients — never contains passwordHash */
export interface SafeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
}

// ─── Password Hashing ───────────────────────────────────────────────────────────

const SALT_ROUNDS = config.BCRYPT_SALT_ROUNDS;

/**
 * Hash a plaintext password using bcrypt.
 * The returned hash includes the salt — safe to store directly.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

/**
 * Compare a plaintext password against a bcrypt hash.
 * Uses constant-time comparison internally (bcrypt guarantee).
 */
export async function comparePassword(
  plaintext: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

// ─── JWT Tokens ──────────────────────────────────────────────────────────────────

/**
 * Sign a short-lived access token.
 * Contains only userId + role — no PII.
 */
export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Sign a long-lived refresh token.
 * Used to obtain new access tokens without re-entering credentials.
 */
export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Verify and decode an access token.
 * Throws `JsonWebTokenError` or `TokenExpiredError` on failure.
 */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtPayload;
}

/**
 * Verify and decode a refresh token.
 * Throws `JsonWebTokenError` or `TokenExpiredError` on failure.
 */
export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, config.JWT_REFRESH_SECRET) as JwtPayload;
}

// ─── User Sanitisation ──────────────────────────────────────────────────────────

/**
 * Strip sensitive fields from a User record before returning to clients.
 * NEVER return passwordHash, tokens, or internal flags.
 */
export function sanitizeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    isVerified: user.isVerified,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

// ─── Cookie Helpers ──────────────────────────────────────────────────────────────

/** Parse a duration string like "15m", "7d", "1h" to milliseconds */
export function parseDurationToMs(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    // fallback: 15 minutes
    return 15 * 60 * 1000;
  }

  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default:  return 15 * 60 * 1000;
  }
}

/** Standard cookie options for auth tokens */
export function getCookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: maxAgeMs,
    path: '/',
  };
}
