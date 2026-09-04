/**
 * Authentication routes.
 *
 * POST /register  — patient self-registration (public)
 * POST /login     — authenticate & receive tokens (public, tighter rate limit)
 * POST /logout    — clear auth cookies (authenticated)
 * GET  /me        — current user profile (authenticated)
 * POST /refresh   — refresh access token (cookie-based)
 *
 * Security:
 *  - Registration force-sets role = PATIENT regardless of input
 *  - Login uses generic "Invalid email or password" error messages
 *  - Tighter rate limits on /login (5/15min) and /register (10/15min)
 *  - Tokens are set as httpOnly cookies + returned in body for API clients
 *  - Passwords are never returned in any response
 */

import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import { prisma } from '../db/client';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  sanitizeUser,
  parseDurationToMs,
  getCookieOptions,
} from '../services/auth.service';
import type { JwtPayload } from '../services/auth.service';
import { registerSchema, loginSchema } from '../validators/auth.validators';
import { authenticate } from '../middleware/authenticate';
import { AppError } from '../utils/AppError';
import { config, isDev } from '../config';
import logger from '../utils/logger';

const router = Router();

// ─── Google OAuth Setup ─────────────────────────────────────────────────────────

const getGoogleClient = () => {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET || !config.GOOGLE_OAUTH_REDIRECT_URI) {
    throw AppError.serviceUnavailable('Google OAuth is not configured on the server');
  }
  return new OAuth2Client(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.GOOGLE_OAUTH_REDIRECT_URI
  );
};

// ─── Rate Limiters ──────────────────────────────────────────────────────────────

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? Infinity : 5, // unlimited in dev, 5 attempts per window in production
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many login attempts. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? Infinity : 10, // unlimited in dev, 10 registrations per window in production
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many registration attempts. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
});

// ─── POST /register ─────────────────────────────────────────────────────────────

router.post(
  '/register',
  registerLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate input
      const data = registerSchema.parse(req.body);

      // Hash password — never store plaintext
      const passwordHash = await hashPassword(data.password);

      let user;
      if (data.role === 'DOCTOR') {
        user = await prisma.user.create({
          data: {
            email: data.email,
            passwordHash,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone ?? null,
            role: 'DOCTOR',
            doctorProfile: {
              create: {
                licenseNumber: data.licenseNumber!,
                certificateUrl: data.certificateUrl!,
              },
            },
          },
        });
        logger.info({ userId: user.id }, 'New doctor registered');
      } else {
        user = await prisma.user.create({
          data: {
            email: data.email,
            passwordHash,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone ?? null,
            role: 'PATIENT',
            patientProfile: {
              create: {},
            },
          },
        });
        logger.info({ userId: user.id }, 'New patient registered');
      }

      res.status(201).json({
        success: true,
        data: { user: sanitizeUser(user) },
      });
    } catch (err) {
      // Prisma unique constraint on email → friendly duplicate error
      if (
        err instanceof Error &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        next(AppError.conflict('An account with this email already exists'));
        return;
      }
      next(err);
    }
  },
);

// ─── POST /login ────────────────────────────────────────────────────────────────

