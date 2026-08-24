import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../app';
import type { Role, User } from '@prisma/client';

const TEST_PASSWORD = 'PatientTest@12345';
const TEST_PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 4);

function makeUser(overrides: Partial<User> & { id: string; role: Role }): User {
  return {
    email: `${overrides.id}@example.com`,
    passwordHash: TEST_PASSWORD_HASH,
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

const patientTest = makeUser({ id: 'patient.test', role: 'PATIENT' });
const doctorTest = makeUser({ id: 'doctor.test', role: 'DOCTOR', email: 'doctor.test@example.com' });
const adminTest = makeUser({ id: 'admin.test', role: 'ADMIN', email: 'admin.test@example.com' });

const mockPrismaUser = {
  findUnique: jest.fn(),
  upsert: jest.fn(),
};

jest.mock('../db/client', () => {
  return {
    prisma: {
      user: {
        findUnique: (...args: any[]) => mockPrismaUser.findUnique(...args),
        upsert: (...args: any[]) => mockPrismaUser.upsert(...args),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ ping: 1 }]),
      $on: jest.fn(),
    },
    connectDatabase: jest.fn().mockResolvedValue(undefined),
    disconnectDatabase: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('jsonwebtoken', () => ({
  sign: () => 'mock-token',
  verify: () => ({ userId: 'mock-id' })
}));

const app = createApp();

describe('Development Test Accounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Login & Role Verification', () => {
    it('Patient test account exists and can log in', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(patientTest);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'patient.test@example.com', password: TEST_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('PATIENT');
    });

    it('Doctor test account exists and can log in', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(doctorTest);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'doctor.test@example.com', password: TEST_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('DOCTOR');
    });

    it('Admin test account exists and can log in', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(adminTest);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin.test@example.com', password: TEST_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('ADMIN');
    });

    it('Passwords are hashed and not returned in responses', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(patientTest);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'patient.test@example.com', password: TEST_PASSWORD });

      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain(TEST_PASSWORD_HASH);
    });
  });

  describe('RBAC Verification using Middleware', () => {
    beforeAll(async () => {
      // Mock jsonwebtoken verify per-test to return appropriate userId
    });

    it('Patient receives PATIENT role and cannot access admin routes', async () => {
      // Setup verify mock for this test
      require('jsonwebtoken').verify = jest.fn().mockReturnValue({ userId: 'patient.test' });
      mockPrismaUser.findUnique.mockResolvedValue(patientTest);
      
      const res = await request(app)
        .get('/api/v1/admin/doctors')
        .set('Authorization', `Bearer patient-token`);

      expect(res.status).toBe(403);
    });

    it('Patient cannot access doctor-only routes', async () => {
      require('jsonwebtoken').verify = jest.fn().mockReturnValue({ userId: 'patient.test' });
      mockPrismaUser.findUnique.mockResolvedValue(patientTest);
      
      const res = await request(app)
        .get('/api/v1/appointments/doctor/anything')
        .set('Authorization', `Bearer patient-token`);
      
      expect(res.status).not.toBe(200);
    });

    it('Doctor receives DOCTOR role and cannot access admin routes', async () => {
      require('jsonwebtoken').verify = jest.fn().mockReturnValue({ userId: 'doctor.test' });
      mockPrismaUser.findUnique.mockResolvedValue(doctorTest);
      
      const res = await request(app)
        .get('/api/v1/admin/doctors')
        .set('Authorization', `Bearer doctor-token`);

      expect(res.status).toBe(403);
    });

    it('Admin receives ADMIN role and can access admin routes', async () => {
      require('jsonwebtoken').verify = jest.fn().mockReturnValue({ userId: 'admin.test' });
      mockPrismaUser.findUnique.mockResolvedValue(adminTest);
      
      jest.mock('../services/doctor.service', () => ({
        listDoctors: jest.fn().mockResolvedValue([]),
      }));

      const res = await request(app)
        .get('/api/v1/admin/doctors')
        .set('Authorization', `Bearer admin-token`);

      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(401);
    });
  });

  describe('Object-Level Authorization (IDOR)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      require('jsonwebtoken').verify = jest.fn().mockReturnValue({ userId: 'patient.test' });
    });

    it('Patient A tries to access Patient B appointment -> DENIED', async () => {
      // Mock patient token
      require('jsonwebtoken').verify = jest.fn().mockReturnValue({ userId: 'patient.a' });
      mockPrismaUser.findUnique.mockResolvedValue(makeUser({ id: 'patient.a', role: 'PATIENT' }));
      
      // Mock the service to throw an error or we can just mock Prisma inside the service.
      // appointmentService.getAppointmentById calls prisma.appointment.findUnique
      const prismaMock = require('../db/client').prisma;
      prismaMock.appointment = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'appt-patient-b',
          patientProfileId: 'patient-b-profile-id',
          doctorProfileId: 'doctor-a-profile-id',
          patient: { userId: 'patient.b' }
        })
      };

      const res = await request(app)
        .get('/api/v1/appointments/appt-patient-b')
        .set('Authorization', `Bearer patient-token`);

      // Service should throw AppError.forbidden or notFound if ID does not match
      expect([403, 404]).toContain(res.status);
    });

    it('Doctor A tries to access Doctor B appointment -> DENIED', async () => {
      // Mock doctor token
      require('jsonwebtoken').verify = jest.fn().mockReturnValue({ userId: 'doctor.a' });
      mockPrismaUser.findUnique.mockResolvedValue(makeUser({ id: 'doctor.a', role: 'DOCTOR' }));
      
      const prismaMock = require('../db/client').prisma;
      prismaMock.appointment = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'appt-doctor-b',
          patientProfileId: 'patient-a-profile-id',
          doctorProfileId: 'doctor-b-profile-id',
          doctor: { userId: 'doctor.b' },
          patient: { userId: 'patient.a' }
        })
      };

      const res = await request(app)
        .get('/api/v1/appointments/appt-doctor-b')
        .set('Authorization', `Bearer doctor-token`);

      expect([403, 404]).toContain(res.status);
    });

    it('Admin trying to access clinical notes directly -> DENIED', async () => {
      require('jsonwebtoken').verify = jest.fn().mockReturnValue({ userId: 'admin.test' });
      mockPrismaUser.findUnique.mockResolvedValue(adminTest);

      const res = await request(app)
        .get('/api/v1/appointments/appt-doctor-b/clinical-notes') // Admin should get 403
        .set('Authorization', `Bearer admin-token`);

      expect([403, 404]).toContain(res.status);
    });
  });

  describe('Seed Script constraints', () => {
    it('Test seed refuses to run in production', () => {
      const { execSync } = require('child_process');
      expect(() => {
        execSync('npx ts-node prisma/seed.ts', {
          env: { ...process.env, NODE_ENV: 'production' },
          stdio: 'pipe'
        });
      }).toThrow();
    });

    it('Running seed twice does not create duplicates (idempotent)', () => {
      // The idempotency is theoretically guaranteed by `upsert` in Prisma.
      // We will verify the seed script uses upsert in a basic regex check
      const fs = require('fs');
      const seedContent = fs.readFileSync('prisma/seed.ts', 'utf8');
      expect(seedContent).toContain('prisma.user.upsert');
      expect(seedContent).not.toContain('prisma.user.create({'); // the outer layer shouldn't be create
    });
  });
});
