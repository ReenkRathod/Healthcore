import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAdminDoctors, useToggleDoctorStatus, useVerifyDoctor, useRejectDoctor } from "../hooks/useDoctors";
import { useAuth } from "../hooks/useAuth";

type AdminTab = "all" | "pending";

export default function AdminDoctors() {
  const [tab, setTab] = useState<AdminTab>("pending");
  const [search, setSearch] = useState("");
  const [specialisation, setSpecialisation] = useState("");
  const [status, setStatus] = useState("");

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const queryFilters: { search?: string; specialisation?: string; isAccepting?: string } = {};
  if (search) queryFilters.search = search;
  if (specialisation) queryFilters.specialisation = specialisation;
  if (status === "active") queryFilters.isAccepting = "true";
  else if (status === "inactive") queryFilters.isAccepting = "false";

  const { data: doctors = [], isLoading, error } = useAdminDoctors(queryFilters);

  const toggleStatus = useToggleDoctorStatus();
  const verifyDoctor = useVerifyDoctor();
  const rejectDoctor = useRejectDoctor();
  const { logout } = useAuth();

  const pendingDoctors = doctors.filter((d) => !d.isVerifiedByAdmin && d.isActive !== false);
  const allDoctors = doctors;

  const displayedDoctors = tab === "pending" ? pendingDoctors : allDoctors;

  const toggleActive = (id: string, currentStatus: boolean) => {
    toggleStatus.mutate({ id, isActive: !currentStatus });
  };

  const handleVerify = (id: string) => {
    verifyDoctor.mutate(id);
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    await rejectDoctor.mutateAsync({ id: rejectTarget.id, ...(rejectReason ? { reason: rejectReason } : {}) });
    setRejectTarget(null);
    setRejectReason("");
  };

  return (
    <div className="bg-background text-on-surface font-body-md antialiased h-full flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Nav */}
      <nav className="md:hidden sticky top-0 w-full flex justify-between items-center px-lg h-16 bg-surface-container-lowest border-b border-outline-variant z-50">
        <Link to="/admin" className="flex items-center gap-sm hover:opacity-80 transition-opacity">
          <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            medical_services
          </span>
          <span className="text-headline-md font-headline-md font-bold text-primary">HealthCore</span>
        </Link>
      </nav>

      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 p-md z-40 bg-surface border-r border-outline-variant">
        <div className="flex items-center gap-sm mb-lg px-sm">
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>health_and_safety</span>
          </div>
          <Link to="/admin" className="hover:opacity-80 transition-opacity">
            <h1 className="text-label-md font-label-md font-bold text-primary truncate">HealthCore Admin</h1>
            <p className="text-body-sm font-body-sm text-secondary truncate">Administration Portal</p>
          </Link>
        </div>
        <nav className="flex-1 space-y-xs overflow-y-auto mt-md">
          <Link
            className="flex items-center gap-md px-md py-sm rounded-lg text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container transition-all duration-200"
            to="/admin"
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-label-md font-label-md">Dashboard</span>
          </Link>
          <Link
            className="flex items-center gap-md px-md py-sm rounded-lg bg-secondary-container text-on-secondary-container font-medium transition-all duration-200"
            to="/admin/doctors"
          >
            <span className="material-symbols-outlined">groups</span>
            <span className="text-label-md font-label-md">Doctors</span>
          </Link>
        </nav>
        <div className="mt-auto space-y-sm pt-md border-t border-outline-variant">
          <button
            className="flex items-center gap-md px-md py-sm rounded-lg text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container transition-all duration-200 w-full text-left"
            onClick={() => logout()}
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="text-label-md font-label-md">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col lg:ml-64 h-[calc(100vh-4rem)] md:h-screen overflow-y-auto bg-background">
        <header className="bg-surface-container-lowest border-b border-outline-variant px-lg py-md sticky top-0 z-30">
          <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-md">
            <div>
              <h2 className="text-headline-lg font-headline-lg text-on-surface mb-xs">Doctor Management</h2>
              <p className="text-body-md font-body-md text-on-surface-variant">
                Review applications, manage staff and availability.
              </p>
            </div>
          </div>
        </header>

        <div className="p-lg max-w-[1440px] mx-auto w-full flex-1 space-y-gutter">
          {/* Tabs */}
          <div className="flex gap-xs border-b border-outline-variant">
            <button
              onClick={() => setTab("pending")}
              className={`flex items-center gap-xs pb-sm px-md border-b-2 font-label-md text-label-md transition-colors ${
                tab === "pending"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">pending_actions</span>
              Pending Verification
              {pendingDoctors.length > 0 && (
                <span className="ml-xs bg-error text-on-error text-code-sm font-code-sm px-xs py-unit rounded-full">
                  {pendingDoctors.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("all")}
              className={`flex items-center gap-xs pb-sm px-md border-b-2 font-label-md text-label-md transition-colors ${
                tab === "all"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">groups</span>
              All Doctors
            </button>
          </div>

          {/* Filters (only on All tab) */}
          {tab === "all" && (
            <section className="bg-surface-container-lowest p-md rounded-lg border border-outline-variant flex flex-col md:flex-row gap-md items-center justify-between">
              <div className="relative w-full md:w-96">
                <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">search</span>
                <input
                  className="w-full pl-[40px] pr-sm py-sm bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-primary text-body-md font-body-md text-on-surface placeholder-on-surface-variant transition-shadow"
                  placeholder="Search doctors by name..."
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-sm w-full md:w-auto overflow-x-auto pb-xs md:pb-0">
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
          )}

          {/* Pending Verification Cards */}
          {tab === "pending" && (
            <section>
              {isLoading && (
                <div className="flex flex-col gap-md animate-pulse">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-36 bg-surface-container-low rounded-xl border border-outline-variant" />
                  ))}
                </div>
              )}
              {!isLoading && pendingDoctors.length === 0 && (
                <div className="flex flex-col items-center justify-center py-xl gap-md text-center">
                  <span className="material-symbols-outlined text-[48px] text-outline">verified_user</span>
                  <p className="text-body-md font-body-md text-secondary">No pending doctor applications. You're all caught up!</p>
                </div>
              )}
              <div className="flex flex-col gap-md">
                {pendingDoctors.map((d) => (
                  <div
                    key={d.id}
                    className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex flex-col md:flex-row md:items-center gap-md"
                  >
                    {/* Avatar + Name */}
                    <div className="flex items-center gap-md flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-bold text-label-lg flex-shrink-0">
                        {d.firstName?.charAt(0)}{d.lastName?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-label-lg font-label-md font-semibold text-on-surface truncate">
                          {d.title ? `${d.title} ` : ""}{d.firstName} {d.lastName}
                        </p>
                        <p className="text-body-sm font-body-sm text-secondary truncate">{d.email}</p>
                        <p className="text-code-sm font-code-sm text-outline mt-xs truncate">
                          License: {d.licenseNumber || "—"}
                        </p>
                      </div>
                    </div>

                    {/* Certificate Link */}
                    <div className="flex-shrink-0">
                      {(d as any).certificateUrl ? (
                        <a
                          href={(d as any).certificateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-xs px-md py-sm bg-surface-container-low border border-outline-variant rounded-lg text-label-md font-label-md text-primary hover:bg-primary/10 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">description</span>
                          View Certificate
                          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        </a>
                      ) : (
                        <span className="text-body-sm text-outline italic">No certificate URL provided</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-sm flex-shrink-0">
                      <button
                        onClick={() => handleVerify(d.id)}
                        disabled={verifyDoctor.isPending}
                        className="inline-flex items-center gap-xs px-md py-sm bg-[#198754] text-white rounded-lg text-label-md font-label-md font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectTarget({ id: d.id, name: `${d.firstName} ${d.lastName}` })}
                        disabled={rejectDoctor.isPending}
                        className="inline-flex items-center gap-xs px-md py-sm bg-error-container text-on-error-container rounded-lg text-label-md font-label-md font-bold hover:bg-error hover:text-on-error transition-colors disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[18px]">cancel</span>
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* All Doctors Table */}
          {tab === "all" && (
            <section className="bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="bg-surface-container-low text-label-md font-label-md text-on-surface-variant border-b border-outline-variant">
                    <tr>
                      <th className="p-md font-semibold uppercase tracking-wider">Doctor</th>
                      <th className="p-md font-semibold uppercase tracking-wider">Specialisation</th>
                      <th className="p-md font-semibold uppercase tracking-wider">Certificate</th>
                      <th className="p-md font-semibold uppercase tracking-wider">Verification</th>
                      <th className="p-md font-semibold uppercase tracking-wider">Accepting</th>
                      <th className="p-md font-semibold uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-body-sm font-body-sm text-on-surface divide-y divide-outline-variant">
                    {isLoading && (
                      <tr>
                        <td className="p-md text-center text-on-surface-variant" colSpan={6}>Loading doctors...</td>
                      </tr>
                    )}
                    {error && (
                      <tr>
                        <td className="p-md text-center text-error" colSpan={6}>Error loading doctors.</td>
                      </tr>
                    )}
                    {!isLoading && !error && displayedDoctors.map((d) => (
                      <tr key={d.id} className="hover:bg-surface-container-low transition-colors group">
                        <td className="p-md">
                          <div className="flex items-center gap-md">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-variant flex-shrink-0 flex items-center justify-center text-on-surface-variant">
                              {d.avatarUrl ? (
                                <img className="w-full h-full object-cover" alt={`${d.firstName} ${d.lastName}`} src={d.avatarUrl} />
                              ) : (
                                <span className="material-symbols-outlined">person</span>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-on-surface">
                                {d.title ? `${d.title} ` : ""}{d.firstName} {d.lastName}
                              </p>
                              <p className="text-on-surface-variant text-code-sm font-code-sm">
                                {d.licenseNumber || d.id.substring(0, 8)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-md">
                          <div className="flex flex-wrap gap-1">
                            {d.specialisations?.map((s) => (
                              <span key={s.id} className="inline-flex items-center px-sm py-xs rounded-full bg-tertiary-container/10 text-tertiary-container font-medium text-xs">{s.name}</span>
                            ))}
                            {(!d.specialisations || d.specialisations.length === 0) && (
                              <span className="text-on-surface-variant text-xs italic">None</span>
                            )}
                          </div>
                        </td>
                        <td className="p-md">
                          {(d as any).certificateUrl ? (
                            <a
                              href={(d as any).certificateUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-xs text-primary hover:underline text-label-md font-label-md"
                            >
                              <span className="material-symbols-outlined text-[16px]">description</span>
                              View
                              <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                            </a>
                          ) : (
                            <span className="text-outline text-xs italic">—</span>
                          )}
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
                              <>
                                <button
                                  onClick={() => handleVerify(d.id)}
                                  disabled={verifyDoctor.isPending}
                                  className="text-[#198754] hover:bg-[#198754]/10 px-sm py-xs rounded transition-colors text-label-md font-bold"
                                  title="Approve Doctor"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => setRejectTarget({ id: d.id, name: `${d.firstName} ${d.lastName}` })}
                                  disabled={rejectDoctor.isPending}
                                  className="text-error hover:bg-error/10 px-sm py-xs rounded transition-colors text-label-md font-bold"
                                  title="Reject Doctor"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            <label className="relative inline-flex items-center cursor-pointer" title="Toggle active status">
                              <input
                                checked={d.isActive}
                                onChange={() => toggleActive(d.id, d.isActive)}
                                className="sr-only peer"
                                type="checkbox"
                                disabled={toggleStatus.isPending}
                              />
                              <div className="w-9 h-5 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!isLoading && !error && displayedDoctors.length === 0 && (
                      <tr>
                        <td className="p-md text-center text-on-surface-variant" colSpan={6}>No doctors match your search.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-outline-variant bg-surface-container-lowest p-sm flex items-center justify-between text-body-sm font-body-sm text-on-surface-variant">
                <div>Showing {displayedDoctors.length} doctors</div>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Reject Confirmation Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-md">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl w-full max-w-md flex flex-col gap-lg shadow-xl">
            <div className="flex items-start gap-md">
              <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-on-error-container">warning</span>
              </div>
              <div>
                <h3 className="text-headline-md font-headline-md text-on-surface">Reject Application</h3>
                <p className="text-body-md font-body-md text-on-surface-variant mt-xs">
                  You are rejecting <strong>{rejectTarget.name}</strong>'s doctor application. Their account will be deactivated.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-xs">
              <label className="text-label-md font-label-md text-on-surface" htmlFor="reject-reason">
                Reason <span className="text-on-surface-variant font-normal">(optional)</span>
              </label>
              <textarea
                id="reject-reason"
                className="w-full border border-outline-variant rounded-lg p-md text-body-md font-body-md text-on-surface bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-error resize-none"
                rows={3}
                placeholder="e.g. Invalid license number, certificate not readable..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>

            <div className="flex gap-sm justify-end">
              <button
                onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                className="px-lg py-sm border border-outline-variant text-on-surface rounded-lg text-label-md font-label-md hover:bg-surface-container-low transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={rejectDoctor.isPending}
                className="px-lg py-sm bg-error text-on-error rounded-lg text-label-md font-label-md font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-xs"
              >
                {rejectDoctor.isPending ? "Rejecting..." : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">cancel</span>
                    Reject Application
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
