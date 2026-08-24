import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAppointment, useUpdateAppointmentStatus, usePreVisitSummary, useGeneratePreVisitSummary, useClinicalNote, useSaveClinicalNote } from "../hooks/useAppointments";
import { useAuth } from "../hooks/useAuth";
import {
  formatAppointmentTimeRange,
  formatSeverityLabel,
  formatStatusLabel,
  formatSymptomSummary,
  getPatientDisplayName,
  getPatientInitials,
  getStatusBadgeClasses,
} from "../lib/appointment-utils";

function AppointmentDetail() {
  const { appointmentId } = Route.useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { data: appointment, isLoading, error } = useAppointment(appointmentId);
  const updateStatus = useUpdateAppointmentStatus();
  const { data: aiSummaryData, isLoading: aiLoading } = usePreVisitSummary(appointmentId);
  const generateAiSummary = useGeneratePreVisitSummary();

  const { data: clinicalNote, isLoading: noteLoading } = useClinicalNote(appointmentId);
  const saveClinicalNote = useSaveClinicalNote();

  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  // Sync state when clinical notes are loaded
  useEffect(() => {
    if (clinicalNote) {
      setSubjective(clinicalNote.subjective || "");
      setObjective(clinicalNote.objective || "");
      setAssessment(clinicalNote.assessment || "");
      setPlan(clinicalNote.plan || "");
      setInternalNotes(clinicalNote.additionalNotes || "");
    }
  }, [clinicalNote]);

  const [meds, setMeds] = useState<{ medication: string; dosage: string; frequency: string; duration: string }[]>([]);
  const [newMed, setNewMed] = useState({ medication: "", dosage: "", frequency: "", duration: "" });

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/auth" });
  };

  const handleCompleteVisit = async () => {
    if (!appointment) return;
    await saveClinicalNote.mutateAsync({
      appointmentId: appointment.id,
      data: {
        subjective,
        objective,
        assessment,
        plan,
        additionalNotes: internalNotes,
        completeVisit: true,
      },
    });
    navigate({ to: "/provider" });
  };

  const handleSaveDraft = async () => {
    if (!appointment) return;
    await saveClinicalNote.mutateAsync({
      appointmentId: appointment.id,
      data: {
        subjective,
        objective,
        assessment,
        plan,
        additionalNotes: internalNotes,
        completeVisit: false,
      },
    });
  };

  const handleConfirmAppointment = async () => {
    if (!appointment) return;
    await updateStatus.mutateAsync({ id: appointment.id, status: "CONFIRMED" });
  };

  const addMed = () => {
    if (!newMed.medication) return;
    setMeds((prev) => [...prev, newMed]);
    setNewMed({ medication: "", dosage: "", frequency: "", duration: "" });
  };

  const removeMed = (idx: number) => {
    setMeds((prev) => prev.filter((_, i) => i !== idx));
  };

  if (isLoading) {
    return (
      <div className="bg-background text-on-background min-h-screen flex items-center justify-center">
        <p className="text-body-lg text-on-surface-variant">Loading appointment...</p>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center gap-md px-lg">
        <p className="text-body-lg text-error">Unable to load this appointment.</p>
        <Link to="/provider" className="text-primary hover:underline text-label-md font-label-md">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const patient = appointment.patient.user;
  const patientName = getPatientDisplayName(patient.firstName, patient.lastName);
  const patientInitials = getPatientInitials(patient.firstName, patient.lastName);
  const primarySymptom = appointment.symptoms[0];
  const canComplete = appointment.status === "CONFIRMED" || appointment.status === "PENDING_CONFIRMATION";
  const canConfirm = appointment.status === "PENDING_CONFIRMATION";

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col lg:flex-row antialiased">
      {/* Shared Component: SideNavBar */}
      <nav className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 p-md z-40 bg-surface border-r border-outline-variant">
        <div className="mb-lg px-sm pt-sm">
          <h1 className="text-headline-sm font-headline-md font-bold text-primary">HealthCore Professional</h1>
          <p className="text-body-sm font-body-sm text-on-surface-variant mt-unit">Provider Portal</p>
        </div>
        <div className="flex-1 flex flex-col gap-unit mt-md">
          <Link className="flex items-center gap-md px-md py-sm rounded-lg text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container transition-all duration-200 group" to="/provider">
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            <span className="text-label-md font-label-md">Dashboard</span>
          </Link>
          <Link className="flex items-center gap-md px-md py-sm rounded-lg bg-primary-container text-on-primary-container font-bold scale-95 duration-100" to="/provider/appointments/$appointmentId" params={{ appointmentId }}>
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>event</span>
            <span className="text-label-md font-label-md">Appointments</span>
          </Link>
          <a className="flex items-center gap-md px-md py-sm rounded-lg text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container transition-all duration-200 group" href="#">
            <span className="material-symbols-outlined text-[20px]">group</span>
            <span className="text-label-md font-label-md">Patients</span>
          </a>
          <a className="flex items-center gap-md px-md py-sm rounded-lg text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container transition-all duration-200 group" href="#">
            <span className="material-symbols-outlined text-[20px]">calendar_month</span>
            <span className="text-label-md font-label-md">Calendar</span>
          </a>
          <a className="flex items-center gap-md px-md py-sm rounded-lg text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container transition-all duration-200 group" href="#">
            <span className="material-symbols-outlined text-[20px]">person</span>
            <span className="text-label-md font-label-md">Profile</span>
          </a>
        </div>
        <div className="mt-auto flex flex-col gap-unit border-t border-outline-variant pt-md">
          <a className="flex items-center gap-md px-md py-sm rounded-lg text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container transition-all duration-200" href="#">
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span className="text-label-md font-label-md">Settings</span>
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-md px-md py-sm rounded-lg text-secondary font-medium hover:bg-secondary-container hover:text-on-secondary-container transition-all duration-200 w-full"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="text-label-md font-label-md">Logout</span>
          </button>
        </div>
      </nav>
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-64 w-full">
        {/* Shared Component: TopNavBar */}
        <header className="sticky top-0 w-full flex justify-between items-center px-lg h-16 bg-surface-container-lowest z-50 border-b border-outline-variant">
          <div className="flex items-center gap-md">
            <button className="lg:hidden p-sm rounded-md text-on-surface-variant hover:bg-surface-container-low">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <Link className="text-headline-md font-headline-md font-bold text-primary lg:hidden" to="/provider">HealthCore</Link>
            <div className="hidden md:flex items-center bg-surface-container-low rounded-lg px-md py-xs border border-outline-variant focus-within:border-primary focus-within:ring-1 focus-within:ring-primary w-64 transition-all">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px] mr-sm">search</span>
              <input className="bg-transparent border-none focus:ring-0 text-body-sm font-body-sm w-full p-0 text-on-surface placeholder:text-on-surface-variant" placeholder="Search records..." type="text" />
            </div>
          </div>
          <div className="flex items-center gap-sm">
            <button className="p-sm rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-1 right-2 w-2 h-2 bg-error rounded-full"></span>
            </button>
            <button className="p-sm rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors hidden sm:block">
              <span className="material-symbols-outlined">help</span>
            </button>
            <div className="h-8 w-8 rounded-full bg-secondary-container border border-outline-variant overflow-hidden ml-sm flex items-center justify-center">
              <img alt="User profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDmw78HH9lYakaL11XgvD6RabfYYROSQdYte-pJSJTqGhX90L0Xb5I7fOla6ZvNx3gGQSvO9gC2k1nLArYaxxs4olW2E0zbBpy1lkJQ5G2SNa7GO3uPERcxLePV5LIgBYGWBE70JC55qWYmsWb9Y9lEqGVA54g9TvTTO408OqEtG1oQgIJUkB6RiwA0m9ZZ8J_ofIunXRiH2tk7so14cXRwFtMZ5IvLorkvix-7oSOZjCXA4QA_HdvOZQ" />
            </div>
          </div>
        </header>
        {/* Consultation View Canvas */}
        <main className="flex-1 p-margin-mobile md:p-gutter max-w-[1440px] mx-auto w-full">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-lg gap-md">
            <div>
              <div className="flex items-center gap-sm mb-unit">
                <span className="px-sm py-xs bg-surface-container text-on-surface-variant rounded text-code-sm font-code-sm border border-outline-variant">
                  {formatAppointmentTimeRange(appointment.slotStart, appointment.slotEnd)}
                </span>
                <span className={`px-sm py-xs rounded-full text-code-sm font-code-sm font-medium flex items-center gap-1 ${getStatusBadgeClasses(appointment.status)}`}>
                  <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                  {formatStatusLabel(appointment.status)}
                </span>
              </div>
              <h2 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-on-background">Consultation</h2>
            </div>
            <div className="flex gap-sm w-full md:w-auto">
              {canConfirm && (
                <button
                  type="button"
                  onClick={handleConfirmAppointment}
                  disabled={updateStatus.isPending}
                  className="flex-1 md:flex-none flex items-center justify-center gap-sm px-md py-sm rounded-lg border border-primary text-primary text-label-md font-label-md hover:bg-surface-container-low transition-colors disabled:opacity-50"
                >
                  Confirm Appointment
                </button>
              )}
            </div>
          </div>
          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            {/* Left Column: Patient Context (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-gutter">
              {/* Patient Info Card */}
              <section className="card-level-1 p-md flex flex-col">
                <div className="flex items-center gap-md pb-md border-b border-surface-variant">
                  <div className="w-16 h-16 rounded-full bg-secondary-container overflow-hidden border-2 border-surface flex-shrink-0 flex items-center justify-center">
                    <span className="text-headline-md font-headline-md text-on-secondary-container">{patientInitials}</span>
                  </div>
                  <div>
                    <h3 className="text-headline-md font-headline-md text-on-background m-0">{patientName}</h3>
                    <p className="text-body-sm font-body-sm text-on-surface-variant">{patient.email}</p>
                    <p className="text-body-sm font-body-sm text-on-surface-variant mt-unit">
                      Patient ID: {appointment.patient.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="pt-md grid grid-cols-2 gap-md">
                  <div>
                    <span className="text-code-sm font-code-sm text-secondary uppercase tracking-wider block mb-unit">Contact</span>
                    <div className="text-body-md font-body-md text-on-surface font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-outline text-[16px]">mail</span>
                      {patient.email}
                    </div>
                    {patient.phone && (
                      <div className="text-body-md font-body-md text-on-surface font-medium flex items-center gap-1 mt-unit">
                        <span className="material-symbols-outlined text-outline text-[16px]">call</span>
                        {patient.phone}
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-code-sm font-code-sm text-secondary uppercase tracking-wider block mb-unit">Reason for Visit</span>
                    <span className="inline-block px-sm py-xs bg-surface-container-high text-on-surface-variant rounded text-code-sm font-code-sm border border-outline-variant">
                      {appointment.reasonForVisit || "General consultation"}
                    </span>
                  </div>
                </div>
              </section>
              {/* Symptoms Card */}
              <section className="card-level-1 p-md">
                <div className="flex items-center gap-sm mb-md">
                  <span className="material-symbols-outlined text-primary">personal_injury</span>
                  <h3 className="text-body-lg font-body-lg font-semibold text-on-background m-0">
                    Reported Symptoms ({appointment.symptoms.length})
                  </h3>
                </div>
                {appointment.symptoms.length === 0 ? (
                  <p className="text-body-md text-on-surface-variant">No symptoms were reported for this appointment.</p>
                ) : (
                  <div className="flex flex-col gap-md">
                    {appointment.symptoms.map((symptom) => (
                      <div key={symptom.id}>
                        <div className="bg-surface p-sm rounded-lg border border-outline-variant">
                          <p className="text-body-md font-body-md text-on-surface italic">{formatSymptomSummary(symptom)}</p>
                        </div>
                        <div className="flex flex-wrap gap-sm mt-sm">
                          <span className="px-sm py-xs rounded bg-surface-container-high text-on-surface-variant text-label-md font-label-md border border-outline-variant">
                            {symptom.description}
                          </span>
                          <span className="px-sm py-xs rounded bg-secondary-container text-on-secondary-container text-label-md font-label-md">
                            {formatSeverityLabel(symptom.severity)}
                          </span>
                          {symptom.durationDays != null && (
                            <span className="px-sm py-xs rounded bg-surface-container-high text-on-surface-variant text-label-md font-label-md border border-outline-variant">
                              {symptom.durationDays} day{symptom.durationDays === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
            {/* Right Column: Clinical Work (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-gutter">
              {/* AI Pre-Visit Summary */}
              <section className="card-level-1 border-primary-container/30 bg-primary-fixed/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container opacity-5 blur-[80px] rounded-full pointer-events-none"></div>
                <div className="p-lg relative z-10">
                  <div className="flex items-center justify-between mb-md pb-sm border-b border-primary-container/20">
                    <div className="flex items-center gap-sm">
                      <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>psychiatry</span>
                      <h3 className="text-body-lg font-body-lg font-semibold text-primary-fixed-variant m-0">AI-assisted pre-visit summary — not a diagnosis.</h3>
                    </div>
                    {aiSummaryData?.status === "SUCCESS" && (
                      <div className="flex items-center gap-xs px-sm py-xs bg-surface-variant text-on-surface-variant rounded-full text-code-sm font-code-sm font-medium border border-outline-variant">
                        <span className={`w-2 h-2 rounded-full ${aiSummaryData.data.urgency === 'HIGH' ? 'bg-error' : aiSummaryData.data.urgency === 'MEDIUM' ? 'bg-tertiary' : 'bg-primary'}`}></span>
                        {aiSummaryData.data.urgency} Urgency
                      </div>
                    )}
                  </div>
                  
                  {aiLoading || aiSummaryData?.status === "PENDING" ? (
                    <div className="flex flex-col items-center justify-center p-md">
                      <span className="material-symbols-outlined animate-spin text-primary text-[32px]">sync</span>
                      <p className="mt-sm text-body-sm text-on-surface-variant">Generating AI summary...</p>
                    </div>
                  ) : aiSummaryData?.status === "SUCCESS" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                      <div>
                        <h4 className="text-label-md font-label-md text-on-surface-variant mb-unit">Chief Complaint Synthesis</h4>
                        <p className="text-body-md font-body-md text-on-surface leading-relaxed">
                          {aiSummaryData.data.chiefComplaint}
                        </p>
                      </div>
                      <div className="bg-surface-container-lowest p-md rounded-lg border border-primary-container/20 shadow-sm">
                        <h4 className="text-label-md font-label-md text-on-primary-fixed-variant mb-sm flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">lightbulb</span> Suggested Questions
                        </h4>
                        <ul className="space-y-sm">
                          {aiSummaryData.data.suggestedQuestions.map((q, idx) => (
                            <li key={idx} className="flex items-start gap-sm text-body-sm font-body-sm text-on-surface">
                              <span className="material-symbols-outlined text-outline text-[16px] mt-0.5">chevron_right</span>
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
                      <p className="text-body-sm mb-sm">{aiSummaryData.error ?? "An error occurred while generating the summary."}</p>
                      <button 
                        onClick={() => generateAiSummary.mutate(appointment.id)}
                        disabled={generateAiSummary.isPending}
                        className="px-sm py-xs bg-surface text-on-surface rounded border border-outline hover:bg-surface-container-low text-label-sm font-medium transition-colors disabled:opacity-50"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-md">
                      <p className="mb-md text-body-md text-on-surface-variant text-center">
                        {appointment.symptoms.length > 0 
                          ? "Generate an AI summary to quickly review this patient's symptoms." 
                          : "No symptoms reported. AI summary cannot be generated."}
                      </p>
                      <button
                        onClick={() => generateAiSummary.mutate(appointment.id)}
                        disabled={appointment.symptoms.length === 0 || generateAiSummary.isPending}
                        className="flex items-center gap-xs px-md py-sm bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-[18px]">psychiatry</span>
                        {generateAiSummary.isPending ? "Generating..." : "Generate Pre-Visit Summary"}
                      </button>
                    </div>
                  )}
                </div>
              </section>
              {/* Clinical Notes Form */}
              <section className="card-level-1 p-lg">
                <div className="flex items-center gap-sm mb-md">
                  <span className="material-symbols-outlined text-on-surface-variant">description</span>
                  <h3 className="text-headline-md font-headline-md text-on-background m-0">Clinical Notes (SOAP)</h3>
                </div>
                {noteLoading ? (
                  <div className="flex justify-center p-md text-on-surface-variant">Loading notes...</div>
                ) : (
                  <div className="space-y-lg">
                    <div>
                      <label className="block text-label-md font-label-md text-on-surface-variant mb-sm" htmlFor="subjective">Subjective (Patient-reported)</label>
                      <textarea
                        className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-surface text-body-md font-body-md p-sm transition-all"
                        id="subjective"
                        placeholder="Patient's complaints, history, symptoms..."
                        rows={3}
                        value={subjective}
                        onChange={(e) => setSubjective(e.target.value)}
                        disabled={!canComplete}
                      ></textarea>
                    </div>
                    <div>
                      <label className="block text-label-md font-label-md text-on-surface-variant mb-sm" htmlFor="objective">Objective (Observations & Exam)</label>
                      <textarea
                        className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-surface text-body-md font-body-md p-sm transition-all"
                        id="objective"
                        placeholder="Vital signs, physical exam findings, lab results..."
                        rows={3}
                        value={objective}
                        onChange={(e) => setObjective(e.target.value)}
                        disabled={!canComplete}
                      ></textarea>
                    </div>
                    <div>
                      <label className="block text-label-md font-label-md text-on-surface-variant mb-sm" htmlFor="assessment">Assessment (Diagnosis)</label>
                      <textarea
                        className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-surface text-body-md font-body-md p-sm transition-all"
                        id="assessment"
                        placeholder="Enter clinical assessment..."
                        rows={3}
                        value={assessment}
                        onChange={(e) => setAssessment(e.target.value)}
                        disabled={!canComplete}
                      ></textarea>
                    </div>
                    <div>
                      <label className="block text-label-md font-label-md text-on-surface-variant mb-sm" htmlFor="plan">Plan (Treatment & Follow-up)</label>
                      <textarea
                        className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-surface text-body-md font-body-md p-sm transition-all"
                        id="plan"
                        placeholder="Outline treatment steps, referrals, or lifestyle advice..."
                        rows={3}
                        value={plan}
                        onChange={(e) => setPlan(e.target.value)}
                        disabled={!canComplete}
                      ></textarea>
                    </div>
                    <div>
                      <label className="block text-label-md font-label-md text-secondary mb-sm flex items-center gap-1" htmlFor="internal_notes">
                        <span className="material-symbols-outlined text-[16px]">lock</span> Additional Internal Notes
                      </label>
                      <textarea
                        className="w-full rounded-lg border border-outline-variant bg-surface-container focus:bg-surface-container-lowest text-on-surface focus:border-tertiary focus:ring-2 focus:ring-tertiary focus:ring-offset-1 focus:ring-offset-surface text-body-md font-body-md p-sm transition-all"
                        id="internal_notes"
                        placeholder="Private provider notes..."
                        rows={2}
                        value={internalNotes}
                        onChange={(e) => setInternalNotes(e.target.value)}
                        disabled={!canComplete}
                      ></textarea>
                    </div>
                    
                    {saveClinicalNote.isError && (
                      <div className="text-error text-body-sm bg-error-container p-sm rounded">Failed to save notes. Please try again.</div>
                    )}
                    {saveClinicalNote.isSuccess && !saveClinicalNote.isPending && (
                      <div className="text-primary text-body-sm bg-primary-container p-sm rounded">Notes saved successfully.</div>
                    )}
                  </div>
                )}
              </section>
              {/* Prescription Interface */}
              <section className="card-level-1 p-lg">
                <div className="flex items-center justify-between mb-md">
                  <div className="flex items-center gap-sm">
                    <span className="material-symbols-outlined text-on-surface-variant">medication</span>
                    <h3 className="text-headline-md font-headline-md text-on-background m-0">Prescriptions</h3>
                  </div>
                  <button className="flex items-center gap-xs px-sm py-xs rounded-lg border border-primary text-primary text-label-md font-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors" onClick={addMed}>
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Add Medication
                  </button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-outline-variant">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant text-code-sm font-code-sm text-secondary uppercase tracking-wider">
                        <th className="p-sm font-medium">Medication</th>
                        <th className="p-sm font-medium">Dosage</th>
                        <th className="p-sm font-medium">Frequency</th>
                        <th className="p-sm font-medium">Duration</th>
                        <th className="p-sm font-medium w-12 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meds.map((med, idx) => (
                        <tr key={idx} className="border-b border-outline-variant hover:bg-surface-container-lowest transition-colors group">
                          <td className="p-sm">
                            <input className="w-full bg-transparent border-none p-0 focus:ring-0 text-body-sm font-body-sm text-on-surface" readOnly type="text" value={med.medication} />
                          </td>
                          <td className="p-sm">
                            <input className="w-full bg-transparent border-none p-0 focus:ring-0 text-body-sm font-body-sm text-on-surface" readOnly type="text" value={med.dosage} />
                          </td>
                          <td className="p-sm">
                            <input className="w-full bg-transparent border-none p-0 focus:ring-0 text-body-sm font-body-sm text-on-surface" readOnly type="text" value={med.frequency} />
                          </td>
                          <td className="p-sm">
                            <input className="w-full bg-transparent border-none p-0 focus:ring-0 text-body-sm font-body-sm text-on-surface" readOnly type="text" value={med.duration} />
                          </td>
                          <td className="p-sm text-center">
                            <button className="text-outline hover:text-error transition-colors opacity-0 group-hover:opacity-100" onClick={() => removeMed(idx)}>
                              <span className="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-surface-container-lowest border-b border-outline-variant focus-within:ring-2 focus-within:ring-primary focus-within:relative">
                        <td className="p-sm">
                          <input className="w-full bg-transparent border-none p-0 focus:ring-0 text-body-sm font-body-sm text-on-surface placeholder:text-outline" placeholder="Search drug..." type="text" value={newMed.medication} onChange={(e) => setNewMed({ ...newMed, medication: e.target.value })} />
                        </td>
                        <td className="p-sm">
                          <input className="w-full bg-transparent border-none p-0 focus:ring-0 text-body-sm font-body-sm text-on-surface placeholder:text-outline" placeholder="e.g. 500mg" type="text" value={newMed.dosage} onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })} />
                        </td>
                        <td className="p-sm">
                          <input className="w-full bg-transparent border-none p-0 focus:ring-0 text-body-sm font-body-sm text-on-surface placeholder:text-outline" placeholder="e.g. Daily" type="text" value={newMed.frequency} onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })} />
                        </td>
                        <td className="p-sm">
                          <input className="w-full bg-transparent border-none p-0 focus:ring-0 text-body-sm font-body-sm text-on-surface placeholder:text-outline" placeholder="e.g. 7 Days" type="text" value={newMed.duration} onChange={(e) => setNewMed({ ...newMed, duration: e.target.value })} />
                        </td>
                        <td className="p-sm text-center">
                          <button className="text-outline hover:text-primary transition-colors" onClick={addMed}>
                            <span className="material-symbols-outlined text-[20px]">check_circle</span>
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
          {/* Footer Actions */}
          <div className="mt-lg pt-md border-t border-outline-variant flex flex-col sm:flex-row justify-end gap-md">
            <Link className="px-lg py-sm rounded-lg border border-outline text-on-surface-variant text-label-md font-label-md hover:bg-surface-container-low transition-colors w-full sm:w-auto text-center" to="/provider">
              Back to Dashboard
            </Link>
            {canComplete && (
              <>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saveClinicalNote.isPending || updateStatus.isPending}
                  className="px-lg py-sm rounded-lg border border-primary text-primary text-label-md font-label-md hover:bg-surface-container-low transition-colors w-full sm:w-auto text-center shadow-sm disabled:opacity-50"
                >
                  {saveClinicalNote.isPending && !saveClinicalNote.variables?.data.completeVisit ? "Saving..." : "Save Draft"}
                </button>
                <button
                  type="button"
                  onClick={handleCompleteVisit}
                  disabled={saveClinicalNote.isPending || updateStatus.isPending}
                  className="px-lg py-sm rounded-lg bg-primary text-on-primary text-label-md font-label-md hover:bg-on-primary-fixed-variant transition-colors w-full sm:w-auto text-center shadow-sm disabled:opacity-50"
                >
                  {saveClinicalNote.isPending && saveClinicalNote.variables?.data.completeVisit ? "Completing..." : "Complete Visit"}
                </button>
              </>
            )}
          </div>
          {/* Bottom spacing for mobile */}
          <div className="h-8 md:h-0"></div>
        </main>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/provider/appointments/$appointmentId")({
  head: () => ({
    meta: [
      { title: "Appointment Consultation - HealthCore Provider" },
      { name: "description", content: "View patient vitals, AI pre-visit summary, clinical notes, and manage prescriptions for this appointment." },
      { property: "og:title", content: "Appointment Consultation - HealthCore Provider" },
      { property: "og:description", content: "View patient vitals, AI pre-visit summary, clinical notes, and manage prescriptions for this appointment." },
    ],
  }),
  component: AppointmentDetail,
});
