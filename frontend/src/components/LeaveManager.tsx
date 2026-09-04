import { useState } from "react";
import { useApplyLeave } from "../hooks/useDoctors";

interface Props {
  /** Optional override — if not provided, uses internal mutation */
  onSubmit?: (start: string, end: string) => Promise<void>;
}

export default function LeaveManager({ onSubmit }: Props) {
  const applyLeaveMutation = useApplyLeave();
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    try {
      if (onSubmit) {
        await onSubmit(leaveStart, leaveEnd);
      } else {
        await applyLeaveMutation.mutateAsync({ startDate: leaveStart, endDate: leaveEnd, isFullDay: true });
      }
      setSuccess(true);
      setLeaveStart("");
      setLeaveEnd("");
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(err?.message ?? "Failed to apply leave. Please try again.");
    }
  };

  const isPending = applyLeaveMutation.isPending;

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-lg py-md border-b border-outline-variant bg-surface-container-low flex items-center gap-sm">
        <span className="material-symbols-outlined text-primary">event_busy</span>
        <h3 className="text-headline-sm font-headline-md text-on-surface">Leave Manager</h3>
      </div>

      <form onSubmit={handleSubmit} className="p-lg flex flex-col gap-lg">
        <p className="text-body-md font-body-md text-on-surface-variant">
          Apply for a leave period. All appointment slots within the selected range will be blocked.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          <div className="flex flex-col gap-xs">
            <label className="text-label-md font-label-md text-on-surface" htmlFor="leave-start">
              Start Date
            </label>
            <input
              id="leave-start"
              type="date"
              required
              min={today}
              value={leaveStart}
              onChange={(e) => setLeaveStart(e.target.value)}
              className="border border-outline-variant rounded-lg px-md py-sm text-body-md font-body-md bg-surface text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
          </div>
          <div className="flex flex-col gap-xs">
            <label className="text-label-md font-label-md text-on-surface" htmlFor="leave-end">
              End Date
            </label>
            <input
              id="leave-end"
              type="date"
              required
              min={leaveStart || today}
              value={leaveEnd}
              onChange={(e) => setLeaveEnd(e.target.value)}
              className="border border-outline-variant rounded-lg px-md py-sm text-body-md font-body-md bg-surface text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
          </div>
        </div>

        {/* Full-day notice */}
        <div className="flex items-center gap-sm text-body-sm font-body-sm text-on-surface-variant bg-surface-container-low rounded-lg p-sm border border-outline-variant">
          <span className="material-symbols-outlined text-[18px] text-secondary">info</span>
          All-day leave will be applied for every day in the selected range.
        </div>

        {/* Feedback */}
        {error && (
          <div className="flex items-center gap-sm text-error text-body-sm bg-error-container p-sm rounded-lg">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-sm text-primary text-body-sm bg-primary-container p-sm rounded-lg">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            Leave applied successfully. Your calendar has been updated.
          </div>
        )}

        <div className="flex justify-end gap-sm">
          <button
            type="button"
            onClick={() => { setLeaveStart(""); setLeaveEnd(""); setError(null); }}
            className="px-lg py-sm border border-outline-variant rounded-lg text-on-surface-variant text-label-md font-label-md hover:bg-surface-container-low transition-colors"
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={isPending || !leaveStart || !leaveEnd}
            className="flex items-center gap-xs px-lg py-sm bg-primary text-on-primary rounded-lg text-label-md font-label-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                Applying…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">event_busy</span>
                Apply Leave
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
