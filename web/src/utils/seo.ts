import type { ViewName } from "../types";

// Canonical origin — matches index.html's hardcoded og:url/canonical/JSON-LD
// values, since this is the one place both need to agree with each other.
const SITE_URL = "https://www.forwardlegacy.co.in";

export interface SeoEntry {
  /** Real, bookmarkable/crawlable path for this view (see App.tsx's pushState sync). */
  path: string;
  title: string;
  description: string;
}

// Only the public marketing views get a real URL + their own on-page SEO —
// everything else (wizard, signup/OTP, admin, my-wills, ...) is a
// testator/admin-only flow that shouldn't be indexed, so it keeps sharing
// "/" without touching document head tags. `landing`'s entry doubles as the
// values index.html already ships (kept in sync manually — see index.html).
export const SEO_PAGES: Partial<Record<ViewName, SeoEntry>> = {
  landing: {
    path: "/",
    title: "Forward Legacy — Online Will Creation, Estate & Legacy Planning in India",
    description: "Forward Legacy helps you create a legally valid Will online — All India and Goan Will formats, succession deeds, and custom estate planning documents. Secure legacy forwarding and wealth management services, drafted in minutes.",
  },
  about: {
    path: "/about",
    title: "About Us — Forward Legacy",
    description: "Learn about Forward Legacy's mission and the team behind India's online Will creation, estate planning, and legacy forwarding platform.",
  },
  services: {
    path: "/services",
    title: "Our Services — Will Drafting, Estate & Succession Planning | Forward Legacy",
    description: "Explore Forward Legacy's services: online Will drafting, succession deeds, Goan Will formats, estate planning, and legacy forwarding for individuals and families across India.",
  },
  faq: {
    path: "/faq",
    title: "Frequently Asked Questions — Forward Legacy",
    description: "Answers to common questions about creating a Will online, legal validity, succession law, pricing, and how Forward Legacy's estate planning process works.",
  },
  partner: {
    path: "/partner",
    title: "Partner With Us — Forward Legacy",
    description: "Partner with Forward Legacy to bring online Will creation and estate planning services to your clients, employees, or community.",
  },
  contactUs: {
    path: "/contact-us",
    title: "Contact Us — Forward Legacy",
    description: "Get in touch with Forward Legacy for questions about creating your Will, estate planning services, or partnership opportunities.",
  },
};

// Reverse lookup used to resolve a browser path (initial load, or
// back/forward) back to the ViewName that should be shown for it.
export const PATH_TO_VIEW: Record<string, ViewName> = Object.fromEntries(
  Object.entries(SEO_PAGES).map(([v, e]) => [e!.path, v as ViewName])
);

const setMetaContent = (selector: string, value: string) => {
  document.querySelector(selector)?.setAttribute("content", value);
};

// Updates document.title, the description/canonical/OG/Twitter tags to
// match the given view — so each URL in SEO_PAGES carries its own on-page
// signals instead of every "page" reusing index.html's landing-page
// defaults. No-op for views with no SEO_PAGES entry (index.html's static
// tags — the landing page's — stay as the fallback).
export function applySeoMeta(view: ViewName): void {
  const entry = SEO_PAGES[view];
  if (!entry) return;
  const url = `${SITE_URL}${entry.path}`;
  document.title = entry.title;
  setMetaContent('meta[name="description"]', entry.description);
  document.querySelector('link[rel="canonical"]')?.setAttribute("href", url);
  setMetaContent('meta[property="og:title"]', entry.title);
  setMetaContent('meta[property="og:description"]', entry.description);
  setMetaContent('meta[property="og:url"]', url);
  setMetaContent('meta[name="twitter:title"]', entry.title);
  setMetaContent('meta[name="twitter:description"]', entry.description);
}
