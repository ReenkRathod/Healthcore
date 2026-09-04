import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useAppointments } from "../hooks/useAppointments";
import {
  getTimeOfDayGreeting,
  getNextUpcomingAppointment,
  formatAppointmentTime,
  formatStatusLabel,
  getStatusBadgeClasses,
  isActiveAppointment,
} from "../lib/appointment-utils";

export default function Index() {
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const { user } = useAuth();

  // Fetch all appointments for this patient
  const { data: appointments = [], isLoading } = useAppointments();

  const upcomingAppointments = appointments
    .filter(
      (a) =>
        isActiveAppointment(a.status) &&
        new Date(a.slotStart).getTime() >= Date.now()
    )
    .sort(
      (a, b) =>
        new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime()
    );

  const recentVisits = appointments
    .filter((a) => a.status === "COMPLETED")
    .sort(
      (a, b) =>
        new Date(b.slotEnd).getTime() - new Date(a.slotEnd).getTime()
    )
    .slice(0, 3);

  const nextAppointment = getNextUpcomingAppointment(appointments);

  const greeting = getTimeOfDayGreeting();
  const firstName = user?.firstName ?? "there";

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col md:flex-row">
      {/* SideNavBar (Web) */}
      <nav className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 p-md z-40 bg-surface dark:bg-on-background border-r border-outline-variant dark:border-outline">
        <div className="mb-lg px-sm">
          <Link to="/patient" className="text-title-md font-bold text-primary dark:text-inverse-primary mb-1 block hover:opacity-80 transition-opacity">
            HealthCore
          </Link>
          <p className="text-label-md font-label-md text-secondary">
            Patient Portal
          </p>
        </div>
        <ul className="flex flex-col gap-sm flex-1 overflow-y-auto">
          <li>
            <Link
              className="flex items-center gap-md p-md bg-primary-container text-on-primary-container font-bold rounded-lg transition-all duration-200"
              to="/patient"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                dashboard
              </span>
              <span className="text-label-md font-label-md">Dashboard</span>
            </Link>
          </li>
          <li>
            <Link
              className="flex items-center gap-md p-md text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container rounded-lg transition-all duration-200"
              to="/find-doctors"
            >
              <span className="material-symbols-outlined">event</span>
              <span className="text-label-md font-label-md">Appointments</span>
            </Link>
          </li>
          <li>
            <Link
              className="flex items-center gap-md p-md text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container rounded-lg transition-all duration-200"
              to="/find-doctors"
            >
              <span className="material-symbols-outlined">search</span>
              <span className="text-label-md font-label-md">Find Doctors</span>
            </Link>
          </li>
          <li>
            <Link
              className="flex items-center gap-md p-md text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container rounded-lg transition-all duration-200"
              to="/profile"
            >
              <span className="material-symbols-outlined">person</span>
              <span className="text-label-md font-label-md">Profile</span>
            </Link>
          </li>
        </ul>
        <div className="mt-auto flex flex-col gap-sm pt-md border-t border-outline-variant">
          <button
            className="w-full flex items-center justify-center gap-sm p-md bg-error text-on-error rounded-lg text-label-md font-label-md font-bold transition-colors hover:bg-error-container hover:text-on-error-container"
            onClick={() => setEmergencyOpen((v) => !v)}
          >
            <span className="material-symbols-outlined">emergency</span>
            Emergency Alert
          </button>
          {emergencyOpen && (
            <p className="text-body-sm font-body-sm text-error">
              Emergency services would be contacted now.
            </p>
          )}
          <ul className="flex flex-col gap-sm">
            <li>
              <Link
                className="flex items-center gap-md p-md text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container rounded-lg transition-all duration-200"
                to="/auth"
              >
                <span className="material-symbols-outlined">logout</span>
                <span className="text-label-md font-label-md">Logout</span>
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* TopNavBar (Mobile/Tablet) */}
      <header className="sticky top-0 w-full flex justify-between items-center px-lg h-16 bg-surface-container-lowest dark:bg-inverse-surface border-b border-outline-variant dark:border-outline lg:hidden z-50">
        <div className="flex items-center gap-md">
          <Link to="/patient" className="text-headline-md font-headline-md font-bold text-primary dark:text-inverse-primary hover:opacity-80 transition-opacity">
            HealthCore
          </Link>
        </div>
        <div className="flex items-center gap-md">
          <button className="text-on-surface-variant hover:bg-surface-container-low p-sm rounded-full transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <Link to="/profile" className="text-on-surface-variant hover:bg-surface-container-low p-sm rounded-full transition-colors">
            <span className="material-symbols-outlined">person</span>
          </Link>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 lg:ml-64 p-margin-mobile md:p-gutter max-w-[1440px] mx-auto w-full">
        {/* Header Section */}
        <header className="mb-gutter">
          <h2 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg text-on-background mb-sm">
            {greeting}, {firstName}
          </h2>
          <p className="text-body-md font-body-md text-secondary">
            {upcomingAppointments.length > 0
              ? `You have ${upcomingAppointments.length} upcoming appointment${upcomingAppointments.length > 1 ? "s" : ""}.`
              : "No upcoming appointments. Book one to get started."}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
          {/* Left Column: Primary Actions & Next Appt */}
          <div className="md:col-span-8 flex flex-col gap-gutter">
            {/* Next Appointment Card */}
            <div className="bg-surface-container-lowest border border-surface-variant rounded-lg p-lg">
              <div className="flex justify-between items-start mb-md">
                <h3 className="text-headline-md font-headline-md text-on-surface">
                  Next Appointment
                </h3>
                {nextAppointment && (
                  <span
                    className={`inline-flex items-center px-sm py-unit rounded-full text-code-sm font-code-sm uppercase tracking-wide ${getStatusBadgeClasses(nextAppointment.status)}`}
                  >
                    {formatStatusLabel(nextAppointment.status)}
                  </span>
                )}
              </div>

              {isLoading ? (
                <div className="flex flex-col gap-md animate-pulse">
                  <div className="h-16 bg-surface-container-low rounded-lg" />
                  <div className="h-10 bg-surface-container-low rounded-lg w-1/2" />
                </div>
              ) : nextAppointment ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-md sm:gap-lg bg-surface-container-low p-md rounded-lg mb-md">
                    {/* Doctor info */}
                    <div className="flex items-center gap-md">
                      {nextAppointment.doctor.avatarUrl ? (
                        <img
                          alt={`${nextAppointment.doctor.title ?? ""} ${nextAppointment.doctor.user.firstName} ${nextAppointment.doctor.user.lastName}`}
                          className="w-12 h-12 rounded-full object-cover"
                          src={nextAppointment.doctor.avatarUrl}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-bold text-label-lg">
                          {nextAppointment.doctor.user.firstName.charAt(0)}
                          {nextAppointment.doctor.user.lastName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-label-md font-label-md text-on-surface">
                          {nextAppointment.doctor.title
                            ? `${nextAppointment.doctor.title} `
                            : ""}
                          {nextAppointment.doctor.user.firstName}{" "}
                          {nextAppointment.doctor.user.lastName}
                        </p>
                      </div>
                    </div>
                    <div className="hidden sm:block w-px h-10 bg-outline-variant" />
                    {/* Time info */}
                    <div className="flex items-center gap-md">
                      <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container">
                        <span className="material-symbols-outlined">
                          calendar_today
                        </span>
                      </div>
                      <div>
                        <p className="text-label-md font-label-md text-on-surface">
                          {new Date(nextAppointment.slotStart).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric", year: "numeric" }
                          )}
                        </p>
                        <p className="text-body-sm font-body-sm text-secondary">
                          {formatAppointmentTime(nextAppointment.slotStart)}
                        </p>
                      </div>
                    </div>
                  </div>
                  {nextAppointment.reasonForVisit && (
                    <p className="text-body-sm font-body-sm text-secondary mb-md px-xs">
                      Reason: {nextAppointment.reasonForVisit}
                    </p>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-xl gap-md text-center">
                  <span className="material-symbols-outlined text-[48px] text-outline">
                    calendar_today
                  </span>
                  <p className="text-body-md font-body-md text-secondary">
                    No upcoming appointments scheduled.
                  </p>
                  <Link
                    to="/find-doctors"
                    className="inline-flex items-center gap-xs bg-primary text-on-primary px-lg py-sm rounded-lg text-label-md font-label-md hover:opacity-90 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      search
                    </span>
                    Find a Doctor
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Actions Bento */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
              <Link
                className="flex flex-col items-center justify-center p-lg bg-surface-container-lowest border border-surface-variant rounded-lg hover:bg-surface-container-low transition-colors group"
                to="/find-doctors"
              >
                <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container mb-md group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">search</span>
                </div>
                <span className="text-label-md font-label-md text-on-surface">
                  Find a Doctor
                </span>
              </Link>
              <Link
                className="flex flex-col items-center justify-center p-lg bg-surface-container-lowest border border-surface-variant rounded-lg hover:bg-surface-container-low transition-colors group"
                to="/find-doctors"
              >
                <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container mb-md group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">
                    edit_calendar
                  </span>
                </div>
                <span className="text-label-md font-label-md text-on-surface">
                  Book Appointment
                </span>
              </Link>
              <button className="flex flex-col items-center justify-center p-lg bg-surface-container-lowest border border-surface-variant rounded-lg hover:bg-surface-container-low transition-colors group">
                <div className="w-12 h-12 rounded-full bg-tertiary-container flex items-center justify-center text-on-tertiary-container mb-md group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">history</span>
                </div>
                <span className="text-label-md font-label-md text-on-surface">
                  View My History
                </span>
              </button>
            </div>

            {/* Upcoming Appointments List */}
            <div className="bg-surface-container-lowest border border-surface-variant rounded-lg overflow-hidden">
              <div className="p-md border-b border-surface-variant bg-surface-container-low">
                <h3 className="text-label-md font-label-md text-on-surface uppercase tracking-wider">
                  Upcoming Appointments
                </h3>
              </div>
              <div className="flex flex-col">
                {isLoading ? (
                  <div className="flex flex-col gap-sm p-md animate-pulse">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-14 bg-surface-container-low rounded-lg"
                      />
                    ))}
                  </div>
                ) : upcomingAppointments.length === 0 ? (
                  <div className="p-lg text-center text-secondary text-body-md font-body-md">
                    No upcoming appointments.{" "}
                    <Link
                      to="/find-doctors"
                      className="text-primary hover:underline"
                    >
                      Book one now
                    </Link>
                    .
                  </div>
                ) : (
                  upcomingAppointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="flex items-center justify-between p-md border-b border-surface-variant hover:bg-surface-container-low transition-colors"
                    >
                      <div className="flex items-center gap-md">
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        <div>
                          <p className="text-body-md font-body-md text-on-surface">
                            {appt.reasonForVisit ?? "Medical Appointment"}
                          </p>
                          <p className="text-body-sm font-body-sm text-secondary">
                            {appt.doctor.title ? `${appt.doctor.title} ` : ""}
                            {appt.doctor.user.firstName}{" "}
                            {appt.doctor.user.lastName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-label-md font-label-md text-on-surface">
                          {new Date(appt.slotStart).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric" }
                          )}
                        </p>
                        <p className="text-body-sm font-body-sm text-secondary">
                          {formatAppointmentTime(appt.slotStart)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Recent Visits & Tips */}
          <div className="md:col-span-4 flex flex-col gap-gutter">
            {/* Recent Visit Summaries */}
            <div className="bg-surface-container-lowest border border-surface-variant rounded-lg p-lg">
              <div className="flex items-center justify-between mb-md">
                <h3 className="text-headline-md font-headline-md text-on-surface">
                  Recent Visits
                </h3>
              </div>
              <div className="flex flex-col gap-md">
                {isLoading ? (
                  <div className="flex flex-col gap-sm animate-pulse">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-16 bg-surface-container-low rounded-lg"
                      />
                    ))}
                  </div>
                ) : recentVisits.length === 0 ? (
                  <p className="text-body-sm font-body-sm text-secondary">
                    No completed visits yet.
                  </p>
                ) : (
                  recentVisits.map((appt) => (
                    <div
                      key={appt.id}
                      className="p-md bg-surface-container-low rounded-lg border border-transparent hover:border-outline-variant transition-colors"
                    >
                      <div className="flex justify-between items-start mb-sm">
                        <span className="text-label-md font-label-md text-on-surface">
                          {appt.reasonForVisit ?? "Visit"}
                        </span>
                        <span className="text-body-sm font-body-sm text-secondary">
                          {new Date(appt.slotStart).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric" }
                          )}
                        </span>
                      </div>
                      <p className="text-body-sm font-body-sm text-secondary line-clamp-2">
                        {appt.doctor.title ? `${appt.doctor.title} ` : ""}
                        {appt.doctor.user.firstName}{" "}
                        {appt.doctor.user.lastName}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Health Tips (Clinical Feel) */}
            <div className="bg-primary-container text-on-primary-container rounded-lg p-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-[40px] -mr-[40px] opacity-20">
                <span className="material-symbols-outlined text-[120px]">
                  monitor_heart
                </span>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-sm mb-md">
                  <span className="material-symbols-outlined">lightbulb</span>
                  <h3 className="text-label-md font-label-md font-bold">
                    Clinical Insight
                  </h3>
                </div>
                <p className="text-body-md font-body-md mb-md">
                  Maintaining consistent sleep patterns supports cardiovascular
                  health and metabolic function.
                </p>
                <a
                  className="inline-flex items-center text-label-md font-label-md font-bold hover:underline"
                  href="#"
                >
                  Read more evidence
                  <span className="material-symbols-outlined text-[16px] ml-unit">
                    arrow_forward
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
