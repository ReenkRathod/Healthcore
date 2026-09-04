import { usePreVisitSummary, useGeneratePreVisitSummary } from "../hooks/useAppointments";

interface Props {
  appointmentId: string;
  symptomCount: number;
}

export default function AISummaryPanel({ appointmentId, symptomCount }: Props) {
  const { data: aiSummaryData, isLoading: aiLoading } = usePreVisitSummary(appointmentId);
  const generateAiSummary = useGeneratePreVisitSummary();

  const urgencyDot =
    aiSummaryData?.status === "SUCCESS"
      ? aiSummaryData.data.urgency === "HIGH"
        ? "bg-error"
        : aiSummaryData.data.urgency === "MEDIUM"
          ? "bg-tertiary"
          : "bg-primary"
      : "bg-outline";

  return (
    <section className="card-level-1 border-primary-container/30 bg-primary-fixed/20 relative overflow-hidden">
      {/* Glow accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container opacity-5 blur-[80px] rounded-full pointer-events-none" />

      <div className="p-lg relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-md pb-sm border-b border-primary-container/20">
          <div className="flex items-center gap-sm">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              psychiatry
            </span>
            <h3 className="text-body-lg font-body-lg font-semibold text-primary-fixed-variant m-0">
              AI-assisted pre-visit summary
              <span className="ml-sm text-body-sm font-body-sm font-normal text-on-surface-variant">
                — not a diagnosis
              </span>
            </h3>
          </div>

          {aiSummaryData?.status === "SUCCESS" && (
            <div className="flex items-center gap-xs px-sm py-xs bg-surface-variant text-on-surface-variant rounded-full text-code-sm font-code-sm font-medium border border-outline-variant">
              <span className={`w-2 h-2 rounded-full ${urgencyDot}`} />
              {aiSummaryData.data.urgency} Urgency
            </div>
          )}
        </div>

        {/* Body */}
        {aiLoading || aiSummaryData?.status === "PENDING" ? (
          <div className="flex flex-col items-center justify-center py-lg gap-sm">
            <span className="material-symbols-outlined animate-spin text-primary text-[32px]">sync</span>
            <p className="text-body-sm text-on-surface-variant">Generating AI summary…</p>
          </div>
        ) : aiSummaryData?.status === "SUCCESS" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            <div>
              <h4 className="text-label-md font-label-md text-on-surface-variant mb-unit">
                Chief Complaint Synthesis
              </h4>
              <p className="text-body-md font-body-md text-on-surface leading-relaxed">
                {aiSummaryData.data.chiefComplaint}
              </p>
            </div>
            <div className="bg-surface-container-lowest p-md rounded-lg border border-primary-container/20 shadow-sm">
              <h4 className="text-label-md font-label-md text-on-primary-fixed-variant mb-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">lightbulb</span>
                Suggested Questions
              </h4>
              <ul className="space-y-sm">
                {aiSummaryData.data.suggestedQuestions.map((q, idx) => (
                  <li key={idx} className="flex items-start gap-sm text-body-sm font-body-sm text-on-surface">
                    <span className="material-symbols-outlined text-outline text-[16px] mt-0.5">
                      chevron_right
                    </span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : aiSummaryData?.status === "FAILED" ? (
          <div className="p-md bg-error-container text-on-error-container rounded-lg border border-error/20">
            <p className="text-body-md font-bold mb-xs flex items-center gap-xs">
              <span className="material-symbols-outlined text-[18px]">error</span>
              Generation Failed
            </p>
            <p className="text-body-sm mb-sm">
              {aiSummaryData.error ?? "An error occurred while generating the summary."}
            </p>
            <button
              onClick={() => generateAiSummary.mutate(appointmentId)}
              disabled={generateAiSummary.isPending}
              className="px-sm py-xs bg-surface text-on-surface rounded border border-outline hover:bg-surface-container-low text-label-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-xs"
            >
              {generateAiSummary.isPending ? (
                <>
                  <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                  Retrying…
                </>
              ) : (
                "Try Again"
              )}
            </button>
          </div>
        ) : (
          /* Not yet generated */
          <div className="flex flex-col items-center justify-center py-lg gap-md text-center">
            <p className="text-body-md text-on-surface-variant">
              {symptomCount > 0
                ? "Generate an AI summary to quickly review this patient's symptoms."
                : "No symptoms reported. AI summary cannot be generated."}
            </p>
            <button
              onClick={() => generateAiSummary.mutate(appointmentId)}
              disabled={symptomCount === 0 || generateAiSummary.isPending}
              className="flex items-center gap-xs px-md py-sm bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">psychiatry</span>
              {generateAiSummary.isPending ? "Generating…" : "Generate Pre-Visit Summary"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
