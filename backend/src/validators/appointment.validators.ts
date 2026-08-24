/**
 * Zod validation schemas for Appointment Booking, Availability Engine,
 * and Status Management.
 */

import { z } from 'zod';
import { SymptomSeverity, AppointmentStatus } from '@prisma/client';

/** Regular expression for YYYY-MM-DD date string */
const DATE_YYYYMMDD_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// ─── 1. Availability Query Schema ───────────────────────────────────────────

export const availabilityQuerySchema = z.object({
  date: z
    .string()
    .regex(DATE_YYYYMMDD_REGEX, 'Date must be in YYYY-MM-DD format'),
});

// ─── 2. Symptom Input Schema ────────────────────────────────────────────────

export const symptomInputSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, 'Symptom description is required')
    .max(500, 'Symptom description must be 500 characters or fewer'),

  severity: z
    .nativeEnum(SymptomSeverity, {
      errorMap: () => ({ message: 'Severity must be MILD, MODERATE, or SEVERE' }),
    })
    .default(SymptomSeverity.MILD),

  durationDays: z
    .number()
    .int('Duration must be an integer')
    .min(1, 'Duration must be at least 1 day')
    .max(365, 'Duration must be 365 days or fewer')
    .optional()
    .nullable(),

  notes: z
    .string()
    .trim()
    .max(1000, 'Notes must be 1000 characters or fewer')
    .optional()
    .nullable(),
});

// ─── 3. Book Appointment Schema ─────────────────────────────────────────────

export const bookAppointmentSchema = z.object({
  doctorProfileId: z
    .string()
    .min(1, 'Doctor profile ID is required'),

  slotStart: z
    .string()
    .datetime({ message: 'slotStart must be a valid ISO 8601 date-time string' }),

  reasonForVisit: z
    .string()
    .trim()
    .max(500, 'Reason for visit must be 500 characters or fewer')
    .optional()
    .nullable(),

  symptoms: z
    .array(symptomInputSchema)
    .min(1, 'At least one symptom must be provided during booking'),

  idempotencyKey: z
    .string()
    .trim()
    .max(100, 'Idempotency key must be 100 characters or fewer')
    .optional()
    .nullable(),
});

// ─── 4. Cancel Appointment Schema ───────────────────────────────────────────

export const cancelAppointmentSchema = z.object({
  cancellationReason: z
    .string()
    .trim()
    .max(500, 'Cancellation reason must be 500 characters or fewer')
    .optional()
    .nullable(),
});

// ─── 5. Update Status Schema ────────────────────────────────────────────────

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(
    [
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.COMPLETED,
      AppointmentStatus.NO_SHOW,
    ],
    {
      errorMap: () => ({
        message: 'Status must be CONFIRMED, COMPLETED, or NO_SHOW',
      }),
    },
  ),
});

// ─── 6. Clinical Notes Schema ──────────────────────────────────────────────────

export const clinicalNoteSchema = z.object({
  subjective: z.string().trim().max(3000, 'Subjective notes must be 3000 characters or fewer').optional().nullable(),
  objective: z.string().trim().max(3000, 'Objective notes must be 3000 characters or fewer').optional().nullable(),
  assessment: z.string().trim().max(3000, 'Assessment notes must be 3000 characters or fewer').optional().nullable(),
  plan: z.string().trim().max(3000, 'Plan notes must be 3000 characters or fewer').optional().nullable(),
  additionalNotes: z.string().trim().max(3000, 'Additional notes must be 3000 characters or fewer').optional().nullable(),
  completeVisit: z.boolean().optional().default(false),
});

export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;
export type SymptomInput = z.infer<typeof symptomInputSchema>;
export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
export type ClinicalNoteInput = z.infer<typeof clinicalNoteSchema>;
