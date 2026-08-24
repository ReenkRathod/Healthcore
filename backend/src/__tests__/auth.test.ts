/**
 * Authentication & Authorization test suite.
 *
 * Tests cover:
 *  1.  Successful registration
 *  2.  Duplicate registration
 *  3.  Invalid registration (missing fields, weak password)
 *  4.  Successful login
 *  5.  Invalid login (wrong credentials)
 *  6.  Logout
 *  7.  Unauthenticated protected request
 *  8.  Patient authorization
 *  9.  Doctor authorization
 *  10. Admin authorization
 *  11. Patient A accessing Patient B's resource (IDOR)
 *  12. Doctor A accessing Doctor B's resource (IDOR)
 *  13. Non-admin attempting admin-only operation
 *  14. Role escalation attempt during registration
 *
 * All tests mock Prisma — no real database required.
 */

import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createApp } from '../app';
import type { Role, User } from '@prisma/client';

// ── Mock data ─────────────────────────────────────────────────────────────────

const TEST_PASSWORD = 'StrongPass1';
const TEST_PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 4); // low rounds for speed

function makeUser(overrides: Partial<User> & { id: string; role: Role }): User {
  return {
    email: `${overrides.id}@test.com`,
    passwordHash: TEST_PASSWORD_HASH,
    firstName: 'Test',
    lastName: 'User',
    phone: null,
    isVerified: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const patientA = makeUser({ id: 'patient-a', role: 'PATIENT' });
const patientB = makeUser({ id: 'patient-b', role: 'PATIENT', email: 'patientb@test.com' });
const doctorA = makeUser({ id: 'doctor-a', role: 'DOCTOR', email: 'doctora@test.com' });
const doctorB = makeUser({ id: 'doctor-b', role: 'DOCTOR', email: 'doctorb@test.com' });
const adminUser = makeUser({ id: 'admin-1', role: 'ADMIN', email: 'admin@test.com' });

// ── Prisma mock ──────────────────────────────────────────────────────────────

const mockPrismaUser = {
  create: jest.fn(),
  findUnique: jest.fn(),
};

jest.mock('../db/client', () => {
  return {
    prisma: {
      user: {
        create: (...args: any[]) => mockPrismaUser.create(...args),
        findUnique: (...args: any[]) => mockPrismaUser.findUnique(...args),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ ping: 1 }]),
      $on: jest.fn(),
    },
    connectDatabase: jest.fn().mockResolvedValue(undefined),
    disconnectDatabase: jest.fn().mockResolvedValue(undefined),
  };
});

const app = createApp();

// ── Helpers ──────────────────────────────────────────────────────────────────

const ACCESS_SECRET = process.env['JWT_ACCESS_SECRET']!;

function signToken(userId: string, role: Role): string {
  return jwt.sign({ sub: userId, role }, ACCESS_SECRET, { expiresIn: '15m' });
}

