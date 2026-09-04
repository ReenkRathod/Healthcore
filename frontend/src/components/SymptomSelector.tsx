interface SymptomEntry {
  id: number;
  description: string;
  severity: "mild" | "moderate" | "severe";
  duration: string;
}

interface Props {
  symptoms: SymptomEntry[];
  onUpdate: (id: number, patch: Partial<SymptomEntry>) => void;
  onAdd: () => void;
}

const SEVERITY_LEVELS = ["mild", "moderate", "severe"] as const;

export default function SymptomSelector({ symptoms, onUpdate, onAdd }: Props) {
  return (
    <div className="flex flex-col gap-md">
      {symptoms.map((symptom) => (
        <div
          key={symptom.id}
          className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg relative shadow-sm"
        >
          <div className="flex flex-col gap-lg">
            {/* Description */}
            <div>
              <label
                className="text-label-md font-label-md text-on-surface mb-xs block"
                htmlFor={`symptom-desc-${symptom.id}`}
              >
                Symptom Description <span className="text-error">*</span>
              </label>
              <textarea
                className="w-full bg-surface-container-low border border-outline rounded-DEFAULT px-md py-sm text-body-md font-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-outline resize-none"
                id={`symptom-desc-${symptom.id}`}
                placeholder="E.g., Sharp pain in lower back when bending over…"
                rows={3}
                value={symptom.description}
                onChange={(e) => onUpdate(symptom.id, { description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
              {/* Severity toggle */}
              <div>
                <label className="text-label-md font-label-md text-on-surface mb-xs block">
                  Severity
                </label>
                <div className="flex bg-surface-container-low rounded-lg p-xs border border-outline-variant w-full h-11">
                  {SEVERITY_LEVELS.map((level) => (
                    <div className="relative flex-1" key={level}>
                      <input
                        className="sr-only"
                        id={`sev-${symptom.id}-${level}`}
                        name={`severity-${symptom.id}`}
                        type="radio"
                        value={level}
                        checked={symptom.severity === level}
                        onChange={() => onUpdate(symptom.id, { severity: level })}
                      />
                      <label
                        htmlFor={`sev-${symptom.id}-${level}`}
                        className={`flex items-center justify-center w-full h-full rounded-md text-label-md font-label-md cursor-pointer transition-colors border ${
                          symptom.severity === level
                            ? "bg-primary text-on-primary border-primary"
                            : "text-on-surface-variant border-transparent hover:bg-surface-variant"
                        }`}
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
                  htmlFor={`symptom-dur-${symptom.id}`}
                >
                  Duration
                </label>
                <div className="flex items-center relative">
                  <input
                    className="w-full bg-surface-container-low border border-outline rounded-DEFAULT pl-md pr-16 py-sm h-11 text-body-md font-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                    id={`symptom-dur-${symptom.id}`}
                    min={1}
                    placeholder="3"
                    type="number"
                    value={symptom.duration}
                    onChange={(e) => onUpdate(symptom.id, { duration: e.target.value })}
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

      {/* Add Another */}
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center justify-center gap-sm w-full py-md border-2 border-dashed border-outline-variant rounded-xl text-primary hover:bg-primary-container hover:border-primary transition-all duration-200 mt-sm group"
      >
        <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">
          add_circle
        </span>
        <span className="text-label-md font-label-md">Add Another Symptom</span>
      </button>
    </div>
  );
}
