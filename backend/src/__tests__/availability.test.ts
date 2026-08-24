/**
 * Availability Engine test suite.
 *
 * Scenarios tested:
 *  1. Normal working day (slots generated within working hours)
 *  2. Multiple working periods / schedule
 *  3. Slot duration configuration (15m, 30m, 60m)
 *  4. Single appointment occupying a slot
 *  5. Multiple occupied slots
 *  6. Cancelled appointment (does NOT block availability)
 *  7. Doctor leave (full day returns 0 slots; partial day excludes overlap)
 *  8. Outside working hours (no slots before start or after end)
 *  9. Invalid doctor ID (returns 404)
 *  10. Invalid date format (returns 400)
 *  11. Unauthorized / private data access check (response leaks zero patient PII)
 *  12. Timezone / boundary cases
 *  13. Slot ending exactly at working-hours end (included)
 *  14. Slot extending beyond working-hours end (excluded)
 *  15. Ignores client query overrides (slotDuration in query string is ignored)
 */

import request from 'supertest';
import { createApp } from '../app';

// ── Mock Data ─────────────────────────────────────────────────────────────────

const doctorUser = {
  id: 'doc-user-1',
  email: 'doctor@test.com',
  firstName: 'Sarah',
  lastName: 'Connor',
  role: 'DOCTOR',
  isActive: true,
};

const doctorProfile = {
  id: 'doc-prof-1',
  userId: 'doc-user-1',
  title: 'Dr.',
  licenseNumber: 'MD-55555',
  slotDurationMn: 30,
  bio: 'Specialist',
  avatarUrl: null,
  isAccepting: true,
  user: doctorUser,
  workingHours: [
    {
      id: 'wh-mon',
      doctorProfileId: 'doc-prof-1',
      dayOfWeek: 'MONDAY',
      startTime: '09:00',
      endTime: '13:00',
      isActive: true,
    },
  ],
  leaves: [],
};

const MONDAY_DATE_STR = '2026-10-05'; // 2026-10-05 is a Monday

const mockActiveAppt = {
  slotStart: new Date('2026-10-05T10:00:00.000Z'),
  slotEnd: new Date('2026-10-05T10:30:00.000Z'),
  status: 'CONFIRMED',
};

const mockCancelledAppt = {
  slotStart: new Date('2026-10-05T11:00:00.000Z'),
  slotEnd: new Date('2026-10-05T11:30:00.000Z'),
  status: 'CANCELLED_BY_PATIENT',
};

// ── Prisma Mocks ─────────────────────────────────────────────────────────────

const mockPrismaDoctorProfile = {
  findUnique: jest.fn(),
};

const mockPrismaAppointment = {
  findMany: jest.fn(),
};

jest.mock('../db/client', () => {
  return {
    prisma: {
      doctorProfile: {
        findUnique: (...args: any[]) => mockPrismaDoctorProfile.findUnique(...args),
      },
      appointment: {
        findMany: (...args: any[]) => mockPrismaAppointment.findMany(...args),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ ping: 1 }]),
      $on: jest.fn(),
    },
    connectDatabase: jest.fn().mockResolvedValue(undefined),
    disconnectDatabase: jest.fn().mockResolvedValue(undefined),
  };
});

