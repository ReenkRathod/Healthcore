import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Patient Dashboard - HealthCore" },
      {
        name: "description",
        content:
          "View your upcoming appointments, quick actions, and recent visit summaries in your HealthCore patient dashboard.",
      },
      { property: "og:title", content: "Patient Dashboard - HealthCore" },
      {
        property: "og:description",
        content:
          "View your upcoming appointments, quick actions, and recent visit summaries in your HealthCore patient dashboard.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [emergencyOpen, setEmergencyOpen] = useState(false);

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col md:flex-row">
      {/* SideNavBar (Web) */}
      <nav className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 p-md z-40 bg-surface dark:bg-on-background border-r border-outline-variant dark:border-outline">
        <div className="flex items-center gap-md mb-lg">
          <img
            alt="Medical Facility Logo"
            className="w-10 h-10 rounded-full object-cover shrink-0"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBmeb54nTexFqUx7nOUlPdWKjATZypWYsBhdTtfPjMifSDCrWOD18tKXSR_1Ca6ttDix61W3pHs7Q8neM7me2sPpLfA7y2DSf0KJlvHMKuLRL39CmhGgN42Ww586CsEkpkAEOM5sI8sbLZpN-Pwx9VJrUGTv11aWa48X1ljMmclhDe88MhXc7tnqOlLgeDxnIojCnFdKzG1xPkNKiJ3fZIQ2s4eku1LGJgsTc781y3S_IHPNQsa7HI2Xg"
          />
          <div>
            <h1 className="text-headline-sm font-headline-md font-bold text-primary dark:text-inverse-primary truncate">
              HealthCore Professional
            </h1>
            <p className="text-label-md font-label-md text-secondary truncate">
              Provider Portal
            </p>
          </div>
        </div>
        <ul className="flex flex-col gap-sm flex-1 overflow-y-auto">
          <li>
            <Link
              className="flex items-center gap-md p-md bg-primary-container text-on-primary-container font-bold rounded-lg transition-all duration-200"
              to="/"
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
              to="/book/symptoms"
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
              <span className="material-symbols-outlined">group</span>
              <span className="text-label-md font-label-md">Patients</span>
            </Link>
          </li>
          <li>
            <a
              className="flex items-center gap-md p-md text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container rounded-lg transition-all duration-200"
              href="#"
            >
              <span className="material-symbols-outlined">calendar_month</span>
              <span className="text-label-md font-label-md">Calendar</span>
            </a>
          </li>
          <li>
            <a
              className="flex items-center gap-md p-md text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container rounded-lg transition-all duration-200"
              href="#"
            >
              <span className="material-symbols-outlined">person</span>
              <span className="text-label-md font-label-md">Profile</span>
            </a>
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
              <a
                className="flex items-center gap-md p-md text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container rounded-lg transition-all duration-200"
                href="#"
              >
                <span className="material-symbols-outlined">settings</span>
                <span className="text-label-md font-label-md">Settings</span>
              </a>
            </li>
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
          <span className="text-headline-md font-headline-md font-bold text-primary dark:text-inverse-primary">
            HealthCore
          </span>
        </div>
        <div className="flex items-center gap-md">
          <button className="text-on-surface-variant hover:bg-surface-container-low p-sm rounded-full transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="text-on-surface-variant hover:bg-surface-container-low p-sm rounded-full transition-colors">
            <span className="material-symbols-outlined">help</span>
          </button>
          <img
            alt="User profile"
            className="w-8 h-8 rounded-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAiMh533FMFGhr-g31g2x9fUsr_DgREDT2Y6jKgFWk2wCPsLhSq1wsf4eFxpQvMpNiTifWiH3PfJEtJOohqFRSYNxDV56x5A1U12IZ1-hcUe20hr5KVd1VqT2Lz0Lr-HVd4K5jXI_VK6fSd98nTQ9tZdwRaQ1eOjI96yfVmgIc8sV-ce0v-g6-pGxFx42zHtAvQozjVtbsD7A2mTJgLTimj4tiiUAdgWLIeFaZI_F-9JrpGoLidNzfL6A"
          />
        </div>
      </header>
      {/* Main Content Canvas */}
      <main className="flex-1 lg:ml-64 p-margin-mobile md:p-gutter max-w-[1440px] mx-auto w-full">
        {/* Header Section */}
        <header className="mb-gutter">
          <h2 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg text-on-background mb-sm">
            Good morning, Alexander
          </h2>
          <p className="text-body-md font-body-md text-secondary">
            Here is an overview of your health status and upcoming activities.
          </p>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
          {/* Left Column: Primary Actions & Next Appt */}
          <div className="md:col-span-8 flex flex-col gap-gutter">
            {/* Next Appointment Card (Level 1) */}
            <div className="bg-surface-container-lowest border border-surface-variant rounded-lg p-lg">
              <div className="flex justify-between items-start mb-md">
                <h3 className="text-headline-md font-headline-md text-on-surface">
                  Next Appointment
                </h3>
                <span className="inline-flex items-center px-sm py-unit rounded-full bg-[#E6F4EA] text-[#1E4620] text-code-sm font-code-sm uppercase tracking-wide">
                  <span className="material-symbols-outlined text-[14px] mr-unit">
                    check_circle
                  </span>
                  Confirmed
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-md sm:gap-lg bg-surface-container-low p-md rounded-lg mb-md">
                <div className="flex items-center gap-md">
                  <img
                    alt="Dr. Sarah Johnson"
                    className="w-12 h-12 rounded-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDqNYy7bw0ssakvTR981wBr4hNX257ke_kabXViiIUkexNsuwMiekMeIKJXAo4PK-3ke27UmzbtrQk2RLC1wrXgqe3Cepcw1BIB1QMrL6lsFksiniEdaReez1PCWTbq9NBqVeeDhxA4hyJZR1roICFyKR3Q9m7YYu7EfXsdbH_98d_C_HTAZ1ql6LBzZO8iHZkO2f5hgCjLm9CBTmyohr-8E5jhcv5b7e64waFd5MbyuCdUrPUpeXvMfg"
                  />
                  <div>
                    <p className="text-label-md font-label-md text-on-surface">
                      Dr. Sarah Johnson
                    </p>
                    <p className="text-body-sm font-body-sm text-secondary">
                      Cardiology
                    </p>
                  </div>
                </div>
                <div className="hidden sm:block w-px h-10 bg-outline-variant"></div>
                <div className="flex items-center gap-md">
                  <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container">
                    <span className="material-symbols-outlined">calendar_today</span>
                  </div>
                  <div>
                    <p className="text-label-md font-label-md text-on-surface">
                      Oct 15, 2024
                    </p>
                    <p className="text-body-sm font-body-sm text-secondary">
                      09:30 AM
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-md">
                <button className="flex-1 bg-surface-container-lowest border border-outline text-on-surface py-sm px-md rounded-lg text-label-md font-label-md hover:bg-surface-container-low transition-colors">
                  Reschedule
                </button>
                <Link
                  className="flex-1 bg-primary text-on-primary py-sm px-md rounded-lg text-label-md font-label-md hover:bg-on-primary-fixed-variant transition-colors text-center"
                  to="/provider/appointments/$appointmentId"
                  params={{ appointmentId: "1" }}
                >
                  Join Telehealth
                </Link>
              </div>
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
                to="/book/symptoms"
              >
                <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container mb-md group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">edit_calendar</span>
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
                {/* Item 1 */}
                <div className="flex items-center justify-between p-md border-b border-surface-variant hover:bg-surface-container-low transition-colors">
                  <div className="flex items-center gap-md">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <div>
                      <p className="text-body-md font-body-md text-on-surface">
                        Annual Physical Checkup
                      </p>
                      <p className="text-body-sm font-body-sm text-secondary">
                        Dr. Robert Chen • General Practice
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-label-md font-label-md text-on-surface">
                      Nov 02
                    </p>
                    <p className="text-body-sm font-body-sm text-secondary">
                      11:00 AM
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Right Column: Summaries & Tips */}
          <div className="md:col-span-4 flex flex-col gap-gutter">
            {/* Recent Visit Summaries */}
            <div className="bg-surface-container-lowest border border-surface-variant rounded-lg p-lg">
              <div className="flex items-center justify-between mb-md">
                <h3 className="text-headline-md font-headline-md text-on-surface">
                  Recent Visits
                </h3>
                <a className="text-primary text-label-md font-label-md hover:underline" href="#">
                  View All
                </a>
              </div>
              <div className="flex flex-col gap-md">
                <div className="p-md bg-surface-container-low rounded-lg border border-transparent hover:border-outline-variant transition-colors cursor-pointer">
                  <div className="flex justify-between items-start mb-sm">
                    <span className="text-label-md font-label-md text-on-surface">
                      Blood Test Results
                    </span>
                    <span className="text-body-sm font-body-sm text-secondary">
                      Sep 28
                    </span>
                  </div>
                  <p className="text-body-sm font-body-sm text-secondary line-clamp-2">
                    All parameters within normal ranges. Cholesterol levels improved since last visit.
                  </p>
                </div>
                <div className="p-md bg-surface-container-low rounded-lg border border-transparent hover:border-outline-variant transition-colors cursor-pointer">
                  <div className="flex justify-between items-start mb-sm">
                    <span className="text-label-md font-label-md text-on-surface">
                      Dermatology Consult
                    </span>
                    <span className="text-body-sm font-body-sm text-secondary">
                      Aug 15
                    </span>
                  </div>
                  <p className="text-body-sm font-body-sm text-secondary line-clamp-2">
                    Routine skin check completed. No areas of concern identified. Continue daily SPF application.
                  </p>
                </div>
              </div>
            </div>
            {/* Health Tips (Clinical Feel) */}
            <div className="bg-primary-container text-on-primary-container rounded-lg p-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-[40px] -mr-[40px] opacity-20">
                <span className="material-symbols-outlined text-[120px]">monitor_heart</span>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-sm mb-md">
                  <span className="material-symbols-outlined">lightbulb</span>
                  <h3 className="text-label-md font-label-md font-bold">Clinical Insight</h3>
                </div>
                <p className="text-body-md font-body-md mb-md">
                  Maintaining consistent sleep patterns supports cardiovascular health and metabolic function.
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
