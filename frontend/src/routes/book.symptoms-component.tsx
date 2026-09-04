import { Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { useBookAppointment } from "../hooks/useAppointments";
import { useDoctor } from "../hooks/useDoctors";
import { AppointmentConfirmationModal } from "../components/AppointmentConfirmationModal";
import { SectionSkeleton } from "../components/ui/LoadingSpinner";
import { Route } from "./book.symptoms";

// ─── Lazy sub-components ─────────────────────────────────────────────────────
const SymptomSelector = lazy(() => import("../components/SymptomSelector"));

interface SymptomEntry {
  id: number;
  description: string;
  severity: "mild" | "moderate" | "severe";
  duration: string;
}

export default function BookSymptomsPage() {
  const { doctorId, slotStart } = Route.useSearch();
  const navigate = useNavigate();
  const bookAppointment = useBookAppointment();
  const { data: doctor } = useDoctor(doctorId ?? "");
  const [showModal, setShowModal] = useState(false);

  const [symptoms, setSymptoms] = useState<SymptomEntry[]>([
    { id: 1, description: "", severity: "moderate", duration: "" },
  ]);
  let nextId = symptoms.length ? Math.max(...symptoms.map((s) => s.id)) + 1 : 1;

  const updateSymptom = (id: number, patch: Partial<SymptomEntry>) => {
    setSymptoms((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const addSymptom = () => {
    setSymptoms((prev) => [
      ...prev,
      { id: nextId, description: "", severity: "moderate", duration: "" },
    ]);
  };

  const hasValidSymptoms = symptoms.some((s) => s.description.trim().length > 0);
  const canSubmit = doctorId && slotStart && hasValidSymptoms && !bookAppointment.isPending;

  const handleConfirmBooking = async () => {
    if (!doctorId || !slotStart) return;

    const symptomPayload = symptoms
      .filter((s) => s.description.trim().length > 0)
      .map((s) => ({
        description: s.description.trim(),
        severity: s.severity.toUpperCase() as "MILD" | "MODERATE" | "SEVERE",
        durationDays: s.duration ? parseInt(s.duration, 10) : null,
      }));

    if (symptomPayload.length === 0) return;

    try {
      await bookAppointment.mutateAsync({
        doctorProfileId: doctorId,
        slotStart,
        symptoms: symptomPayload,
      });
      setShowModal(true);
    } catch {
      // error is available via bookAppointment.error
    }
  };

  const doctorName = doctor
    ? `${doctor.title ? `${doctor.title} ` : ""}${doctor.firstName} ${doctor.lastName}`
    : "your doctor";

  const formattedSlotTime = slotStart
    ? new Date(slotStart).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Not selected";

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md antialiased selection:bg-primary-container selection:text-on-primary-container">
      {/* Transactional Header */}
      <header className="bg-surface-container-lowest h-16 border-b border-outline-variant flex items-center justify-between px-lg sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-sm hover:opacity-80 transition-opacity">
          <span
            className="material-symbols-outlined filled text-primary text-[28px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            medical_services
          </span>
          <span className="text-headline-md font-headline-md font-bold text-primary tracking-tight">
            HealthCore
          </span>
        </Link>
        <Link to="/" className="flex items-center gap-xs text-secondary hover:text-on-surface transition-colors">
          <span className="text-label-md font-label-md">Cancel Booking</span>
          <span className="material-symbols-outlined text-[20px]">close</span>
        </Link>
      </header>
      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-margin-mobile md:px-lg py-lg md:py-xl flex flex-col gap-gutter">
        {/* Booking Header Card */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg md:p-xl flex flex-col gap-lg relative overflow-hidden">
          {/* Subtle accent top border */}
          <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
            <div>
              <h1 className="text-headline-lg font-headline-lg text-on-surface mb-xs">
                Book Appointment
              </h1>
              <div className="flex items-center gap-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">person</span>
                <span className="text-body-md font-body-md">with {doctorName}</span>
              </div>
            </div>
            {/* Appointment Quick Summary */}
            <div className="bg-surface-container-low rounded-lg p-sm px-md flex items-center gap-md border border-outline-variant">
              <div className="flex flex-col">
                <span className="text-code-sm font-code-sm text-secondary uppercase tracking-wider">
                  Date &amp; Time
                </span>
                <span className="text-label-md font-label-md text-on-surface">
                  {formattedSlotTime}
                </span>
              </div>
              <div className="h-8 w-px bg-outline-variant/60"></div>
              <div className="flex flex-col">
                <span className="text-code-sm font-code-sm text-secondary uppercase tracking-wider">
                  Consultation Fee
                </span>
                <span className="text-label-md font-bold text-emerald-700 dark:text-emerald-400">
                  ${doctor?.consultationFee ?? 50}
                </span>
              </div>
            </div>
          </div>
          {/* Progress Stepper */}
          <div className="mt-sm">
            <div className="flex items-center justify-between relative">
              {/* Connecting Lines */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-outline-variant z-0"></div>
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-primary z-0 transition-all duration-300"></div>
              {/* Step 1: Doctor (Completed) */}
              <div className="relative z-10 flex flex-col items-center gap-xs">
                <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center border-2 border-primary">
                  <span className="material-symbols-outlined text-[18px] font-bold">check</span>
                </div>
                <span className="text-label-md font-label-md text-primary absolute top-10 whitespace-nowrap">
                  1. Doctor
                </span>
              </div>
              {/* Step 2: Slot (Completed) */}
              <div className="relative z-10 flex flex-col items-center gap-xs">
                <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center border-2 border-primary">
                  <span className="material-symbols-outlined text-[18px] font-bold">check</span>
                </div>
                <span className="text-label-md font-label-md text-primary absolute top-10 whitespace-nowrap">
                  2. Slot
                </span>
              </div>
              {/* Step 3: Symptoms (Active) */}
              <div className="relative z-10 flex flex-col items-center gap-xs">
                <div className="w-8 h-8 rounded-full bg-surface-container-lowest text-primary flex items-center justify-center border-2 border-primary ring-4 ring-primary-fixed">
                  <span className="text-label-md font-label-md">3</span>
                </div>
                <span className="text-label-md font-label-md text-on-surface absolute top-10 whitespace-nowrap font-bold">
                  3. Symptoms
                </span>
              </div>
            </div>
          </div>
          {/* Spacer for absolutely positioned labels */}
          <div className="h-6"></div>
        </div>
        {/* Form Content Container */}
        <div className="flex flex-col gap-md">
          <h2 className="text-headline-md font-headline-md text-on-surface">
            Please describe your symptoms
          </h2>
          <p className="text-body-md font-body-md text-on-surface-variant">
            This helps {doctorName} prepare for your visit.
          </p>
          {/* Symptom cards — lazy */}
          <Suspense fallback={<SectionSkeleton rows={4} label="Loading symptom form…" />}>
            <SymptomSelector symptoms={symptoms} onUpdate={updateSymptom} onAdd={addSymptom} />
          </Suspense>
        </div>

        {/* Error Message */}
        {bookAppointment.isError && (
          <div className="bg-error-container text-on-error-container rounded-lg p-md flex items-start gap-sm">
            <span className="material-symbols-outlined text-[20px] mt-0.5">error</span>
            <div className="flex flex-col gap-xs">
              <span className="text-body-md font-body-md font-medium">
                {(() => {
                  const err = bookAppointment.error as any;
                  const apiData = err?.data;
                  if (apiData?.error?.message) return apiData.error.message;
                  if (apiData?.error?.details) return JSON.stringify(apiData.error.details);
                  if (err?.message) return err.message;
                  return "Failed to book appointment. Please try again.";
                })()}
              </span>
            </div>
          </div>
        )}

        {/* Action Footer */}
        <div className="flex items-center justify-between pt-lg mt-md border-t border-outline-variant">
          <Link
            to={doctorId ? "/doctors/$doctorId" : "/find-doctors"}
            params={(doctorId ? { doctorId } : undefined) as any}
            className="px-lg py-sm h-11 border border-outline text-on-surface rounded-DEFAULT text-label-md font-label-md hover:bg-surface-container-low transition-colors flex items-center gap-xs"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Slot Selection
          </Link>
          <button
            onClick={handleConfirmBooking}
            disabled={!canSubmit}
            className={`px-lg py-sm h-11 rounded-DEFAULT text-label-md font-label-md shadow-sm flex items-center gap-xs transition-all ${
              canSubmit
                ? "bg-primary text-on-primary hover:opacity-90"
                : "bg-surface-variant text-outline cursor-not-allowed"
            }`}
          >
            {bookAppointment.isPending ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                Booking...
              </>
            ) : (
              <>
                Confirm &amp; Book
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
              </>
            )}
          </button>
        </div>
      </main>

      <AppointmentConfirmationModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          navigate({ to: "/" });
        }}
        appointmentData={{
          doctorName,
          specialisation: doctor?.specialisations?.[0]?.name,
          slotStart,
          consultationFee: doctor?.consultationFee ?? 50,
        }}
        onNavigateDashboard={() => {
          setShowModal(false);
          navigate({ to: "/patient" });
        }}
      />
    </div>
  );
}
