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
  // Open Google OAuth in a popup to avoid iframe restrictions
  const popup = window.open(
    "/api/auth/google",
    "google-oauth",
    "width=500,height=600,scrollbars=yes,resizable=yes"
  );
  
  // Listen for popup to close (successful auth)
  const checkClosed = setInterval(() => {
    if (popup?.closed) {
      clearInterval(checkClosed);
      // Refresh the page to get the updated auth state
      window.location.reload();
    }
  }, 1000);
}

export async function logout() {
  await fetch("/api/auth/logout", { credentials: "include" });
  window.location.reload();
}