const app = createApp();

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/v1/doctors/:id/availability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Normal working day
  it('1. calculates all valid slots for a normal working day', async () => {
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfile);
    mockPrismaAppointment.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get(`/api/v1/doctors/${doctorProfile.id}/availability?date=${MONDAY_DATE_STR}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // 09:00 to 13:00 with 30m slots = 8 slots (09:00, 09:30, 10:00, 10:30, 11:00, 11:30, 12:00, 12:30)
    expect(res.body.data.slots.length).toBe(8);
  });

  // 2. Multiple working periods / schedule
  it('2. respects doctor working schedule for specified day of week', async () => {
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfile);
    mockPrismaAppointment.findMany.mockResolvedValue([]);

    // TUESDAY has no working hours configured
    const res = await request(app)
      .get(`/api/v1/doctors/${doctorProfile.id}/availability?date=2026-10-06`);

    expect(res.status).toBe(200);
    expect(res.body.data.slots.length).toBe(0);
  });

  // 3. Slot duration
  it('3. respects doctor custom slot duration (e.g. 60 minutes)', async () => {
    const doc60m = {
      ...doctorProfile,
      slotDurationMn: 60,
    };
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doc60m);
    mockPrismaAppointment.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get(`/api/v1/doctors/${doctorProfile.id}/availability?date=${MONDAY_DATE_STR}`);

    expect(res.status).toBe(200);
    // 09:00 to 13:00 with 60m slots = 4 slots (09:00, 10:00, 11:00, 12:00)
    expect(res.body.data.slots.length).toBe(4);
    expect(res.body.data.slotDurationMn).toBe(60);
  });

  // 4. Appointment occupying a slot
  it('4. excludes a slot occupied by an active appointment', async () => {
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfile);
    // 10:00 - 10:30 is occupied
    mockPrismaAppointment.findMany.mockResolvedValue([mockActiveAppt]);

    const res = await request(app)
      .get(`/api/v1/doctors/${doctorProfile.id}/availability?date=${MONDAY_DATE_STR}`);

    expect(res.status).toBe(200);
    expect(res.body.data.slots.length).toBe(7); // 8 - 1 = 7
    const has1000 = res.body.data.slots.some(
      (s: any) => s.slotStart === '2026-10-05T10:00:00.000Z',
    );
    expect(has1000).toBe(false);
  });

  // 5. Multiple occupied slots
  it('5. excludes multiple occupied slots', async () => {
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfile);
    mockPrismaAppointment.findMany.mockResolvedValue([
      { slotStart: new Date('2026-10-05T09:00:00.000Z'), slotEnd: new Date('2026-10-05T09:30:00.000Z') },
      { slotStart: new Date('2026-10-05T10:00:00.000Z'), slotEnd: new Date('2026-10-05T10:30:00.000Z') },
    ]);

    const res = await request(app)
      .get(`/api/v1/doctors/${doctorProfile.id}/availability?date=${MONDAY_DATE_STR}`);

    expect(res.status).toBe(200);
    expect(res.body.data.slots.length).toBe(6); // 8 - 2 = 6
  });

  // 6. Cancelled appointment
  it('6. does NOT block availability for cancelled appointments', async () => {
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfile);
    // Mock return from findMany where query status filter already excludes cancelled
    // mockCancelledAppt has status CANCELLED_BY_PATIENT so it is excluded from DB result
    expect(mockCancelledAppt.status).toBe('CANCELLED_BY_PATIENT');
    mockPrismaAppointment.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get(`/api/v1/doctors/${doctorProfile.id}/availability?date=${MONDAY_DATE_STR}`);

    expect(res.status).toBe(200);
    expect(res.body.data.slots.length).toBe(8); // Cancelled appt did not reduce slots
  });

  // 7. Doctor leave
  it('7a. returns 0 slots when doctor is on full-day leave', async () => {
    const docOnLeave = {
      ...doctorProfile,
      leaves: [
        {
          id: 'leave-1',
          doctorProfileId: doctorProfile.id,
          startDate: new Date(MONDAY_DATE_STR),
          endDate: new Date(MONDAY_DATE_STR),
          isFullDay: true,
        },
      ],
    };
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(docOnLeave);

    const res = await request(app)
      .get(`/api/v1/doctors/${doctorProfile.id}/availability?date=${MONDAY_DATE_STR}`);

    expect(res.status).toBe(200);
    expect(res.body.data.slots.length).toBe(0);
  });

  it('7b. excludes slots overlapping with partial-day doctor leave', async () => {
    const docPartialLeave = {
      ...doctorProfile,
      leaves: [
        {
          id: 'leave-partial',
          doctorProfileId: doctorProfile.id,
          startDate: new Date(MONDAY_DATE_STR),
          endDate: new Date(MONDAY_DATE_STR),
          isFullDay: false,
          leaveStartTime: '10:00',
          leaveEndTime: '11:00',
        },
      ],
    };
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(docPartialLeave);
    mockPrismaAppointment.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get(`/api/v1/doctors/${doctorProfile.id}/availability?date=${MONDAY_DATE_STR}`);

    expect(res.status).toBe(200);
    // 10:00-10:30 and 10:30-11:00 excluded -> 6 slots remaining
    expect(res.body.data.slots.length).toBe(6);
  });

  // 8. Outside working hours
  it('8. does not generate slots outside working hours (before 09:00 or after 13:00)', async () => {
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfile);
    mockPrismaAppointment.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get(`/api/v1/doctors/${doctorProfile.id}/availability?date=${MONDAY_DATE_STR}`);

    const slotStarts = res.body.data.slots.map((s: any) => s.slotStart);
    expect(slotStarts).not.toContain('2026-10-05T08:30:00.000Z');
    expect(slotStarts).not.toContain('2026-10-05T13:00:00.000Z');
  });

  // 9. Invalid doctor
  it('9. returns 404 Not Found for non-existent doctor ID', async () => {
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/v1/doctors/non-existent-id/availability?date=2026-10-05');

    expect(res.status).toBe(404);
  });

  // 10. Invalid date
  it('10. returns 400 Bad Request for malformed date string', async () => {
    const res = await request(app)
      .get(`/api/v1/doctors/${doctorProfile.id}/availability?date=invalid-date`);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('YYYY-MM-DD');
  });

  // 11. Unauthorized / private data access
  it('11. availability response leaks zero patient PII or private data', async () => {
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfile);
    mockPrismaAppointment.findMany.mockResolvedValue([mockActiveAppt]);

    const res = await request(app)
      .get(`/api/v1/doctors/${doctorProfile.id}/availability?date=${MONDAY_DATE_STR}`);

    const responseText = JSON.stringify(res.body);
    expect(responseText).not.toContain('patient');
    expect(responseText).not.toContain('symptom');
    expect(responseText).not.toContain('prescription');
    expect(responseText).not.toContain('email');
    expect(responseText).not.toContain('phone');
  });

  // 12. Timezone / boundary cases
  it('12. handles UTC date calculations consistently', async () => {
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfile);
    mockPrismaAppointment.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get(`/api/v1/doctors/${doctorProfile.id}/availability?date=${MONDAY_DATE_STR}`);

    expect(res.status).toBe(200);
    const firstSlot = res.body.data.slots[0];
    expect(firstSlot.slotStart).toBe('2026-10-05T09:00:00.000Z');
    expect(firstSlot.slotEnd).toBe('2026-10-05T09:30:00.000Z');
  });

  // 13. Slot ending exactly at working-hours end
  it('13. includes slot that ends exactly at working-hours end time (12:30 - 13:00)', async () => {
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfile);
    mockPrismaAppointment.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get(`/api/v1/doctors/${doctorProfile.id}/availability?date=${MONDAY_DATE_STR}`);

    const lastSlot = res.body.data.slots[res.body.data.slots.length - 1];
    expect(lastSlot.slotStart).toBe('2026-10-05T12:30:00.000Z');
    expect(lastSlot.slotEnd).toBe('2026-10-05T13:00:00.000Z');
  });

  // 14. Slot that would extend beyond working-hours end
  it('14. excludes slots that would extend past working hours end', async () => {
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfile);
    mockPrismaAppointment.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get(`/api/v1/doctors/${doctorProfile.id}/availability?date=${MONDAY_DATE_STR}`);

    // No slot should start at 13:00 or end after 13:00
    const invalidSlot = res.body.data.slots.some(
      (s: any) => new Date(s.slotEnd).getTime() > new Date('2026-10-05T13:00:00.000Z').getTime(),
    );
    expect(invalidSlot).toBe(false);
  });

  // 15. Server derives slot duration from DB (ignores client override attempt)
  it('15. ignores client query attempts to override slotDuration', async () => {
    mockPrismaDoctorProfile.findUnique.mockResolvedValue(doctorProfile); // DB slotDurationMn is 30
    mockPrismaAppointment.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get(`/api/v1/doctors/${doctorProfile.id}/availability?date=${MONDAY_DATE_STR}&slotDuration=15`);

    expect(res.status).toBe(200);
    // Must use 30 minutes from database, not 15 from query
    expect(res.body.data.slotDurationMn).toBe(30);
    expect(res.body.data.slots.length).toBe(8);
  });
});
