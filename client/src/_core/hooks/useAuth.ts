import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  // Fix 1: Ensure redirectPath defaults to the current origin if getLoginUrl fails
  const { 
    redirectOnUnauthenticated = false, 
    redirectPath = getLoginUrl() || "/login" 
  } = options ?? {};
  
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    // Fix 2: StaleTime ensures the UI doesn't flicker while scanning hardware
    staleTime: Infinity, 
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    // Sync user info to localStorage for persistence across hardware tests
    if (meQuery.data) {
      localStorage.setItem(
        "manus-runtime-user-info",
        JSON.stringify(meQuery.data)
      );
    }
    
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      // Fix 3: Robust authentication check
      isAuthenticated: !!meQuery.data,
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    
    // Fix 4: If we are already on the redirect path, stop the loop
    const currentPath = window.location.pathname;
    const isAlreadyAtRedirect = currentPath === redirectPath || currentPath === "/";

    if (state.isAuthenticated || isAlreadyAtRedirect) return;

    // Fix 5: Ensure the redirect uses the correct port 3006 logic
    // We force a check here to prevent the "3005" port mismatch
    const safeRedirect = redirectPath.replace(":3005", ":3006");
    window.location.href = safeRedirect;
    
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    state.isAuthenticated,
    meQuery.isLoading,
    logoutMutation.isPending,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}