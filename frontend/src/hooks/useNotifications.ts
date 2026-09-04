import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface AppNotification {
  id: string;
  recipientId: string;
  senderId: string | null;
  appointmentId: string | null;
  type: string;
  channel: string;
  status: "PENDING" | "SENT" | "FAILED" | "RETRYING" | "CANCELLED";
  subject: string | null;
  body: string;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
}

export const useNotifications = () => {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: NotificationsResponse }>("/notifications");
      return res.data;
    },
    refetchInterval: 5000, // Poll every 5 seconds for real-time notifications
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.patch<{ success: boolean; data: { notification: AppNotification } }>(`/notifications/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.patch<{ success: boolean; data: { success: boolean } }>("/notifications/read-all", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};
