import { prisma } from '../db/client';
import { AppError } from '../utils/AppError';
import { AppointmentStatus, Role } from '@prisma/client';
import { getAppointmentById } from './appointment.service';
import type { ClinicalNoteInput } from '../validators/appointment.validators';

const ALLOWED_NOTE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.COMPLETED,
];

/**
 * Retrieve the clinical note (PostVisitNote) for a specific appointment.
 * Automatically enforces authorization via `getAppointmentById`.
 */
export async function getClinicalNoteForAppointment(
  appointmentId: string,
  userId: string,
  role: Role,
) {
  // Admins should not have unrestricted access to private clinical notes
  if (role === Role.ADMIN) {
    throw AppError.forbidden('Admins are not permitted to access private clinical notes');
  }

  // Enforces authorization: this throws if doctor/patient is not assigned to this appointment
  const appointment = await getAppointmentById(appointmentId, userId, role);

  const note = await prisma.postVisitNote.findUnique({
    where: { appointmentId: appointment.id },
  });

  return note;
}

/**
 * Creates or updates the clinical note (SOAP) for an appointment.
 * Ensures the appointment is in an appropriate status, and optionally
 * marks the appointment as COMPLETED transactionally.
 */
export async function saveClinicalNote(
  appointmentId: string,
  data: ClinicalNoteInput,
  userId: string,
  role: Role,
) {
  if (role === Role.ADMIN) {
    throw AppError.forbidden('Admins are not permitted to modify private clinical notes');
  }

  // Enforces authorization
  const appointment = await getAppointmentById(appointmentId, userId, role);

  // Prevent patients from modifying notes (just an extra safety net, routes enforce this too)
  if (role === Role.PATIENT) {
    throw AppError.forbidden('Patients cannot modify clinical notes');
  }

  // Validate state
  if (!ALLOWED_NOTE_STATUSES.includes(appointment.status)) {
    throw AppError.badRequest(
      `Cannot modify clinical notes for an appointment with status: ${appointment.status}`,
    );
  }

  const { completeVisit, ...noteData } = data;

  // Use transaction to ensure data integrity when completing the visit
  const result = await prisma.$transaction(async (tx) => {
    // Upsert the clinical note
    const note = await tx.postVisitNote.upsert({
      where: { appointmentId: appointment.id },
      update: {
        subjective: noteData.subjective ?? null,
        objective: noteData.objective ?? null,
        assessment: noteData.assessment ?? null,
        plan: noteData.plan ?? null,
        additionalNotes: noteData.additionalNotes ?? null,
      },
      create: {
        appointmentId: appointment.id,
        subjective: noteData.subjective ?? null,
        objective: noteData.objective ?? null,
        assessment: noteData.assessment ?? null,
        plan: noteData.plan ?? null,
        additionalNotes: noteData.additionalNotes ?? null,
      },
    });

    // If requested, mark appointment as COMPLETED
    if (completeVisit && appointment.status !== AppointmentStatus.COMPLETED) {
      await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          status: AppointmentStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    }

    return note;
  });

  return result;
}
