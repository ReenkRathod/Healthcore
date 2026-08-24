import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app';
import type { Role, AppointmentStatus } from '@prisma/client';

// ── Mock Data ─────────────────────────────────────────────────────────────────

const patientUserA = { id: 'patient-user-a', email: 'patientA@test.com', role: 'PATIENT' as Role, isActive: true };
const patientProfileA = { id: 'patient-prof-a', userId: 'patient-user-a', user: patientUserA };

const doctorUserA = { id: 'doctor-user-a', email: 'doctorA@test.com', role: 'DOCTOR' as Role, isActive: true };
const doctorProfileA = { id: 'doctor-prof-a', userId: 'doctor-user-a', user: doctorUserA };

const doctorUserB = { id: 'doctor-user-b', email: 'doctorB@test.com', role: 'DOCTOR' as Role, isActive: true };
const doctorProfileB = { id: 'doctor-prof-b', userId: 'doctor-user-b', user: doctorUserB };

const mockAppointmentConfirmed = {
  id: 'appt-confirmed',
  patientProfileId: 'patient-prof-a',
  doctorProfileId: 'doctor-prof-a',
  slotStart: new Date(),
  slotEnd: new Date(),
  status: 'CONFIRMED' as AppointmentStatus,
  patient: patientProfileA,
  doctor: doctorProfileA,
};

const mockAppointmentDoctorB = {
  id: 'appt-doctor-b',
  patientProfileId: 'patient-prof-a',
  doctorProfileId: 'doctor-prof-b',
  slotStart: new Date(),
  slotEnd: new Date(),
  status: 'CONFIRMED' as AppointmentStatus,
  patient: patientProfileA,
  doctor: doctorProfileB,
};

const mockAppointmentCancelled = {
  ...mockAppointmentConfirmed,
  id: 'appt-cancelled',
  status: 'CANCELLED_BY_PATIENT' as AppointmentStatus,
};

// ── Prisma Mocks ─────────────────────────────────────────────────────────────

const mockPrismaUser = { findUnique: jest.fn() };
const mockPrismaAppointment = { findUnique: jest.fn(), update: jest.fn() };
const mockPrismaPostVisitNote = { findUnique: jest.fn(), upsert: jest.fn() };

jest.mock('../db/client', () => {
  return {
    prisma: {
      user: { findUnique: (...args: any[]) => mockPrismaUser.findUnique(...args) },
      appointment: { 
        findUnique: (...args: any[]) => mockPrismaAppointment.findUnique(...args),
        update: (...args: any[]) => mockPrismaAppointment.update(...args)
      },
      postVisitNote: { 
        findUnique: (...args: any[]) => mockPrismaPostVisitNote.findUnique(...args), 
        upsert: (...args: any[]) => mockPrismaPostVisitNote.upsert(...args) 
      },
      $transaction: async (cb: any) => {
        if (typeof cb === 'function') {
          return cb({
            appointment: mockPrismaAppointment,
            postVisitNote: mockPrismaPostVisitNote,
          });
        }
        return Promise.all(cb);
      },
    },
  };
});

const app = createApp();
const ACCESS_SECRET = process.env['JWT_ACCESS_SECRET'] || 'test-secret';

