import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

// Set this to true to bypass the login screen for your demo
const DEMO_MODE = true;

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { 
    redirectOnUnauthenticated = false, 
    redirectPath = getLoginUrl() 
  } = options ?? {};
  
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity, 
    enabled: !DEMO_MODE, // Disable actual network call in demo mode
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    if (DEMO_MODE) {
      window.location.href = "/";
      return;
    }
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED") return;
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    if (DEMO_MODE) {
      return {
        user: { id: "demo-admin", name: "Elisha (Admin)", role: "ADMIN" },
        loading: false,
        error: null,
        isAuthenticated: true,
      };
    }

    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: !!meQuery.data,
    };
  }, [meQuery.data, meQuery.error, meQuery.isLoading, logoutMutation.error, logoutMutation.isPending]);

  useEffect(() => {
    if (DEMO_MODE || !redirectOnUnauthenticated) return;
    if (state.loading || state.isAuthenticated) return;

    // Prevent infinite loops if the redirect path is the current page
    if (window.location.href.includes(redirectPath)) return;

    window.location.href = redirectPath;
  }, [redirectOnUnauthenticated, redirectPath, state.isAuthenticated, state.loading]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}