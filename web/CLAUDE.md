# web/ — SmartWill frontend (React + Vite + TS)

## What this is

The React SPA. No router — `App.tsx` is a manual view-state machine
(`view: ViewName` via `useState`). Golden/amber theme (`#d09d61`), Tailwind
CSS. Deployed **three independent ways** — Vercel (Vite static build, part
of `vercel.json`'s `services.web`), AKS (nginx container), local Docker
(same nginx image via `docker-compose.yml`).

## Layout

```
src/
  App.tsx                    View state machine + top-level will/signup/otp
                             state; composes everything else. Also owns
                             handleGenerateWill/handleSaveDraft and the
                             showWillDoc toggle that swaps the wizard for a
                             full-page document view.
  types.ts                    All shared TS interfaces — WillState and every
                             sub-shape (Testator, Executor, Guardian,
                             Witness, AllIndia*, Goan*, ...)
  constants.ts                 Central constants — API_*, LBL_*, MSG_*,
                             BTN_*, ERR_*, PH_* (placeholder), ARIA_*,
                             CONFIRM_* prefixes. New UI copy/literals
                             belong here, not inline in components.
  data/
    defaultWill.ts              DEFAULT_WILL — initial wizard state, one
                             entry per Will type's data needs
    options.ts                  Dropdown option lists (STATES, RELATIONS,
                             ID_TYPES, OCCUPATIONS, MONTHS, GOAN_*, etc.)
    willTypes.tsx                WILL_TYPE_OPTIONS / WILL_TYPE_LBL — the
                             4 Will types: allindia, goan, successiondeed,
                             customwill
    assetCatalogue.tsx           Generic asset catalogue used by the
                             successiondeed/customwill flow only
  features/
    create-will/
      WizardForms.tsx            All wizard steps in one file, branching by
                             `willType` for steps that differ per Will
                             type (Testator, Assets, Residuary/Witnesses).
                             See "Will-type branching" below.
      AllIndiaWillDocument.tsx    Printable Open Will output for willType
      AllIndiaLiveDocPreview.tsx  ==="allindia" + its live wizard preview
      GoanWillDocument.tsx        Printable notarial Open Will for
                             willType==="goan" — parameterized by `person`
                             (goanTestator or goanSpouse), since Goan
                             succession law needs a separate Will per spouse
      GoanDeedDocument.tsx        Deed of Consent (goan, married only)
      GoanDocumentsView.tsx       Lists whichever of the 1-3 Goan documents
                             apply, each opening its own print view
      WillDocument.tsx / LiveDocPreview.tsx   Generic path for
                             successiondeed/customwill (no dedicated PDF
                             template exists for these two types)
    admin-dashboard/, admin-signin/, admin-signup/, client-signin-otp/,
    client-profile/, chatbot/
  utils/
    apiBase.ts                  apiUrl()/authFetch() — VITE_API_BASE_URL
    chatbotBase.ts               chatbotUrl() — VITE_CHATBOT_BASE_URL
    willValidation.ts             getMissingIdFields(will, willType) — blocks
                             "Generate" until every in-use ID Number field
                             is filled; branches per Will type
nginx.conf.template           AKS/local container nginx config — a
                             *template* (envsubst, not a build-time file),
                             see "The /api/flags proxy" below
Dockerfile
```

## Will-type branching

The 4 Will types (`allindia`, `goan`, `successiondeed`, `customwill`) share
the Executor/Guardian/Beneficiaries wizard steps unconditionally (even
though `allindia`'s and `goan`'s own PDF formats don't reference
executor/guardian data at all — established precedent, not a bug) but
diverge for Testator, Assets, and Residuary/Witnesses. Each Will type's
data lives in its own top-level `WillState` fields
(`allIndiaAssets`/`allIndiaResidue` vs `goanTestator`/`goanSpouse`/
`goanAssets`/`goanResidue`/`goanWitnesses`/`goanDeed*`) — **never share a
field between Will types** even when the shape looks identical, since each
type's PDF template can (and does) diverge in ways that make retrofitting a
shared field painful later.

**Component pitfall already fixed once, don't reintroduce it**: never
declare a component as a JSX tag (`<Foo/>`) from inside a render-scoped
closure (e.g. an IIFE inside a step's JSX). React sees a new function
identity every render and remounts the subtree, losing input focus on
every keystroke. Write it as a plain function called directly
(`{foo(...)}`) instead — see `WizardForms.tsx`'s `personFields`/`category`
in the Goan steps for the correct pattern (the older All India asset-picker
`Category` component still has the JSX-tag bug — don't copy it, and don't
"fix" it without being asked, since All India's behavior is explicitly
frozen).

## The `/api/flags` proxy

`constants.ts`'s `API_FLAGS`/`API_RAZORPAY_FLAG`/`API_CHATBOT_FLAG` are
always `fetch()`ed as a **same-origin relative path** — never through
`apiUrl()`. This matches how Vercel's `vercel.json` rewrites `/api/flags`
to the `flags` service. For AKS and local Docker, `nginx.conf.template`
proxies that same path to the `flags` container/service via the
`FLAGS_UPSTREAM` env var, substituted at container **start** (not build
time) by the official nginx image's `envsubst` templating convention — one
`web` image works unmodified in every environment. See `flags/CLAUDE.md`.

## No hardcoded cross-environment URLs

`VITE_API_BASE_URL`/`VITE_CHATBOT_BASE_URL` are Vite build args, baked into
the JS bundle — each environment's build passes its own values (Vercel:
unset/same-origin; AKS: the api/chatbot LoadBalancer IPs; local: `localhost`
ports). Never hardcode a URL from one environment into a component or
constant — always go through these build-time values.

## Testing

```
cd web
npx tsc --noEmit          # type-check
npx vitest run             # 82 tests as of this writing (3 pre-existing failures in
                           # willValidation.test.ts/GiftAWillForm.test.tsx predate this
                           # writing — see those files before assuming a change caused them)
npm run build              # tsc + vite build, closest to what CI/ACR do
```

## Known gaps

- No live preview exists for the Goan Will type (`AllIndiaLiveDocPreview`
  exists for `allindia`; Goan shows a static placeholder card in `App.tsx`
  instead) — deliberate scope cut, not an oversight.
- `WillDocument.tsx` (successiondeed/customwill) has no `@page` CSS rule at
  all, unlike the other three document components — not yet fixed pending
  explicit formatting requirements for those two Will types.
