/**
 * Appointment Booking, Availability Engine, & Concurrency Control test suite.
 *
 * Covers:
 *  1. Availability Engine slot calculation (working hours, leaves, existing bookings)
 *  2. Patient appointment booking with symptom recording
 *  3. Past slot and inactive doctor booking rejection
 *  4. Double booking prevention (409 Conflict)
 *  5. Object-level authorization (Patients view own; Doctors view assigned; Admin views all)
 *  6. Appointment cancellation and status lifecycle transitions
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app';
import type { Role } from '@prisma/client';

// ── Mock Data ─────────────────────────────────────────────────────────────────

const patientUserA = {
  id: 'patient-user-a',
  email: 'patientA@test.com',
  firstName: 'Alice',
  lastName: 'Patient',
  role: 'PATIENT' as Role,
  isActive: true,
};

const patientProfileA = {
  id: 'patient-prof-a',
  userId: 'patient-user-a',
  user: patientUserA,
};

const patientUserB = {
  id: 'patient-user-b',
  email: 'patientB@test.com',
  firstName: 'Bob',
  lastName: 'Patient',
  role: 'PATIENT' as Role,
  isActive: true,
};

const patientProfileB = {
  id: 'patient-prof-b',
  userId: 'patient-user-b',
  user: patientUserB,
};

const doctorUserA = {
  id: 'doctor-user-a',
  email: 'doctorA@test.com',
  firstName: 'David',
  lastName: 'Doctor',
  role: 'DOCTOR' as Role,
  isActive: true,
};

const doctorProfileA = {
  id: 'doctor-prof-a',
  userId: 'doctor-user-a',
  slotDurationMn: 30,
  isAccepting: true,
  user: doctorUserA,
  workingHours: [
    {
      id: 'wh-1',
      doctorProfileId: 'doctor-prof-a',
      dayOfWeek: 'MONDAY',
      startTime: '09:00',
      endTime: '12:00',
      isActive: true,
    },
  ],
  leaves: [],
};

const doctorUserB = {
  id: 'doctor-user-b',
  email: 'doctorB@test.com',
  firstName: 'Eve',
  lastName: 'Doctor',
  role: 'DOCTOR' as Role,
  isActive: true,
};

const doctorProfileB = {
  id: 'doctor-prof-b',
  userId: 'doctor-user-b',
  slotDurationMn: 30,
  isAccepting: true,
  user: doctorUserB,
  workingHours: [],
  leaves: [],
};

const adminUser = {
  id: 'admin-user-1',
  email: 'admin@test.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'ADMIN' as Role,
  isActive: true,
};

// Future target date (Monday) for predictable availability tests
const TARGET_DATE_STR = '2026-10-05'; // 2026-10-05 is a Monday
const SLOT_START_ISO = '2026-10-05T09:00:00.000Z';
const SLOT_END_ISO = '2026-10-05T09:30:00.000Z';

const mockAppointment1 = {
  id: 'appt-1',
  patientProfileId: 'patient-prof-a',
  doctorProfileId: 'doctor-prof-a',
  slotStart: new Date(SLOT_START_ISO),
  slotEnd: new Date(SLOT_END_ISO),
  status: 'CONFIRMED',
  reasonForVisit: 'Routine checkup',
  confirmedAt: new Date(),
  symptoms: [
    {
      id: 'sym-1',
      description: 'Headache',
      severity: 'MILD',
      durationDays: 2,
    },
  ],
  patient: patientProfileA,
  doctor: doctorProfileA,
};

// ── Prisma Mocks ─────────────────────────────────────────────────────────────

const mockPrismaUser = {
  findUnique: jest.fn(),
};

const mockPrismaPatientProfile = {
  findUnique: jest.fn(),
  create: jest.fn(),
};

const mockPrismaDoctorProfile = {
  findUnique: jest.fn(),
};

const mockPrismaAppointment = {
  findFirst: jest.fn(),
  findMany: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

jest.mock('../db/client', () => {
  return {
    prisma: {
      user: {
        findUnique: (...args: any[]) => mockPrismaUser.findUnique(...args),
      },
      patientProfile: {
        findUnique: (...args: any[]) => mockPrismaPatientProfile.findUnique(...args),
        create: (...args: any[]) => mockPrismaPatientProfile.create(...args),
      },
      doctorProfile: {
        findUnique: (...args: any[]) => mockPrismaDoctorProfile.findUnique(...args),
      },
      appointment: {
        findFirst: (...args: any[]) => mockPrismaAppointment.findFirst(...args),
        findMany: (...args: any[]) => mockPrismaAppointment.findMany(...args),
        findUnique: (...args: any[]) => mockPrismaAppointment.findUnique(...args),
        create: (...args: any[]) => mockPrismaAppointment.create(...args),
        update: (...args: any[]) => mockPrismaAppointment.update(...args),
      },
      $transaction: async (cb: any) => {
        if (typeof cb === 'function') {
          return cb({
            $executeRaw: jest.fn().mockResolvedValue(1),
            doctorProfile: mockPrismaDoctorProfile,
            appointment: mockPrismaAppointment,
          });
        }
        return Promise.all(cb);
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
// TEST SUITES
// ─────────────────────────────────────────────────────────────────────────────

describe('Availability Engine (GET /api/v1/doctors/:id/availability)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('computes available slots for working day with no bookings or leaves', async () => {
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfileA);
    mockPrismaAppointment.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get(`/api/v1/doctors/${doctorProfileA.id}/availability?date=${TARGET_DATE_STR}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.date).toBe(TARGET_DATE_STR);
    expect(res.body.data.slots.length).toBeGreaterThan(0);
    // Working hours 09:00 to 12:00 with 30m slot = 6 slots
    expect(res.body.data.slots.length).toBe(6);
  });

  it('returns 0 slots when doctor is on full-day leave', async () => {
    const doctorOnLeave = {
      ...doctorProfileA,
      leaves: [
        {
          id: 'leave-1',
          doctorProfileId: doctorProfileA.id,
          startDate: new Date(TARGET_DATE_STR),
          endDate: new Date(TARGET_DATE_STR),
          isFullDay: true,
        },
      ],
    };
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorOnLeave);

    const res = await request(app)
      .get(`/api/v1/doctors/${doctorProfileA.id}/availability?date=${TARGET_DATE_STR}`);

    expect(res.status).toBe(200);
    expect(res.body.data.slots.length).toBe(0);
  });

  it('excludes slots that overlap with existing active appointments', async () => {
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfileA);
    // 09:00 - 09:30 is already booked
    mockPrismaAppointment.findMany.mockResolvedValue([
      {
        slotStart: new Date(SLOT_START_ISO),
        slotEnd: new Date(SLOT_END_ISO),
        status: 'CONFIRMED',
      },
    ]);

    const res = await request(app)
      .get(`/api/v1/doctors/${doctorProfileA.id}/availability?date=${TARGET_DATE_STR}`);

    expect(res.status).toBe(200);
    // Should have 5 available slots instead of 6
    expect(res.body.data.slots.length).toBe(5);
    const hasBookedSlot = res.body.data.slots.some(
      (s: any) => s.slotStart === SLOT_START_ISO,
    );
    expect(hasBookedSlot).toBe(false);
  });

  it('returns 400 when date parameter is missing', async () => {
    const res = await request(app)
      .get(`/api/v1/doctors/${doctorProfileA.id}/availability`);

    expect(res.status).toBe(400);
  });
});

describe('Appointment Booking (POST /api/v1/appointments)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows PATIENT to book an appointment with symptoms attached', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(patientUserA);
    mockPrismaPatientProfile.findUnique.mockResolvedValue(patientProfileA);
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfileA);
    mockPrismaAppointment.findFirst.mockResolvedValue(null); // No existing conflict
    mockPrismaAppointment.create.mockResolvedValue(mockAppointment1);

    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', authHeader(patientUserA.id, 'PATIENT'))
      .send({
        doctorProfileId: doctorProfileA.id,
        slotStart: SLOT_START_ISO,
        reasonForVisit: 'Routine checkup',
        symptoms: [
          {
            description: 'Headache',
            severity: 'MILD',
            durationDays: 2,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.appointment).toBeDefined();
    expect(res.body.data.appointment.id).toBe('appt-1');
  });

  it('rejects booking in the past', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(patientUserA);

    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', authHeader(patientUserA.id, 'PATIENT'))
      .send({
        doctorProfileId: doctorProfileA.id,
        slotStart: '2020-01-01T09:00:00.000Z', // Past date!
        symptoms: [{ description: 'Fever' }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('past');
  });

  it('rejects duplicate booking attempt for the same slot (409 Conflict)', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(patientUserA);
    mockPrismaPatientProfile.findUnique.mockResolvedValue(patientProfileA);
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfileA);
    // Simulate existing appointment conflict inside transaction check
    mockPrismaAppointment.findFirst.mockResolvedValue(mockAppointment1);

    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', authHeader(patientUserA.id, 'PATIENT'))
      .send({
        doctorProfileId: doctorProfileA.id,
        slotStart: SLOT_START_ISO,
        symptoms: [{ description: 'Fever' }],
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain('already been booked');
  });

  it('prevents DOCTOR or ADMIN from calling PATIENT booking endpoint (403)', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(doctorUserA);

    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', authHeader(doctorUserA.id, 'DOCTOR'))
      .send({
        doctorProfileId: doctorProfileA.id,
        slotStart: SLOT_START_ISO,
      });

    expect(res.status).toBe(403);
  });
});

describe('Appointment Object-Level Authorization (IDOR Prevention)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('patient A can view their own appointment', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(patientUserA);
    mockPrismaAppointment.findUnique.mockResolvedValue(mockAppointment1);

    const res = await request(app)
      .get(`/api/v1/appointments/${mockAppointment1.id}`)
      .set('Authorization', authHeader(patientUserA.id, 'PATIENT'));

    expect(res.status).toBe(200);
    expect(res.body.data.appointment.id).toBe(mockAppointment1.id);
  });

  it('patient B cannot view patient A appointment (403 Forbidden)', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(patientUserB);
    mockPrismaPatientProfile.findUnique.mockResolvedValue(patientProfileB);
    mockPrismaAppointment.findUnique.mockResolvedValue(mockAppointment1);

    const res = await request(app)
      .get(`/api/v1/appointments/${mockAppointment1.id}`)
      .set('Authorization', authHeader(patientUserB.id, 'PATIENT'));

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('another patient\'s appointment');
  });

  it('assigned doctor A can view their assigned appointment', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(doctorUserA);
    mockPrismaAppointment.findUnique.mockResolvedValue(mockAppointment1);

    const res = await request(app)
      .get(`/api/v1/appointments/${mockAppointment1.id}`)
      .set('Authorization', authHeader(doctorUserA.id, 'DOCTOR'));

    expect(res.status).toBe(200);
    expect(res.body.data.appointment.id).toBe(mockAppointment1.id);
  });

  it('unassigned doctor B cannot view doctor A appointment (403 Forbidden)', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(doctorUserB);
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfileB);
    mockPrismaAppointment.findUnique.mockResolvedValue(mockAppointment1);

    const res = await request(app)
      .get(`/api/v1/appointments/${mockAppointment1.id}`)
      .set('Authorization', authHeader(doctorUserB.id, 'DOCTOR'));

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('another doctor\'s appointment');
  });

  it('admin can view any appointment', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(adminUser);
    mockPrismaAppointment.findUnique.mockResolvedValue(mockAppointment1);

    const res = await request(app)
      .get(`/api/v1/appointments/${mockAppointment1.id}`)
      .set('Authorization', authHeader(adminUser.id, 'ADMIN'));

    expect(res.status).toBe(200);
    expect(res.body.data.appointment.id).toBe(mockAppointment1.id);
  });
});

describe('Appointment Cancellation & Status Lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows patient to cancel their own appointment', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(patientUserA);
    mockPrismaAppointment.findUnique.mockResolvedValue(mockAppointment1);
    mockPrismaAppointment.update.mockResolvedValue({
      ...mockAppointment1,
      status: 'CANCELLED_BY_PATIENT',
      cancellationReason: 'Feeling better',
    });

    const res = await request(app)
      .patch(`/api/v1/appointments/${mockAppointment1.id}/cancel`)
      .set('Authorization', authHeader(patientUserA.id, 'PATIENT'))
      .send({ cancellationReason: 'Feeling better' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.appointment.status).toBe('CANCELLED_BY_PATIENT');
  });

  it('allows doctor to update appointment status to COMPLETED', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(doctorUserA);
    mockPrismaAppointment.findUnique.mockResolvedValue(mockAppointment1);
    mockPrismaAppointment.update.mockResolvedValue({
      ...mockAppointment1,
      status: 'COMPLETED',
      completedAt: new Date(),
    });

    const res = await request(app)
      .patch(`/api/v1/appointments/${mockAppointment1.id}/status`)
      .set('Authorization', authHeader(doctorUserA.id, 'DOCTOR'))
      .send({ status: 'COMPLETED' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.appointment.status).toBe('COMPLETED');
  });
});
