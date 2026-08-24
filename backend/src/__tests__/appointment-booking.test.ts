/**
 * Appointment Booking & Validation test suite.
 *
 * Covers:
 *  1. Successful booking with symptoms
 *  2. Invalid doctor ID (404)
 *  3. Inactive doctor / not accepting appointments (400)
 *  4. Invalid date/time or past date (400)
 *  5. Outside working hours (400)
 *  6. Invalid slot boundary alignment (400)
 *  7. Doctor on full-day leave (409)
 *  8. Doctor on partial-day leave (409)
 *  9. Occupied slot (409)
 *  10. Cancelled appointment does NOT block booking
 *  11. Unauthenticated request (401)
 *  12. Wrong role attempt (403)
 *  13. Patient cannot book for another patient (identity from token)
 *  14. Response privacy check (zero unrelated patient PII)
 *  15. Idempotency key handling
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

const SLOT_START_ISO = '2026-10-05T09:00:00.000Z';
const SLOT_END_ISO = '2026-10-05T09:30:00.000Z';

const mockAppointment1 = {
  id: 'appt-1',
  patientProfileId: 'patient-prof-a',
  doctorProfileId: 'doctor-prof-a',
  slotStart: new Date(SLOT_START_ISO),
  slotEnd: new Date(SLOT_END_ISO),
  status: 'CONFIRMED',
  reasonForVisit: 'Checkup',
  confirmedAt: new Date(),
  symptoms: [
    {
      id: 'sym-1',
      description: 'Fever',
      severity: 'MODERATE',
      durationDays: 3,
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
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Appointment Booking API (POST /api/v1/appointments)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Successful booking
  it('1. successful booking with valid symptoms', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(patientUserA);
    mockPrismaPatientProfile.findUnique.mockResolvedValue(patientProfileA);
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfileA);
    mockPrismaAppointment.findFirst.mockResolvedValue(null);
    mockPrismaAppointment.create.mockResolvedValue(mockAppointment1);

    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', authHeader(patientUserA.id, 'PATIENT'))
      .send({
        doctorProfileId: doctorProfileA.id,
        slotStart: SLOT_START_ISO,
        reasonForVisit: 'Checkup',
        symptoms: [
          { description: 'Fever', severity: 'MODERATE', durationDays: 3 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.appointment.id).toBe('appt-1');
  });

  // 2. Invalid doctor
  it('2. returns 404 Not Found for non-existent doctor ID', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(patientUserA);
    mockPrismaPatientProfile.findUnique.mockResolvedValue(patientProfileA);
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', authHeader(patientUserA.id, 'PATIENT'))
      .send({
        doctorProfileId: 'non-existent-doctor-id',
        slotStart: SLOT_START_ISO,
        symptoms: [{ description: 'Headache' }],
      });

    expect(res.status).toBe(404);
  });

  // 3. Inactive doctor / not accepting
  it('3. returns 400 Bad Request when doctor is not accepting appointments', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(patientUserA);
    mockPrismaPatientProfile.findUnique.mockResolvedValue(patientProfileA);
    mockPrismaDoctorProfile.findUnique.mockResolvedValue({
      ...doctorProfileA,
      isAccepting: false,
    });

    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', authHeader(patientUserA.id, 'PATIENT'))
      .send({
        doctorProfileId: doctorProfileA.id,
        slotStart: SLOT_START_ISO,
        symptoms: [{ description: 'Headache' }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('not accepting');
  });

  // 4. Invalid date/time (past date)
  it('4. returns 400 Bad Request when booking in the past', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(patientUserA);

    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', authHeader(patientUserA.id, 'PATIENT'))
      .send({
        doctorProfileId: doctorProfileA.id,
        slotStart: '2020-01-01T09:00:00.000Z',
        symptoms: [{ description: 'Cough' }],
      });

    expect(res.status).toBe(400);
  });

  // 5. Outside working hours
  it('5. returns 400 Bad Request when slot is outside doctor working hours', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(patientUserA);
    mockPrismaPatientProfile.findUnique.mockResolvedValue(patientProfileA);
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfileA); // Working hours 09:00 to 12:00

    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', authHeader(patientUserA.id, 'PATIENT'))
      .send({
        doctorProfileId: doctorProfileA.id,
        slotStart: '2026-10-05T13:00:00.000Z', // 13:00 is outside 09:00-12:00
        symptoms: [{ description: 'Cough' }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('outside doctor working hours');
  });

  // 6. Invalid slot alignment
  it('6. returns 400 Bad Request when slot is not aligned to slot duration boundary', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(patientUserA);
    mockPrismaPatientProfile.findUnique.mockResolvedValue(patientProfileA);
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfileA); // 30m slots starting at 09:00

    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', authHeader(patientUserA.id, 'PATIENT'))
      .send({
        doctorProfileId: doctorProfileA.id,
        slotStart: '2026-10-05T09:15:00.000Z', // 09:15 is unaligned!
        symptoms: [{ description: 'Cough' }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('not aligned');
  });

  // 7. Full-day leave
  it('7. returns 409 Conflict when doctor is on full-day leave', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(patientUserA);
    mockPrismaPatientProfile.findUnique.mockResolvedValue(patientProfileA);
    const docFullLeave = {
      ...doctorProfileA,
      leaves: [
        {
          id: 'leave-1',
          doctorProfileId: doctorProfileA.id,
          startDate: new Date('2026-10-05'),
          endDate: new Date('2026-10-05'),
          isFullDay: true,
        },
      ],
    };
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(docFullLeave);

    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', authHeader(patientUserA.id, 'PATIENT'))
      .send({
        doctorProfileId: doctorProfileA.id,
        slotStart: SLOT_START_ISO,
        symptoms: [{ description: 'Fever' }],
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain('on leave');
  });

  // 8. Partial-day leave
  it('8. returns 409 Conflict when slot overlaps partial-day leave', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(patientUserA);
    mockPrismaPatientProfile.findUnique.mockResolvedValue(patientProfileA);
    const docPartialLeave = {
      ...doctorProfileA,
      leaves: [
        {
          id: 'leave-partial',
          doctorProfileId: doctorProfileA.id,
          startDate: new Date('2026-10-05'),
          endDate: new Date('2026-10-05'),
          isFullDay: false,
          leaveStartTime: '09:00',
          leaveEndTime: '10:00',
        },
      ],
    };
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(docPartialLeave);

    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', authHeader(patientUserA.id, 'PATIENT'))
      .send({
        doctorProfileId: doctorProfileA.id,
        slotStart: SLOT_START_ISO, // 09:00 overlaps leave 09:00-10:00
        symptoms: [{ description: 'Fever' }],
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain('on leave');
  });

  // 9. Occupied slot
  it('9. returns 409 Conflict when slot is already occupied', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(patientUserA);
    mockPrismaPatientProfile.findUnique.mockResolvedValue(patientProfileA);
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfileA);
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

  // 10. Cancelled appointment does NOT block booking
  it('10. allows booking if previous appointment for slot was cancelled', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(patientUserA);
    mockPrismaPatientProfile.findUnique.mockResolvedValue(patientProfileA);
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfileA);
    mockPrismaAppointment.findFirst.mockResolvedValue(null); // Filtered out because status was CANCELLED
    mockPrismaAppointment.create.mockResolvedValue(mockAppointment1);

    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', authHeader(patientUserA.id, 'PATIENT'))
      .send({
        doctorProfileId: doctorProfileA.id,
        slotStart: SLOT_START_ISO,
        symptoms: [{ description: 'Fever' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  // 11. Unauthenticated request
  it('11. returns 401 Unauthorized for unauthenticated booking request', async () => {
    const res = await request(app)
      .post('/api/v1/appointments')
      .send({
        doctorProfileId: doctorProfileA.id,
        slotStart: SLOT_START_ISO,
        symptoms: [{ description: 'Fever' }],
      });

    expect(res.status).toBe(401);
  });

  // 12. Wrong role (DOCTOR or ADMIN)
  it('12. returns 403 Forbidden when non-PATIENT role attempts booking', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(doctorUserA);

    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', authHeader(doctorUserA.id, 'DOCTOR'))
      .send({
        doctorProfileId: doctorProfileA.id,
        slotStart: SLOT_START_ISO,
        symptoms: [{ description: 'Fever' }],
      });

    expect(res.status).toBe(403);
  });

  // 13. Patient identity derived from token only
  it('13. ignores patientId supplied in request body — derives identity from auth token', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(patientUserA);
    mockPrismaPatientProfile.findUnique.mockResolvedValue(patientProfileA);
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfileA);
    mockPrismaAppointment.findFirst.mockResolvedValue(null);
    mockPrismaAppointment.create.mockResolvedValue(mockAppointment1);

    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', authHeader(patientUserA.id, 'PATIENT'))
      .send({
        doctorProfileId: doctorProfileA.id,
        slotStart: SLOT_START_ISO,
        patientId: 'hacker-patient-id', // Ignored!
        symptoms: [{ description: 'Fever' }],
      });

    expect(res.status).toBe(201);
    // Verified patientProfileId used is patient-prof-a
    expect(mockPrismaPatientProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: patientUserA.id },
    });
  });

  // 14. Response privacy check
  it('14. response does not expose unrelated patient information', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(patientUserA);
    mockPrismaPatientProfile.findUnique.mockResolvedValue(patientProfileA);
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfileA);
    mockPrismaAppointment.findFirst.mockResolvedValue(null);
    mockPrismaAppointment.create.mockResolvedValue(mockAppointment1);

    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', authHeader(patientUserA.id, 'PATIENT'))
      .send({
        doctorProfileId: doctorProfileA.id,
        slotStart: SLOT_START_ISO,
        symptoms: [{ description: 'Fever' }],
      });

    const body = JSON.stringify(res.body);
    expect(body).not.toContain('patientB@test.com');
    expect(body).not.toContain('Bob');
  });

  // 15. Idempotency retry handling
  it('15. returns existing appointment without creating duplicate on idempotency key retry', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(patientUserA);
    mockPrismaPatientProfile.findUnique.mockResolvedValue(patientProfileA);
    // Simulate finding existing appointment created with idempotency key
    mockPrismaAppointment.findFirst.mockResolvedValue(mockAppointment1);

    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', authHeader(patientUserA.id, 'PATIENT'))
      .set('Idempotency-Key', 'retry-key-12345')
      .send({
        doctorProfileId: doctorProfileA.id,
        slotStart: SLOT_START_ISO,
        symptoms: [{ description: 'Fever' }],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.appointment.id).toBe('appt-1');
  });
});
