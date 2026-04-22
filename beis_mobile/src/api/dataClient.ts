/**
 * Data Ky Client -- 3 retries, 8s timeout.
 * Expense CRUD, thresholds, memory status.
 * Fix 3: 401 hook skips retry if the failing request IS /auth/refresh.
 */
import ky from "ky";
import { API_BASE_URL } from "./config";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "./tokenManager";
import { authClient } from "./authClient";

let isRefreshing = false;

export const dataClient = ky.create({
  prefixUrl: API_BASE_URL,
  timeout: 8000,
  retry: { limit: 3, methods: ["get", "post", "put", "delete"] },
  headers: { "Content-Type": "application/json" },
  hooks: {
    beforeRequest: [
      async (request) => {
        const token = await getAccessToken();
        if (token) request.headers.set("Authorization", `Bearer ${token}`);
      },
    ],
    afterResponse: [
      async (request, _options, response) => {
        if (response.status !== 401) return response;

        // Guard: if already refreshing, or this IS the refresh call, bail out
        if (isRefreshing) return response;
        const url = request.url || "";
        if (url.includes("auth/refresh") || url.includes("auth/login") || url.includes("auth/register")) {
          return response;
        }

        const refresh = await getRefreshToken();
        if (!refresh) {
          await clearTokens();
          return response;
        }

        isRefreshing = true;
        try {
          const data = await authClient
            .post("auth/refresh", { json: { refresh_token: refresh } })
            .json<{ access_token: string; refresh_token: string }>();
          await setTokens(data.access_token, data.refresh_token);
          request.headers.set("Authorization", `Bearer ${data.access_token}`);
          return ky(request);
        } catch {
          // Refresh token itself is expired/invalid -- clear and force re-login
          await clearTokens();
          return response;
        } finally {
          isRefreshing = false;
        }
      },
    ],
  },
});
