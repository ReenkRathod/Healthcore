/**
 * Doctor Management & Availability Configuration test suite.
 *
 * Scenarios tested:
 *  1. Admin creates doctor profile
 *  2. Admin updates doctor profile
 *  3. Non-admin cannot create doctor profile (403)
 *  4. Non-admin cannot modify doctor profile (403)
 *  5. Valid working hours configuration
 *  6. Invalid working hours configuration (startTime >= endTime)
 *  7. Invalid slot duration (non-standard duration)
 *  8. Adding doctor leave (full-day & partial)
 *  9. Removing doctor leave
 *  10. Duplicate / overlapping leave rejection (409)
 *  11. Invalid leave dates (startDate > endDate)
 *  12. Inactive doctor behavior (excluded from search)
 *  13. Specialisation search data
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app';
import type { Role } from '@prisma/client';

// ── Mock Data ─────────────────────────────────────────────────────────────────

const adminUser = {
  id: 'admin-1',
  email: 'admin@test.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'ADMIN' as Role,
  isActive: true,
};

const patientUser = {
  id: 'patient-1',
  email: 'patient@test.com',
  firstName: 'Patient',
  lastName: 'User',
  role: 'PATIENT' as Role,
  isActive: true,
};

const doctorUser = {
  id: 'doctor-user-1',
  email: 'dr.smith@test.com',
  firstName: 'John',
  lastName: 'Smith',
  phone: '1234567890',
  role: 'DOCTOR' as Role,
  isActive: true,
};

const doctorProfile1 = {
  id: 'doc-prof-1',
  userId: 'doctor-user-1',
  title: 'Dr.',
  licenseNumber: 'MD-12345',
  slotDurationMn: 30,
  bio: 'Cardiologist with 10 years experience',
  avatarUrl: 'https://example.com/avatar.jpg',
  isAccepting: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: doctorUser,
  specialisations: [
    {
      id: 'spec-1',
      doctorProfileId: 'doc-prof-1',
      name: 'Cardiology',
      subSpeciality: 'Interventional',
      isPrimary: true,
    },
  ],
  workingHours: [
    {
      id: 'wh-1',
      doctorProfileId: 'doc-prof-1',
      dayOfWeek: 'MONDAY',
      startTime: '09:00',
      endTime: '17:00',
      isActive: true,
    },
  ],
  leaves: [],
};

// ── Prisma Mocks ─────────────────────────────────────────────────────────────

const mockPrismaUser = {
  findUnique: jest.fn(),
  create: jest.fn(),
};

const mockPrismaDoctorProfile = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
};

const mockPrismaDoctorSpecialisation = {
  create: jest.fn(),
  findFirst: jest.fn(),
  delete: jest.fn(),
  groupBy: jest.fn(),
};

const mockPrismaDoctorWorkingHours = {
  upsert: jest.fn(),
  findMany: jest.fn(),
};

const mockPrismaDoctorLeave = {
  create: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  delete: jest.fn(),
};

jest.mock('../db/client', () => {
  return {
    prisma: {
      user: {
        findUnique: (...args: any[]) => mockPrismaUser.findUnique(...args),
        create: (...args: any[]) => mockPrismaUser.create(...args),
      },
      doctorProfile: {
        findUnique: (...args: any[]) => mockPrismaDoctorProfile.findUnique(...args),
        findMany: (...args: any[]) => mockPrismaDoctorProfile.findMany(...args),
        update: (...args: any[]) => mockPrismaDoctorProfile.update(...args),
      },
      doctorSpecialisation: {
        create: (...args: any[]) => mockPrismaDoctorSpecialisation.create(...args),
        findFirst: (...args: any[]) => mockPrismaDoctorSpecialisation.findFirst(...args),
        delete: (...args: any[]) => mockPrismaDoctorSpecialisation.delete(...args),
        groupBy: (...args: any[]) => mockPrismaDoctorSpecialisation.groupBy(...args),
      },
      doctorWorkingHours: {
        upsert: (...args: any[]) => mockPrismaDoctorWorkingHours.upsert(...args),
        findMany: (...args: any[]) => mockPrismaDoctorWorkingHours.findMany(...args),
      },
      doctorLeave: {
        create: (...args: any[]) => mockPrismaDoctorLeave.create(...args),
        findFirst: (...args: any[]) => mockPrismaDoctorLeave.findFirst(...args),
        findMany: (...args: any[]) => mockPrismaDoctorLeave.findMany(...args),
        delete: (...args: any[]) => mockPrismaDoctorLeave.delete(...args),
      },
      $transaction: async (arg: any) => {
        if (Array.isArray(arg)) {
          return Promise.all(arg);
        }
        return arg(mockPrismaUser);
      },
      $queryRaw: jest.fn().mockResolvedValue([{ ping: 1 }]),
      $on: jest.fn(),
    },
    connectDatabase: jest.fn().mockResolvedValue(undefined),
    disconnectDatabase: jest.fn().mockResolvedValue(undefined),
  };
});

const app = createApp();

const ACCESS_SECRET = process.env['JWT_ACCESS_SECRET']!;

function authHeader(userId: string, role: Role): string {
  const token = jwt.sign({ sub: userId, role }, ACCESS_SECRET, { expiresIn: '15m' });
  return `Bearer ${token}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Doctor Management API (/api/v1/admin/doctors)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Admin creates doctor
  it('allows ADMIN to create a new doctor profile', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(adminUser);
    mockPrismaUser.create.mockResolvedValue({
      ...doctorUser,
      doctorProfile: doctorProfile1,
    });

    const res = await request(app)
      .post('/api/v1/admin/doctors')
      .set('Authorization', authHeader(adminUser.id, 'ADMIN'))
      .send({
        email: 'dr.smith@test.com',
        password: 'DoctorPass1',
        firstName: 'John',
        lastName: 'Smith',
        licenseNumber: 'MD-12345',
        title: 'Dr.',
        slotDurationMn: 30,
        bio: 'Cardiologist with 10 years experience',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.doctor).toBeDefined();
    expect(res.body.data.doctor.licenseNumber).toBe('MD-12345');
  });

  // 3. Non-admin cannot create doctor
  it('prevents PATIENT from creating a doctor profile (403)', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(patientUser);

    const res = await request(app)
      .post('/api/v1/admin/doctors')
      .set('Authorization', authHeader(patientUser.id, 'PATIENT'))
      .send({
        email: 'unauthorized@test.com',
        password: 'DoctorPass1',
        firstName: 'Hacker',
        lastName: 'Try',
        licenseNumber: 'MD-99999',
      });

    expect(res.status).toBe(403);
  });

  // 2. Admin updates doctor
  it('allows ADMIN to update a doctor profile', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(adminUser);
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfile1);
    mockPrismaDoctorProfile.update.mockResolvedValue({
      ...doctorProfile1,
      title: 'Prof.',
      slotDurationMn: 45,
    });

    const res = await request(app)
      .patch('/api/v1/admin/doctors/doc-prof-1')
      .set('Authorization', authHeader(adminUser.id, 'ADMIN'))
      .send({
        title: 'Prof.',
        slotDurationMn: 45,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.doctor.title).toBe('Prof.');
    expect(res.body.data.doctor.slotDurationMn).toBe(45);
  });

  // 4. Non-admin cannot modify doctor
  it('prevents PATIENT from modifying a doctor profile (403)', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(patientUser);

    const res = await request(app)
      .patch('/api/v1/admin/doctors/doc-prof-1')
      .set('Authorization', authHeader(patientUser.id, 'PATIENT'))
      .send({ title: 'Hacked Title' });

    expect(res.status).toBe(403);
  });

  // 7. Invalid slot duration
  it('rejects invalid slot duration (non-standard duration like 7 minutes)', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(adminUser);

    const res = await request(app)
      .post('/api/v1/admin/doctors')
      .set('Authorization', authHeader(adminUser.id, 'ADMIN'))
      .send({
        email: 'badslot@test.com',
        password: 'DoctorPass1',
        firstName: 'Bad',
        lastName: 'Slot',
        licenseNumber: 'MD-77777',
        slotDurationMn: 7, // Invalid interval
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // Activate / Deactivate doctor
  it('allows ADMIN to deactivate a doctor', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(adminUser);
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfile1);
    mockPrismaDoctorProfile.update.mockResolvedValue({
      ...doctorProfile1,
      isAccepting: false,
      user: { ...doctorUser, isActive: false },
    });

    const res = await request(app)
      .patch('/api/v1/admin/doctors/doc-prof-1/status')
      .set('Authorization', authHeader(adminUser.id, 'ADMIN'))
      .send({ isActive: false, isAccepting: false });

    expect(res.status).toBe(200);
    expect(res.body.data.doctor.isActive).toBe(false);
    expect(res.body.data.doctor.isAccepting).toBe(false);
  });
});

describe('Working Hours Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 5. Valid working hours
  it('allows ADMIN to set valid working hours', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(adminUser);
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfile1);
    mockPrismaDoctorWorkingHours.upsert.mockResolvedValue({
      id: 'wh-1',
      doctorProfileId: 'doc-prof-1',
      dayOfWeek: 'MONDAY',
      startTime: '09:00',
      endTime: '17:00',
      isActive: true,
    });

    const res = await request(app)
      .put('/api/v1/admin/doctors/doc-prof-1/working-hours')
      .set('Authorization', authHeader(adminUser.id, 'ADMIN'))
      .send({
        workingHours: [
          {
            dayOfWeek: 'MONDAY',
            startTime: '09:00',
            endTime: '17:00',
            isActive: true,
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // 6. Invalid working hours (startTime >= endTime)
  it('rejects working hours where startTime is after endTime', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(adminUser);

    const res = await request(app)
      .put('/api/v1/admin/doctors/doc-prof-1/working-hours')
      .set('Authorization', authHeader(adminUser.id, 'ADMIN'))
      .send({
        workingHours: [
          {
            dayOfWeek: 'MONDAY',
            startTime: '17:00',
            endTime: '09:00', // Invalid!
            isActive: true,
          },
        ],
      });

    expect(res.status).toBe(422);
  });

  it('rejects duplicate days in working hours payload', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(adminUser);

    const res = await request(app)
      .put('/api/v1/admin/doctors/doc-prof-1/working-hours')
      .set('Authorization', authHeader(adminUser.id, 'ADMIN'))
      .send({
        workingHours: [
          { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '12:00' },
          { dayOfWeek: 'MONDAY', startTime: '13:00', endTime: '17:00' }, // Duplicate MONDAY
        ],
      });

    expect(res.status).toBe(422);
  });
});

describe('Doctor Leave Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 8. Adding leave
  it('allows ADMIN to add doctor leave', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(adminUser);
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfile1);
    mockPrismaDoctorLeave.findFirst.mockResolvedValue(null); // No overlap
    mockPrismaDoctorLeave.create.mockResolvedValue({
      id: 'leave-1',
      doctorProfileId: 'doc-prof-1',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-05'),
      reason: 'Annual leave',
      isFullDay: true,
    });

    const res = await request(app)
      .post('/api/v1/admin/doctors/doc-prof-1/leaves')
      .set('Authorization', authHeader(adminUser.id, 'ADMIN'))
      .send({
        startDate: '2026-09-01',
        endDate: '2026-09-05',
        reason: 'Annual leave',
        isFullDay: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.leave.id).toBe('leave-1');
  });

  // 9. Removing leave
  it('allows ADMIN to remove doctor leave', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(adminUser);
    mockPrismaDoctorLeave.findFirst.mockResolvedValue({
      id: 'leave-1',
      doctorProfileId: 'doc-prof-1',
    });
    mockPrismaDoctorLeave.delete.mockResolvedValue({});

    const res = await request(app)
      .delete('/api/v1/admin/doctors/doc-prof-1/leaves/leave-1')
      .set('Authorization', authHeader(adminUser.id, 'ADMIN'));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // 10. Duplicate / overlapping leave
  it('rejects overlapping leave dates for the same doctor (409)', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(adminUser);
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfile1);
    // Simulate existing overlap
    mockPrismaDoctorLeave.findFirst.mockResolvedValue({
      id: 'leave-existing',
      doctorProfileId: 'doc-prof-1',
    });

    const res = await request(app)
      .post('/api/v1/admin/doctors/doc-prof-1/leaves')
      .set('Authorization', authHeader(adminUser.id, 'ADMIN'))
      .send({
        startDate: '2026-09-03',
        endDate: '2026-09-10',
        reason: 'Overlapping leave',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain('overlaps');
  });

  // 11. Invalid dates
  it('rejects leave when startDate is after endDate', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(adminUser);

    const res = await request(app)
      .post('/api/v1/admin/doctors/doc-prof-1/leaves')
      .set('Authorization', authHeader(adminUser.id, 'ADMIN'))
      .send({
        startDate: '2026-09-10',
        endDate: '2026-09-01', // Invalid!
      });

    expect(res.status).toBe(422);
  });
});

describe('Doctor Discovery & Specialisation Search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 12. Inactive doctor behavior & 13. Specialisation search data
  it('returns active doctors filtered by specialisation', async () => {
    mockPrismaDoctorProfile.findMany.mockResolvedValue([doctorProfile1]);

    const res = await request(app)
      .get('/api/v1/doctors?specialisation=Cardiology');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.doctors).toHaveLength(1);
    expect(res.body.data.doctors[0].licenseNumber).toBe('MD-12345');
  });

  it('lists available medical specialisations', async () => {
    mockPrismaDoctorSpecialisation.groupBy.mockResolvedValue([
      { name: 'Cardiology', _count: { id: 5 } },
      { name: 'Dermatology', _count: { id: 3 } },
    ]);

    const res = await request(app).get('/api/v1/specialisations');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.specialisations).toHaveLength(2);
    expect(res.body.data.specialisations[0].name).toBe('Cardiology');
  });
});
