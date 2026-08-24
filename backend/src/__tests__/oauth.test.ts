import request from 'supertest';
import { createApp } from '../app';
import type { Role, User } from '@prisma/client';

// ── Mock data ─────────────────────────────────────────────────────────────────
function makeUser(overrides: Partial<User> & { id: string; role: Role }): User {
  return {
    email: `${overrides.id}@test.com`,
    passwordHash: null,
    firstName: 'Test',
    lastName: 'User',
    phone: null,
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const existingPatient = makeUser({ id: 'existing-patient', role: 'PATIENT', email: 'existing@test.com' });
const existingDoctor = makeUser({ id: 'existing-doc', role: 'DOCTOR', email: 'doc@test.com' });

const mockIdentity = {
  id: 'id-1',
  userId: existingPatient.id,
  provider: 'google',
  providerAccountId: 'google-sub-123',
  createdAt: new Date(),
};

// ── Prisma mock ──────────────────────────────────────────────────────────────
const mockPrismaUser = {
  create: jest.fn(),
  findUnique: jest.fn(),
};

const mockPrismaOAuthIdentity = {
  findUnique: jest.fn(),
  create: jest.fn(),
};

jest.mock('../db/client', () => {
  return {
    prisma: {
      user: {
        create: (...args: any[]) => mockPrismaUser.create(...args),
        findUnique: (...args: any[]) => mockPrismaUser.findUnique(...args),
      },
      oAuthIdentity: {
        findUnique: (...args: any[]) => mockPrismaOAuthIdentity.findUnique(...args),
        create: (...args: any[]) => mockPrismaOAuthIdentity.create(...args),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ ping: 1 }]),
      $on: jest.fn(),
    },
    connectDatabase: jest.fn().mockResolvedValue(undefined),
    disconnectDatabase: jest.fn().mockResolvedValue(undefined),
  };
});

// ── Google OAuth mock ──────────────────────────────────────────────────────────
const mockGetToken = jest.fn();
const mockVerifyIdToken = jest.fn();
const mockGenerateAuthUrl = jest.fn();

jest.mock('google-auth-library', () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => {
      return {
        generateAuthUrl: (...args: any[]) => mockGenerateAuthUrl(...args),
        getToken: (...args: any[]) => mockGetToken(...args),
        verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
      };
    }),
  };
});

// Configure Google OAuth env vars for the test
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_OAUTH_REDIRECT_URI = 'http://localhost/callback';
process.env.JWT_ACCESS_SECRET = 'supersecretaccesskey32charsminlength';
process.env.JWT_REFRESH_SECRET = 'supersecretrefreshkey32charsminlength';

const app = createApp();

describe('Google OAuth endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?state=mocked');
  });

  describe('GET /api/v1/auth/google', () => {
    it('redirects to Google and sets state cookie', async () => {
      const res = await request(app).get('/api/v1/auth/google');
      expect(res.status).toBe(302);
      expect(res.header.location).toBe('https://accounts.google.com/o/oauth2/v2/auth?state=mocked');
      
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies.some(c => c.startsWith('oauth_state='))).toBe(true);
    });
  });

  describe('GET /api/v1/auth/google/callback', () => {
    const validState = 'valid-state-123';

    beforeEach(() => {
      mockGetToken.mockResolvedValue({ tokens: { id_token: 'mock-id-token' } });
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          sub: 'google-sub-456',
          email: 'newuser@test.com',
          email_verified: true,
          given_name: 'New',
          family_name: 'User'
        })
      });
    });

    it('rejects if OAuth state does not match cookie', async () => {
      const res = await request(app)
        .get('/api/v1/auth/google/callback?code=mock-code&state=invalid-state')
        .set('Cookie', [`oauth_state=${validState}`]);
      
      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('CSRF protection');
    });

    it('rejects if error is present in query', async () => {
      const res = await request(app)
        .get('/api/v1/auth/google/callback?error=access_denied&state=' + validState)
        .set('Cookie', [`oauth_state=${validState}`]);
      
      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('access_denied');
    });

    it('handles existing linked Google user logging in', async () => {
      mockPrismaOAuthIdentity.findUnique.mockResolvedValue({
        ...mockIdentity,
        user: existingPatient,
      });

      const res = await request(app)
        .get(`/api/v1/auth/google/callback?code=mock-code&state=${validState}`)
        .set('Cookie', [`oauth_state=${validState}`]);

      expect(res.status).toBe(302);
      expect(res.header.location).toContain('/dashboard');
      
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies.some(c => c.startsWith('access_token='))).toBe(true);
      expect(cookies.some(c => c.startsWith('refresh_token='))).toBe(true);

      // It should not create any new users
      expect(mockPrismaUser.create).not.toHaveBeenCalled();
    });

    it('handles existing unlinked user (email matches) by linking safely', async () => {
      mockPrismaOAuthIdentity.findUnique.mockResolvedValue(null);
      mockPrismaUser.findUnique.mockResolvedValue(existingDoctor); // Found by email
      
      const res = await request(app)
        .get(`/api/v1/auth/google/callback?code=mock-code&state=${validState}`)
        .set('Cookie', [`oauth_state=${validState}`]);

      expect(res.status).toBe(302);
      
      // Should create OAuthIdentity but NOT a new User
      expect(mockPrismaUser.create).not.toHaveBeenCalled();
      expect(mockPrismaOAuthIdentity.create).toHaveBeenCalledWith({
        data: {
          userId: existingDoctor.id,
          provider: 'google',
          providerAccountId: 'google-sub-456'
        }
      });
    });

    it('creates new PATIENT account if user does not exist', async () => {
      mockPrismaOAuthIdentity.findUnique.mockResolvedValue(null);
      mockPrismaUser.findUnique.mockResolvedValue(null);
      
      const newUser = makeUser({ id: 'new-user', role: 'PATIENT' });
      mockPrismaUser.create.mockResolvedValue(newUser);

      const res = await request(app)
        .get(`/api/v1/auth/google/callback?code=mock-code&state=${validState}`)
        .set('Cookie', [`oauth_state=${validState}`]);

      expect(res.status).toBe(302);
      
      // Should create a User with role PATIENT
      expect(mockPrismaUser.create).toHaveBeenCalledTimes(1);
      const createArgs = mockPrismaUser.create.mock.calls[0][0];
      expect(createArgs.data.role).toBe('PATIENT');
      expect(createArgs.data.email).toBe('newuser@test.com');
      // Should also create patient profile and oauth identity inline
      expect(createArgs.data.patientProfile).toBeDefined();
      expect(createArgs.data.oauthIdentities).toBeDefined();
    });

    it('rejects unverified Google emails', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          sub: 'google-sub-456',
          email: 'unverified@test.com',
          email_verified: false,
        })
      });

      const res = await request(app)
        .get(`/api/v1/auth/google/callback?code=mock-code&state=${validState}`)
        .set('Cookie', [`oauth_state=${validState}`]);

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('verified email address is required');
    });
  });
});
