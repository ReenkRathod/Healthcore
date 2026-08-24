import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app';
import type { Role } from '@prisma/client';
import { generateSummaryForAppointment } from '../services/ai/preVisitSummary.service';

// ── Mock Data ─────────────────────────────────────────────────────────────────

const patientUserA = { id: 'patient-user-a', email: 'patientA@test.com', role: 'PATIENT' as Role, isActive: true };
const patientProfileA = { id: 'patient-prof-a', userId: 'patient-user-a', user: patientUserA };

const patientUserB = { id: 'patient-user-b', email: 'patientB@test.com', role: 'PATIENT' as Role, isActive: true };

const doctorUserA = { id: 'doctor-user-a', email: 'doctorA@test.com', role: 'DOCTOR' as Role, isActive: true };
const doctorProfileA = { id: 'doctor-prof-a', userId: 'doctor-user-a', user: doctorUserA };

const doctorUserB = { id: 'doctor-user-b', email: 'doctorB@test.com', role: 'DOCTOR' as Role, isActive: true };

const mockAppointment1 = {
  id: 'appt-1',
  patientProfileId: 'patient-prof-a',
  doctorProfileId: 'doctor-prof-a',
  slotStart: new Date(),
  slotEnd: new Date(),
  status: 'CONFIRMED',
  symptoms: [
    { id: 'sym-1', description: 'Headache', severity: 'MILD', durationDays: 2 },
  ],
  patient: patientProfileA,
  doctor: doctorProfileA,
};

const mockAppointmentNoSymptoms = {
  ...mockAppointment1,
  id: 'appt-no-sym',
  symptoms: [],
};

// ── Prisma Mocks ─────────────────────────────────────────────────────────────

const mockPrismaUser = { findUnique: jest.fn() };
const mockPrismaAppointment = { findUnique: jest.fn() };
const mockPrismaPreVisitSummary = { findUnique: jest.fn(), upsert: jest.fn() };

jest.mock('../db/client', () => {
  return {
    prisma: {
      user: { findUnique: (...args: any[]) => mockPrismaUser.findUnique(...args) },
      appointment: { findUnique: (...args: any[]) => mockPrismaAppointment.findUnique(...args) },
      preVisitSummary: { 
        findUnique: (...args: any[]) => mockPrismaPreVisitSummary.findUnique(...args), 
        upsert: (...args: any[]) => mockPrismaPreVisitSummary.upsert(...args) 
      },
    },
  };
});

// Mock config
jest.mock('../config', () => {
  const original = jest.requireActual('../config');
  return {
    ...original,
    config: {
      ...original.config,
      OPENAI_API_KEY: 'test-key',
      OPENAI_MODEL: 'gpt-4o-mini',
      LOG_LEVEL: 'fatal'
    }
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

describe('Pre-Visit AI Summary Service & Endpoints', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('Service: generateSummaryForAppointment', () => {
    it('successfully generates AI summary', async () => {
      mockPrismaAppointment.findUnique.mockResolvedValue(mockAppointment1);
      mockPrismaPreVisitSummary.upsert.mockResolvedValue({});

      const mockAiResponse = {
        urgency: 'LOW',
        chiefComplaint: 'Mild headache',
        suggestedQuestions: ['Q1', 'Q2', 'Q3']
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockAiResponse) } }]
        })
      });

      const result = await generateSummaryForAppointment('appt-1');

      expect(result.status).toBe('SUCCESS');
      if (result.status === 'SUCCESS') {
        expect(result.data.urgency).toBe('LOW');
        expect(result.data.suggestedQuestions).toHaveLength(3);
      }
      expect(mockPrismaPreVisitSummary.upsert).toHaveBeenCalled();
    });

    it('rejects invalid AI output (e.g. 4 questions)', async () => {
      mockPrismaAppointment.findUnique.mockResolvedValue(mockAppointment1);
      mockPrismaPreVisitSummary.upsert.mockResolvedValue({});

      const mockInvalidAiResponse = {
        urgency: 'LOW',
        chiefComplaint: 'Mild headache',
        suggestedQuestions: ['Q1', 'Q2', 'Q3', 'Q4'] // Invalid: needs exactly 3
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockInvalidAiResponse) } }]
        })
      });

      const result = await generateSummaryForAppointment('appt-1');

      expect(result.status).toBe('FAILED');
      if (result.status === 'FAILED') {
        expect(result.error).toContain('Exactly 3 suggested questions');
      }
    });

    it('handles missing symptoms safely', async () => {
      mockPrismaAppointment.findUnique.mockResolvedValue(mockAppointmentNoSymptoms);
      mockPrismaPreVisitSummary.upsert.mockResolvedValue({});

      const result = await generateSummaryForAppointment('appt-no-sym');

      expect(result.status).toBe('FAILED');
      if (result.status === 'FAILED') {
        expect(result.error).toBe('No symptoms provided');
      }
      // AI should NOT be called
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('LLM failure does not invalidate appointment, handled safely', async () => {
      mockPrismaAppointment.findUnique.mockResolvedValue(mockAppointment1);
      mockPrismaPreVisitSummary.upsert.mockResolvedValue({});

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      });

      const result = await generateSummaryForAppointment('appt-1');

      expect(result.status).toBe('FAILED');
      if (result.status === 'FAILED') {
        expect(result.error).toContain('OpenAI API error');
      }
    });
  });

  describe('Endpoints', () => {
    it('POST /generate returns 202 Accepted and triggers generation', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(doctorUserA);
      mockPrismaAppointment.findUnique.mockResolvedValue(mockAppointment1);

      const res = await request(app)
        .post(`/api/v1/appointments/${mockAppointment1.id}/pre-visit-summary/generate`)
        .set('Authorization', authHeader(doctorUserA.id, 'DOCTOR'));

      expect(res.status).toBe(202);
      expect(res.body.message).toContain('started');
    });

    it('unauthorized doctor B cannot GET doctor A summary', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(doctorUserB);
      mockPrismaAppointment.findUnique.mockResolvedValue(mockAppointment1);

      const res = await request(app)
        .get(`/api/v1/appointments/${mockAppointment1.id}/pre-visit-summary`)
        .set('Authorization', authHeader(doctorUserB.id, 'DOCTOR'));

      expect(res.status).toBe(403);
    });

    it('patient B cannot GET patient A summary', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(patientUserB);
      mockPrismaAppointment.findUnique.mockResolvedValue(mockAppointment1);

      const res = await request(app)
        .get(`/api/v1/appointments/${mockAppointment1.id}/pre-visit-summary`)
        .set('Authorization', authHeader(patientUserB.id, 'PATIENT'));

      expect(res.status).toBe(403);
    });
  });
});
