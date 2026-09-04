import { useState } from "react";

interface MedRow {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
}

const EMPTY_ROW: MedRow = { medication: "", dosage: "", frequency: "", duration: "" };

export default function PrescriptionEditor() {
  const [meds, setMeds] = useState<MedRow[]>([]);
  const [newMed, setNewMed] = useState<MedRow>(EMPTY_ROW);

  const addMed = () => {
    if (!newMed.medication.trim()) return;
    setMeds((prev) => [...prev, newMed]);
    setNewMed(EMPTY_ROW);
  };

  const removeMed = (idx: number) =>
    setMeds((prev) => prev.filter((_, i) => i !== idx));

  const updateMed = (idx: number, patch: Partial<MedRow>) =>
    setMeds((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));

  const inputClass =
    "w-full bg-transparent border-none p-0 focus:ring-0 text-body-sm font-body-sm text-on-surface placeholder:text-outline";

  return (
    <section className="card-level-1 p-lg">
      <div className="flex items-center justify-between mb-md">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-on-surface-variant">medication</span>
          <h3 className="text-headline-md font-headline-md text-on-background m-0">Prescriptions</h3>
        </div>
        <button
          type="button"
          onClick={addMed}
          className="flex items-center gap-xs px-sm py-xs rounded-lg border border-primary text-primary text-label-md font-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add Medication
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-outline-variant">
        <table className="w-full text-left border-collapse min-w-[540px]">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant text-code-sm font-code-sm text-secondary uppercase tracking-wider">
              <th className="p-sm font-medium">Medication</th>
              <th className="p-sm font-medium">Dosage</th>
              <th className="p-sm font-medium">Frequency</th>
              <th className="p-sm font-medium">Duration</th>
              <th className="p-sm font-medium w-12 text-center">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {meds.map((med, idx) => (
              <tr
                key={idx}
                className="border-b border-outline-variant hover:bg-surface-container-lowest transition-colors group"
              >
                <td className="p-sm">
                  <input
                    className={inputClass}
                    type="text"
                    value={med.medication}
                    onChange={(e) => updateMed(idx, { medication: e.target.value })}
                    aria-label="Medication name"
                  />
                </td>
                <td className="p-sm">
                  <input
                    className={inputClass}
                    type="text"
                    value={med.dosage}
                    onChange={(e) => updateMed(idx, { dosage: e.target.value })}
                    aria-label="Dosage"
                  />
                </td>
                <td className="p-sm">
                  <input
                    className={inputClass}
                    type="text"
                    value={med.frequency}
                    onChange={(e) => updateMed(idx, { frequency: e.target.value })}
                    aria-label="Frequency"
                  />
                </td>
                <td className="p-sm">
                  <input
                    className={inputClass}
                    type="text"
                    value={med.duration}
                    onChange={(e) => updateMed(idx, { duration: e.target.value })}
                    aria-label="Duration"
                  />
                </td>
                <td className="p-sm text-center">
                  <button
                    type="button"
                    aria-label={`Remove ${med.medication}`}
                    className="text-outline hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                    onClick={() => removeMed(idx)}
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </td>
              </tr>
            ))}

            {/* New row input */}
            <tr className="bg-surface-container-lowest border-b border-outline-variant focus-within:ring-2 focus-within:ring-primary focus-within:relative">
              <td className="p-sm">
                <input
                  className={inputClass}
                  type="text"
                  placeholder="Search drug…"
                  value={newMed.medication}
                  onChange={(e) => setNewMed({ ...newMed, medication: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && addMed()}
                  aria-label="New medication name"
                />
              </td>
              <td className="p-sm">
                <input
                  className={inputClass}
                  type="text"
                  placeholder="e.g. 500mg"
                  value={newMed.dosage}
                  onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                  aria-label="New medication dosage"
                />
              </td>
              <td className="p-sm">
                <input
                  className={inputClass}
                  type="text"
                  placeholder="e.g. Daily"
                  value={newMed.frequency}
                  onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                  aria-label="New medication frequency"
                />
              </td>
              <td className="p-sm">
                <input
                  className={inputClass}
                  type="text"
                  placeholder="e.g. 7 Days"
                  value={newMed.duration}
                  onChange={(e) => setNewMed({ ...newMed, duration: e.target.value })}
                  aria-label="New medication duration"
                />
              </td>
              <td className="p-sm text-center">
                <button
                  type="button"
                  aria-label="Confirm new medication"
                  className="text-outline hover:text-primary transition-colors"
                  onClick={addMed}
                >
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {meds.length === 0 && (
        <p className="text-body-sm text-on-surface-variant text-center mt-md">
          No medications prescribed yet. Fill in the row above and press{" "}
          <kbd className="px-xs py-unit rounded border border-outline-variant text-code-sm font-code-sm">Enter</kbd>{" "}
          or click{" "}
          <span className="material-symbols-outlined text-[14px] align-middle">check_circle</span> to add.
        </p>
      )}
    </section>
  );
}
