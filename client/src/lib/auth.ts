import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/me"],
    retry: false,
  });

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
  };
}

export function redirectToGoogleAuth() {
  window.location.href = "/api/auth/google";
}

export async function logout() {
  await fetch("/api/auth/logout", { credentials: "include" });
  window.location.reload();
}
