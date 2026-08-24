import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/admin/doctors")({
  head: () => ({
    meta: [
      { title: "Doctor Management | HealthCore Admin" },
      {
        name: "description",
        content: "Manage hospital staff, availability, and active status for doctors on the HealthCore platform.",
      },
      { property: "og:title", content: "Doctor Management | HealthCore Admin" },
      {
        property: "og:description",
        content: "Manage hospital staff, availability, and active status for doctors on the HealthCore platform.",
      },
    ],
  }),
  component: AdminDoctors,
});

import { useAdminDoctors, useToggleDoctorStatus, useVerifyDoctor } from "../hooks/useDoctors";
import { useAuth } from "../hooks/useAuth";

function AdminDoctors() {
  const [search, setSearch] = useState("");
  const [specialisation, setSpecialisation] = useState("");
  const [status, setStatus] = useState("");
  const queryFilters: { search?: string; specialisation?: string; isAccepting?: string } = {};
  if (search) queryFilters.search = search;
  if (specialisation) queryFilters.specialisation = specialisation;
  if (status === "active") queryFilters.isAccepting = "true";
  else if (status === "inactive") queryFilters.isAccepting = "false";

  const { data: doctors = [], isLoading, error } = useAdminDoctors(queryFilters);
  
  const toggleStatus = useToggleDoctorStatus();
  const verifyDoctor = useVerifyDoctor();
  const { logout } = useAuth();

  const toggleActive = (id: string, currentStatus: boolean) => {
    toggleStatus.mutate({ id, isActive: !currentStatus });
  };

  return (
    <div className="bg-background text-on-surface font-body-md antialiased h-full flex flex-col md:flex-row overflow-hidden">
      <nav className="md:hidden sticky top-0 w-full flex justify-between items-center px-lg h-16 bg-surface-container-lowest dark:bg-inverse-surface border-b border-outline-variant z-50">
        <div className="flex items-center gap-sm">
          <span
            className="material-symbols-outlined text-primary text-[28px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            medical_services
          </span>
          <span className="text-headline-md font-headline-md font-bold text-primary dark:text-inverse-primary">
            HealthCore
          </span>
        </div>
        <div className="flex items-center gap-md">
          <button className="text-on-surface-variant hover:bg-surface-container-low p-sm rounded-full transition-colors flex items-center justify-center">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="text-on-surface-variant hover:bg-surface-container-low p-sm rounded-full transition-colors flex items-center justify-center">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </nav>
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 p-md z-40 bg-surface dark:bg-on-background border-r border-outline-variant dark:border-outline">
        <div className="flex items-center gap-sm mb-lg px-sm">
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container">
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              health_and_safety
            </span>
          </div>
          <div>
            <h1 className="text-label-md font-label-md font-bold text-primary dark:text-inverse-primary truncate">
              HealthCore Professional
            </h1>
            <p className="text-body-sm font-body-sm text-secondary truncate">
              Provider Portal
            </p>
          </div>
        </div>
        <nav className="flex-1 space-y-xs overflow-y-auto mt-md">
          <Link
            className="flex items-center gap-md px-md py-sm rounded-lg text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container transition-all duration-200"
            to="/provider"
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-label-md font-label-md">Dashboard</span>
          </Link>
          <Link
            className="flex items-center gap-md px-md py-sm rounded-lg text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container transition-all duration-200"
            to="/provider/appointments/$appointmentId"
            params={{ appointmentId: "1" }}
          >
            <span className="material-symbols-outlined">event</span>
            <span className="text-label-md font-label-md">Appointments</span>
          </Link>
          <a
            className="flex items-center gap-md px-md py-sm rounded-lg text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container transition-all duration-200"
            href="#"
          >
            <span className="material-symbols-outlined">group</span>
            <span className="text-label-md font-label-md">Patients</span>
          </a>
          <Link
            className="flex items-center gap-md px-md py-sm rounded-lg bg-secondary-container text-on-secondary-container font-medium transition-all duration-200"
            to="/admin/doctors"
          >
            <span className="material-symbols-outlined">groups</span>
            <span className="text-label-md font-label-md">Doctors</span>
          </Link>
        </nav>
        <div className="mt-auto space-y-sm pt-md border-t border-outline-variant">
          <button className="w-full flex items-center justify-center gap-sm bg-error text-on-error py-sm rounded-lg font-label-md text-label-md shadow-sm hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined text-[20px]">warning</span>
            Emergency Alert
          </button>
          <a
            className="flex items-center gap-md px-md py-sm rounded-lg text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container transition-all duration-200"
            href="#"
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="text-label-md font-label-md">Settings</span>
          </a>
          <button
            className="flex items-center gap-md px-md py-sm rounded-lg text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container transition-all duration-200 w-full text-left"
            onClick={() => logout()}
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="text-label-md font-label-md">Logout</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col lg:ml-64 h-[calc(100vh-4rem)] md:h-screen overflow-y-auto bg-background">
        <header className="bg-surface-container-lowest border-b border-outline-variant px-lg py-md sticky top-0 z-30">
          <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-md">
            <div>
              <h2 className="text-headline-lg font-headline-lg text-on-surface mb-xs">
                Doctor Management
              </h2>
              <p className="text-body-md font-body-md text-on-surface-variant">
                Manage hospital staff, availability, and active status.
              </p>
            </div>
            <div className="flex items-center gap-sm">
              <button className="bg-primary-container text-on-primary-container px-md py-sm rounded-lg flex items-center gap-xs font-label-md text-label-md hover:opacity-90 transition-opacity shadow-sm">
                <span className="material-symbols-outlined text-[20px]">add</span>
                Add New Doctor
              </button>
            </div>
          </div>
        </header>
        <div className="p-lg max-w-[1440px] mx-auto w-full flex-1 space-y-gutter">
          <section className="bg-surface-container-lowest p-md rounded-lg border border-outline-variant flex flex-col md:flex-row gap-md items-center justify-between">
            <div className="relative w-full md:w-96">
              <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                search
              </span>
              <input
                className="w-full pl-[40px] pr-sm py-sm bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-primary text-body-md font-body-md text-on-surface placeholder-on-surface-variant transition-shadow"
                placeholder="Search doctors by name or ID..."
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-sm w-full md:w-auto overflow-x-auto pb-xs md:pb-0 hide-scrollbar">
              <select 
                className="bg-surface-container-low border-none rounded-lg text-body-sm font-body-sm text-on-surface py-sm pl-md pr-[32px] focus:ring-2 focus:ring-primary cursor-pointer min-w-[140px]"
                value={specialisation}
                onChange={(e) => setSpecialisation(e.target.value)}
              >
                <option value="">All Specialties</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Neurology">Neurology</option>
                <option value="General Practice">General Practice</option>
              </select>
              <select 
                className="bg-surface-container-low border-none rounded-lg text-body-sm font-body-sm text-on-surface py-sm pl-md pr-[32px] focus:ring-2 focus:ring-primary cursor-pointer min-w-[120px]"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Status</option>
                <option value="active">Accepting</option>
                <option value="inactive">Not Accepting</option>
              </select>
            </div>
          </section>
          <section className="bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-surface-container-low text-label-md font-label-md text-on-surface-variant border-b border-outline-variant">
                  <tr>
                    <th className="p-md font-semibold uppercase tracking-wider">Doctor</th>
                    <th className="p-md font-semibold uppercase tracking-wider">Specialisation</th>
                    <th className="p-md font-semibold uppercase tracking-wider">Status</th>
                    <th className="p-md font-semibold uppercase tracking-wider">Verification</th>
                    <th className="p-md font-semibold uppercase tracking-wider">
                      Accepting Appointments
                    </th>
                    <th className="p-md font-semibold uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="text-body-sm font-body-sm text-on-surface divide-y divide-outline-variant">
                  {isLoading && (
                    <tr>
                      <td className="p-md text-center text-on-surface-variant" colSpan={5}>
                        Loading doctors...
                      </td>
                    </tr>
                  )}
                  {error && (
                    <tr>
                      <td className="p-md text-center text-error" colSpan={5}>
                        Error loading doctors.
                      </td>
                    </tr>
                  )}
                  {!isLoading && !error && doctors.map((d) => (
                    <tr
                      key={d.id}
                      className="hover:bg-surface-container-low transition-colors group"
                    >
                      <td className="p-md">
                        <div className="flex items-center gap-md">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-variant flex-shrink-0 flex items-center justify-center text-on-surface-variant">
                            {d.avatarUrl ? (
                              <img
                                className="w-full h-full object-cover"
                                alt={`${d.firstName} ${d.lastName}`}
                                src={d.avatarUrl}
                              />
                            ) : (
                              <span className="material-symbols-outlined">person</span>
                            )}
                          </div>
                          <div>
                            <Link
                              to="/doctors/$doctorId"
                              params={{ doctorId: d.id }}
                              className="font-semibold text-on-surface group-hover:text-primary transition-colors"
                            >
                              {d.title ? `${d.title} ` : ''}{d.firstName} {d.lastName}
                            </Link>
                            <p className="text-on-surface-variant text-code-sm font-code-sm">
                              ID: {d.licenseNumber || d.id.substring(0, 8)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-md">
                        <div className="flex flex-wrap gap-1">
                          {d.specialisations?.map(s => (
                            <span key={s.id} className="inline-flex items-center px-sm py-xs rounded-full bg-tertiary-container/10 text-tertiary-container font-medium text-xs">
                              {s.name}
                            </span>
                          ))}
                          {(!d.specialisations || d.specialisations.length === 0) && (
                            <span className="text-on-surface-variant text-xs italic">None</span>
                          )}
                        </div>
                      </td>
                      <td className="p-md">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            checked={d.isActive}
                            onChange={() => toggleActive(d.id, d.isActive)}
                            className="sr-only peer"
                            type="checkbox"
                            disabled={toggleStatus.isPending}
                          />
                          <div className="w-9 h-5 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                          <span className="ml-sm text-sm font-medium text-on-surface-variant peer-checked:text-primary">
                            {d.isActive ? "Active" : "Inactive"}
                          </span>
                        </label>
                      </td>
                      <td className="p-md">
                        {d.isVerifiedByAdmin ? (
                          <div className="flex items-center gap-xs text-[12px] font-medium text-[#198754] bg-[#198754]/10 px-sm py-xs rounded-full w-fit">
                            <span className="material-symbols-outlined text-[16px]">verified_user</span>
                            Verified
                          </div>
                        ) : (
                          <div className="flex items-center gap-xs text-[12px] font-medium text-[#FFB300] bg-[#FFB300]/10 px-sm py-xs rounded-full w-fit">
                            <span className="material-symbols-outlined text-[16px]">pending_actions</span>
                            Pending
                          </div>
                        )}
                      </td>
                      <td className="p-md">
                        {d.isAccepting ? (
                          <div className="flex items-center gap-xs text-[12px] font-medium text-[#198754] bg-[#198754]/10 px-sm py-xs rounded-full w-fit">
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            Yes
                          </div>
                        ) : (
                          <div className="flex items-center gap-xs text-[12px] font-medium text-[#DC3545] bg-[#DC3545]/10 px-sm py-xs rounded-full w-fit">
                            <span className="material-symbols-outlined text-[16px]">cancel</span>
                            No
                          </div>
                        )}
                      </td>
                      <td className="p-md text-right">
                        <div className="flex items-center justify-end gap-sm opacity-0 group-hover:opacity-100 transition-opacity">
                          {!d.isVerifiedByAdmin && (
                            <button
                              onClick={() => verifyDoctor.mutate(d.id)}
                              disabled={verifyDoctor.isPending}
                              className="text-[#198754] hover:bg-[#198754]/10 px-sm py-xs rounded transition-colors text-label-md font-bold"
                              title="Verify Doctor"
                            >
                              Verify
                            </button>
                          )}
                          <button
                            className="text-primary hover:bg-primary/10 p-xs rounded transition-colors"
                            title="Edit Details"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button
                            className="text-secondary hover:bg-secondary/10 p-xs rounded transition-colors"
                            title="Working Hours"
                          >
                            <span className="material-symbols-outlined text-[20px]">schedule</span>
                          </button>
                          <button
                            className="text-secondary hover:bg-secondary/10 p-xs rounded transition-colors"
                            title="Manage Leave"
                          >
                            <span className="material-symbols-outlined text-[20px]">event_busy</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!isLoading && !error && doctors.length === 0 && (
                    <tr>
                      <td className="p-md text-center text-on-surface-variant" colSpan={5}>
                        No doctors match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-outline-variant bg-surface-container-lowest p-sm flex items-center justify-between text-body-sm font-body-sm text-on-surface-variant">
              <div>Showing {doctors.length} doctors</div>
              <div className="flex gap-xs">
                <button className="p-xs rounded hover:bg-surface-container-low disabled:opacity-50" disabled>
                  <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                </button>
                <button className="p-xs rounded hover:bg-surface-container-low">
                  <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
