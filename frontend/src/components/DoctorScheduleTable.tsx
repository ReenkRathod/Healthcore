import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  formatAppointmentTime,
  formatStatusLabel,
  getPatientDisplayName,
  getPatientInitials,
  getStatusBadgeClasses,
} from "../lib/appointment-utils";
import { useCancelAppointment } from "../hooks/useAppointments";
type AppointmentStatus = Parameters<typeof formatStatusLabel>[0];

interface Appointment {
  id: string;
  slotStart: string;
  status: AppointmentStatus | string;
  reasonForVisit?: string | null;
  patient: {
    id: string;
    user: { firstName: string; lastName: string };
  };
}

interface Props {
  appointments: Appointment[];
  nextAppointmentId?: string | undefined;
  isLoading: boolean;
  error: unknown;
}

export default function DoctorScheduleTable({ appointments, nextAppointmentId, isLoading, error }: Props) {
  const navigate = useNavigate();
  const cancelAppointment = useCancelAppointment();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleReject = async (id: string) => {
    if (!rejectReason) {
      alert("Please provide a reason.");
      return;
    }
    await cancelAppointment.mutateAsync({ id, cancellationReason: rejectReason });
    setRejectId(null);
    setRejectReason("");
  };

  return (
    <div className="xl:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col">
      <div className="px-lg py-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
        <h3 className="text-headline-md font-headline-md text-on-surface">Today's Schedule</h3>
        <button className="text-primary hover:text-on-primary-fixed-variant text-label-md font-label-md flex items-center gap-1 transition-colors">
          View Calendar <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-bright border-b border-outline-variant">
              <th className="px-lg py-3 text-label-md font-label-md text-secondary uppercase">Time</th>
              <th className="px-lg py-3 text-label-md font-label-md text-secondary uppercase">Patient</th>
              <th className="px-lg py-3 text-label-md font-label-md text-secondary uppercase">Type</th>
              <th className="px-lg py-3 text-label-md font-label-md text-secondary uppercase text-right">Status</th>
              <th className="px-lg py-3 text-label-md font-label-md text-secondary uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-lg py-8 text-center text-body-md text-on-surface-variant">
                  Loading today's schedule…
                </td>
              </tr>
            )}
            {!!error && (
              <tr>
                <td colSpan={5} className="px-lg py-8 text-center text-body-md text-error">
                  Unable to load appointments.
                </td>
              </tr>
            )}
            {!isLoading && !error && appointments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-lg py-8 text-center text-body-md text-on-surface-variant">
                  No appointments scheduled for today.
                </td>
              </tr>
            )}
            {!isLoading &&
              !error &&
              appointments.map((appt) => {
                const patient = appt.patient.user;
                const isNext = nextAppointmentId === appt.id;
                const initials = getPatientInitials(patient.firstName, patient.lastName);
                const isCancelled = appt.status === "CANCELLED_BY_DOCTOR" || appt.status === "CANCELLED_BY_PATIENT" || appt.status === "COMPLETED";

                return (
                  <tr
                    key={appt.id}
                    onClick={() =>
                      navigate({ to: "/doctor/appointments/$appointmentId", params: { appointmentId: appt.id } })
                    }
                    className={`transition-colors group cursor-pointer ${
                      isNext ? "bg-primary-fixed/30 hover:bg-primary-fixed/50" : "hover:bg-surface-container-low"
                    }`}
                  >
                    <td className={`px-lg py-4 text-body-md font-body-md whitespace-nowrap ${isNext ? "text-on-primary-fixed font-semibold" : "text-on-surface"}`}>
                      {formatAppointmentTime(appt.slotStart)}
                    </td>
                    <td className="px-lg py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-label-md ${isNext ? "bg-primary-container text-on-primary-container" : "bg-secondary-container text-on-secondary-container"}`}>
                          {initials}
                        </div>
                        <div>
                          <p className="text-body-md font-body-md font-semibold text-on-surface">
                            {getPatientDisplayName(patient.firstName, patient.lastName)}
                          </p>
                          <p className="text-body-sm font-body-sm text-secondary">
                            ID: {appt.patient.id.slice(0, 8).toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-lg py-4 text-body-md font-body-md text-on-surface-variant">
                      {appt.reasonForVisit || "General Consultation"}
                    </td>
                    <td className="px-lg py-4 text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-label-md font-label-md ${getStatusBadgeClasses(appt.status as AppointmentStatus)}`}>
                        {formatStatusLabel(appt.status as AppointmentStatus)}
                      </span>
                    </td>
                    <td className="px-lg py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      {!isCancelled && (
                        rejectId === appt.id ? (
                          <div className="flex gap-2 justify-end items-center">
                            <input
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Reason"
                              className="border border-outline-variant rounded p-1 text-body-sm w-28 bg-surface"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              onClick={() => handleReject(appt.id)}
                              className="text-error text-label-md font-semibold hover:underline"
                            >
                              Submit
                            </button>
                            <button
                              onClick={() => setRejectId(null)}
                              className="text-on-surface-variant text-label-md hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRejectId(appt.id)}
                            className="text-error hover:text-error/80 font-semibold text-label-md opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Reject
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
