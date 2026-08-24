import type { Appointment, AppointmentStatus, Symptom, SymptomSeverity } from "../hooks/useAppointments";

const TERMINAL_STATUSES: AppointmentStatus[] = [
  "CANCELLED_BY_PATIENT",
  "CANCELLED_BY_DOCTOR",
  "RESCHEDULED",
  "NO_SHOW",
];

export function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export function formatTodayHeading(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function formatAppointmentTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatAppointmentTimeRange(slotStart: string, slotEnd: string): string {
  return `${formatAppointmentTime(slotStart)} - ${formatAppointmentTime(slotEnd)}`;
}

export function getPatientInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function getPatientDisplayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}

export function formatStatusLabel(status: AppointmentStatus): string {
  switch (status) {
    case "PENDING_CONFIRMATION":
      return "Pending";
    case "CONFIRMED":
      return "Confirmed";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED_BY_PATIENT":
      return "Cancelled";
    case "CANCELLED_BY_DOCTOR":
      return "Cancelled";
    case "NO_SHOW":
      return "No Show";
    case "RESCHEDULED":
      return "Rescheduled";
    default:
      return status;
  }
}

export function getStatusBadgeClasses(status: AppointmentStatus): string {
  switch (status) {
    case "COMPLETED":
      return "bg-tertiary-container text-on-tertiary-container";
    case "CONFIRMED":
      return "bg-secondary-container text-on-secondary-container";
    case "PENDING_CONFIRMATION":
      return "border border-outline-variant text-secondary";
    case "NO_SHOW":
      return "bg-error-container text-on-error-container";
    case "CANCELLED_BY_PATIENT":
    case "CANCELLED_BY_DOCTOR":
    case "RESCHEDULED":
      return "bg-surface-variant text-outline";
    default:
      return "border border-outline-variant text-secondary";
  }
}

export function isActiveAppointment(status: AppointmentStatus): boolean {
  return !TERMINAL_STATUSES.includes(status) && status !== "COMPLETED";
}

export function getNextUpcomingAppointment(appointments: Appointment[]): Appointment | null {
  const now = Date.now();
  return (
    appointments
      .filter((appt) => isActiveAppointment(appt.status) && new Date(appt.slotStart).getTime() >= now)
      .sort((a, b) => new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime())[0] ?? null
  );
}

export function formatSymptomSummary(symptom: Symptom): string {
  const severity = symptom.severity.charAt(0) + symptom.severity.slice(1).toLowerCase();
  const duration = symptom.durationDays ? `${symptom.durationDays} day${symptom.durationDays === 1 ? "" : "s"}` : "unspecified duration";
  return `"${symptom.description}, ${severity}, ${duration}"`;
}

export function formatSeverityLabel(severity: SymptomSeverity): string {
  return severity.charAt(0) + severity.slice(1).toLowerCase();
}