function authHeader(userId: string, role: Role): string {
  return `Bearer ${signToken(userId, role)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITES
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Successful registration
  it('creates a new patient account and returns safe user data (no password)', async () => {
    mockPrismaUser.create.mockResolvedValue(patientA);

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'new@test.com',
        password: 'StrongPass1',
        firstName: 'New',
        lastName: 'Patient',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBeDefined();
    // Must NOT contain password or hash
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.user.password).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain(TEST_PASSWORD_HASH);
  });

  it('calls prisma.user.create with role PATIENT', async () => {
    mockPrismaUser.create.mockResolvedValue(patientA);

    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'new@test.com',
        password: 'StrongPass1',
        firstName: 'New',
        lastName: 'Patient',
      });

    expect(mockPrismaUser.create).toHaveBeenCalledTimes(1);
    const createArg = mockPrismaUser.create.mock.calls[0][0];
    expect(createArg.data.role).toBe('PATIENT');
  });

  // 2. Duplicate registration
  it('returns 409 when email already exists', async () => {
    const prismaError = new Error('Unique constraint failed') as Error & { code: string; meta?: Record<string, unknown> };
    prismaError.code = 'P2002';
    prismaError.meta = { target: ['email'] };
    mockPrismaUser.create.mockRejectedValue(prismaError);

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'duplicate@test.com',
        password: 'StrongPass1',
        firstName: 'Dup',
        lastName: 'User',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  // 3. Invalid registration
  it('returns 422 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'no-password@test.com' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('returns 422 for weak password (no uppercase)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'weak@test.com',
        password: 'weakpass1',
        firstName: 'Weak',
        lastName: 'Pass',
      });

    expect(res.status).toBe(422);
  });

  it('returns 422 for password shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'short@test.com',
        password: 'Ab1',
        firstName: 'Short',
        lastName: 'Pass',
      });

    expect(res.status).toBe(422);
  });

  // 14. Role escalation attempt during registration
  it('ignores role=ADMIN in registration body — still creates PATIENT', async () => {
    mockPrismaUser.create.mockResolvedValue(patientA);

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'escalation@test.com',
        password: 'StrongPass1',
        firstName: 'Hacker',
        lastName: 'Try',
        role: 'ADMIN', // this should be ignored
      });

    expect(res.status).toBe(201);
    // Verify the create call forced PATIENT
    const createArg = mockPrismaUser.create.mock.calls[0][0];
    expect(createArg.data.role).toBe('PATIENT');
  });

  it('ignores role=DOCTOR in registration body — still creates PATIENT', async () => {
    mockPrismaUser.create.mockResolvedValue(patientA);

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'escalation2@test.com',
        password: 'StrongPass1',
        firstName: 'Hacker',
        lastName: 'Try',
        role: 'DOCTOR',
      });

    expect(res.status).toBe(201);
    const createArg = mockPrismaUser.create.mock.calls[0][0];
    expect(createArg.data.role).toBe('PATIENT');
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 4. Successful login
  it('returns 200 with user data and tokens on valid credentials', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(patientA);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: patientA.email, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    // Cookies should be set
    expect(res.headers['set-cookie']).toBeDefined();
    // No password in response
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain(TEST_PASSWORD_HASH);
  });

  // 5. Invalid login
  it('returns 401 with generic message for non-existent email', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@test.com', password: 'Whatever1' });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
    // Must NOT reveal that the email doesn't exist
    expect(res.body.error.message).not.toContain('not found');
    expect(res.body.error.message).not.toContain('does not exist');
  });

  it('returns 401 with generic message for wrong password', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(patientA);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: patientA.email, password: 'WrongPassword1' });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('returns 401 for deactivated account (same generic message)', async () => {
    const deactivated = { ...patientA, isActive: false };
    mockPrismaUser.findUnique.mockResolvedValue(deactivated);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: patientA.email, password: TEST_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });
});

describe('POST /api/v1/auth/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 6. Logout
  it('returns 200 and clears cookies', async () => {
    // authenticate middleware needs findUnique
    mockPrismaUser.findUnique.mockResolvedValue(patientA);

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', authHeader(patientA.id, 'PATIENT'));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Cookies should be cleared (set with past expiry or maxAge=0)
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies).toBeDefined();
    const cookieStr = cookies.join('; ');
    expect(cookieStr).toContain('access_token');
    expect(cookieStr).toContain('refresh_token');
  });

  it('returns 401 without authentication', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/auth/me', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 7. Unauthenticated protected request
  it('returns 401 without authentication', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 with an invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });

  it('returns 401 with an expired token', async () => {
    const expiredToken = jwt.sign(
      { sub: patientA.id, role: 'PATIENT' },
      ACCESS_SECRET,
      { expiresIn: '0s' },
    );

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
  });

  // 8. Patient authorization
  it('returns user data for authenticated patient', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(patientA);

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', authHeader(patientA.id, 'PATIENT'));

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(patientA.id);
    expect(res.body.data.user.role).toBe('PATIENT');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  // 9. Doctor authorization
  it('returns user data for authenticated doctor', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(doctorA);

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', authHeader(doctorA.id, 'DOCTOR'));

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(doctorA.id);
    expect(res.body.data.user.role).toBe('DOCTOR');
  });

  // 10. Admin authorization
  it('returns user data for authenticated admin', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(adminUser);

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', authHeader(adminUser.id, 'ADMIN'));

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(adminUser.id);
    expect(res.body.data.user.role).toBe('ADMIN');
  });

  it('never returns sensitive fields', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(patientA);

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', authHeader(patientA.id, 'PATIENT'));

    const body = JSON.stringify(res.body);
    expect(body).not.toContain('passwordHash');
    expect(body).not.toContain('password_hash');
    expect(body).not.toContain(TEST_PASSWORD_HASH);
  });
});

describe('Role-based access control', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 13. Non-admin attempting admin-only operation
  // We test this via a hypothetical admin-only route. Since we don't have
  // admin-specific routes yet, we test the authorize middleware directly
  // by importing it.

  it('patient cannot access admin-only endpoint', async () => {
    // We'll create a mini-app with an admin-only route for this test
    const express = require('express');
    const miniApp = express();
    const cookieParser = require('cookie-parser');
    miniApp.use(express.json());
    miniApp.use(cookieParser());

    const { authenticate } = require('../middleware/authenticate');
    const { authorize } = require('../middleware/authorize');
    const { errorHandler } = require('../middleware/errorHandler');

    miniApp.get('/admin-test', authenticate, authorize('ADMIN'), (_req: any, res: any) => {
      res.json({ success: true });
    });
    miniApp.use(errorHandler);

    mockPrismaUser.findUnique.mockResolvedValue(patientA);

    const res = await request(miniApp)
      .get('/admin-test')
      .set('Authorization', authHeader(patientA.id, 'PATIENT'));

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('doctor cannot access admin-only endpoint', async () => {
    const express = require('express');
    const miniApp = express();
    const cookieParser = require('cookie-parser');
    miniApp.use(express.json());
    miniApp.use(cookieParser());

    const { authenticate } = require('../middleware/authenticate');
    const { authorize } = require('../middleware/authorize');
    const { errorHandler } = require('../middleware/errorHandler');

    miniApp.get('/admin-test', authenticate, authorize('ADMIN'), (_req: any, res: any) => {
      res.json({ success: true });
    });
    miniApp.use(errorHandler);

    mockPrismaUser.findUnique.mockResolvedValue(doctorA);

    const res = await request(miniApp)
      .get('/admin-test')
      .set('Authorization', authHeader(doctorA.id, 'DOCTOR'));

    expect(res.status).toBe(403);
  });

  it('admin can access admin-only endpoint', async () => {
    const express = require('express');
    const miniApp = express();
    const cookieParser = require('cookie-parser');
    miniApp.use(express.json());
    miniApp.use(cookieParser());

    const { authenticate } = require('../middleware/authenticate');
    const { authorize } = require('../middleware/authorize');
    const { errorHandler } = require('../middleware/errorHandler');

    miniApp.get('/admin-test', authenticate, authorize('ADMIN'), (_req: any, res: any) => {
      res.json({ success: true });
    });
    miniApp.use(errorHandler);

    mockPrismaUser.findUnique.mockResolvedValue(adminUser);

    const res = await request(miniApp)
      .get('/admin-test')
      .set('Authorization', authHeader(adminUser.id, 'ADMIN'));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Object-level authorization (IDOR prevention)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // We test the requireSelfOrRole middleware via mini-apps

  // 11. Patient A accessing Patient B's resource
  it('patient A cannot access patient B resource via :userId param', async () => {
    const express = require('express');
    const miniApp = express();
    const cookieParser = require('cookie-parser');
    miniApp.use(express.json());
    miniApp.use(cookieParser());

    const { authenticate } = require('../middleware/authenticate');
    const { requireSelfOrRole } = require('../middleware/ownershipCheck');
    const { errorHandler } = require('../middleware/errorHandler');

    miniApp.get('/users/:userId/profile', authenticate, requireSelfOrRole('ADMIN'), (_req: any, res: any) => {
      res.json({ success: true });
    });
    miniApp.use(errorHandler);

    // Patient A tries to access Patient B's profile
    mockPrismaUser.findUnique.mockResolvedValue(patientA);

    const res = await request(miniApp)
      .get(`/users/${patientB.id}/profile`)
      .set('Authorization', authHeader(patientA.id, 'PATIENT'));

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('patient A can access their own resource via :userId param', async () => {
    const express = require('express');
    const miniApp = express();
    const cookieParser = require('cookie-parser');
    miniApp.use(express.json());
    miniApp.use(cookieParser());

    const { authenticate } = require('../middleware/authenticate');
    const { requireSelfOrRole } = require('../middleware/ownershipCheck');
    const { errorHandler } = require('../middleware/errorHandler');

    miniApp.get('/users/:userId/profile', authenticate, requireSelfOrRole('ADMIN'), (_req: any, res: any) => {
      res.json({ success: true });
    });
    miniApp.use(errorHandler);

    mockPrismaUser.findUnique.mockResolvedValue(patientA);

    const res = await request(miniApp)
      .get(`/users/${patientA.id}/profile`)
      .set('Authorization', authHeader(patientA.id, 'PATIENT'));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // 12. Doctor A accessing Doctor B's resource
  it('doctor A cannot access doctor B resource via :userId param', async () => {
    const express = require('express');
    const miniApp = express();
    const cookieParser = require('cookie-parser');
    miniApp.use(express.json());
    miniApp.use(cookieParser());

    const { authenticate } = require('../middleware/authenticate');
    const { requireSelfOrRole } = require('../middleware/ownershipCheck');
    const { errorHandler } = require('../middleware/errorHandler');

    miniApp.get('/users/:userId/schedule', authenticate, requireSelfOrRole('ADMIN'), (_req: any, res: any) => {
      res.json({ success: true });
    });
    miniApp.use(errorHandler);

    mockPrismaUser.findUnique.mockResolvedValue(doctorA);

    const res = await request(miniApp)
      .get(`/users/${doctorB.id}/schedule`)
      .set('Authorization', authHeader(doctorA.id, 'DOCTOR'));

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('admin can access any user resource (elevated role bypass)', async () => {
    const express = require('express');
    const miniApp = express();
    const cookieParser = require('cookie-parser');
    miniApp.use(express.json());
    miniApp.use(cookieParser());

    const { authenticate } = require('../middleware/authenticate');
    const { requireSelfOrRole } = require('../middleware/ownershipCheck');
    const { errorHandler } = require('../middleware/errorHandler');

    miniApp.get('/users/:userId/profile', authenticate, requireSelfOrRole('ADMIN'), (_req: any, res: any) => {
      res.json({ success: true });
    });
    miniApp.use(errorHandler);

    mockPrismaUser.findUnique.mockResolvedValue(adminUser);

    const res = await request(miniApp)
      .get(`/users/${patientA.id}/profile`)
      .set('Authorization', authHeader(adminUser.id, 'ADMIN'));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Security properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passwords are hashed with bcrypt (not stored as plaintext)', async () => {
    mockPrismaUser.create.mockImplementation(async (args: any) => {
      // Verify the passwordHash is actually a bcrypt hash, not plaintext
      const hash = args.data.passwordHash;
      expect(hash).not.toBe('StrongPass1');
      expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
      return { ...patientA, passwordHash: hash };
    });

    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'hash-test@test.com',
        password: 'StrongPass1',
        firstName: 'Hash',
        lastName: 'Test',
      });

    expect(mockPrismaUser.create).toHaveBeenCalledTimes(1);
  });

  it('registration response never contains password hash', async () => {
    mockPrismaUser.create.mockResolvedValue(patientA);

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'nohash@test.com',
        password: 'StrongPass1',
        firstName: 'No',
        lastName: 'Hash',
      });

    const body = JSON.stringify(res.body);
    expect(body).not.toContain('$2a$');
    expect(body).not.toContain('$2b$');
    expect(body).not.toContain('passwordHash');
    expect(body).not.toContain('password_hash');
  });

  it('login response never contains password hash', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(patientA);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: patientA.email, password: TEST_PASSWORD });

    const body = JSON.stringify(res.body);
    expect(body).not.toContain('$2a$');
    expect(body).not.toContain('$2b$');
    expect(body).not.toContain('passwordHash');
  });
});

describe('POST /api/v1/auth/refresh', () => {
  const REFRESH_SECRET = process.env['JWT_REFRESH_SECRET']!;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 if refresh token is missing', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('returns 401 for an invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'invalid.token' });
    expect(res.status).toBe(401);
  });

  it('returns 200 and a new access token when valid refresh token provided', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({
      id: patientA.id,
      role: patientA.role,
      isActive: true,
    });

    const validRefreshToken = jwt.sign(
      { sub: patientA.id, role: patientA.role },
      REFRESH_SECRET,
      { expiresIn: '7d' },
    );

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [`refresh_token=${validRefreshToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('returns 401 if user from refresh token is inactive', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({
      id: patientA.id,
      role: patientA.role,
      isActive: false,
    });

    const validRefreshToken = jwt.sign(
      { sub: patientA.id, role: patientA.role },
      REFRESH_SECRET,
      { expiresIn: '7d' },
    );

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: validRefreshToken });

    expect(res.status).toBe(401);
  });
});

describe('assertOwnership helper unit test', () => {
  it('passes when user IDs match', () => {
    const { assertOwnership } = require('../middleware/ownershipCheck');
    expect(() => assertOwnership('user-1', 'user-1')).not.toThrow();
  });

  it('throws 403 AppError when user IDs do not match', () => {
    const { assertOwnership } = require('../middleware/ownershipCheck');
    expect(() => assertOwnership('user-1', 'user-2')).toThrow();
  });
});
