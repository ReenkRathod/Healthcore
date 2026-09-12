import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "PATIENT" | "DOCTOR" | "ADMIN";
  doctorProfile?: {
    id: string;
    isVerifiedByAdmin: boolean;
    isAccepting: boolean;
  };
}

export const useAuth = () => {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        const res = await api.get<{ success: boolean; data: { user: User } }>("/auth/me");
        return res.data.user;
      } catch (err) {
        return null;
      }
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: (credentials: any) =>
      api.post<{ success: boolean; data: { user: User; accessToken?: string } }>("/auth/login", credentials),
    onSuccess: (res) => {
      if (res.data.accessToken) {
        localStorage.setItem("access_token", res.data.accessToken);
      }
      queryClient.setQueryData(["me"], res.data.user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (userData: any) =>
      api.post<{ success: boolean; data: { user: User } }>("/auth/register", userData),
    onSuccess: () => {},
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSuccess: () => {
      localStorage.removeItem("access_token");
      queryClient.setQueryData(["me"], null);
      queryClient.clear();
    },
  });

  return {
    user: meQuery.data,
    isLoading: meQuery.isLoading,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,
    logout: logoutMutation.mutateAsync,
  };
};
