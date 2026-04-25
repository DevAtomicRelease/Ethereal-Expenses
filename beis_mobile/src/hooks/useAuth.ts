import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import { setAuthenticated, logout as logoutAction } from "@/store/slices/authSlice";
import { authClient } from "@/api/authClient";
import { setTokens, clearTokens, getAccessToken } from "@/api/tokenManager";
import type { TokenResponse } from "@/types/api";
import { router } from "expo-router";
import { clearIntelligenceCache } from "@/services/intelligenceCache";
import { clearQueue } from "@/services/offlineQueue";

/** Extract a useful error message from ky HTTPError or generic errors. */
async function extractError(e: any): Promise<{ status: number; detail: string }> {
  if (e?.response) {
    const status: number = e.response.status ?? 0;
    try {
      const body = await e.response.json();
      return { status, detail: body?.detail ?? `Request failed (${status})` };
    } catch {
      return { status, detail: `Request failed (${status})` };
    }
  }
  
  // In dev, dump the raw error so we know if it's CORS, Timeout, or connection refused
  console.error("DEBUG FETCH ERROR:", e.name, e.message, e);
  
  // Network / fetch errors
  if (e?.message?.includes("fetch") || e?.message?.includes("Network")) {
    return { status: 0, detail: "Cannot reach server" };
  }
  return { status: 0, detail: e?.message ?? "Unknown error" };
}

export function useAuth() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const login = useCallback(async (email: string, password: string) => {
    try {
      const data = await authClient.post("auth/login", { json: { email, password } }).json<TokenResponse>();
      await setTokens(data.access_token, data.refresh_token);

      // Clear any stale/failed query cache from previous sessions or cold-start failures
      // This prevents the dashboard from showing "No transactions" with old cached empty results
      queryClient.clear();
      await clearIntelligenceCache();

      dispatch(setAuthenticated({ userId: data.user_id || "", email: data.email || email }));

      router.replace("/(tabs)/home");

      // Force all queries to refetch with fresh tokens after navigation
      // Small delay ensures the home screen is mounted and queries are registered
      setTimeout(() => {
        queryClient.invalidateQueries();
      }, 300);
    } catch (e: any) {
      const err = await extractError(e);
      throw new Error(
        err.status === 401 ? "Invalid credentials"
        : err.status === 0 ? "Cannot reach server"
        : err.detail
      );
    }
  }, [dispatch, queryClient]);

  const register = useCallback(async (email: string, password: string) => {
    try {
      const data = await authClient.post("auth/register", { json: { email, password } }).json<TokenResponse>();
      await setTokens(data.access_token, data.refresh_token);

      // Clear stale cache for fresh start
      queryClient.clear();
      await clearIntelligenceCache();

      dispatch(setAuthenticated({ userId: data.user_id || "", email: data.email || email }));
      router.replace("/(onboarding)/welcome");
    } catch (e: any) {
      const err = await extractError(e);
      throw new Error(
        err.status === 409 ? "Account already exists"
        : err.status === 0 ? "Cannot reach server"
        : err.detail
      );
    }
  }, [dispatch, queryClient]);

  const logout = useCallback(async () => {
    // Call server-side logout to invalidate token
    try {
      const token = await getAccessToken();
      if (token) {
        await authClient.delete("auth/logout", {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Continue logout even if server call fails
    }

    // Clear ALL local state — prevents data leaking across accounts
    await clearTokens();
    await clearIntelligenceCache();
    await clearQueue();               // ← purge offline operation queue
    queryClient.clear();              // ← purge all React Query cached data
    dispatch(logoutAction());
    router.replace("/(auth)/login");
  }, [dispatch, queryClient]);

  return { login, register, logout };
}

