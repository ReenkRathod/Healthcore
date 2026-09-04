import React from "react";

interface AppointmentConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  appointmentData?: {
    doctorName?: string | undefined;
    specialisation?: string | undefined;
    slotStart?: string | undefined;
    reason?: string | undefined;
    consultationFee?: number | undefined;
  };
  onNavigateDashboard: () => void;
}

export const AppointmentConfirmationModal: React.FC<AppointmentConfirmationModalProps> = ({
  open,
  onClose,
  appointmentData,
  onNavigateDashboard,
}) => {
  if (!open) return null;

  const formattedTime = appointmentData?.slotStart
    ? new Date(appointmentData.slotStart).toLocaleString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Scheduled Time";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface dark:bg-surface-container-high border border-outline-variant rounded-2xl shadow-2xl max-w-md w-full p-6 text-on-surface overflow-hidden relative transform transition-all animate-in zoom-in-95 duration-200">
        {/* Background glow header */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-primary to-teal-500" />
        
        {/* Icon & Title */}
        <div className="flex flex-col items-center text-center mt-2 mb-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 shadow-inner">
            <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>
          <h3 className="text-headline-sm font-headline-md font-bold text-on-surface">
            Appointment Confirmed!
          </h3>
          <p className="text-body-sm font-body-sm text-secondary mt-1">
            Your appointment has been successfully scheduled.
          </p>
        </div>

        {/* Card details */}
        <div className="bg-surface-container-low dark:bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-4 space-y-3 mb-6">
          <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                <span className="material-symbols-outlined text-[20px]">medical_services</span>
              </div>
              <div>
                <p className="text-label-sm text-secondary font-medium uppercase tracking-wider">Doctor</p>
                <p className="text-body-md font-bold text-on-surface">
                  {appointmentData?.doctorName || "Healthcare Provider"}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 text-label-sm font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-500/30">
              CONFIRMED
            </span>
          </div>

          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5">calendar_today</span>
            <div>
              <p className="text-label-sm text-secondary font-medium">Date & Time</p>
              <p className="text-body-md font-semibold text-on-surface">{formattedTime}</p>
            </div>
          </div>

          {appointmentData?.specialisation && (
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5">stethoscope</span>
              <div>
                <p className="text-label-sm text-secondary font-medium">Speciality</p>
                <p className="text-body-sm text-on-surface">{appointmentData.specialisation}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[20px] mt-0.5">payments</span>
            <div>
              <p className="text-label-sm text-secondary font-medium">Consultation Fee</p>
              <p className="text-body-md font-bold text-emerald-700 dark:text-emerald-400">
                ${appointmentData?.consultationFee ?? 50}
              </p>
            </div>
          </div>
        </div>

        {/* Info notice */}
        <div className="flex items-center gap-2 p-3 bg-primary-container/30 border border-primary/20 rounded-lg mb-6 text-label-md text-on-surface-variant">
          <span className="material-symbols-outlined text-primary text-[18px]">info</span>
          <span>A notification has been sent to your provider. Please arrive 10 mins prior.</span>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onNavigateDashboard}
            className="flex-1 py-3 px-4 rounded-xl bg-primary text-on-primary font-bold text-label-md hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">dashboard</span>
            Go to Dashboard
          </button>
          <button
            onClick={onClose}
            className="py-3 px-4 rounded-xl border border-outline-variant text-on-surface font-semibold text-label-md hover:bg-surface-container-high transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
