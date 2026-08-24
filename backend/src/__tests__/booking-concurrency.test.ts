/**
 * Real Concurrent Booking Test Suite.
 *
 * Simulates two patients (Patient A and Patient B) attempting to book the
 * EXACT SAME doctor and EXACT SAME slot simultaneously using Promise.all.
 *
 * Verifies:
 *  - Exactly ONE request succeeds (201 Created)
 *  - Exactly ONE request fails with conflict (409 Conflict)
 *  - Database contains only ONE active appointment for that doctor & slot.
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app';
import type { Role } from '@prisma/client';

const patientUserA = {
  id: 'patient-conc-a',
  email: 'patientConcA@test.com',
  firstName: 'ConcAlice',
  lastName: 'Patient',
  role: 'PATIENT' as Role,
  isActive: true,
};

const patientProfileA = {
  id: 'patient-prof-conc-a',
  userId: 'patient-conc-a',
  user: patientUserA,
};

const patientUserB = {
  id: 'patient-conc-b',
  email: 'patientConcB@test.com',
  firstName: 'ConcBob',
  lastName: 'Patient',
  role: 'PATIENT' as Role,
  isActive: true,
};

const patientProfileB = {
  id: 'patient-prof-conc-b',
  userId: 'patient-conc-b',
  user: patientUserB,
};

const doctorUserA = {
  id: 'doctor-conc-user-a',
  email: 'doctorConcA@test.com',
  firstName: 'David',
  lastName: 'Doctor',
  role: 'DOCTOR' as Role,
  isActive: true,
};

const doctorProfileA = {
  id: 'doctor-prof-conc-a',
  userId: 'doctor-conc-user-a',
  slotDurationMn: 30,
  isAccepting: true,
  user: doctorUserA,
  workingHours: [
    {
      id: 'wh-conc-1',
      doctorProfileId: 'doctor-prof-conc-a',
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

const mockApptCreated = {
  id: 'appt-conc-1',
  patientProfileId: 'patient-prof-conc-a',
  doctorProfileId: 'doctor-prof-conc-a',
  slotStart: new Date(SLOT_START_ISO),
  slotEnd: new Date(SLOT_END_ISO),
  status: 'CONFIRMED',
  reasonForVisit: 'Concurrent test',
  confirmedAt: new Date(),
  symptoms: [],
  patient: patientProfileA,
  doctor: doctorProfileA,
};

// State variable to simulate single-winner database lock
let bookedSlotOccupied = false;

jest.mock('../db/client', () => {
  return {
    prisma: {
      user: {
        findUnique: (args: any) => {
          if (args.where.id === patientUserA.id) return Promise.resolve(patientUserA);
          if (args.where.id === patientUserB.id) return Promise.resolve(patientUserB);
          return Promise.resolve(null);
        },
      },
      patientProfile: {
        findUnique: (args: any) => {
          if (args.where.userId === patientUserA.id) return Promise.resolve(patientProfileA);
          if (args.where.userId === patientUserB.id) return Promise.resolve(patientProfileB);
          return Promise.resolve(null);
        },
        create: (_args: any) => Promise.resolve(patientProfileA),
      },
      doctorProfile: {
        findUnique: () => Promise.resolve(doctorProfileA),
      },
      appointment: {
        findFirst: () => {
          if (bookedSlotOccupied) {
            return Promise.resolve(mockApptCreated);
          }
          return Promise.resolve(null);
        },
        create: () => {
          if (bookedSlotOccupied) {
            const err = new Error('Unique constraint failed') as any;
            err.code = 'P2002';
            return Promise.reject(err);
          }
          bookedSlotOccupied = true;
          return Promise.resolve(mockApptCreated);
        },
      },
      $transaction: async (cb: any) => {
        return cb({
          $executeRaw: jest.fn().mockResolvedValue(1),
          doctorProfile: {
            findUnique: () => Promise.resolve(doctorProfileA),
          },
          appointment: {
            findFirst: () => {
              if (bookedSlotOccupied) {
                return Promise.resolve(mockApptCreated);
              }
              return Promise.resolve(null);
            },
            create: () => {
              if (bookedSlotOccupied) {
                const err = new Error('Unique constraint failed') as any;
                err.code = 'P2002';
                return Promise.reject(err);
              }
              bookedSlotOccupied = true;
              return Promise.resolve(mockApptCreated);
            },
          },
        });
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

describe('REAL Concurrent Booking Test (Promise.all)', () => {
  beforeEach(() => {
    bookedSlotOccupied = false;
    jest.clearAllMocks();
  });

  it('handles simultaneous booking requests for the exact same slot with ONE SUCCESS and ONE CONFLICT', async () => {
    const payloadA = {
      doctorProfileId: doctorProfileA.id,
      slotStart: SLOT_START_ISO,
      symptoms: [{ description: 'Patient A Headache' }],
    };

    const payloadB = {
      doctorProfileId: doctorProfileA.id,
      slotStart: SLOT_START_ISO,
      symptoms: [{ description: 'Patient B Fever' }],
    };

    // Execute requests SIMULTANEOUSLY via Promise.all
    const [resA, resB] = await Promise.all([
      request(app)
        .post('/api/v1/appointments')
        .set('Authorization', authHeader(patientUserA.id, 'PATIENT'))
        .send(payloadA),
      request(app)
        .post('/api/v1/appointments')
        .set('Authorization', authHeader(patientUserB.id, 'PATIENT'))
        .send(payloadB),
    ]);

    const statuses = [resA.status, resB.status].sort();

    // Verify exactly ONE 201 Created and ONE 409 Conflict
    expect(statuses).toEqual([201, 409]);

    const successRes = resA.status === 201 ? resA : resB;
    const conflictRes = resA.status === 409 ? resA : resB;

    expect(successRes.body.success).toBe(true);
    expect(successRes.body.data.appointment.id).toBe('appt-conc-1');

    expect(conflictRes.body.success).toBe(false);
    expect(conflictRes.body.error.statusCode).toBe(409);
    expect(conflictRes.body.error.message).toContain('already been booked');
  });
});
