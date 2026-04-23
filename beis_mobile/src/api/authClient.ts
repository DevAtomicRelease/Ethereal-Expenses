/**
 * Auth Ky Client -- no retry, 10s timeout.
 * Login, register, token refresh. Failures surfaced immediately.
 */
import ky from "ky";
import { API_BASE_URL } from "./config";

export const authClient = ky.create({
  prefixUrl: API_BASE_URL,
  timeout: 60000,
  retry: 0,
  headers: { "Content-Type": "application/json" },
});
