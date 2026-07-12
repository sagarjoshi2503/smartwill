# SmartWill — Codebase Documentation

## 1. What this is

SmartWill is a **mostly frontend, mock-everything prototype** (no database, no
persisted sessions) for an Indian online Will-drafting product. It walks a user
through picking a pricing plan, a signup flow (Google SSO **or** mock phone/OTP),
a legal-disclaimer gate, a 6-step wizard that collects testator / executor /
guardian / beneficiary / asset / residual-clause data, and finally renders a
formatted, print-ready Last Will & Testament document modeled on the Indian
Succession Act, 1925. It also has a separate "Lawyer Portal" (email/password
login gate, not verified against anything real) with a mock client dashboard.

The one real backend piece is a single Vercel serverless function
(`api/auth/google.ts`) that verifies Google Sign-In ID tokens server-side —
see §4.2a. Everything else (phone OTP, lawyer login, payment, PDF generation,
the lawyer portal's client list) is still fully mocked/hard-coded client state.

All app state otherwise lives in React `useState` in memory. Nothing is
persisted (no localStorage) — refreshing the page resets everything to
hard-coded demo defaults.

## 2. Tech stack

| Concern | Choice |
|---|---|
| Framework | React 18 (`react`, `react-dom`) |
| Build tool | Vite 5 (`@vitejs/plugin-react`) |
| Language | TypeScript, fully typed (no `@ts-nocheck`) |
| Styling | Tailwind CSS 3 + a handful of hand-written utility classes (`apv-*`) in `src/index.css` |
| Icons | `lucide-react` |
| Deployment | Deployed to both Vercel (domain root) and GitHub Pages (`gh-pages` package, sub-path) — `vite.config.ts` uses a relative `base: './'` so the same build works at either location |
| Backend | One Vercel serverless function: `api/auth/google.ts` (verifies Google Sign-In ID tokens via `google-auth-library`) |

There is no router, no state library (Redux/Zustand/Context), no form library,
no test runner, and no linter configured.

## 3. File layout

The app was refactored (2026-07-12) from a single 1380-line `App.tsx` into a
conventional multi-file structure. Behavior and visuals are unchanged; only the
code organization moved.

```
index.html               Vite entry HTML, mounts #root
src/main.tsx              ReactDOM.createRoot renders <SmartWill/> (App.tsx default export)
src/App.tsx               Root component: view state machine + top-level will/signup/otp state,
                          composes everything under src/components
src/types.ts              Shared TS interfaces (WillState, Testator, Executor, Guardian,
                          Beneficiary, AssetInstance/AssetCatalogItem, Plan, Addon, etc.)
src/data/
  options.ts               STATES, RELATIONS, ID_TYPES, MONTHS (dropdown option lists)
  plans.tsx                PLANS, ADDONS (pricing catalogue, has JSX icons)
  assetCatalogue.tsx        ASSET_CATALOGUE (12 asset types w/ field schemas + docText
                          templates), COLOR (per-category Tailwind class lookup)
  defaultWill.ts            DEFAULT_WILL (initial wizard state, pre-filled demo persona),
                          MOCK_CLIENTS (Lawyer Portal demo rows)
src/utils/
  format.ts                 fmt (currency), statusStyle (client status badge classes), today
  allocation.ts             allocTotal, formatAllocCompact (live preview), formatAllocFull
                          (printable document) — the compact/full variants render
                          slightly different text and are kept separate intentionally
src/components/
  shared/                   StepHeader, FormBlock, Toggle, Nav, Clause, WillSection —
                          small presentational pieces reused across steps/documents
  LandingPage.tsx           Hero, pricing plans, add-ons, order summary
  AuthChoiceView.tsx        "Get Started" screen — Google Sign-In button OR
                          "Continue with Phone Number", see §4.2a
  GoogleSignInButton.tsx    Thin wrapper around Google Identity Services' JS SDK;
                          renders the official Google button, hands the raw ID
                          token up to the caller for server-side verification
  SignupView.tsx            Phone/OTP signup form (name/phone/email/state + terms)
  OtpView.tsx                6-digit OTP entry (includes the pre-existing "Auto-fill
                          123456" demo shortcut and its stale-closure quirk, see below)
  DisclaimerView.tsx        4-checkbox legal disclaimer gate
  LawyerLoginView.tsx        Email/password gate in front of the Lawyer Portal —
                          client-side only, accepts any syntactically valid
                          email + non-empty password (no real backend check)
  WizardForms.tsx           All 6 wizard steps (Testator/Executor/Guardian/
                          Beneficiaries/Assets/Residual) — kept as one component,
                          matching the original step markup exactly
  LiveDocPreview.tsx        Compact live-updating preview shown in the wizard's right pane
  WillDocument.tsx          Full printable 7-section Will document
  LawyerPortal.tsx          Mock lawyer dashboard (stats + client table)
api/auth/google.ts         Vercel serverless function — verifies a Google ID token
                          server-side via `google-auth-library`, returns
                          {name, email} on success. The only real backend code
                          in the repo; see §4.2a for setup.
src/index.css              Tailwind directives + custom "apv-*" utility classes, fonts, print CSS
tailwind.config.js         Tailwind content globs + brand color palette + font families
postcss.config.js          standard tailwind/autoprefixer pipeline
vite.config.ts             base: './' (relative, works at a domain root or a sub-path), react plugin
tsconfig.json / .node.json  standard Vite React TS config
package.json               scripts: dev, build, preview, predeploy, deploy (gh-pages -d dist)
.env.example               documents VITE_GOOGLE_CLIENT_ID (see §4.2a)
apv.html                   a saved copy of https://apv.co.in — reference/theme source only,
                          not imported or built into the app (per commit "Changed themes
                          just like apv.co.in")
dist/                     pre-built output, checked in (from a previous `npm run build`)
README.md                 just the title "smartwill" — no real docs (this file replaces that gap)
```

## 4. Application flow (state machine)

Top-level state in `SmartWill()` (the default-exported root component):

```
view: "landing" | "authChoice" | "signup" | "otp" | "disclaimer" | "lawyerLogin" | "lawyer" | "wizard"
```

Flow for a testator:

```
landing → signup → otp → disclaimer → wizard (6 steps) → showWillDoc (true) → printable WillDocument
```

Flow for a lawyer:

```
landing → (Lawyer Portal login button, no real auth) → lawyer → onCreateWill → wizard
```

Nothing gates these transitions with real validation beyond simple UI checks
(e.g., "check all boxes to continue", "OTP must be 6 digits" — but the OTP is
never verified against anything real; there's even a "Demo: Auto-fill 123456" shortcut).

### 4.1 Landing page (`LandingPage`)
- Hero section with marketing copy.
- 4 pricing `PLANS` (Notarized ₹4,999 / Registered ₹19,999 / Premium ₹29,999 / NRI ₹29,999),
  each with feature bullets, selectable via click.
- 4 `ADDONS` (Registration, Spouse Will, Gift a Will, Doorstep Notarization) as toggleable checkboxes.
- Live order summary computing `totalPrice = plan.price + sum(selected addon prices)`.
- "Proceed" / "Start Creating Your Will Free" buttons, and the header's "Create Your Will" button, all call `onStart` → `setView("authChoice")`.

### 4.2a Auth choice: Google SSO vs. phone/OTP (`AuthChoiceView`)
Clicking "Create Your Will" lands on a "Get Started" screen with two paths:

- **"Continue with Google"** — renders Google's official Sign-In button via
  Google Identity Services (`GoogleSignInButton`). On success, the raw ID token
  is POSTed to `api/auth/google.ts`, a Vercel serverless function that verifies
  the token's signature server-side with `google-auth-library` and returns
  `{name, email}`. `App.tsx`'s `handleGoogleSuccess` then pre-fills `signup`
  with that name/email and — since Google already proved identity — **skips
  the phone/OTP screens entirely**, going straight to `disclaimer`.
- **"Continue with Phone Number"** — unchanged: leads to `SignupView` → `OtpView`
  → `disclaimer`, exactly as before Google SSO was added.

`DisclaimerView`'s "Back" button is context-aware (`skippedOtp` state in
`App.tsx`): it returns to `authChoice` if the user arrived via Google, or to
`otp` if they arrived via the phone flow.

**Setup required** — Google Sign-In won't work until you provide a real OAuth
Client ID:
1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create an **OAuth 2.0 Client ID** of type "Web application".
2. Add every origin the app is served from under **Authorized JavaScript
   origins** — e.g. `http://localhost:5173` for local dev, and your Vercel
   domain(s) (`https://smartwill-seven.vercel.app`, plus any preview-deployment
   pattern you use).
3. Copy the generated Client ID (it looks like `1234567890-abc...apps.googleusercontent.com`).
4. Set it as `VITE_GOOGLE_CLIENT_ID` in **two** places (same value both times):
   - Locally: a `.env.local` file at the repo root (see `.env.example`).
   - On Vercel: Project Settings → Environment Variables → `VITE_GOOGLE_CLIENT_ID`.
     This also makes it available to `api/auth/google.ts` at runtime (Vercel
     injects all configured env vars into serverless functions regardless of
     the `VITE_` prefix — that prefix only matters for Vite's client bundling).
5. Redeploy. Until this is done, `GoogleSignInButton` shows a small "Google
   Sign-In isn't configured" notice instead of a button (and the API route
   returns a 500 if somehow called anyway) — it fails soft, not with a crash.

A Client ID is a public identifier, not a secret — it's fine that it ends up in
the client-side JS bundle. What actually gets verified server-side is the ID
token Google issues after the user signs in, not the Client ID itself.

### 4.2b Phone signup / OTP / Disclaimer (mocked auth & compliance gate)
- `SignupView`: name/phone/email/state fields + a "must accept terms" checkbox before "Send OTP" is enabled. Nothing is sent anywhere.
- `OtpView`: 6 separate digit inputs with auto-advance focus; includes a **demo auto-fill link** that fills `123456`. No backend verification — advancing only requires all 6 boxes non-empty.
- `DisclaimerView`: 4 mandatory checkboxes (non-Muslim declaration, age ≥18 & sound mind, Indian law governs, tool ≠ legal advice) that must all be checked to proceed. This encodes real Indian legal constraints (Muslim personal law is excluded; Indian Succession Act, 1925 applies) directly into the UX copy.

### 4.3 Wizard (`WizardForms`, 6 steps) + Live preview (`LiveDocPreview`)
The wizard renders in a **split-pane layout**: left pane is the active step's form,
right pane (desktop only) is a continuously-updated document preview reflecting
`will` state in real time — a nice UX touch worth preserving in any refactor.

Steps (`WIZARD_STEPS`), each mapped to a Will "Section":

1. **Testator** (Section I) — full name (locked once disclaimer accepted, per UI copy), relation-to-parent/spouse, age, country (locked to India), address, ID type/number, signing date/place.
2. **Executor** (Section II) — primary executor, optional joint executor, administration type (`jointly` vs `jointly_severally`), optional substitute executor.
3. **Guardians** (Section III) — optional; only relevant if there are minor beneficiaries; main + substitute guardian.
4. **Beneficiaries** — dynamic list (add/remove) of `{id, name, relation}`; relation drawn from `RELATIONS`.
5. **Assets** (Section IV) — the most complex step:
   - `distributionMode`: `"global"` (divide whole estate: equal split or user-specified percentages that must sum to 100%) or `"itemized"` (pick individual asset types from `ASSET_CATALOGUE` and allocate each one, split by % across beneficiaries or given wholly to one).
   - `ASSET_CATALOGUE` defines 4 categories (Financial Assets, Immovable Property, Personal & Valuables, Digital & Misc.) totaling 12 asset types (bank account, stocks/MF, crypto, insurance, house/flat, land, commercial property, vehicle, jewelry, pet, social media/digital, IP). Each asset type has its own field schema, placeholder defaults, an `allowSplit` flag, and a `docText(data, allocationString)` function that renders the legal clause text for that asset — this is effectively a **template engine per asset type**, all defined inline as data + closures.
   - Assets are also each pinned to a will "section" letter (A–F) used later to group them in the printed document (A=Immovable, B=Vehicles, C=Securities, D=Bank, E=Insurance/cash, F=Other movable/digital).
6. **Residual & Special Instructions** (Sections V & VI) — residual beneficiary (catch-all for anything not itemized) + free-text special instructions (funeral rites, organ donation, pets, etc., defaulting to Hindu-rite/organ-donation boilerplate) + 2 witnesses (name + address, hard Indian Succession Act attestation requirement).

Both `LiveDocPreview` (compact) and the full `WillDocument` (printable) consume the
same `will` object and format asset allocations via `src/utils/allocation.ts`
(`formatAllocCompact` / `formatAllocFull`). These two are kept as separate functions
rather than merged into one, because their output text genuinely differs (the full
version includes the beneficiary's relation and a different "not set" fallback
string) — merging them would change the rendered document text.

### 4.4 Generated Will document (`WillDocument`)
- Full-page, serif-styled (`EB Garamond`), print-optimized legal document with 7 numbered sections (I–VII), matching Indian testamentary-instrument conventions: Declaration, Executors, Guardians, Distribution (grouped by asset section A–F, or the global-mode clause), Rest & Residue, Special Instructions, Testimonium/Attestation with signature blocks for testator + 2 witnesses.
- "Print" and "Download PDF" buttons both just call `window.print()` (browser print-to-PDF) — there is no server-side PDF generation.
- Print CSS (`@media print`) hides the `no-print` toolbar and strips shadows/margins from the document page.

### 4.5 Lawyer Portal (`LawyerLoginView` → `LawyerPortal`)
- The header's "Lawyer Portal" button leads to `LawyerLoginView` first — an
  email + password form. Like the OTP flow, this is a client-side-only gate:
  it accepts any syntactically valid email plus a non-empty password (no
  server call, no real credential check). An empty/invalid submission shows
  an inline error and stays on the login screen.
- `LawyerPortal`: purely presentational mock dashboard: 4 stat tiles (Total Clients, Wills Completed, Pending Actions, Revenue MTD), a tab switcher (Clients/Completed/Pending) that doesn't actually filter anything, and a table of `MOCK_CLIENTS` (5 hard-coded rows). "Create Will for Client" and "Open Draft" both just jump into the same wizard with default state — no per-client data loading.

## 5. Data model (all defined at top of `App.tsx`)

- `PLANS`, `ADDONS` — pricing catalogue for the landing page.
- `STATES` — 28 Indian states (no UTs) for the signup state dropdown.
- `RELATIONS`, `ID_TYPES`, `MONTHS` — dropdown option lists reused across steps.
- `ASSET_CATALOGUE` — the asset-type schema/template catalogue described above.
- `COLOR` — Tailwind class lookup per asset category color tag.
- `DEFAULT_WILL` — the entire initial `will` state shape, pre-filled with a realistic
  demo persona ("Arjun Verma", Pune address, SBI account, Zerodha demat, etc.) so the
  app is fully explorable without typing anything.
- `MOCK_CLIENTS` — lawyer-portal demo rows.

`will` shape (informal):
```
{
  testator: {...}, executor: {...}, guardian: {...},
  distributionMode, globalMode, globalPercentages: {beneId: pct},
  assets: [{ uid, typeId, catItem, data: {...fields}, allocs: {beneId: pct} | {sole: beneId}, allowSplit }],
  residualBeneId, residualIdType, residualIdNumber,
  specialInstructions,
  beneficiaries: [{id, name, relation}],
  witnesses: [{name, address}],
}
```

## 6. Styling system

- Tailwind utility classes everywhere, plus a small set of bespoke classes defined
  in `src/index.css` prefixed `apv-` (apv = the theme this was copied from, see
  `apv.html` / commit "Changed themes just like apv.co.in"): `.apv-btn`, `.apv-card`,
  `.apv-input`, `.apv-pill`, `.apv-label`, `.apv-section-title`.
- Brand color: gold/amber `#d09d61` (also in `tailwind.config.js` as `brand.500`).
- Fonts: `Cinzel` (serif headings, loaded as `.serif` class) + `Epilogue`/`Montserrat`
  (body), loaded via Google Fonts `@import` in `index.css`; the printable Will
  document separately loads `EB Garamond` via an inline `<style>` `@import` inside
  `WillDocument`.
- Light theme only (`color-scheme: light` in `:root`); no dark-mode toggle despite
  some dark-palette utility classes (`bg-slate-900`, `border-slate-800`) being
  overridden back to light-compatible values in `index.css` — a leftover from an
  earlier dark design that was converted to light (matches the "Changed themes"
  commit).

## 7. Build & deploy

```
npm run dev        # vite dev server
npm run build       # tsc (real type-check, no @ts-nocheck) + vite build → dist/
npm run preview     # serve the dist/ build locally
npm run deploy      # predeploy runs build automatically, then gh-pages -d dist pushes to gh-pages branch
```

`vite.config.ts` uses a relative `base: './'`, so the same `dist/` build works
both at a domain root (Vercel, e.g. `https://smartwill-seven.vercel.app/`) and
under a sub-path (GitHub Pages, `https://<user>.github.io/smartwill/`, via the
`gh-pages` deploy script). Vercel additionally auto-detects `api/*.ts` files as
serverless functions alongside the static Vite build — no `vercel.json` needed.
The `dist/` folder is currently committed to the repo (a built snapshot), which is
unusual — normally `dist/` would be gitignored and only produced by CI/`gh-pages`.

## 8. Notable gaps / things to know before extending

- **Almost no backend.** Only `api/auth/google.ts` is real (verifies Google
  Sign-In tokens). Payment, PDF generation, the phone/OTP flow, the lawyer
  login gate, and the lawyer portal's client list are all still fully
  mocked/hard-coded. Anything resembling "save my will" or "email me a copy"
  does not exist yet.
- **Remaining copy-paste**: within `WizardForms.tsx`, the JSX for optional
  joint/substitute executor blocks (step 2) and main/substitute guardian blocks
  (step 3) still repeats the same ID-type/ID-number/address field trio with only
  field-name differences. Left as-is during the 2026-07-12 structural refactor
  (single-file split, no behavior changes) — a follow-up could factor this into a
  shared `PersonFields` component if the wizard grows further.
- **No persistence** — closing the tab loses all wizard progress; there's no
  localStorage/sessionStorage or draft-save mechanism.
- **No routing/URL state** — `view`/`wizardStep` are plain `useState`, so there are
  no shareable/bookmarkable URLs and the browser back button doesn't work as expected.
- **Legal content is hard-coded English boilerplate** targeting non-Muslim Indian
  testators only (explicitly excluded via the disclaimer checkbox) and assumes the
  Indian Succession Act, 1925 governs — useful domain context if asked to extend
  legal clause coverage (e.g. adding Muslim personal law flows would be a large,
  distinct feature, not a copy-edit).
