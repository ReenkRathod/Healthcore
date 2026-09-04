/**
 * Zod validation schemas for Doctor Management & Availability Configuration.
 *
 * Enforces strict validation on:
 *  - Doctor profile creation & updates
 *  - Time string formats ("HH:MM") and order (startTime < endTime)
 *  - Date ranges (startDate <= endDate)
 *  - Slot durations (standard intervals)
 *  - Specialisations
 */

import { z } from 'zod';
import { DayOfWeek } from '@prisma/client';

/** Regular expression for 24-hour wall-clock time string "HH:MM" */
const TIME_HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Regular expression for YYYY-MM-DD date string */
const DATE_YYYYMMDD_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** Allowed slot durations in minutes */
export const ALLOWED_SLOT_DURATIONS = [10, 15, 20, 30, 45, 60] as const;

// ─── Specialisation Schema ───────────────────────────────────────────────────

export const specialisationInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Specialisation name is required')
    .max(100, 'Specialisation name must be 100 characters or fewer'),
  subSpeciality: z
    .string()
    .trim()
    .max(100, 'Sub-speciality must be 100 characters or fewer')
    .optional()
    .nullable(),
  isPrimary: z.boolean().default(false),
});

// ─── Doctor Creation Schema ─────────────────────────────────────────────────

export const createDoctorSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one digit'),

  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(100, 'First name must be 100 characters or fewer'),

  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be 100 characters or fewer'),

  phone: z
    .string()
    .trim()
    .min(7, 'Phone number must be at least 7 characters')
    .max(20, 'Phone number must be 20 characters or fewer')
    .optional()
    .nullable(),

  licenseNumber: z
    .string()
    .trim()
    .min(1, 'Medical license number is required')
    .max(100, 'License number must be 100 characters or fewer'),

  title: z
    .string()
    .trim()
    .max(20, 'Title must be 20 characters or fewer')
    .optional()
    .nullable(),

  slotDurationMn: z
    .number()
    .int('Slot duration must be an integer')
    .refine(
      (val) => (ALLOWED_SLOT_DURATIONS as readonly number[]).includes(val),
      {
        message: `Slot duration must be one of: ${ALLOWED_SLOT_DURATIONS.join(', ')} minutes`,
      },
    )
    .default(30),

  consultationFee: z.number().min(0, 'Consultation fee must be non-negative').optional().default(50.0),

  bio: z.string().trim().max(2000, 'Bio must be 2000 characters or fewer').optional().nullable(),

  avatarUrl: z.string().trim().url('Invalid avatar URL').optional().nullable(),

  specialisations: z.array(specialisationInputSchema).optional().default([]),
});

// ─── Doctor Update Schema ───────────────────────────────────────────────────

export const updateDoctorSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().min(7).max(20).optional().nullable(),
  title: z.string().trim().max(20).optional().nullable(),
  licenseNumber: z.string().trim().min(1).max(100).optional(),
  slotDurationMn: z
    .number()
    .int()
    .refine(
      (val) => (ALLOWED_SLOT_DURATIONS as readonly number[]).includes(val),
      {
        message: `Slot duration must be one of: ${ALLOWED_SLOT_DURATIONS.join(', ')} minutes`,
      },
    )
    .optional(),
  consultationFee: z.number().min(0).optional(),
  bio: z.string().trim().max(2000).optional().nullable(),
  avatarUrl: z.string().trim().url().optional().nullable(),
  isAccepting: z.boolean().optional(),
});

// ─── Doctor Status Schema ───────────────────────────────────────────────────

export const doctorStatusSchema = z.object({
  isActive: z.boolean().optional(),
  isAccepting: z.boolean().optional(),
});

// ─── Working Hours Schemas ──────────────────────────────────────────────────

export const workingHourItemSchema = z
  .object({
    dayOfWeek: z.nativeEnum(DayOfWeek, {
      errorMap: () => ({ message: 'Invalid day of week' }),
    }),
    startTime: z
      .string()
      .regex(TIME_HHMM_REGEX, 'Start time must be in HH:MM format (24-hour)'),
    endTime: z
      .string()
      .regex(TIME_HHMM_REGEX, 'End time must be in HH:MM format (24-hour)'),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => {
      // Validate startTime < endTime
      return data.startTime < data.endTime;
    },
    {
      message: 'Start time must be strictly before end time',
      path: ['startTime'],
    },
  );

export const setWorkingHoursSchema = z.object({
  workingHours: z
    .array(workingHourItemSchema)
    .min(1, 'At least one working hour entry is required')
    .refine(
      (items) => {
        // Ensure no duplicate days in the array
        const days = items.map((item) => item.dayOfWeek);
        return new Set(days).size === days.length;
      },
      {
        message: 'Duplicate days of week in working hours configuration are not allowed',
      },
    ),
});

// ─── Doctor Leave Schemas ────────────────────────────────────────────────────

export const doctorLeaveSchema = z
  .object({
    startDate: z
      .string()
      .regex(DATE_YYYYMMDD_REGEX, 'Start date must be in YYYY-MM-DD format'),
    endDate: z
      .string()
      .regex(DATE_YYYYMMDD_REGEX, 'End date must be in YYYY-MM-DD format'),
    reason: z.string().trim().max(500, 'Reason must be 500 characters or fewer').optional().nullable(),
    isFullDay: z.boolean().default(true),
    leaveStartTime: z
      .string()
      .regex(TIME_HHMM_REGEX, 'Leave start time must be in HH:MM format')
      .optional()
      .nullable(),
    leaveEndTime: z
      .string()
      .regex(TIME_HHMM_REGEX, 'Leave end time must be in HH:MM format')
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      // Validate startDate <= endDate
      return data.startDate <= data.endDate;
    },
    {
      message: 'Start date must be on or before end date',
      path: ['startDate'],
    },
  )
  .refine(
    (data) => {
      // If partial day, validate leaveStartTime < leaveEndTime
      if (!data.isFullDay && data.leaveStartTime && data.leaveEndTime) {
        return data.leaveStartTime < data.leaveEndTime;
      }
      return true;
    },
    {
      message: 'Leave start time must be strictly before leave end time for partial day leave',
      path: ['leaveStartTime'],
    },
  );

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
export type DoctorStatusInput = z.infer<typeof doctorStatusSchema>;
export type SpecialisationInput = z.infer<typeof specialisationInputSchema>;
export type WorkingHourItemInput = z.infer<typeof workingHourItemSchema>;
export type SetWorkingHoursInput = z.infer<typeof setWorkingHoursSchema>;
export type DoctorLeaveInput = z.infer<typeof doctorLeaveSchema>;
