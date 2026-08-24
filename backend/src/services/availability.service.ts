/**
 * Availability Engine Service.
 *
 * Calculates valid bookable appointment slots for a doctor on a target date.
 *
 * Rules:
 *  - All calculations use server-side database configuration (DoctorProfile.slotDurationMn,
 *    DoctorWorkingHours, DoctorLeave, and active non-cancelled Appointment records).
 *  - Client-supplied overrides (e.g. slotDuration in query) are strictly ignored.
 *  - Cancelled appointments (CANCELLED_BY_PATIENT, CANCELLED_BY_DOCTOR, RESCHEDULED, NO_SHOW)
 *    do NOT block availability.
 *  - Full-day doctor leave results in 0 bookable slots.
 *  - Partial-day doctor leave excludes overlapping slots.
 *  - Slots starting before working hours or extending past working hours end are excluded.
 *  - Privacy: Returns only slot timestamps and availability flags — no patient PII or symptoms.
 */

import { prisma } from '../db/client';
import { AppError } from '../utils/AppError';
import { DayOfWeek, AppointmentStatus } from '@prisma/client';

const DAY_MAP: Record<number, DayOfWeek> = {
  0: DayOfWeek.SUNDAY,
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
  6: DayOfWeek.SATURDAY,
};

const TERMINAL_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.CANCELLED_BY_PATIENT,
  AppointmentStatus.CANCELLED_BY_DOCTOR,
  AppointmentStatus.RESCHEDULED,
  AppointmentStatus.NO_SHOW,
];

/** Response shape for the availability endpoint */
export interface AvailableSlot {
  slotStart: string;
  slotEnd: string;
  isAvailable: boolean;
}

export interface DoctorAvailabilityResult {
  doctorId: string;
  date: string;
  dayOfWeek: DayOfWeek;
  slotDurationMn: number;
  slots: AvailableSlot[];
}

export async function calculateDoctorAvailability(
  doctorProfileId: string,
  dateStr: string,
): Promise<DoctorAvailabilityResult> {
  // Validate date format (YYYY-MM-DD)
  const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  if (!dateStr || typeof dateStr !== 'string' || !DATE_REGEX.test(dateStr)) {
    throw AppError.badRequest('Invalid date format. Expected YYYY-MM-DD');
  }

  // Fetch doctor profile with user active status, working hours, and leaves
  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorProfileId },
    include: {
      user: {
        select: { id: true, isActive: true },
      },
      workingHours: {
        where: { isActive: true },
      },
      leaves: true,
    },
  });

  if (!doctor || !doctor.user.isActive || !doctor.isAccepting) {
    throw AppError.notFound('Doctor profile not found or is currently not accepting appointments');
  }

  // Parse target date in UTC
  const [year, month, day] = dateStr.split('-').map((v) => parseInt(v, 10)) as [number, number, number];
  const targetDate = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = DAY_MAP[targetDate.getUTCDay()]!;

  // 1. Check working hours for day of week
  const daySchedule = doctor.workingHours.find((wh) => wh.dayOfWeek === dayOfWeek);
  if (!daySchedule || !daySchedule.isActive) {
    return {
      doctorId: doctorProfileId,
      date: dateStr,
      dayOfWeek,
      slotDurationMn: doctor.slotDurationMn,
      slots: [],
    };
  }

  // 2. Check doctor leaves on target date
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  const leavesOnDate = doctor.leaves.filter((leave) => {
    const lStart = new Date(leave.startDate);
    const lEnd = new Date(leave.endDate);
    return lStart <= endOfDay && lEnd >= startOfDay;
  });

  // If doctor is on full-day leave, return 0 slots
  const fullDayLeave = leavesOnDate.find((l) => l.isFullDay);
  if (fullDayLeave) {
    return {
      doctorId: doctorProfileId,
      date: dateStr,
      dayOfWeek,
      slotDurationMn: doctor.slotDurationMn,
      slots: [],
    };
  }

  // 3. Batch fetch active non-cancelled appointments for this doctor on target date
  const activeAppointments = await prisma.appointment.findMany({
    where: {
      doctorProfileId,
      status: { notIn: TERMINAL_STATUSES },
      slotStart: { lte: endOfDay },
      slotEnd: { gte: startOfDay },
    },
    select: {
      slotStart: true,
      slotEnd: true,
    },
  });

  // 4. Slot generation loop
  const [startH, startM] = daySchedule.startTime.split(':').map((v) => parseInt(v, 10)) as [number, number];
  const [endH, endM] = daySchedule.endTime.split(':').map((v) => parseInt(v, 10)) as [number, number];

  const windowStartMs = Date.UTC(year, month - 1, day, startH, startM);
  const windowEndMs = Date.UTC(year, month - 1, day, endH, endM);
  const slotStepMs = doctor.slotDurationMn * 60 * 1000;

  const nowMs = Date.now();
  const slots: AvailableSlot[] = [];

  for (let currentMs = windowStartMs; currentMs + slotStepMs <= windowEndMs; currentMs += slotStepMs) {
    const slotStart = new Date(currentMs);
    const slotEnd = new Date(currentMs + slotStepMs);

    // Filter past slots if date is today
    let isAvailable = currentMs >= nowMs;

    // Filter against partial-day leave
    if (isAvailable && leavesOnDate.length > 0) {
      for (const leave of leavesOnDate) {
        if (!leave.isFullDay && leave.leaveStartTime && leave.leaveEndTime) {
          const [lStartH, lStartM] = leave.leaveStartTime.split(':').map((v) => parseInt(v, 10)) as [number, number];
          const [lEndH, lEndM] = leave.leaveEndTime.split(':').map((v) => parseInt(v, 10)) as [number, number];
          const leaveStartMs = Date.UTC(year, month - 1, day, lStartH, lStartM);
          const leaveEndMs = Date.UTC(year, month - 1, day, lEndH, lEndM);

          if (currentMs < leaveEndMs && currentMs + slotStepMs > leaveStartMs) {
            isAvailable = false;
            break;
          }
        }
      }
    }

    // Filter against active appointments
    if (isAvailable) {
      const hasConflict = activeAppointments.some((appt) => {
        const apptStartMs = appt.slotStart.getTime();
        const apptEndMs = appt.slotEnd.getTime();
        return currentMs < apptEndMs && currentMs + slotStepMs > apptStartMs;
      });
      if (hasConflict) {
        isAvailable = false;
      }
    }

    if (isAvailable) {
      slots.push({
        slotStart: slotStart.toISOString(),
        slotEnd: slotEnd.toISOString(),
        isAvailable: true,
      });
    }
  }

  return {
    doctorId: doctorProfileId,
    date: dateStr,
    dayOfWeek,
    slotDurationMn: doctor.slotDurationMn,
    slots,
  };
}
