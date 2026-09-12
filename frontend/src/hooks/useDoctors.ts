import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface Specialisation {
  id: string;
  name: string;
  subSpeciality: string | null;
  isPrimary: boolean;
}

export interface WorkingHours {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  title: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  licenseNumber: string;
  certificateUrl: string | null;
  slotDurationMn: number;
  consultationFee?: number;
  bio: string | null;
  avatarUrl: string | null;
  isAccepting: boolean;
  isVerifiedByAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  specialisations: Specialisation[];
  workingHours?: WorkingHours[];
}

export interface AvailableSlot {
  slotStart: string;
  slotEnd: string;
  isAvailable: boolean;
}

export interface DoctorAvailability {
  doctorId: string;
  date: string;
  dayOfWeek: string;
  slotDurationMn: number;
  slots: AvailableSlot[];
}

export const useAdminDoctors = (filters?: { search?: string; specialisation?: string; isAccepting?: string }) => {
  return useQuery({
    queryKey: ["adminDoctors", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.append("search", filters.search);
      if (filters?.specialisation) params.append("specialisation", filters.specialisation);
      if (filters?.isAccepting) params.append("isAccepting", filters.isAccepting);

      const url = `/admin/doctors${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await api.get<{ success: boolean; data: { doctors: DoctorProfile[]; count: number } }>(url);
      return res.data.doctors;
    },
  });
};

export const useToggleDoctorStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive, isAccepting }: { id: string; isActive?: boolean; isAccepting?: boolean }) => {
      return api.patch<{ success: boolean; data: { doctor: DoctorProfile } }>(`/admin/doctors/${id}/status`, {
        ...(isActive !== undefined && { isActive }),
        ...(isAccepting !== undefined && { isAccepting }),
      });
    },
    onSuccess: (res, variables) => {
      // Invalidate the adminDoctors query so the table refetches
      queryClient.invalidateQueries({ queryKey: ["adminDoctors"] });
    },
  });
};

export const useVerifyDoctor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      return api.patch<{ success: boolean; data: { doctor: DoctorProfile } }>(`/admin/doctors/${id}/verify`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminDoctors"] });
    },
  });
};

export const useRejectDoctor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => {
      return api.patch<{ success: boolean; data: { doctor: DoctorProfile } }>(`/admin/doctors/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminDoctors"] });
    },
  });
};


export const usePublicDoctors = (filters?: { search?: string; specialisation?: string }) => {
  return useQuery({
    queryKey: ["publicDoctors", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.append("search", filters.search);
      if (filters?.specialisation) params.append("specialisation", filters.specialisation);

      const url = `/doctors${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await api.get<{ success: boolean; data: { doctors: DoctorProfile[]; count: number } }>(url);
      return res.data.doctors;
    },
  });
};

export const useDoctor = (doctorId: string) => {
  return useQuery({
    queryKey: ["doctor", doctorId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: { doctor: DoctorProfile } }>(`/doctors/${doctorId}`);
      return res.data.doctor;
    },
    enabled: Boolean(doctorId),
  });
};

export const useDoctorAvailability = (doctorId: string, date: string) => {
  return useQuery({
    queryKey: ["doctorAvailability", doctorId, date],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: DoctorAvailability }>(
        `/doctors/${doctorId}/availability?date=${date}`,
      );
      return res.data;
    },
    enabled: Boolean(doctorId) && Boolean(date),
  });
};

export const useApplyLeave = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { startDate: string; endDate: string; isFullDay?: boolean; leaveStartTime?: string; leaveEndTime?: string; reason?: string }) => {
      return api.post<{ success: boolean; data: any }>(`/doctors/me/leaves`, data);
    },
    onSuccess: () => {
      // Invalidate relevant queries like availability
      queryClient.invalidateQueries({ queryKey: ["doctorAvailability"] });
    },
  });
};

// ─── Doctor self-service: own profile & fee ──────────────────────────────────

export const useMyDoctorProfile = () => {
  return useQuery({
    queryKey: ["myDoctorProfile"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: { doctor: DoctorProfile } }>(`/doctors/me/profile`);
      return res.data.doctor;
    },
  });
};

export const useUpdateMyFee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (consultationFee: number) => {
      return api.patch<{ success: boolean; data: { doctor: DoctorProfile } }>(`/doctors/me/fee`, { consultationFee });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myDoctorProfile"] });
      queryClient.invalidateQueries({ queryKey: ["publicDoctors"] });
    },
  });
};
