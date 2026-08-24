import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useDoctor, useDoctorAvailability, type AvailableSlot } from "../hooks/useDoctors";

const WEEKDAY_LABELS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
}

function formatDisplayDate(dateStr: string): string {
  return parseDateString(dateStr).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatSlotTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSelectedAppointment(dateStr: string, slotStart: string): string {
  const dateLabel = parseDateString(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${dateLabel} at ${formatSlotTime(slotStart)}`;
}

function isPastDate(year: number, month: number, day: number): boolean {
  const candidate = toDateString(new Date(year, month, day));
  return candidate < toDateString(new Date());
}

function buildCalendarCells(year: number, month: number): (number | null)[] {
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];

  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(day);
  }

  return cells;
}

function groupSlotsByPeriod(slots: AvailableSlot[]) {
  const morning: AvailableSlot[] = [];
  const afternoon: AvailableSlot[] = [];

  for (const slot of slots) {
    const hour = new Date(slot.slotStart).getHours();
    if (hour < 12) {
      morning.push(slot);
    } else {
      afternoon.push(slot);
    }
  }

  return { morning, afternoon };
}

function getDoctorDisplayName(doctor: { title: string | null; firstName: string; lastName: string }) {
  return `${doctor.title ? `${doctor.title} ` : ""}${doctor.firstName} ${doctor.lastName}`;
}

function getPrimarySpecialisation(doctor: { specialisations: { name: string; isPrimary: boolean }[] }) {
  const primary = doctor.specialisations.find((spec) => spec.isPrimary);
  return primary?.name ?? doctor.specialisations[0]?.name ?? "General Practice";
}

function SlotButton({
  slot,
  selected,
  onSelect,
}: {
  slot: AvailableSlot;
  selected: boolean;
  onSelect: (slotStart: string) => void;
}) {
  const label = formatSlotTime(slot.slotStart);

  return (
    <button
      type="button"
      onClick={() => onSelect(slot.slotStart)}
      className={
        selected
          ? "py-sm px-md rounded-lg border-2 border-primary bg-primary text-on-primary text-label-md font-label-md shadow-sm transition-colors flex items-center justify-center gap-xs"
          : "py-sm px-md rounded-lg border border-outline-variant text-label-md font-label-md text-on-surface hover:border-primary hover:text-primary hover:bg-primary-container/10 transition-colors"
      }
    >
      {selected && <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>check</span>}
      {label}
    </button>
  );
}

function DoctorProfile() {
  const { doctorId } = Route.useParams();
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(toDateString(today));
  const [selectedSlotStart, setSelectedSlotStart] = useState<string | null>(null);

  const { data: doctor, isLoading: doctorLoading, error: doctorError } = useDoctor(doctorId);
  const {
    data: availability,
    isLoading: availabilityLoading,
    isFetching: availabilityFetching,
    error: availabilityError,
  } = useDoctorAvailability(doctorId, selectedDate);

  const calendarCells = useMemo(() => buildCalendarCells(viewYear, viewMonth), [viewYear, viewMonth]);
  const { morning, afternoon } = useMemo(
    () => groupSlotsByPeriod(availability?.slots ?? []),
    [availability?.slots],
  );

  useEffect(() => {
    setSelectedSlotStart(null);
  }, [selectedDate]);

  useEffect(() => {
    if (!availability?.slots.length) {
      setSelectedSlotStart(null);
      return;
    }

    setSelectedSlotStart((current) => {
      if (current && availability.slots.some((slot) => slot.slotStart === current)) {
        return current;
      }
      return availability.slots[0]?.slotStart ?? null;
    });
  }, [availability?.slots]);

  const goToPreviousMonth = () => {
    if (viewMonth === 0) {
      setViewYear((year) => year - 1);
      setViewMonth(11);
      return;
    }
    setViewMonth((month) => month - 1);
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((year) => year + 1);
      setViewMonth(0);
      return;
    }
    setViewMonth((month) => month + 1);
  };

  const selectDay = (day: number) => {
    if (isPastDate(viewYear, viewMonth, day)) {
      return;
    }
    setSelectedDate(toDateString(new Date(viewYear, viewMonth, day)));
  };

  const selectedDay = parseDateString(selectedDate).getDate();
  const isSelectedMonth =
    viewYear === parseDateString(selectedDate).getFullYear() &&
    viewMonth === parseDateString(selectedDate).getMonth();

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
        <div className="flex items-center gap-sm cursor-pointer">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
          <span className="text-headline-md font-headline-md font-bold text-primary">HealthCore</span>
        </div>
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
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col md:flex-row overflow-hidden">
              <div className="md:w-1/2 p-lg border-b md:border-b-0 md:border-r border-outline-variant bg-surface-bright">
                <div className="flex justify-between items-center mb-md">
                  <button
                    type="button"
                    onClick={goToPreviousMonth}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-on-surface"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <h3 className="text-label-md font-label-md text-on-surface">
                    {new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                  </h3>
                  <button
                    type="button"
                    onClick={goToNextMonth}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-on-surface"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-y-sm text-center mb-sm">
                  {WEEKDAY_LABELS.map((day) => (
                    <div key={day} className="text-code-sm font-code-sm text-outline">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-y-sm text-center justify-items-center">
                  {calendarCells.map((day, index) => {
                    if (day === null) {
                      return <div key={`empty-${index}`} className="w-8 h-8" />;
                    }

                    const isPast = isPastDate(viewYear, viewMonth, day);
                    const isSelected = isSelectedMonth && selectedDay === day;

                    return (
                      <div
                        key={day}
                        onClick={() => selectDay(day)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-body-sm font-body-sm transition-colors ${
                          isPast
                            ? "text-surface-variant cursor-not-allowed"
                            : isSelected
                              ? "bg-primary text-on-primary font-semibold shadow-sm cursor-pointer"
                              : "text-on-surface hover:bg-surface-container cursor-pointer"
                        }`}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="md:w-1/2 p-lg bg-surface-container-lowest">
                <div className="mb-md">
                  <h3 className="text-label-md font-label-md text-on-surface mb-xs">Available Slots</h3>
                  <p className="text-body-sm font-body-sm text-secondary">{formatDisplayDate(selectedDate)}</p>
                </div>

                {availabilityLoading || availabilityFetching ? (
                  <p className="text-body-md text-on-surface-variant">Loading available times...</p>
                ) : availabilityError ? (
                  <p className="text-body-md text-error">Unable to load availability for this date.</p>
                ) : availability?.slots.length === 0 ? (
                  <p className="text-body-md text-on-surface-variant">No available slots on this date. Try another day.</p>
                ) : (
                  <>
                    {morning.length > 0 && (
                      <div className="mb-md">
                        <div className="flex items-center gap-xs mb-sm">
                          <span className="material-symbols-outlined text-secondary" style={{ fontSize: "18px" }}>light_mode</span>
                          <h4 className="text-code-sm font-code-sm text-secondary uppercase tracking-wider">Morning</h4>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-sm">
                          {morning.map((slot) => (
                            <SlotButton
                              key={slot.slotStart}
                              slot={slot}
                              selected={selectedSlotStart === slot.slotStart}
                              onSelect={setSelectedSlotStart}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {afternoon.length > 0 && (
                      <div>
                        <div className="flex items-center gap-xs mb-sm">
                          <span className="material-symbols-outlined text-secondary" style={{ fontSize: "18px" }}>dark_mode</span>
                          <h4 className="text-code-sm font-code-sm text-secondary uppercase tracking-wider">Afternoon</h4>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-sm">
                          {afternoon.map((slot) => (
                            <SlotButton
                              key={slot.slotStart}
                              slot={slot}
                              selected={selectedSlotStart === slot.slotStart}
                              onSelect={setSelectedSlotStart}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="mt-lg p-lg bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col sm:flex-row justify-between items-center gap-md sticky bottom-gutter shadow-[0px_8px_24px_rgba(0,0,0,0.08)] z-40">
              <div className="flex items-center gap-md">
                <div className="w-12 h-12 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>event_available</span>
                </div>
                <div>
                  <p className="text-body-sm font-body-sm text-secondary">Selected Appointment</p>
                  <p className="text-body-md font-body-md text-on-surface font-medium">
                    {selectedSlotStart
                      ? formatSelectedAppointment(selectedDate, selectedSlotStart)
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

export const Route = createFileRoute("/doctors/$doctorId")({
  head: () => ({
    meta: [
      { title: "Doctor Profile & Availability | HealthCore" },
      { name: "description", content: "View doctor profile details and book an available appointment slot." },
      { property: "og:title", content: "Doctor Profile & Availability | HealthCore" },
      { property: "og:description", content: "View doctor profile details and book an available appointment slot." },
    ],
  }),
  component: DoctorProfile,
});
