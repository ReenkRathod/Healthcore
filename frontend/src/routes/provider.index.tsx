import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAppointments } from "../hooks/useAppointments";
import { useAuth } from "../hooks/useAuth";
import {
  formatAppointmentTime,
  formatStatusLabel,
  formatTodayHeading,
  getNextUpcomingAppointment,
  getPatientDisplayName,
  getPatientInitials,
  getStatusBadgeClasses,
  getTimeOfDayGreeting,
  getTodayRange,
} from "../lib/appointment-utils";

export const Route = createFileRoute("/provider/")({
  head: () => ({
    meta: [
      { title: "Doctor Dashboard | HealthCore Professional" },
      {
        name: "description",
        content:
          "Provider dashboard with today's schedule, pending notes, and quick clinical actions.",
      },
      { property: "og:title", content: "Doctor Dashboard | HealthCore Professional" },
      {
        property: "og:description",
        content:
          "Provider dashboard with today's schedule, pending notes, and quick clinical actions.",
      },
    ],
  }),
  component: ProviderDashboard,
});

function ProviderDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const todayRange = useMemo(() => getTodayRange(), []);
  const { data: appointments = [], isLoading, error } = useAppointments(todayRange);

  const nextAppointment = useMemo(() => getNextUpcomingAppointment(appointments), [appointments]);
  const pendingActionCount = useMemo(
    () => appointments.filter((appt) => appt.status === "PENDING_CONFIRMATION" || appt.status === "CONFIRMED").length,
    [appointments],
  );
  const firstAppointmentId = appointments[0]?.id;

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/auth" });
  };

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md antialiased selection:bg-primary-container selection:text-on-primary-container">
      {/* TopNavBar */}
      <header className="sticky top-0 w-full flex justify-between items-center px-lg h-16 bg-surface-container-lowest border-b border-outline-variant z-50">
        <div className="flex items-center gap-md">
          <button className="lg:hidden text-on-surface-variant hover:bg-surface-container-low p-sm rounded-full transition-colors">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h1 className="text-headline-md font-headline-md font-bold text-primary hidden md:block">HealthCore</h1>
        </div>
        <div className="flex items-center gap-lg flex-1 justify-end">
          <div className="hidden md:flex items-center bg-surface-container-low rounded-full px-4 py-2 flex-1 max-w-md ml-lg">
            <span className="material-symbols-outlined text-on-surface-variant mr-2">search</span>
            <input
              className="bg-transparent border-none focus:ring-0 text-body-md font-body-md w-full text-on-surface placeholder-on-surface-variant outline-none"
              placeholder="Search patients, records..."
              type="text"
            />
          </div>
          <div className="flex items-center gap-md">
            <button className="text-on-surface-variant hover:bg-surface-container-low p-sm rounded-full transition-colors relative" title="notifications">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
            </button>
            <button className="text-on-surface-variant hover:bg-surface-container-low p-sm rounded-full transition-colors" title="help">
              <span className="material-symbols-outlined">help</span>
            </button>
            <div className="h-8 w-8 rounded-full bg-primary-container border border-outline-variant overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
              <img
                alt="User profile"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDckjfOD3bkBOp13SPLNnMKpMNsKRSqnGZW6Cr8iGDFNyG8nwVpEpBwxkQV6bzM5atf-7ZFiWclLkKk_vOebNx7NeyKXCVmnCJ3A5jBT_9Iiz6JpHmVmjaekRbdTn31D_XnaekwDdF46qxr0njQZDoa1lwWtlVQoZmEmCNTDSJNulUOpNpvQvdxC1_r7DSkS0TMw9GBbaQvzNIrV9VD-xG2PX0bmrDQ0902wuv70xmlKD14C6G-FPU9bw"
              />
            </div>
          </div>
        </div>
      </header>
      {/* SideNavBar & Main Content Wrapper */}
      <div className="flex">
        {/* SideNavBar */}
        <nav className="hidden lg:flex flex-col fixed left-0 top-16 h-[calc(100vh-64px)] w-64 p-md z-40 bg-surface border-r border-outline-variant overflow-y-auto">
          <div className="mb-xl px-sm">
            <h2 className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider mb-1">HealthCore Professional</h2>
            <p className="text-body-sm font-body-sm text-secondary">Provider Portal</p>
          </div>
          <div className="flex-1 space-y-sm">
            <Link
              className="flex items-center gap-md px-4 py-3 bg-primary-container text-on-primary-container font-bold rounded-lg transition-colors"
              to="/provider"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
              <span className="text-label-md font-label-md">Dashboard</span>
            </Link>
            {firstAppointmentId ? (
              <Link
                className="flex items-center gap-md px-4 py-3 text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container rounded-lg transition-all duration-200"
                to="/provider/appointments/$appointmentId"
                params={{ appointmentId: firstAppointmentId }}
              >
                <span className="material-symbols-outlined">event</span>
                <span className="text-label-md font-label-md">Appointments</span>
              </Link>
            ) : (
              <span className="flex items-center gap-md px-4 py-3 text-outline rounded-lg cursor-not-allowed">
                <span className="material-symbols-outlined">event</span>
                <span className="text-label-md font-label-md">Appointments</span>
              </span>
            )}
            <a className="flex items-center gap-md px-4 py-3 text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container rounded-lg transition-all duration-200" href="#">
              <span className="material-symbols-outlined">group</span>
              <span className="text-label-md font-label-md">Patients</span>
            </a>
            <a className="flex items-center gap-md px-4 py-3 text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container rounded-lg transition-all duration-200" href="#">
              <span className="material-symbols-outlined">calendar_month</span>
              <span className="text-label-md font-label-md">Calendar</span>
            </a>
            <a className="flex items-center gap-md px-4 py-3 text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container rounded-lg transition-all duration-200" href="#">
              <span className="material-symbols-outlined">person</span>
              <span className="text-label-md font-label-md">Profile</span>
            </a>
          </div>
          <div className="mt-auto space-y-sm pt-xl border-t border-outline-variant">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-error-container text-on-error-container hover:bg-error hover:text-on-error rounded-lg transition-colors font-label-md text-label-md">
              <span className="material-symbols-outlined text-sm">warning</span>
              Emergency Alert
            </button>
            <a className="flex items-center gap-md px-4 py-3 text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container rounded-lg transition-all duration-200" href="#">
              <span className="material-symbols-outlined">settings</span>
              <span className="text-label-md font-label-md">Settings</span>
            </a>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-md px-4 py-3 text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container rounded-lg transition-all duration-200 w-full"
            >
              <span className="material-symbols-outlined">logout</span>
              <span className="text-label-md font-label-md">Logout</span>
            </button>
          </div>
        </nav>
        {/* Main Content Canvas */}
        <main className="flex-1 w-full lg:pl-64 pt-gutter p-gutter max-w-[1440px] mx-auto space-y-xl pb-xl">
          {/* Header Section */}
          <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-md">
            <div>
              <h2 className="text-display-lg font-display-lg text-on-surface">{getTimeOfDayGreeting()}, Dr. {user?.lastName ?? "Provider"}</h2>
              <p className="text-body-lg font-body-lg text-on-surface-variant mt-2">Here is your clinical overview for today.</p>
            </div>
            <div className="text-right hidden md:block">
              <p className="text-label-md font-label-md text-secondary uppercase tracking-widest">{formatTodayHeading()}</p>
            </div>
          </section>
          {/* Stats/Bento Cards Level 1 */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex flex-col justify-between min-h-[140px]">
              <div className="flex justify-between items-start">
                <h3 className="text-label-md font-label-md text-secondary">Today's Appointments</h3>
                <span className="material-symbols-outlined text-primary">event_available</span>
              </div>
              <div className="mt-4">
                <span className="text-display-lg font-display-lg text-on-surface">{isLoading ? "—" : appointments.length}</span>
                <span className="text-body-sm font-body-sm text-on-surface-variant ml-2">Scheduled</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex flex-col justify-between min-h-[140px]">
              <div className="flex justify-between items-start">
                <h3 className="text-label-md font-label-md text-secondary">Active Visits</h3>
                <span className="material-symbols-outlined text-error">edit_document</span>
              </div>
              <div className="mt-4">
                <span className="text-display-lg font-display-lg text-on-surface">{isLoading ? "—" : pendingActionCount}</span>
                <span className="text-body-sm font-body-sm text-on-surface-variant ml-2">Need attention</span>
              </div>
            </div>
            <div className="bg-primary-container border border-primary rounded-xl p-lg flex flex-col justify-between min-h-[140px] text-on-primary-container relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
              <div className="flex justify-between items-start relative z-10">
                <h3 className="text-label-md font-label-md opacity-90">Next Patient</h3>
                <span className="material-symbols-outlined">schedule</span>
              </div>
              <div className="mt-4 relative z-10">
                {nextAppointment ? (
                  <>
                    <span className="text-headline-md font-headline-md block mb-1">
                      {getPatientDisplayName(
                        nextAppointment.patient.user.firstName,
                        nextAppointment.patient.user.lastName,
                      )}
                    </span>
                    <span className="text-body-md font-body-md font-medium opacity-90 bg-on-primary-container/10 px-2 py-1 rounded inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">alarm</span>
                      {formatAppointmentTime(nextAppointment.slotStart)}
                    </span>
                  </>
                ) : (
                  <span className="text-body-md font-body-md opacity-90">No upcoming appointments today</span>
                )}
              </div>
            </div>
          </section>
          {/* Main Layout Grid */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-gutter">
            {/* Today's Schedule */}
            <div className="xl:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col">
              <div className="px-lg py-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
                <h3 className="text-headline-md font-headline-md text-on-surface">Today's Schedule</h3>
                <button className="text-primary hover:text-on-primary-fixed-variant text-label-md font-label-md flex items-center gap-1 transition-colors">
                  View Calendar <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-bright border-b border-outline-variant">
                      <th className="px-lg py-3 text-label-md font-label-md text-secondary uppercase">Time</th>
                      <th className="px-lg py-3 text-label-md font-label-md text-secondary uppercase">Patient</th>
                      <th className="px-lg py-3 text-label-md font-label-md text-secondary uppercase">Type</th>
                      <th className="px-lg py-3 text-label-md font-label-md text-secondary uppercase text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {isLoading && (
                      <tr>
                        <td colSpan={4} className="px-lg py-8 text-center text-body-md text-on-surface-variant">
                          Loading today's schedule...
                        </td>
                      </tr>
                    )}
                    {error && (
                      <tr>
                        <td colSpan={4} className="px-lg py-8 text-center text-body-md text-error">
                          Unable to load appointments. Please sign in as a provider.
                        </td>
                      </tr>
                    )}
                    {!isLoading && !error && appointments.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-lg py-8 text-center text-body-md text-on-surface-variant">
                          No appointments scheduled for today.
                        </td>
                      </tr>
                    )}
                    {!isLoading &&
                      !error &&
                      appointments.map((appointment) => {
                        const patient = appointment.patient.user;
                        const isNext = nextAppointment?.id === appointment.id;
                        const initials = getPatientInitials(patient.firstName, patient.lastName);

                        return (
                          <tr
                            key={appointment.id}
                            onClick={() =>
                              navigate({
                                to: "/provider/appointments/$appointmentId",
                                params: { appointmentId: appointment.id },
                              })
                            }
                            className={`transition-colors group cursor-pointer ${
                              isNext
                                ? "bg-primary-fixed/30 hover:bg-primary-fixed/50"
                                : "hover:bg-surface-container-low"
                            }`}
                          >
                            <td
                              className={`px-lg py-4 text-body-md font-body-md whitespace-nowrap ${
                                isNext ? "text-on-primary-fixed font-semibold" : "text-on-surface"
                              }`}
                            >
                              {formatAppointmentTime(appointment.slotStart)}
                            </td>
                            <td className="px-lg py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center font-label-md ${
                                    isNext
                                      ? "bg-primary-container text-on-primary-container"
                                      : "bg-secondary-container text-on-secondary-container"
                                  }`}
                                >
                                  {initials}
                                </div>
                                <div>
                                  <p className="text-body-md font-body-md font-semibold text-on-surface">
                                    {getPatientDisplayName(patient.firstName, patient.lastName)}
                                  </p>
                                  <p className="text-body-sm font-body-sm text-secondary">ID: {appointment.patient.id.slice(0, 8).toUpperCase()}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-lg py-4 text-body-md font-body-md text-on-surface-variant">
                              {appointment.reasonForVisit || "General Consultation"}
                            </td>
                            <td className="px-lg py-4 text-right">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded text-label-md font-label-md ${getStatusBadgeClasses(appointment.status)}`}
                              >
                                {formatStatusLabel(appointment.status)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Quick Links & Actions */}
            <div className="xl:col-span-1 space-y-gutter">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
                <h3 className="text-headline-md font-headline-md text-on-surface mb-md">Quick Actions</h3>
                <div className="flex flex-col gap-sm">
                  <button className="w-full flex items-center justify-between p-4 rounded-lg bg-surface-bright border border-outline-variant hover:border-primary hover:bg-surface-container-low transition-all group">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary">calendar_today</span>
                      <span className="text-body-md font-body-md font-medium text-on-surface group-hover:text-primary transition-colors">My Calendar</span>
                    </div>
                    <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors text-[20px]">chevron_right</span>
                  </button>
                  <button className="w-full flex items-center justify-between p-4 rounded-lg bg-surface-bright border border-outline-variant hover:border-primary hover:bg-surface-container-low transition-all group">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary">recent_patient</span>
                      <span className="text-body-md font-body-md font-medium text-on-surface group-hover:text-primary transition-colors">Recent Patients</span>
                    </div>
                    <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors text-[20px]">chevron_right</span>
                  </button>
                  <button className="w-full flex items-center justify-between p-4 rounded-lg bg-surface-bright border border-outline-variant hover:border-primary hover:bg-surface-container-low transition-all group relative">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary">note_add</span>
                      <span className="text-body-md font-body-md font-medium text-on-surface group-hover:text-primary transition-colors">Clinical Notes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-error text-on-error text-code-sm font-code-sm px-2 py-0.5 rounded-full">
                        {pendingActionCount} Pending
                      </span>
                      <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors text-[20px]">chevron_right</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
