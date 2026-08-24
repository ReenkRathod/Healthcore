/**
 * Appointment service logic.
 *
 * Implements:
 *  - Dynamic Availability Engine
 *  - Transactional Appointment Booking with PostgreSQL Advisory Locking (pg_advisory_xact_lock)
 *  - Database-level double-booking prevention
 *  - Re-checking doctor status, working hours, slot alignment, leaves, and active conflicts inside transaction
 *  - Symptom recording
 *  - Idempotency key handling for network retries
 *  - Role-scoped appointment listings and details
 *  - Object-level authorization checks
 *  - Appointment cancellation and lifecycle transitions
 */

import { prisma } from '../db/client';
import { AppError } from '../utils/AppError';
import {
  AppointmentStatus,
  DayOfWeek,
  Role,
  Prisma,
} from '@prisma/client';
import type { BookAppointmentInput } from '../validators/appointment.validators';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── 1. Availability Engine ──────────────────────────────────────────────────

export async function getDoctorAvailability(
  doctorProfileId: string,
  dateStr: string,
) {
  // Validate doctor exists and is active/accepting
  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorProfileId },
    include: {
      user: true,
      workingHours: { where: { isActive: true } },
      leaves: true,
    },
  });

  if (!doctor || !doctor.user.isActive || !doctor.isAccepting || !doctor.isVerifiedByAdmin) {
    throw AppError.notFound('Doctor profile not found, is not verified, or is currently not accepting appointments');
  }

  // Parse YYYY-MM-DD date in UTC
  const [year, month, day] = dateStr.split('-').map((v) => parseInt(v, 10));
  if (!year || !month || !day) {
    throw AppError.badRequest('Invalid date format. Expected YYYY-MM-DD');
  }

  const targetDate = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = DAY_MAP[targetDate.getUTCDay()]!;

  // 1. Check working hours for day of week
  const daySchedule = doctor.workingHours.find((wh) => wh.dayOfWeek === dayOfWeek);
  if (!daySchedule || !daySchedule.isActive) {
    return {
      date: dateStr,
      dayOfWeek,
      slotDurationMn: doctor.slotDurationMn,
      slots: [],
    };
  }

  // 2. Check doctor leaves on dateStr
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  const leavesOnDate = doctor.leaves.filter((leave) => {
    const lStart = new Date(leave.startDate);
    const lEnd = new Date(leave.endDate);
    return lStart <= endOfDay && lEnd >= startOfDay;
  });

  // If full day leave exists, 0 slots
  const fullDayLeave = leavesOnDate.find((l) => l.isFullDay);
  if (fullDayLeave) {
    return {
      date: dateStr,
      dayOfWeek,
      slotDurationMn: doctor.slotDurationMn,
      slots: [],
    };
  }

  // 3. Fetch existing active appointments for this doctor on target date
  const existingAppts = await prisma.appointment.findMany({
    where: {
      doctorProfileId,
      status: { notIn: TERMINAL_STATUSES },
      slotStart: { lte: endOfDay },
      slotEnd: { gte: startOfDay },
    },
  });

  // Parse schedule start/end wall-clock times into UTC Date objects on targetDate
  const [startH, startM] = daySchedule.startTime.split(':').map((v) => parseInt(v, 10)) as [number, number];
  const [endH, endM] = daySchedule.endTime.split(':').map((v) => parseInt(v, 10)) as [number, number];

  const windowStartMs = Date.UTC(year, month - 1, day, startH, startM);
  const windowEndMs = Date.UTC(year, month - 1, day, endH, endM);
  const slotStepMs = doctor.slotDurationMn * 60 * 1000;

  const nowMs = Date.now();
  const slots: Array<{ slotStart: string; slotEnd: string; isAvailable: boolean }> = [];

  for (let currentMs = windowStartMs; currentMs + slotStepMs <= windowEndMs; currentMs += slotStepMs) {
    const slotStart = new Date(currentMs);
    const slotEnd = new Date(currentMs + slotStepMs);

    // Skip past slots if target date is today
    let isAvailable = currentMs >= nowMs;

    // Filter against partial day leave
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

    // Filter against existing booked appointments
    if (isAvailable) {
      const hasConflict = existingAppts.some((appt) => {
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
    date: dateStr,
    dayOfWeek,
    slotDurationMn: doctor.slotDurationMn,
    slots,
  };
}

// ─── 2. Book Appointment ─────────────────────────────────────────────────────

export async function bookAppointment(
  patientUserId: string,
  input: BookAppointmentInput,
) {
  // Ensure PatientProfile exists
  let patientProfile = await prisma.patientProfile.findUnique({
    where: { userId: patientUserId },
  });

  if (!patientProfile) {
    patientProfile = await prisma.patientProfile.create({
      data: { userId: patientUserId },
    });
  }

  // Parse & validate slotStart timestamp
  const slotStart = new Date(input.slotStart);
  if (isNaN(slotStart.getTime())) {
    throw AppError.badRequest('Invalid slotStart timestamp');
  }

  if (slotStart.getTime() <= Date.now()) {
    throw AppError.badRequest('Cannot book appointment slots in the past');
  }

  // Idempotency check for retries
  if (input.idempotencyKey) {
    const existingIdempotent = await prisma.appointment.findFirst({
      where: {
        patientProfileId: patientProfile.id,
        doctorProfileId: input.doctorProfileId,
        slotStart,
        status: { notIn: TERMINAL_STATUSES },
      },
      include: {
        symptoms: true,
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
      },
    });

    if (existingIdempotent) {
      return { appointment: existingIdempotent, isNew: false };
    }
  }

  // Pre-fetch doctor profile for initial check
  const preDoctor = await prisma.doctorProfile.findUnique({
    where: { id: input.doctorProfileId },
    include: { user: true },
  });

  if (!preDoctor) {
    throw AppError.notFound('Doctor profile not found');
  }

  if (!preDoctor.user.isActive || !preDoctor.isAccepting || !preDoctor.isVerifiedByAdmin) {
    throw AppError.badRequest('Doctor is not active, not verified, or not accepting appointments');
  }

  // Transaction with PostgreSQL Advisory Lock + Re-checking inside Transaction
  try {
    const newAppt = await prisma.$transaction(async (tx) => {
      // 1. Acquire transaction-scoped PostgreSQL advisory lock to serialize concurrent booking attempts
      const lockKey = `doc:${input.doctorProfileId}:slot:${slotStart.toISOString()}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      // 2. Re-read doctor configuration inside transaction
      const doctor = await tx.doctorProfile.findUnique({
        where: { id: input.doctorProfileId },
        include: {
          user: true,
          workingHours: { where: { isActive: true } },
          leaves: true,
        },
      });

      if (!doctor || !doctor.user.isActive || !doctor.isAccepting || !doctor.isVerifiedByAdmin) {
        throw AppError.badRequest('Doctor is not active, not verified, or not accepting appointments');
      }

      const slotDurationMs = doctor.slotDurationMn * 60 * 1000;
      const slotEnd = new Date(slotStart.getTime() + slotDurationMs);

      // 3. Re-check doctor working hours & alignment
      const dayOfWeek = DAY_MAP[slotStart.getUTCDay()]!;
      const daySchedule = doctor.workingHours.find((wh) => wh.dayOfWeek === dayOfWeek);

      if (!daySchedule || !daySchedule.isActive) {
        throw AppError.badRequest('Doctor is not working on the requested day');
      }

      const year = slotStart.getUTCFullYear();
      const month = slotStart.getUTCMonth();
      const day = slotStart.getUTCDate();

      const [startH, startM] = daySchedule.startTime.split(':').map((v) => parseInt(v, 10)) as [number, number];
      const [endH, endM] = daySchedule.endTime.split(':').map((v) => parseInt(v, 10)) as [number, number];

      const windowStartMs = Date.UTC(year, month, day, startH, startM);
      const windowEndMs = Date.UTC(year, month, day, endH, endM);

      if (slotStart.getTime() < windowStartMs || slotEnd.getTime() > windowEndMs) {
        throw AppError.badRequest('Requested appointment time falls outside doctor working hours');
      }

      // Verify slot boundary alignment
      const offsetMs = slotStart.getTime() - windowStartMs;
      if (offsetMs % slotDurationMs !== 0) {
        throw AppError.badRequest('Requested slot time is not aligned with doctor slot duration');
      }

      // 4. Re-check doctor leave
      const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

      const onLeave = doctor.leaves.some((leave) => {
        const lStart = new Date(leave.startDate);
        const lEnd = new Date(leave.endDate);
        lEnd.setUTCHours(23, 59, 59, 999);

        if (lStart > endOfDay || lEnd < startOfDay) {
          return false;
        }

        if (leave.isFullDay) {
          return true;
        }

        // Partial leave check
        if (leave.leaveStartTime && leave.leaveEndTime) {
          const [lStartH, lStartM] = leave.leaveStartTime.split(':').map((v) => parseInt(v, 10)) as [number, number];
          const [lEndH, lEndM] = leave.leaveEndTime.split(':').map((v) => parseInt(v, 10)) as [number, number];
          const leaveStartMs = Date.UTC(year, month, day, lStartH, lStartM);
          const leaveEndMs = Date.UTC(year, month, day, lEndH, lEndM);

          return slotStart.getTime() < leaveEndMs && slotEnd.getTime() > leaveStartMs;
        }

        return true;
      });

      if (onLeave) {
        throw AppError.conflict('Doctor is on leave during the selected appointment time');
      }

      // 5. Re-check for conflicting active non-cancelled appointments inside transaction
      const existingConflict = await tx.appointment.findFirst({
        where: {
          doctorProfileId: input.doctorProfileId,
          status: { notIn: TERMINAL_STATUSES },
          slotStart: { lt: slotEnd },
          slotEnd: { gt: slotStart },
        },
      });

      if (existingConflict) {
        throw AppError.conflict('This appointment slot has already been booked. Please select another time.');
      }

      // 6. Create appointment & symptoms
      const createdAppt = await tx.appointment.create({
        data: {
          patientProfileId: patientProfile.id,
          doctorProfileId: input.doctorProfileId,
          slotStart,
          slotEnd,
          status: AppointmentStatus.CONFIRMED,
          reasonForVisit: input.reasonForVisit ?? null,
          confirmedAt: new Date(),
          symptoms: {
            createMany: {
              data: input.symptoms.map((s) => ({
                description: s.description,
                severity: s.severity,
                durationDays: s.durationDays ?? null,
                notes: s.notes ?? null,
              })),
            },
          },
        },
        include: {
          symptoms: true,
          patient: {
            include: { user: true },
          },
          doctor: {
            include: { user: true },
          },
        },
      });

      return createdAppt;
    });

    return { appointment: newAppt, isNew: true };
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw AppError.conflict('This appointment slot has already been booked. Please select another time.');
    }
    throw err;
  }
}

// ─── 3. List Appointments ────────────────────────────────────────────────────

export async function listAppointments(
  userId: string,
  role: Role,
  query: { status?: AppointmentStatus; startDate?: string; endDate?: string },
) {
  const whereClause: Prisma.AppointmentWhereInput = {};

  // Scope by role
  if (role === Role.PATIENT) {
    const patientProfile = await prisma.patientProfile.findUnique({
      where: { userId },
    });
    if (!patientProfile) {
      return [];
    }
    whereClause.patientProfileId = patientProfile.id;
  } else if (role === Role.DOCTOR) {
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId },
    });
    if (!doctorProfile) {
      return [];
    }
    whereClause.doctorProfileId = doctorProfile.id;
  }
  // ADMIN sees all

  if (query.status) {
    whereClause.status = query.status;
  }

  if (query.startDate) {
    whereClause.slotStart = { gte: new Date(query.startDate) };
  }

  if (query.endDate) {
    whereClause.slotEnd = { lte: new Date(query.endDate) };
  }

  const appointments = await prisma.appointment.findMany({
    where: whereClause,
    include: {
      symptoms: true,
      patient: {
        include: { user: true },
      },
      doctor: {
        include: { user: true },
      },
    },
    orderBy: { slotStart: 'asc' },
  });

  return appointments;
}

// ─── 4. Get Appointment By ID ────────────────────────────────────────────────

export async function getAppointmentById(
  appointmentId: string,
  userId: string,
  role: Role,
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      symptoms: true,
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
    },
  });

  if (!appointment) {
    throw AppError.notFound('Appointment not found');
  }

  // Object-level ownership check
  if (role === Role.PATIENT && appointment.patient.userId !== userId) {
    throw AppError.forbidden('You do not have permission to access another patient\'s appointment');
  }

  if (role === Role.DOCTOR && appointment.doctor.userId !== userId) {
    throw AppError.forbidden('You do not have permission to access another doctor\'s appointment');
  }

  return appointment;
}

// ─── 5. Cancel Appointment ───────────────────────────────────────────────────

export async function cancelAppointment(
  appointmentId: string,
  userId: string,
  role: Role,
  cancellationReason?: string,
) {
  const appointment = await getAppointmentById(appointmentId, userId, role);

  if (TERMINAL_STATUSES.includes(appointment.status)) {
    throw AppError.badRequest('Appointment cannot be cancelled as it is already in a terminal status');
  }

  const cancelStatus =
    role === Role.PATIENT
      ? AppointmentStatus.CANCELLED_BY_PATIENT
      : AppointmentStatus.CANCELLED_BY_DOCTOR;

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: cancelStatus,
      cancellationReason: cancellationReason ?? null,
      cancelledAt: new Date(),
      cancelledByUserId: userId,
    },
    include: {
      symptoms: true,
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
    },
  });

  return updated;
}

// ─── 6. Update Appointment Status ────────────────────────────────────────────

export async function updateAppointmentStatus(
  appointmentId: string,
  newStatus: AppointmentStatus,
  userId: string,
  role: Role,
) {
  const appointment = await getAppointmentById(appointmentId, userId, role);

  if (role !== Role.ADMIN && role !== Role.DOCTOR) {
    throw AppError.forbidden('Only doctors or admins can update appointment status');
  }

  const updateData: Prisma.AppointmentUpdateInput = {
    status: newStatus,
  };

  if (newStatus === AppointmentStatus.CONFIRMED && !appointment.confirmedAt) {
    updateData.confirmedAt = new Date();
  }

  if (newStatus === AppointmentStatus.COMPLETED) {
    updateData.completedAt = new Date();
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: updateData,
    include: {
      symptoms: true,
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
    },
  });

  return updated;
}
