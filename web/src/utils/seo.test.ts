import { describe, expect, it, beforeEach } from "vitest";
import { SEO_PAGES, PATH_TO_VIEW, applySeoMeta } from "./seo";

// Mirrors the subset of index.html's <head> that applySeoMeta touches.
const HEAD_HTML = `
  <title>Default title</title>
  <meta name="description" content="Default description" />
  <link rel="canonical" href="https://www.forwardlegacy.co.in/" />
  <meta property="og:title" content="Default OG title" />
  <meta property="og:description" content="Default OG description" />
  <meta property="og:url" content="https://www.forwardlegacy.co.in/" />
  <meta name="twitter:title" content="Default Twitter title" />
  <meta name="twitter:description" content="Default Twitter description" />
`;

beforeEach(() => {
  document.head.innerHTML = HEAD_HTML;
});

describe("SEO_PAGES / PATH_TO_VIEW", () => {
  it("gives every entry a unique, absolute-rooted path", () => {
    const paths = Object.values(SEO_PAGES).map(e => e!.path);
    expect(new Set(paths).size).toBe(paths.length);
    paths.forEach(p => expect(p.startsWith("/")).toBe(true));
  });

  it("PATH_TO_VIEW is the exact inverse of SEO_PAGES' paths", () => {
    for (const [view, entry] of Object.entries(SEO_PAGES)) {
      expect(PATH_TO_VIEW[entry!.path]).toBe(view);
    }
  });
});

describe("applySeoMeta", () => {
  it("updates title/description/canonical/OG/Twitter tags for a mapped view", () => {
    applySeoMeta("about");
    const about = SEO_PAGES.about!;
    expect(document.title).toBe(about.title);
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(about.description);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(`https://www.forwardlegacy.co.in${about.path}`);
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute("content")).toBe(about.title);
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute("content")).toBe(`https://www.forwardlegacy.co.in${about.path}`);
    expect(document.querySelector('meta[name="twitter:title"]')?.getAttribute("content")).toBe(about.title);
  });

  it("leaves the existing tags untouched for a view with no SEO_PAGES entry", () => {
    applySeoMeta("wizard");
    expect(document.title).toBe("Default title");
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe("Default description");
  });
});