function authHeader(userId: string, role: Role): string {
  const token = jwt.sign({ sub: userId, role }, ACCESS_SECRET, { expiresIn: '15m' });
  return `Bearer ${token}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITES
// ─────────────────────────────────────────────────────────────────────────────

describe('Doctor Clinical/SOAP Notes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/appointments/:id/clinical-notes', () => {
    it('successfully saves draft notes without completing the appointment', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(doctorUserA);
      mockPrismaAppointment.findUnique.mockResolvedValue(mockAppointmentConfirmed);
      mockPrismaPostVisitNote.upsert.mockResolvedValue({ id: 'note-1', subjective: 'Patient reports mild pain' });

      const payload = {
        subjective: 'Patient reports mild pain',
        completeVisit: false,
      };

      const res = await request(app)
        .post(`/api/v1/appointments/${mockAppointmentConfirmed.id}/clinical-notes`)
        .set('Authorization', authHeader(doctorUserA.id, 'DOCTOR'))
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrismaPostVisitNote.upsert).toHaveBeenCalled();
      expect(mockPrismaAppointment.update).not.toHaveBeenCalled(); // completeVisit is false
    });

    it('saves notes and completes the visit transactionally when completeVisit is true', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(doctorUserA);
      mockPrismaAppointment.findUnique.mockResolvedValue(mockAppointmentConfirmed);
      mockPrismaPostVisitNote.upsert.mockResolvedValue({ id: 'note-1' });
      mockPrismaAppointment.update.mockResolvedValue({ ...mockAppointmentConfirmed, status: 'COMPLETED' });

      const payload = {
        subjective: 'Pain',
        objective: 'Normal vitals',
        completeVisit: true,
      };

      const res = await request(app)
        .post(`/api/v1/appointments/${mockAppointmentConfirmed.id}/clinical-notes`)
        .set('Authorization', authHeader(doctorUserA.id, 'DOCTOR'))
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrismaPostVisitNote.upsert).toHaveBeenCalled();
      expect(mockPrismaAppointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'COMPLETED' })
        })
      );
    });

    it('rejects notes for cancelled appointments', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(doctorUserA);
      mockPrismaAppointment.findUnique.mockResolvedValue(mockAppointmentCancelled);

      const res = await request(app)
        .post(`/api/v1/appointments/${mockAppointmentCancelled.id}/clinical-notes`)
        .set('Authorization', authHeader(doctorUserA.id, 'DOCTOR'))
        .send({ subjective: 'test' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Cannot modify clinical notes');
    });

    it('IDOR: prevents Doctor A from writing notes for Doctor B appointment', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(doctorUserA);
      mockPrismaAppointment.findUnique.mockResolvedValue(mockAppointmentDoctorB); // Owned by B

      const res = await request(app)
        .post(`/api/v1/appointments/${mockAppointmentDoctorB.id}/clinical-notes`)
        .set('Authorization', authHeader(doctorUserA.id, 'DOCTOR')) // Doctor A requests
        .send({ subjective: 'test' });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('another doctor');
    });

    it('prevents PATIENT from creating clinical notes', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(patientUserA);

      const res = await request(app)
        .post(`/api/v1/appointments/${mockAppointmentConfirmed.id}/clinical-notes`)
        .set('Authorization', authHeader(patientUserA.id, 'PATIENT'))
        .send({ subjective: 'test' });

      expect(res.status).toBe(403); // Middleware blocks non-doctors
    });
  });

  describe('GET /api/v1/appointments/:id/clinical-notes', () => {
    it('returns clinical notes for authorized doctor', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(doctorUserA);
      mockPrismaAppointment.findUnique.mockResolvedValue(mockAppointmentConfirmed);
      mockPrismaPostVisitNote.findUnique.mockResolvedValue({ id: 'note-1', subjective: 'test' });

      const res = await request(app)
        .get(`/api/v1/appointments/${mockAppointmentConfirmed.id}/clinical-notes`)
        .set('Authorization', authHeader(doctorUserA.id, 'DOCTOR'));

      expect(res.status).toBe(200);
      expect(res.body.data.note.subjective).toBe('test');
    });

    it('IDOR: prevents Doctor A from reading Doctor B notes', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(doctorUserA);
      mockPrismaAppointment.findUnique.mockResolvedValue(mockAppointmentDoctorB);

      const res = await request(app)
        .get(`/api/v1/appointments/${mockAppointmentDoctorB.id}/clinical-notes`)
        .set('Authorization', authHeader(doctorUserA.id, 'DOCTOR'));

      expect(res.status).toBe(403);
    });
  });
});
