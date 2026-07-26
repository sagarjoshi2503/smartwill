import { getAuthToken, type AuthRole } from "./auth";

// Base URL of the deployment that actually runs the api/* serverless functions
// (Vercel). Empty by default, meaning "same origin as the frontend" — set
// VITE_API_BASE_URL when the frontend is served from somewhere that can't run
// serverless functions itself (e.g. GitHub Pages).
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "";

export const apiUrl = (path: string): string => `${API_BASE_URL}${path}`;

// fetch() wrapper that attaches the stored JWT for the given role as a
// Bearer Authorization header — use for every request to an endpoint
// protected by get_current_admin/get_current_testator on the backend.
export const authFetch = (role: AuthRole, path: string, init: RequestInit = {}): Promise<Response> => {
  const token = getAuthToken(role);
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(apiUrl(path), { ...init, headers });
};
