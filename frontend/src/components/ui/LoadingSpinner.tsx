import type { ReactNode } from "react";

/** Full-section centered spinner */
export function LoadingSpinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-xl gap-md min-h-[120px]">
      <span className="material-symbols-outlined animate-spin text-primary text-[36px]">
        progress_activity
      </span>
      <p className="text-body-sm font-body-sm text-on-surface-variant">{label}</p>
    </div>
  );
}

/** Pulsing skeleton for table/editor fallbacks */
export function SectionSkeleton({ rows = 4, label }: { rows?: number; label?: string }) {
  return (
    <div className="animate-pulse flex flex-col gap-sm p-md" aria-busy="true" aria-label={label ?? "Loading content"}>
      {/* Header shimmer */}
      <div className="h-5 w-1/3 bg-surface-container-high rounded mb-sm" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-10 rounded-lg bg-surface-container-high"
          style={{ opacity: 1 - i * (0.15 / rows) }}
        />
      ))}
    </div>
  );
}

/** Inline small spinner for button / compact areas */
export function InlineSpinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`material-symbols-outlined animate-spin text-[18px] ${className}`}
      aria-hidden="true"
    >
      progress_activity
    </span>
  );
}

/** Generic error boundary fallback card */
export function ErrorCard({
  message = "Something went wrong.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-md p-lg bg-error-container text-on-error-container rounded-xl border border-error/20">
      <span className="material-symbols-outlined text-[32px]">error</span>
      <p className="text-body-md font-body-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-md py-sm bg-error text-on-error rounded-lg text-label-md font-label-md hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      )}
    </div>
  );
}
