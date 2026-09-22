import axios from "axios";

import { env } from "./env";
import { supabase } from "./supabase";

/**
 * Shared HTTP client for the FastAPI backend. Every request picks up the
 * current Supabase session token fresh (rather than a token captured once
 * at client-creation time), so a refreshed/expired token is always
 * reflected without extra plumbing in call sites.
 */
export const api = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Session token was rejected server-side (expired/revoked) — clear it
      // locally so the app returns to the signed-out state instead of
      // silently retrying with a dead token.
      await supabase.auth.signOut();
    }
    // Never forward raw error.response.data (may contain internals) to UI
    // callers; they should show a generic message and log details here only.
    if (__DEV__) {
      console.warn("[api]", error.config?.url, error.message);
    }
    return Promise.reject(error);
  },
);
