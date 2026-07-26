// Google Analytics 4 (gtag.js). Loaded only when VITE_GA_MEASUREMENT_ID is
// set, so local dev / preview builds without a real property configured
// don't send any traffic to GA.
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

let initialized = false;

// Loads gtag.js and wires up window.gtag — call once on app start.
export const initAnalytics = (): void => {
  if (initialized || !GA_MEASUREMENT_ID) return;
  initialized = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag("js", new Date());
  // Page views are tracked manually via trackPageview() as the SPA switches
  // views (there's no router/URL change to auto-detect), so the initial,
  // automatic page_view is disabled here to avoid double-counting.
  window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
};

// Records a virtual page view — pass a stable, human-readable path for the
// current in-app view (e.g. "/wizard", "/admin") since this SPA doesn't use
// real routing.
export const trackPageview = (path: string, title?: string): void => {
  if (!GA_MEASUREMENT_ID || typeof window.gtag !== "function") return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title,
    page_location: window.location.href,
  });
};
