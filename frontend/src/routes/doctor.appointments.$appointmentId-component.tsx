import { lazy, Suspense } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAppointment, useUpdateAppointmentStatus } from "../hooks/useAppointments";
import { useAuth } from "../hooks/useAuth";
import { NotificationBell } from "../components/NotificationBell";
import { SectionSkeleton } from "../components/ui/LoadingSpinner";
import {
  formatAppointmentTimeRange,
  formatSeverityLabel,
  formatStatusLabel,
  formatSymptomSummary,
  getPatientDisplayName,
  getPatientInitials,
  getStatusBadgeClasses,
} from "../lib/appointment-utils";
import { Route } from "./doctor.appointments.$appointmentId";

// ─── Lazy sub-panels ─────────────────────────────────────────────────────────
const AISummaryPanel     = lazy(() => import("../components/AISummaryPanel"));
const ClinicalNoteEditor = lazy(() => import("../components/ClinicalNoteEditor"));
const PrescriptionEditor = lazy(() => import("../components/PrescriptionEditor"));

export default function AppointmentDetail() {
  const { appointmentId } = Route.useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { data: appointment, isLoading, error } = useAppointment(appointmentId);
  const updateStatus = useUpdateAppointmentStatus();

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/auth" });
  };

  const handleConfirmAppointment = async () => {
    if (!appointment) return;
    await updateStatus.mutateAsync({ id: appointment.id, status: "CONFIRMED" });
  };

  if (isLoading) {
    return (
      <div className="bg-background text-on-background min-h-screen flex items-center justify-center">
        <p className="text-body-lg text-on-surface-variant">Loading appointment…</p>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center gap-md px-lg">
        <p className="text-body-lg text-error">Unable to load this appointment.</p>
        <Link to="/doctor" className="text-primary hover:underline text-label-md font-label-md">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const patient = appointment.patient.user;
  const patientName = getPatientDisplayName(patient.firstName, patient.lastName);
  const patientInitials = getPatientInitials(patient.firstName, patient.lastName);
  const canComplete = appointment.status === "CONFIRMED" || appointment.status === "PENDING_CONFIRMATION";
  const canConfirm = appointment.status === "PENDING_CONFIRMATION";

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col lg:flex-row antialiased">
      {/* ── SideNavBar ─────────────────────────────────────────────────────── */}
      <nav className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 p-md z-40 bg-surface border-r border-outline-variant">
        <div className="mb-lg px-sm pt-sm">
          <Link to="/doctor" className="hover:opacity-80 transition-opacity block">
            <h1 className="text-headline-sm font-headline-md font-bold text-primary">HealthCore Professional</h1>
          </Link>
          <p className="text-body-sm font-body-sm text-on-surface-variant mt-unit">Provider Portal</p>
        </div>
        <div className="flex-1 flex flex-col gap-unit mt-md">
          <Link className="flex items-center gap-md px-md py-sm rounded-lg text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container transition-all duration-200" to="/doctor">
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            <span className="text-label-md font-label-md">Dashboard</span>
          </Link>
          <Link
            className="flex items-center gap-md px-md py-sm rounded-lg bg-primary-container text-on-primary-container font-bold"
            to="/doctor/appointments/$appointmentId"
            params={{ appointmentId }}
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>event</span>
            <span className="text-label-md font-label-md">Appointments</span>
          </Link>
          <a className="flex items-center gap-md px-md py-sm rounded-lg text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container transition-all" href="#">
            <span className="material-symbols-outlined text-[20px]">group</span>
            <span className="text-label-md font-label-md">Patients</span>
          </a>
          <a className="flex items-center gap-md px-md py-sm rounded-lg text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container transition-all" href="#">
            <span className="material-symbols-outlined text-[20px]">calendar_month</span>
            <span className="text-label-md font-label-md">Calendar</span>
          </a>
          <a className="flex items-center gap-md px-md py-sm rounded-lg text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container transition-all" href="#">
            <span className="material-symbols-outlined text-[20px]">person</span>
            <span className="text-label-md font-label-md">Profile</span>
          </a>
        </div>
        <div className="mt-auto flex flex-col gap-unit border-t border-outline-variant pt-md">
          <a className="flex items-center gap-md px-md py-sm rounded-lg text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container transition-all" href="#">
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span className="text-label-md font-label-md">Settings</span>
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-md px-md py-sm rounded-lg text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container transition-all w-full"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="text-label-md font-label-md">Logout</span>
          </button>
        </div>
      </nav>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:ml-64 w-full">
        {/* TopNavBar */}
        <header className="sticky top-0 w-full flex justify-between items-center px-lg h-16 bg-surface-container-lowest z-50 border-b border-outline-variant">
          <div className="flex items-center gap-md">
            <button className="lg:hidden p-sm rounded-md text-on-surface-variant hover:bg-surface-container-low">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <Link className="text-headline-md font-headline-md font-bold text-primary lg:hidden" to="/doctor">HealthCore</Link>
            <div className="hidden md:flex items-center bg-surface-container-low rounded-lg px-md py-xs border border-outline-variant focus-within:border-primary focus-within:ring-1 focus-within:ring-primary w-64 transition-all">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px] mr-sm">search</span>
              <input className="bg-transparent border-none focus:ring-0 text-body-sm font-body-sm w-full p-0 text-on-surface placeholder:text-on-surface-variant" placeholder="Search records…" type="text" />
            </div>
          </div>
          <div className="flex items-center gap-sm">
            <NotificationBell />
            <button className="p-sm rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors hidden sm:block">
              <span className="material-symbols-outlined">help</span>
            </button>
            <div className="h-8 w-8 rounded-full bg-secondary-container border border-outline-variant overflow-hidden ml-sm flex items-center justify-center">
              <img
                alt="User profile"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDmw78HH9lYakaL11XgvD6RabfYYROSQdYte-pJSJTqGhX90L0Xb5I7fOla6ZvNx3gGQSvO9gC2k1nLArYaxxs4olW2E0zbBpy1lkJQ5G2SNa7GO3uPERcxLePV5LIgBYGWBE70JC55qWYmsWb9Y9lEqGVA54g9TvTTO408OqEtG1oQgIJUkB6RiwA0m9ZZ8J_ofIunXRiH2tk7so14cXRwFtMZ5IvLorkvix-7oSOZjCXA4QA_HdvOZQ"
              />
            </div>
          </div>
        </header>

        {/* Consultation Canvas */}
        <main className="flex-1 p-margin-mobile md:p-gutter max-w-[1440px] mx-auto w-full">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-lg gap-md">
            <div>
              <div className="flex items-center gap-sm mb-unit">
                <span className="px-sm py-xs bg-surface-container text-on-surface-variant rounded text-code-sm font-code-sm border border-outline-variant">
                  {formatAppointmentTimeRange(appointment.slotStart, appointment.slotEnd)}
                </span>
                <span className={`px-sm py-xs rounded-full text-code-sm font-code-sm font-medium flex items-center gap-1 ${getStatusBadgeClasses(appointment.status)}`}>
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  {formatStatusLabel(appointment.status)}
                </span>
              </div>
              <h2 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-on-background">
                Consultation
              </h2>
            </div>
            {canConfirm && (
              <button
                type="button"
                onClick={handleConfirmAppointment}
                disabled={updateStatus.isPending}
                className="flex items-center justify-center gap-sm px-md py-sm rounded-lg border border-primary text-primary text-label-md font-label-md hover:bg-surface-container-low transition-colors disabled:opacity-50"
              >
                Confirm Appointment
              </button>
            )}
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            {/* ── Left Column: Patient Context ─────────────────────────── */}
            <div className="lg:col-span-4 flex flex-col gap-gutter">
              {/* Patient Info */}
              <section className="card-level-1 p-md flex flex-col">
                <div className="flex items-center gap-md pb-md border-b border-surface-variant">
                  <div className="w-16 h-16 rounded-full bg-secondary-container overflow-hidden border-2 border-surface flex-shrink-0 flex items-center justify-center">
                    <span className="text-headline-md font-headline-md text-on-secondary-container">{patientInitials}</span>
                  </div>
                  <div>
                    <h3 className="text-headline-md font-headline-md text-on-background m-0">{patientName}</h3>
                    <p className="text-body-sm font-body-sm text-on-surface-variant">{patient.email}</p>
                    <p className="text-body-sm font-body-sm text-on-surface-variant mt-unit">
                      Patient ID: {appointment.patient.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="pt-md grid grid-cols-2 gap-md">
                  <div>
                    <span className="text-code-sm font-code-sm text-secondary uppercase tracking-wider block mb-unit">Contact</span>
                    <div className="text-body-md font-body-md text-on-surface font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-outline text-[16px]">mail</span>
                      {patient.email}
                    </div>
                    {patient.phone && (
                      <div className="text-body-md font-body-md text-on-surface font-medium flex items-center gap-1 mt-unit">
                        <span className="material-symbols-outlined text-outline text-[16px]">call</span>
                        {patient.phone}
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-code-sm font-code-sm text-secondary uppercase tracking-wider block mb-unit">Reason for Visit</span>
                    <span className="inline-block px-sm py-xs bg-surface-container-high text-on-surface-variant rounded text-code-sm font-code-sm border border-outline-variant">
                      {appointment.reasonForVisit || "General consultation"}
                    </span>
                  </div>
                </div>
              </section>

              {/* Symptoms */}
              <section className="card-level-1 p-md">
                <div className="flex items-center gap-sm mb-md">
                  <span className="material-symbols-outlined text-primary">personal_injury</span>
                  <h3 className="text-body-lg font-body-lg font-semibold text-on-background m-0">
                    Reported Symptoms ({appointment.symptoms.length})
                  </h3>
                </div>
                {appointment.symptoms.length === 0 ? (
                  <p className="text-body-md text-on-surface-variant">No symptoms were reported for this appointment.</p>
                ) : (
                  <div className="flex flex-col gap-md">
                    {appointment.symptoms.map((symptom) => (
                      <div key={symptom.id}>
                        <div className="bg-surface p-sm rounded-lg border border-outline-variant">
                          <p className="text-body-md font-body-md text-on-surface italic">{formatSymptomSummary(symptom)}</p>
                        </div>
                        <div className="flex flex-wrap gap-sm mt-sm">
                          <span className="px-sm py-xs rounded bg-surface-container-high text-on-surface-variant text-label-md font-label-md border border-outline-variant">
                            {symptom.description}
                          </span>
                          <span className="px-sm py-xs rounded bg-secondary-container text-on-secondary-container text-label-md font-label-md">
                            {formatSeverityLabel(symptom.severity)}
                          </span>
                          {symptom.durationDays != null && (
                            <span className="px-sm py-xs rounded bg-surface-container-high text-on-surface-variant text-label-md font-label-md border border-outline-variant">
                              {symptom.durationDays} day{symptom.durationDays === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* ── Right Column: Clinical Work ───────────────────────────── */}
            <div className="lg:col-span-8 flex flex-col gap-gutter">
              {/* AI Summary Panel — lazy */}
              <Suspense fallback={<SectionSkeleton rows={3} label="Loading AI summary…" />}>
                <AISummaryPanel
                  appointmentId={appointmentId}
                  symptomCount={appointment.symptoms.length}
                />
              </Suspense>

              {/* Clinical Note Editor — lazy */}
              <Suspense fallback={<SectionSkeleton rows={6} label="Loading clinical notes…" />}>
                <ClinicalNoteEditor
                  appointmentId={appointmentId}
                  canEdit={canComplete}
                  onCompleteVisit={() => navigate({ to: "/doctor" })}
                />
              </Suspense>

              {/* Prescription Editor — lazy */}
              <Suspense fallback={<SectionSkeleton rows={3} label="Loading prescription editor…" />}>
                <PrescriptionEditor />
              </Suspense>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-lg pt-md border-t border-outline-variant flex flex-col sm:flex-row justify-end gap-md">
            <Link
              className="px-lg py-sm rounded-lg border border-outline text-on-surface-variant text-label-md font-label-md hover:bg-surface-container-low transition-colors w-full sm:w-auto text-center"
              to="/doctor"
            >
              Back to Dashboard
            </Link>
          </div>
          <div className="h-8 md:h-0" />
        </main>
      </div>
    </div>
  );
}
