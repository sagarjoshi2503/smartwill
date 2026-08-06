/// <reference types="vite/client" />

// Injected by vite.config.ts's `define` at build time — the UTC ISO 8601
// timestamp of when `vite build` ran, used for the "show-build-nr" flag's
// footer build number (see SiteFooter.tsx).
declare const __BUILD_TIME__: string;
