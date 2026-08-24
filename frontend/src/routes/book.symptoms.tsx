import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

type BookSymptomsSearch = {
  doctorId?: string;
  slotStart?: string;
};

export const Route = createFileRoute("/book/symptoms")({
  validateSearch: (search: Record<string, unknown>): BookSymptomsSearch => {
    const result: BookSymptomsSearch = {};
    if (typeof search["doctorId"] === "string") result.doctorId = search["doctorId"];
    if (typeof search["slotStart"] === "string") result.slotStart = search["slotStart"];
    return result;
  },
  head: () => ({
    meta: [
      { title: "Book Appointment — Symptoms | HealthCore" },
      {
        name: "description",
        content: "Describe your symptoms before your appointment with Dr. Sarah Johnson.",
      },
      { property: "og:title", content: "Book Appointment — Symptoms | HealthCore" },
      {
        property: "og:description",
        content: "Describe your symptoms before your appointment with Dr. Sarah Johnson.",
      },
    ],
  }),
  component: BookSymptomsPage,
});

interface SymptomEntry {
  id: number;
  description: string;
  severity: "mild" | "moderate" | "severe";
  duration: string;
}

function BookSymptomsPage() {
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

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md antialiased selection:bg-primary-container selection:text-on-primary-container">
      {/* Transactional Header (Nav suppressed per guidelines for focused flow) */}
      <header className="bg-surface-container-lowest h-16 border-b border-outline-variant flex items-center justify-between px-lg sticky top-0 z-50">
        <div className="flex items-center gap-sm">
          <span
            className="material-symbols-outlined filled text-primary text-[28px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            medical_services
          </span>
          <span className="text-headline-md font-headline-md font-bold text-primary tracking-tight">
            HealthCore
          </span>
        </div>
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
                <img
                  className="w-8 h-8 rounded-full object-cover border border-outline-variant"
                  alt="A professional headshot of a female doctor in a white coat, bright and modern clinical lighting, conveying trust and expertise, high resolution, minimalist medical background."
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCLLHQ672v4WBDvILM0gb1VpimQjdAy96OhMpso0K3DE3Sp4a5Ewa2GJcX7l_UTCpbjJqSTYzJZZIk0H_FpWrhoXqE41jb9xR6VfLu3JuMQlBiLfdmM6PJ4Hx_N6OstbDDl6RmZdGS6HyayBc60hXX9kINQFGU_QNxlz1y1gCazAPbQh5bWvjLorg_tMUk05vq87I79ZM6s23qUhWFKU4uQAt56zQkc_D_VrYa5Hf8ogGskZI5b2O5GXg"
                />
                <span className="text-body-md font-body-md">with Dr. Sarah Johnson</span>
              </div>
            </div>
            {/* Appointment Quick Summary (Context) */}
            <div className="bg-surface-container-low rounded-lg p-sm px-md flex items-center gap-md border border-outline-variant">
              <div className="flex flex-col">
                <span className="text-code-sm font-code-sm text-secondary uppercase tracking-wider">
                  Date &amp; Time
                </span>
                <span className="text-label-md font-label-md text-on-surface">
                  Oct 24, 10:30 AM
                </span>
              </div>
              <button className="text-primary hover:text-primary-container" title="Edit Time">
                <span className="material-symbols-outlined text-[20px]">edit</span>
              </button>
            </div>
          </div>
          {/* Progress Stepper */}
          <div className="mt-sm">
            <div className="flex items-center justify-between relative">
              {/* Connecting Lines */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-outline-variant z-0"></div>
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1/2 h-[2px] bg-primary z-0 transition-all duration-300"></div>
              {/* Step 1: Slot (Completed) */}
              <div className="relative z-10 flex flex-col items-center gap-xs">
                <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center border-2 border-primary">
                  <span className="material-symbols-outlined text-[18px] font-bold">check</span>
                </div>
                <span className="text-label-md font-label-md text-primary absolute top-10 whitespace-nowrap">
                  1. Slot
                </span>
              </div>
              {/* Step 2: Symptoms (Active) */}
              <div className="relative z-10 flex flex-col items-center gap-xs">
                <div className="w-8 h-8 rounded-full bg-surface-container-lowest text-primary flex items-center justify-center border-2 border-primary ring-4 ring-primary-fixed">
                  <span className="text-label-md font-label-md">2</span>
                </div>
                <span className="text-label-md font-label-md text-on-surface absolute top-10 whitespace-nowrap font-bold">
                  2. Symptoms
                </span>
              </div>
              {/* Step 3: Review (Upcoming) */}
              <div className="relative z-10 flex flex-col items-center gap-xs">
                <div className="w-8 h-8 rounded-full bg-surface-container-lowest text-outline flex items-center justify-center border-2 border-outline-variant">
                  <span className="text-label-md font-label-md">3</span>
                </div>
                <span className="text-label-md font-label-md text-outline absolute top-10 whitespace-nowrap">
                  3. Review
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
            This helps Dr. Johnson prepare for your visit.
          </p>
          {symptoms.map((symptom) => (
            <div
              key={symptom.id}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg relative shadow-sm group"
            >
              <div className="flex flex-col gap-lg">
                {/* Description */}
                <div>
                  <label
                    className="text-label-md font-label-md text-on-surface mb-xs block"
                    htmlFor={`symptom-${symptom.id}`}
                  >
                    Symptom Description <span className="text-error">*</span>
                  </label>
                  <textarea
                    className="w-full bg-surface-container-low border border-outline rounded-DEFAULT px-md py-sm text-body-md font-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-outline resize-none"
                    id={`symptom-${symptom.id}`}
                    placeholder="E.g., Sharp pain in lower back when bending over..."
                    rows={3}
                    value={symptom.description}
                    onChange={(e) => updateSymptom(symptom.id, { description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                  {/* Severity */}
                  <div>
                    <label className="text-label-md font-label-md text-on-surface mb-xs block">
                      Severity
                    </label>
                    <div className="flex bg-surface-container-low rounded-lg p-xs border border-outline-variant w-full h-11">
                      {(["mild", "moderate", "severe"] as const).map((level) => (
                        <div className="relative flex-1" key={level}>
                          <input
                            className="sr-only"
                            id={`sev-${symptom.id}-${level}`}
                            name={`severity-${symptom.id}`}
                            type="radio"
                            value={level}
                            checked={symptom.severity === level}
                            onChange={() => updateSymptom(symptom.id, { severity: level })}
                          />
                          <label
                            className={`flex items-center justify-center w-full h-full rounded-md text-label-md font-label-md cursor-pointer transition-colors border ${
                              symptom.severity === level
                                ? "bg-primary text-on-primary border-primary"
                                : "text-on-surface-variant border-transparent hover:bg-surface-variant"
                            }`}
                            htmlFor={`sev-${symptom.id}-${level}`}
                          >
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Duration */}
                  <div>
                    <label
                      className="text-label-md font-label-md text-on-surface mb-xs block"
                      htmlFor={`duration-${symptom.id}`}
                    >
                      Duration
                    </label>
                    <div className="flex items-center relative">
                      <input
                        className="w-full bg-surface-container-low border border-outline rounded-DEFAULT pl-md pr-16 py-sm h-11 text-body-md font-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                        id={`duration-${symptom.id}`}
                        min={1}
                        placeholder="3"
                        type="number"
                        value={symptom.duration}
                        onChange={(e) => updateSymptom(symptom.id, { duration: e.target.value })}
                      />
                      <span className="absolute right-md text-body-md font-body-md text-on-surface-variant pointer-events-none">
                        days
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {/* Add Another Button */}
          <button
            onClick={addSymptom}
            className="flex items-center justify-center gap-sm w-full py-md border-2 border-dashed border-outline-variant rounded-xl text-primary hover:bg-primary-container hover:border-primary transition-all duration-200 mt-sm group"
          >
            <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">
              add_circle
            </span>
            <span className="text-label-md font-label-md">Add Another Symptom</span>
          </button>
        </div>
        {/* Action Footer */}
        <div className="flex items-center justify-between pt-lg mt-md border-t border-outline-variant">
          <Link to="/" className="px-lg py-sm h-11 border border-outline text-on-surface rounded-DEFAULT text-label-md font-label-md hover:bg-surface-container-low transition-colors flex items-center gap-xs">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Dashboard
          </Link>
          <Link
            to="/find-doctors"
            className="px-lg py-sm h-11 bg-primary text-on-primary rounded-DEFAULT text-label-md font-label-md hover:opacity-90 shadow-sm transition-opacity flex items-center gap-xs"
          >
            Continue to Review
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
