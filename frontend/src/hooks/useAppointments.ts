import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export type AppointmentStatus =
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED_BY_PATIENT"
  | "CANCELLED_BY_DOCTOR"
  | "NO_SHOW"
  | "RESCHEDULED";

export type SymptomSeverity = "MILD" | "MODERATE" | "SEVERE";

export interface Symptom {
  id: string;
  appointmentId: string;
  description: string;
  severity: SymptomSeverity;
  durationDays: number | null;
  notes: string | null;
  createdAt: string;
}

export interface AppointmentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
}

export interface AppointmentPatient {
  id: string;
  userId: string;
  user: AppointmentUser;
}

export interface AppointmentDoctor {
  id: string;
  userId: string;
  title: string | null;
  avatarUrl: string | null;
  user: AppointmentUser;
}

export interface Appointment {
  id: string;
  patientProfileId: string;
  doctorProfileId: string;
  slotStart: string;
  slotEnd: string;
  status: AppointmentStatus;
  reasonForVisit: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  symptoms: Symptom[];
  patient: AppointmentPatient;
  doctor: AppointmentDoctor;
}

export interface SymptomInput {
  description: string;
  severity: SymptomSeverity;
  durationDays?: number | null;
  notes?: string | null;
}

export interface BookAppointmentInput {
  doctorProfileId: string;
  slotStart: string;
  reasonForVisit?: string | null;
  symptoms: SymptomInput[];
  idempotencyKey?: string | null;
}

export interface AppointmentListFilters {
  status?: AppointmentStatus;
  startDate?: string;
  endDate?: string;
}

export const useAppointments = (filters?: AppointmentListFilters) => {
  return useQuery({
    queryKey: ["appointments", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append("status", filters.status);
      if (filters?.startDate) params.append("startDate", filters.startDate);
      if (filters?.endDate) params.append("endDate", filters.endDate);

      const url = `/appointments${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await api.get<{ success: boolean; data: { appointments: Appointment[]; count: number } }>(url);
      return res.data.appointments;
    },
  });
};

export const useAppointment = (appointmentId: string) => {
  return useQuery({
    queryKey: ["appointments", appointmentId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: { appointment: Appointment } }>(
        `/appointments/${appointmentId}`,
      );
      return res.data.appointment;
    },
    enabled: Boolean(appointmentId),
  });
};

export const useBookAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: BookAppointmentInput) =>
      api.post<{ success: boolean; data: { appointment: Appointment } }>("/appointments", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
};

export const useCancelAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, cancellationReason }: { id: string; cancellationReason?: string }) =>
      api.patch<{ success: boolean; data: { appointment: Appointment } }>(`/appointments/${id}/cancel`, {
        cancellationReason,
      }),
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments", variables.id] });
    },
  });
};

export const useUpdateAppointmentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "CONFIRMED" | "COMPLETED" | "NO_SHOW";
    }) =>
      api.patch<{ success: boolean; data: { appointment: Appointment } }>(`/appointments/${id}/status`, {
        status,
      }),
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments", variables.id] });
    },
  });
};

export type PreVisitSummaryData = {
  status: "SUCCESS";
  data: {
    urgency: "LOW" | "MEDIUM" | "HIGH";
    chiefComplaint: string;
    suggestedQuestions: string[];
  };
} | {
  status: "FAILED" | "PENDING";
  error?: string;
};

export const usePreVisitSummary = (appointmentId: string) => {
  return useQuery({
    queryKey: ["appointments", appointmentId, "pre-visit-summary"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: PreVisitSummaryData }>(
        `/appointments/${appointmentId}/pre-visit-summary`,
      );
      return res.data;
    },
    enabled: Boolean(appointmentId),
    refetchInterval: (query) => {
      if (query.state.data?.status === "PENDING") {
        return 3000;
      }
      return false;
    }
  });
};

export const useGeneratePreVisitSummary = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appointmentId: string) =>
      api.post<{ success: boolean; message: string }>(`/appointments/${appointmentId}/pre-visit-summary/generate`, {}),
    onSuccess: (_res, appointmentId) => {
      // Optimistically update or invalidate to start polling
      queryClient.invalidateQueries({ queryKey: ["appointments", appointmentId, "pre-visit-summary"] });
    },
  });
};

export interface ClinicalNote {
  id: string;
  appointmentId: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  additionalNotes: string | null;
}

export const useClinicalNote = (appointmentId: string) => {
  return useQuery({
    queryKey: ["appointments", appointmentId, "clinical-notes"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: { note: ClinicalNote | null } }>(
        `/appointments/${appointmentId}/clinical-notes`,
      );
      return res.data.note;
    },
    enabled: Boolean(appointmentId),
  });
};

export const useSaveClinicalNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appointmentId,
      data,
    }: {
      appointmentId: string;
      data: {
        subjective?: string | null;
        objective?: string | null;
        assessment?: string | null;
        plan?: string | null;
        additionalNotes?: string | null;
        completeVisit?: boolean;
      };
    }) =>
      api.post<{ success: boolean; data: { note: ClinicalNote } }>(
        `/appointments/${appointmentId}/clinical-notes`,
        data,
      ),
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointments", variables.appointmentId, "clinical-notes"] });
      if (variables.data.completeVisit) {
        queryClient.invalidateQueries({ queryKey: ["appointments", variables.appointmentId] });
        queryClient.invalidateQueries({ queryKey: ["appointments"] });
      }
    },
  });
};
