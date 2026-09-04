import { lazy, Suspense, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useDoctor } from "../hooks/useDoctors";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Route } from "./doctors.$doctorId";

// ─── Lazy sub-components ─────────────────────────────────────────────────────
const AppointmentCalendar = lazy(() => import("../components/AppointmentCalendar"));

function getDoctorDisplayName(doctor: { title: string | null; firstName: string; lastName: string }) {
  return `${doctor.title ? `${doctor.title} ` : ""}${doctor.firstName} ${doctor.lastName}`;
}

function getPrimarySpecialisation(doctor: { specialisations: { name: string; isPrimary: boolean }[] }) {
  const primary = doctor.specialisations.find((spec) => spec.isPrimary);
  return primary?.name ?? doctor.specialisations[0]?.name ?? "General Practice";
}

function formatSelectedSlot(slotStart: string): string {
  return new Date(slotStart).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DoctorProfile() {
  const { doctorId } = Route.useParams();
  const [selectedSlotStart, setSelectedSlotStart] = useState<string | null>(null);

  const { data: doctor, isLoading: doctorLoading, error: doctorError } = useDoctor(doctorId);

  if (doctorLoading) {
    return (
      <div className="bg-background text-on-surface min-h-screen flex items-center justify-center">
        <p className="text-body-lg text-on-surface-variant">Loading doctor profile...</p>
      </div>
    );
  }

  if (doctorError || !doctor) {
    return (
      <div className="bg-background text-on-surface min-h-screen flex flex-col items-center justify-center gap-md px-lg">
        <p className="text-body-lg text-error">Unable to load this doctor profile.</p>
        <Link to="/find-doctors" className="text-primary hover:underline text-label-md font-label-md">
          Back to search results
        </Link>
      </div>
    );
  }

  const doctorName = getDoctorDisplayName(doctor);
  const specialisation = getPrimarySpecialisation(doctor);

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col antialiased">
      <nav className="sticky top-0 w-full flex justify-between items-center px-lg h-16 bg-surface-container-lowest border-b border-outline-variant z-50">
        <Link to="/" className="flex items-center gap-sm cursor-pointer hover:opacity-80 transition-opacity">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
          <span className="text-headline-md font-headline-md font-bold text-primary">HealthCore</span>
        </Link>
        <div className="flex items-center gap-md">
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined">help</span>
          </button>
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-label-md text-label-md ml-sm cursor-pointer">
            PT
          </div>
        </div>
      </nav>
      <main className="flex-grow w-full max-w-[1440px] mx-auto px-margin-mobile md:px-lg py-xl">
        <div className="mb-lg">
          <Link to="/find-doctors" className="flex items-center gap-xs text-secondary hover:text-primary transition-colors text-label-md font-label-md">
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_back</span>
            Back to Search Results
          </Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          <aside className="lg:col-span-4 flex flex-col gap-lg">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex flex-col items-center text-center">
              <div className="relative mb-md">
                {doctor.avatarUrl ? (
                  <img
                    className="w-32 h-32 rounded-full object-cover border-4 border-surface shadow-sm"
                    alt={doctorName}
                    src={doctor.avatarUrl}
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full border-4 border-surface shadow-sm bg-surface-container-high flex items-center justify-center">
                    <span className="material-symbols-outlined text-[64px] text-tertiary-container">person</span>
                  </div>
                )}
                <div className="absolute bottom-0 right-2 w-6 h-6 bg-surface-container-lowest rounded-full flex items-center justify-center border-2 border-surface-container-lowest">
                  <span className="material-symbols-outlined text-[#0D6EFD]" style={{ fontVariationSettings: "'FILL' 1", fontSize: "16px" }}>verified</span>
                </div>
              </div>
              <h1 className="text-headline-md font-headline-md text-on-surface mb-xs">{doctorName}</h1>
              <p className="text-label-md font-label-md text-primary mb-sm">{specialisation}</p>
              <div className="flex items-center gap-xs text-secondary text-body-sm font-body-sm mb-lg">
                <span className="material-symbols-outlined text-[#FFB300]" style={{ fontVariationSettings: "'FILL' 1", fontSize: "16px" }}>star</span>
                <span className="font-medium text-on-surface">New</span>
                <span>(0 reviews)</span>
              </div>
              <div className="w-full h-px bg-outline-variant mb-lg"></div>
              <div className="w-full text-left">
                <h3 className="text-label-md font-label-md text-on-surface mb-sm">About</h3>
                <p className="text-body-md font-body-md text-on-surface-variant mb-md">
                  {doctor.bio || "This provider has not added a biography yet."}
                </p>
                <div className="flex flex-col gap-sm">
                  <div className="flex items-start gap-sm">
                    <span className="material-symbols-outlined text-outline mt-xs" style={{ fontSize: "20px" }}>badge</span>
                    <div>
                      <p className="text-label-md font-label-md text-on-surface">License</p>
                      <p className="text-body-sm font-body-sm text-secondary">{doctor.licenseNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-sm">
                    <span className="material-symbols-outlined text-outline mt-xs" style={{ fontSize: "20px" }}>schedule</span>
                    <div>
                      <p className="text-label-md font-label-md text-on-surface">Appointment Length</p>
                      <p className="text-body-sm font-body-sm text-secondary">{doctor.slotDurationMn} minutes</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-sm">
                    <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 mt-xs" style={{ fontSize: "20px" }}>payments</span>
                    <div>
                      <p className="text-label-md font-label-md text-on-surface">Consultation Fee</p>
                      <p className="text-body-sm font-semibold text-emerald-700 dark:text-emerald-400">${doctor.consultationFee ?? 50} per visit</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-sm">
                    <span className="material-symbols-outlined text-outline mt-xs" style={{ fontSize: "20px" }}>event_available</span>
                    <div>
                      <p className="text-label-md font-label-md text-on-surface">Availability</p>
                      <p className="text-body-sm font-body-sm text-secondary">
                        {doctor.isAccepting ? "Currently accepting appointments" : "Not accepting new appointments"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
          <section className="lg:col-span-8 flex flex-col gap-lg">
            <div>
              <h2 className="text-headline-md font-headline-md text-on-surface mb-sm">Select an Appointment</h2>
              <p className="text-body-md font-body-md text-secondary">Choose an available date and time for your visit.</p>
            </div>

            {/* AppointmentCalendar — lazy */}
            <Suspense fallback={<LoadingSpinner label="Loading calendar…" />}>
              <AppointmentCalendar doctorId={doctorId} onSlotSelected={setSelectedSlotStart} />
            </Suspense>
            <div className="mt-lg p-lg bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col sm:flex-row justify-between items-center gap-md sticky bottom-gutter shadow-[0px_8px_24px_rgba(0,0,0,0.08)] z-40">
              <div className="flex items-center gap-md">
                <div className="w-12 h-12 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>event_available</span>
                </div>
                <div>
                  <p className="text-body-sm font-body-sm text-secondary">Selected Appointment</p>
                  <p className="text-body-md font-body-md text-on-surface font-medium">
                    {selectedSlotStart
                      ? formatSelectedSlot(selectedSlotStart)
                      : "Select a date and time to continue"}
                  </p>
                </div>
              </div>
              {selectedSlotStart ? (
                <Link
                  to="/book/symptoms"
                  search={{ doctorId, slotStart: selectedSlotStart }}
                  className="w-full sm:w-auto px-xl py-md rounded-lg bg-primary text-on-primary text-label-md font-label-md hover:bg-on-primary-fixed-variant transition-colors flex items-center justify-center gap-sm"
                >
                  Continue to Booking
                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>arrow_forward</span>
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full sm:w-auto px-xl py-md rounded-lg bg-surface-variant text-outline text-label-md font-label-md cursor-not-allowed flex items-center justify-center gap-sm"
                >
                  Continue to Booking
                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>arrow_forward</span>
                </button>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