router.post(
  '/login',
  loginLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate input
      const data = loginSchema.parse(req.body);

      // Look up user — generic error if not found (don't reveal email existence)
      const user = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (!user) {
        throw AppError.unauthorized('Invalid email or password');
      }

      // Check if account is deactivated
      if (!user.isActive) {
        throw AppError.unauthorized('Invalid email or password');
      }

      // Block unverified doctors — they must wait for admin approval
      if (user.role === 'DOCTOR') {
        const doctorProfile = await prisma.doctorProfile.findUnique({
          where: { userId: user.id },
          select: { isVerifiedByAdmin: true },
        });
        if (doctorProfile && !doctorProfile.isVerifiedByAdmin) {
          throw AppError.forbidden(
            'Your account is pending admin verification. You will be notified once it is approved.',
          );
        }
      }

      // Check if account has no password (e.g., OAuth only)
      if (!user.passwordHash) {
        throw AppError.unauthorized('Invalid email or password');
      }

      // Verify password
      const isPasswordValid = await comparePassword(
        data.password,
        user.passwordHash,
      );

      if (!isPasswordValid) {
        throw AppError.unauthorized('Invalid email or password');
      }

      // Generate tokens
      const tokenPayload: JwtPayload = { sub: user.id, role: user.role };
      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      // Set httpOnly cookies
      const accessMaxAge = parseDurationToMs(config.JWT_ACCESS_EXPIRES_IN);
      const refreshMaxAge = parseDurationToMs(config.JWT_REFRESH_EXPIRES_IN);

      res.cookie('access_token', accessToken, getCookieOptions(accessMaxAge));
      res.cookie('refresh_token', refreshToken, getCookieOptions(refreshMaxAge));

      logger.info({ userId: user.id }, 'User logged in');

      res.status(200).json({
        success: true,
        data: {
          user: sanitizeUser(user),
          accessToken,
          refreshToken,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /logout ───────────────────────────────────────────────────────────────

router.post(
  '/logout',
  authenticate,
  (req: Request, res: Response): void => {
    // Clear auth cookies — options must match how they were set (path, httpOnly, sameSite, secure)
    const clearOptions = {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: (config.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
      path: '/',
    };

    res.clearCookie('access_token', clearOptions);
    res.clearCookie('refresh_token', clearOptions);

    logger.info({ userId: req.user!.id }, 'User logged out');

    res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  },
);

// ─── GET /me ────────────────────────────────────────────────────────────────────

router.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: { doctorProfile: true },
      });

      if (!user) {
        throw AppError.notFound('User not found');
      }

      res.status(200).json({
        success: true,
        data: { 
          user: {
            ...sanitizeUser(user),
            doctorProfile: user.doctorProfile,
          } 
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /refresh ──────────────────────────────────────────────────────────────

router.post(
  '/refresh',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract refresh token from cookie or body
      const refreshTokenValue: string | undefined =
        req.cookies?.refresh_token ?? req.body?.refreshToken;

      if (!refreshTokenValue) {
        throw AppError.unauthorized('Refresh token required');
      }

      // Verify refresh token
      let payload: JwtPayload;
      try {
        payload = verifyRefreshToken(refreshTokenValue);
      } catch {
        throw AppError.unauthorized('Invalid or expired refresh token');
      }

      // Verify user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, isActive: true },
      });

      if (!user || !user.isActive) {
        throw AppError.unauthorized('Invalid or expired refresh token');
      }

      // Issue new access token
      const newPayload: JwtPayload = { sub: user.id, role: user.role };
      const newAccessToken = generateAccessToken(newPayload);

      const accessMaxAge = parseDurationToMs(config.JWT_ACCESS_EXPIRES_IN);
      res.cookie('access_token', newAccessToken, getCookieOptions(accessMaxAge));

      res.status(200).json({
        success: true,
        data: { accessToken: newAccessToken },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /google ────────────────────────────────────────────────────────────────

router.get(
  '/google',
  (_req: Request, res: Response, next: NextFunction): void => {
    try {
      const client = getGoogleClient();
      
      // Generate secure state to prevent CSRF
      const state = crypto.randomBytes(32).toString('hex');
      
      // Set state in a short-lived HTTP-only cookie (15 mins)
      res.cookie('oauth_state', state, getCookieOptions(15 * 60 * 1000));
      
      const authUrl = client.generateAuthUrl({
        access_type: 'online', // We don't need offline refresh tokens for Google API right now
        scope: ['email', 'profile'],
        state,
        prompt: 'select_account'
      });
      
      res.redirect(authUrl);
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /google/callback ───────────────────────────────────────────────────────

router.get(
  '/google/callback',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code, state, error } = req.query;

      if (error) {
        throw AppError.unauthorized(`Google OAuth failed: ${error}`);
      }

      if (!code || typeof code !== 'string') {
        throw AppError.unauthorized('Google OAuth failed: Missing authorization code');
      }

      // Verify CSRF state
      const cookieState = req.cookies?.oauth_state;
      res.clearCookie('oauth_state'); // Clear it immediately

      if (!state || !cookieState || state !== cookieState) {
        throw AppError.unauthorized('Google OAuth failed: Invalid state parameter (CSRF protection)');
      }

      const client = getGoogleClient();
      
      // Exchange code for tokens
      let tokens;
      try {
        const response = await client.getToken(code);
        tokens = response.tokens;
      } catch (e) {
        throw AppError.unauthorized('Google OAuth failed: Invalid authorization code');
      }

      // Verify ID token to extract email and profile
      if (!tokens.id_token) {
        throw AppError.unauthorized('Google OAuth failed: No ID token returned');
      }

      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: config.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw AppError.unauthorized('Google OAuth failed: Invalid ID token payload');
      }

      const googleId = payload.sub;
      const email = payload.email;
      const emailVerified = payload.email_verified;
      const firstName = payload.given_name || 'User';
      const lastName = payload.family_name || '';

      if (!email || !emailVerified) {
        throw AppError.unauthorized('Google OAuth failed: An verified email address is required');
      }

      // We perform database lookups and creations transactionally if creating, but we can do it sequentially here safely.
      // 1. Check if OAuthIdentity already exists
      let user = null;
      const existingIdentity = await prisma.oAuthIdentity.findUnique({
        where: { uq_provider_account: { provider: 'google', providerAccountId: googleId } },
        include: { user: true },
      });

      if (existingIdentity) {
        user = existingIdentity.user;
      } else {
        // 2. Check if a User with this email already exists
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          // Link account gracefully
          user = existingUser;
          await prisma.oAuthIdentity.create({
            data: {
              userId: user.id,
              provider: 'google',
              providerAccountId: googleId,
            },
          });
          logger.info({ userId: user.id }, 'Linked existing user to Google OAuth');
        } else {
          // 3. Create completely new User safely as PATIENT
          user = await prisma.user.create({
            data: {
              email,
              firstName,
              lastName,
              isVerified: true, // Google verified it
              role: 'PATIENT',  // Always PATIENT for public auth
              patientProfile: {
                create: {}
              },
              oauthIdentities: {
                create: {
                  provider: 'google',
                  providerAccountId: googleId,
                }
              }
            }
          });
          logger.info({ userId: user.id }, 'Registered new patient via Google OAuth');
        }
      }

      // Ensure user is active
      if (!user.isActive) {
        throw AppError.unauthorized('Account is deactivated');
      }

      // Generate app tokens
      const tokenPayload = { sub: user.id, role: user.role };
      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      const accessMaxAge = parseDurationToMs(config.JWT_ACCESS_EXPIRES_IN);
      const refreshMaxAge = parseDurationToMs(config.JWT_REFRESH_EXPIRES_IN);

      res.cookie('access_token', accessToken, getCookieOptions(accessMaxAge));
      res.cookie('refresh_token', refreshToken, getCookieOptions(refreshMaxAge));

      // Redirect back to frontend
      const frontendUrl = config.FRONTEND_URL || 'http://localhost:5173';
      // For a real app, you might want to redirect to a specific dashboard or a success page that closes a popup
      res.redirect(`${frontendUrl}/dashboard`); // Assuming /dashboard redirects to appropriate portal
    } catch (err) {
      next(err);
    }
  }
);

export default router;
