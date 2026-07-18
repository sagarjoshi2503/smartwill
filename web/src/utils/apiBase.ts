// Base URL of the deployment that actually runs the api/* serverless functions
// (Vercel). Empty by default, meaning "same origin as the frontend" — set
// VITE_API_BASE_URL when the frontend is served from somewhere that can't run
// serverless functions itself (e.g. GitHub Pages).
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "";

export const apiUrl = (path: string): string => `${API_BASE_URL}${path}`;
