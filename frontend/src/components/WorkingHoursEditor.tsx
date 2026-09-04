const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
type Day = (typeof DAYS_OF_WEEK)[number];

import { useState } from "react";

interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

const DEFAULT_SCHEDULE: Record<Day, DaySchedule> = {
  Monday:    { enabled: true,  start: "09:00", end: "17:00" },
  Tuesday:   { enabled: true,  start: "09:00", end: "17:00" },
  Wednesday: { enabled: true,  start: "09:00", end: "17:00" },
  Thursday:  { enabled: true,  start: "09:00", end: "17:00" },
  Friday:    { enabled: true,  start: "09:00", end: "17:00" },
  Saturday:  { enabled: false, start: "10:00", end: "14:00" },
  Sunday:    { enabled: false, start: "10:00", end: "14:00" },
};

interface Props {
  /** Called with the updated schedule when user saves */
  onSave?: (schedule: Record<Day, DaySchedule>) => void;
  isSaving?: boolean;
}

export default function WorkingHoursEditor({ onSave, isSaving }: Props) {
  const [schedule, setSchedule] = useState<Record<Day, DaySchedule>>(DEFAULT_SCHEDULE);
  const [saved, setSaved] = useState(false);

  const toggle = (day: Day) =>
    setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], enabled: !prev[day].enabled } }));

  const setTime = (day: Day, field: "start" | "end", value: string) =>
    setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));

  const handleSave = () => {
    onSave?.(schedule);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
      <div className="px-lg py-md border-b border-outline-variant bg-surface-container-low flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary">schedule</span>
          <h3 className="text-headline-sm font-headline-md text-on-surface">Working Hours</h3>
        </div>
        {saved && (
          <span className="text-label-md font-label-md text-primary flex items-center gap-xs">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            Saved
          </span>
        )}
      </div>

      <div className="divide-y divide-outline-variant">
        {DAYS_OF_WEEK.map((day) => {
          const s = schedule[day];
          return (
            <div
              key={day}
              className={`flex flex-col sm:flex-row sm:items-center gap-sm px-lg py-md transition-colors ${s.enabled ? "" : "opacity-50"}`}
            >
              {/* Toggle + day label */}
              <div className="flex items-center gap-md w-36">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={s.enabled}
                    onChange={() => toggle(day)}
                  />
                  <div className="w-9 h-5 bg-surface-variant rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                </label>
                <span className="text-label-md font-label-md text-on-surface">{day}</span>
              </div>

              {/* Time pickers */}
              <div className="flex items-center gap-sm flex-1">
                <input
                  type="time"
                  value={s.start}
                  disabled={!s.enabled}
                  onChange={(e) => setTime(day, "start", e.target.value)}
                  className="border border-outline-variant rounded-lg px-sm py-xs text-body-sm font-body-sm bg-surface text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none disabled:cursor-not-allowed"
                />
                <span className="text-on-surface-variant text-body-sm">to</span>
                <input
                  type="time"
                  value={s.end}
                  disabled={!s.enabled}
                  onChange={(e) => setTime(day, "end", e.target.value)}
                  className="border border-outline-variant rounded-lg px-sm py-xs text-body-sm font-body-sm bg-surface text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none disabled:cursor-not-allowed"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-lg py-md border-t border-outline-variant flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-xs px-lg py-sm bg-primary text-on-primary rounded-lg text-label-md font-label-md hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
              Saving…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[16px]">save</span>
              Save Hours
            </>
          )}
        </button>
      </div>
    </div>
  );
}
