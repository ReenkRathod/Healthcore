import { useEffect, useState } from "react";
import { useClinicalNote, useSaveClinicalNote } from "../hooks/useAppointments";

interface Props {
  appointmentId: string;
  canEdit: boolean;
  /** Called after a successful draft save */
  onSaveDraft?: () => void;
  /** Called after a successful "Complete Visit" save */
  onCompleteVisit?: () => void;
}

export default function ClinicalNoteEditor({
  appointmentId,
  canEdit,
  onSaveDraft,
  onCompleteVisit,
}: Props) {
  const { data: clinicalNote, isLoading: noteLoading } = useClinicalNote(appointmentId);
  const saveClinicalNote = useSaveClinicalNote();

  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  useEffect(() => {
    if (clinicalNote) {
      setSubjective(clinicalNote.subjective || "");
      setObjective(clinicalNote.objective || "");
      setAssessment(clinicalNote.assessment || "");
      setPlan(clinicalNote.plan || "");
      setInternalNotes(clinicalNote.additionalNotes || "");
    }
  }, [clinicalNote]);

  const handleSaveDraft = async () => {
    await saveClinicalNote.mutateAsync({
      appointmentId,
      data: { subjective, objective, assessment, plan, additionalNotes: internalNotes, completeVisit: false },
    });
    onSaveDraft?.();
  };

  const handleCompleteVisit = async () => {
    await saveClinicalNote.mutateAsync({
      appointmentId,
      data: { subjective, objective, assessment, plan, additionalNotes: internalNotes, completeVisit: true },
    });
    onCompleteVisit?.();
  };

  const isSavingDraft = saveClinicalNote.isPending && !saveClinicalNote.variables?.data.completeVisit;
  const isCompleting = saveClinicalNote.isPending && !!saveClinicalNote.variables?.data.completeVisit;
  const isBusy = saveClinicalNote.isPending;

  const fieldClass =
    "w-full rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-surface text-body-md font-body-md p-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <section className="card-level-1 p-lg">
      <div className="flex items-center gap-sm mb-md">
        <span className="material-symbols-outlined text-on-surface-variant">description</span>
        <h3 className="text-headline-md font-headline-md text-on-background m-0">Clinical Notes (SOAP)</h3>
      </div>

      {noteLoading ? (
        <div className="flex justify-center p-md text-on-surface-variant animate-pulse">
          <span className="material-symbols-outlined animate-spin text-primary mr-sm">progress_activity</span>
          Loading notes...
        </div>
      ) : (
        <div className="space-y-lg">
          {/* Subjective */}
          <div>
            <label className="block text-label-md font-label-md text-on-surface-variant mb-sm" htmlFor="soap-subjective">
              Subjective <span className="text-outline font-normal">(Patient-reported)</span>
            </label>
            <textarea
              className={fieldClass}
              id="soap-subjective"
              placeholder="Patient's complaints, history, symptoms..."
              rows={3}
              value={subjective}
              onChange={(e) => setSubjective(e.target.value)}
              disabled={!canEdit}
            />
          </div>

          {/* Objective */}
          <div>
            <label className="block text-label-md font-label-md text-on-surface-variant mb-sm" htmlFor="soap-objective">
              Objective <span className="text-outline font-normal">(Observations &amp; Exam)</span>
            </label>
            <textarea
              className={fieldClass}
              id="soap-objective"
              placeholder="Vital signs, physical exam findings, lab results..."
              rows={3}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              disabled={!canEdit}
            />
          </div>

          {/* Assessment */}
          <div>
            <label className="block text-label-md font-label-md text-on-surface-variant mb-sm" htmlFor="soap-assessment">
              Assessment <span className="text-outline font-normal">(Diagnosis)</span>
            </label>
            <textarea
              className={fieldClass}
              id="soap-assessment"
              placeholder="Enter clinical assessment..."
              rows={3}
              value={assessment}
              onChange={(e) => setAssessment(e.target.value)}
              disabled={!canEdit}
            />
          </div>

          {/* Plan */}
          <div>
            <label className="block text-label-md font-label-md text-on-surface-variant mb-sm" htmlFor="soap-plan">
              Plan <span className="text-outline font-normal">(Treatment &amp; Follow-up)</span>
            </label>
            <textarea
              className={fieldClass}
              id="soap-plan"
              placeholder="Outline treatment steps, referrals, or lifestyle advice..."
              rows={3}
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              disabled={!canEdit}
            />
          </div>

          {/* Internal Notes */}
          <div>
            <label
              className="block text-label-md font-label-md text-secondary mb-sm flex items-center gap-1"
              htmlFor="soap-internal"
            >
              <span className="material-symbols-outlined text-[16px]">lock</span>
              Additional Internal Notes
            </label>
            <textarea
              className="w-full rounded-lg border border-outline-variant bg-surface-container focus:bg-surface-container-lowest text-on-surface focus:border-tertiary focus:ring-2 focus:ring-tertiary focus:ring-offset-1 focus:ring-offset-surface text-body-md font-body-md p-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              id="soap-internal"
              placeholder="Private provider notes..."
              rows={2}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              disabled={!canEdit}
            />
          </div>

          {/* Status feedback */}
          {saveClinicalNote.isError && (
            <div className="text-error text-body-sm bg-error-container p-sm rounded flex items-center gap-xs">
              <span className="material-symbols-outlined text-[16px]">error</span>
              Failed to save notes. Please try again.
            </div>
          )}
          {saveClinicalNote.isSuccess && !saveClinicalNote.isPending && (
            <div className="text-primary text-body-sm bg-primary-container p-sm rounded flex items-center gap-xs">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Notes saved successfully.
            </div>
          )}

          {/* Action buttons (only when editable) */}
          {canEdit && (
            <div className="flex flex-col sm:flex-row gap-sm pt-sm border-t border-outline-variant">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isBusy}
                className="flex-1 sm:flex-none flex items-center justify-center gap-xs px-lg py-sm rounded-lg border border-primary text-primary text-label-md font-label-md hover:bg-surface-container-low transition-colors disabled:opacity-50"
              >
                {isSavingDraft ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    Saving…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    Save Draft
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCompleteVisit}
                disabled={isBusy}
                className="flex-1 sm:flex-none flex items-center justify-center gap-xs px-lg py-sm rounded-lg bg-primary text-on-primary text-label-md font-label-md hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isCompleting ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    Completing…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">task_alt</span>
                    Complete Visit
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
