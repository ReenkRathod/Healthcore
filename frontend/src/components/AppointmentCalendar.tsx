import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useDoctorAvailability, type AvailableSlot } from "../hooks/useDoctors";

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
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function isPastDate(year: number, month: number, day: number): boolean {
  return toDateString(new Date(year, month, day)) < toDateString(new Date());
}

function buildCalendarCells(year: number, month: number): (number | null)[] {
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);
  return cells;
}

function groupSlotsByPeriod(slots: AvailableSlot[]) {
  const morning: AvailableSlot[] = [];
  const afternoon: AvailableSlot[] = [];
  for (const slot of slots) {
    (new Date(slot.slotStart).getHours() < 12 ? morning : afternoon).push(slot);
  }
  return { morning, afternoon };
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
      {formatSlotTime(slot.slotStart)}
    </button>
  );
}

interface Props {
  doctorId: string;
  /** Slot start ISO string, or null when nothing selected */
  onSlotSelected: (slotStart: string | null) => void;
}

export default function AppointmentCalendar({ doctorId, onSlotSelected }: Props) {
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(toDateString(today));
  const [selectedSlotStart, setSelectedSlotStart] = useState<string | null>(null);

  const { data: availability, isLoading, isFetching, error } = useDoctorAvailability(doctorId, selectedDate);

  const calendarCells = useMemo(() => buildCalendarCells(viewYear, viewMonth), [viewYear, viewMonth]);
  const { morning, afternoon } = useMemo(
    () => groupSlotsByPeriod(availability?.slots ?? []),
    [availability?.slots],
  );

  // Reset slot when date changes
  useEffect(() => {
    setSelectedSlotStart(null);
    onSlotSelected(null);
  }, [selectedDate]);

  // Auto-select first slot when availability loads
  useEffect(() => {
    if (!availability?.slots.length) {
      setSelectedSlotStart(null);
      onSlotSelected(null);
      return;
    }
    setSelectedSlotStart((current) => {
      const keep = current && availability.slots.some((s) => s.slotStart === current) ? current : (availability.slots[0]?.slotStart ?? null);
      onSlotSelected(keep);
      return keep;
    });
  }, [availability?.slots]);

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const selectDay = (day: number) => {
    if (isPastDate(viewYear, viewMonth, day)) return;
    setSelectedDate(toDateString(new Date(viewYear, viewMonth, day)));
  };

  const handleSlotSelect = (slotStart: string) => {
    setSelectedSlotStart(slotStart);
    onSlotSelected(slotStart);
  };

  const selectedDay = parseDateString(selectedDate).getDate();
  const isSelectedMonth =
    viewYear === parseDateString(selectedDate).getFullYear() &&
    viewMonth === parseDateString(selectedDate).getMonth();

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col md:flex-row overflow-hidden">
      {/* Month grid */}
      <div className="md:w-1/2 p-lg border-b md:border-b-0 md:border-r border-outline-variant bg-surface-bright">
        <div className="flex justify-between items-center mb-md">
          <button
            type="button"
            onClick={goToPrevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-on-surface"
            aria-label="Previous month"
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
            aria-label="Next month"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        {/* Weekday labels */}
        <div className="grid grid-cols-7 gap-y-sm text-center mb-sm">
          {WEEKDAY_LABELS.map((day) => (
            <div key={day} className="text-code-sm font-code-sm text-outline">{day}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-y-sm text-center justify-items-center">
          {calendarCells.map((day, index) => {
            if (day === null) return <div key={`empty-${index}`} className="w-8 h-8" />;
            const isPast = isPastDate(viewYear, viewMonth, day);
            const isSelected = isSelectedMonth && selectedDay === day;
            return (
              <button
                key={day}
                type="button"
                onClick={() => selectDay(day)}
                disabled={isPast}
                aria-pressed={isSelected}
                aria-label={`${day} ${new Date(viewYear, viewMonth, day).toLocaleDateString(undefined, { month: "long" })}`}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-body-sm font-body-sm transition-colors ${
                  isPast
                    ? "text-surface-variant cursor-not-allowed"
                    : isSelected
                      ? "bg-primary text-on-primary font-semibold shadow-sm"
                      : "text-on-surface hover:bg-surface-container cursor-pointer"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Slot picker */}
      <div className="md:w-1/2 p-lg bg-surface-container-lowest">
        <div className="mb-md">
          <h3 className="text-label-md font-label-md text-on-surface mb-xs">Available Slots</h3>
          <p className="text-body-sm font-body-sm text-secondary">{formatDisplayDate(selectedDate)}</p>
        </div>

        {isLoading || isFetching ? (
          <p className="text-body-md text-on-surface-variant animate-pulse">Loading available times…</p>
        ) : error ? (
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
                      onSelect={handleSlotSelect}
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
                      onSelect={handleSlotSelect}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
