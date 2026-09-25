# Testloom MVP — Implementation Plan

## Overview

Build the Testloom MVP for the IBM Bob 2.0 Hackathon in eight focused phases.

**Core demo story:**
```
Feature request → LLM acceptance checks → Playwright browser run → Evidence capture → PASS / FAIL / INCONCLUSIVE
```

**Stack:** Next.js 14 (App Router) + TypeScript, Tailwind CSS, Playwright, Zod, OpenAI (`gpt-4o-mini`), Vercel Blob, Vercel.

**LLM choice:** `gpt-4o-mini` — cheapest capable model for structured JSON output via `response_format: { type: "json_object" }`. No streaming required for the check-generation step.

**Evidence storage:** Vercel Blob. Screenshots written by the Playwright runner are uploaded to Blob and retrieved by the Evidence screen via public URLs.

**Controlled demo app:** A minimal login app deployed separately, with two versions:
- **Version A (FAIL):** Session stored in memory only — lost on refresh.
- **Version B (PASS):** Session stored in an `HttpOnly` cookie — survives refresh.

Both versions are deployed to Vercel as separate projects with fixed URLs stored as environment variables and used as the only allowed verification targets.

**Verification flow:** Synchronous. `POST /api/verify` runs the full pipeline and returns the complete `Verification` result in the response body. No polling, no in-memory verification store, no database.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Playwright cannot run on Vercel serverless | High | Critical | Use `@sparticuz/chromium` + `playwright-core`. Phase 2 proves it locally; Phase 3 proves it on Vercel. Nothing downstream starts until Phase 3 is confirmed. |
| LLM generates check steps that cannot be mapped to Playwright actions | Medium | High | Define a closed `ActionType` enum in Zod; the LLM is constrained to that vocabulary. Unknown action types produce `INCONCLUSIVE`. |
| Vercel function timeout exceeded during full check run | Medium | High | Set `maxDuration: 60` in `vercel.json`. If a check times out, that check gets `INCONCLUSIVE`. |
| `gpt-4o-mini` returns invalid JSON or unmappable steps | Medium | Medium | Validate all LLM output through Zod. Retry once on failure; if retry fails, return a typed error. |
| Demo app URL changes after the allowlist is configured | Low | High | Store both demo URLs as env vars (`DEMO_APP_FAIL_URL`, `DEMO_APP_PASS_URL`). The server reads them at runtime — no hard-coded strings in source. |
| Evidence Blob upload fails mid-run | Low | Medium | Action log is always captured even if screenshot upload fails. Use a placeholder entry with a clear error message rather than omitting the evidence record. |

**Phase 3 is the hard technical blocker.** Do not start Phase 4 or later until Playwright is confirmed working on a real Vercel deployment.

---

## Phase 0 — Scaffold + Shared Types

**Status:** [x] complete

### Intent
Establish the project skeleton, shared Zod schemas, and environment config so every later phase has a stable, typed foundation to build on.

### Deliverable
A runnable Next.js app with zero application logic — only the shared type system, project config, and `bob_sessions/` directory.

### Expected Outcomes
- `npm run dev` starts the Next.js app at `localhost:3000`
- `npm run lint` and `npx tsc --noEmit` both pass with zero errors
- `/types/index.ts` exports Zod schemas for `ActionType`, `ActionStep`, `AcceptanceCheck`, `CheckResult`, `Verification`
- `.env.local.example` lists all required environment variables

### Todo List
- [ ] Scaffold Next.js 14 app with TypeScript and Tailwind (`create-next-app`)
- [ ] Add dependencies: `zod`, `@vercel/blob`, `openai`, `playwright-core`, `@sparticuz/chromium`
- [ ] Create `/types/index.ts` with Zod schemas:
  - `ActionType` — enum: `navigate | click | fill | expectVisible | expectText | expectUrl`
  - `ActionStep` — `{ type: ActionType, selector?: string, value?: string, expectedText?: string, expectedUrl?: string }`
  - `AcceptanceCheck` — `{ id: string, description: string, steps: ActionStep[] }`
  - `CheckResult` — `{ checkId: string, description: string, status: "PASS"|"FAIL"|"INCONCLUSIVE", expected: string, observed: string, evidence: string[] }`
  - `Verification` — `{ id: string, featureRequest: string, targetUrl: string, checks: CheckResult[], verdict: "PASS"|"FAIL"|"INCONCLUSIVE", createdAt: string }`
- [ ] Create `.env.local.example` with: `OPENAI_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `DEMO_APP_FAIL_URL`, `DEMO_APP_PASS_URL`
- [ ] Create `vercel.json` with: `{ "functions": { "app/api/**/*.ts": { "memory": 1024, "maxDuration": 60 } } }`
- [ ] Create `bob_sessions/.gitkeep`
- [ ] Verify `npm run lint` and `npx tsc --noEmit` pass

### Relevant Context
- `/types/index.ts` is the single source of truth — never duplicate type definitions elsewhere
- `ActionType` is the closed vocabulary the LLM will be constrained to in Phase 4

---

## Phase 1 — Controlled Demo Application

**Status:** [ ] pending

### Intent
Build and deploy the two-version demo login app that Testloom will verify against. Testloom never executes code from this app — it only drives a browser against its public URLs.

### Deliverable
Two publicly deployed login apps: one that loses session on refresh (FAIL target), one that preserves it (PASS target). Both URLs recorded in Testloom's environment config.

### Expected Outcomes
- **Version A** live at a stable Vercel URL — login works, session lost on refresh
- **Version B** live at a stable Vercel URL — login works, session survives refresh
- A human can manually verify the difference: log in → refresh → observe
- Both URLs recorded in Testloom `.env.local` as `DEMO_APP_FAIL_URL` and `DEMO_APP_PASS_URL`

### Todo List
- [ ] Create `/demo-app/` as a minimal standalone Next.js app (separate from the main Testloom app)
- [ ] Implement login form: `POST /api/login`, credentials `demo` / `demo123`
- [ ] Add `/dashboard` route: shows "Welcome, demo" if authenticated, redirects to `/login` if not
- [ ] **Version A:** Store auth state in a server-side JavaScript `Map` keyed by a non-persistent request header — effectively lost on any new request after refresh
- [ ] **Version B:** Store auth state in an `HttpOnly` cookie set by the `/api/login` route — survives refresh
- [ ] Deploy Version A and Version B as two separate Vercel projects
- [ ] Add both deployed URLs to Testloom `.env.local` and `.env.local.example`

### Relevant Context
- The demo app must be visually simple but Playwright-reliable: stable selectors, no flaky animations
- Use `data-testid` attributes on the login form, submit button, and dashboard heading to give the Playwright runner stable selectors
- Hard-coded credentials `demo` / `demo123` — no real secrets are involved
- Version A and B must be reachable from the Vercel serverless network (public URLs, not localhost)

---

## Phase 2 — Local Playwright Proof-of-Concept

**Status:** [ ] pending

### Intent
Prove the Playwright runner works correctly against the demo app in a local environment before attempting a Vercel deployment. Catch selector, navigation, and screenshot issues cheaply while debugging is fast.

### Deliverable
A working local script that drives Playwright against both demo app versions and produces screenshots — confirming the FAIL scenario and PASS scenario are both detectable.

### Expected Outcomes
- A standalone script (`/scripts/probe-local.ts`) runs with `npx tsx scripts/probe-local.ts`
- Script navigates to `DEMO_APP_FAIL_URL`, logs in, refreshes, observes the unauthenticated redirect, saves a screenshot
- Same script repeated for `DEMO_APP_PASS_URL` — session survives, screenshot shows dashboard
- Both screenshots saved to `/tmp/` and visually inspected to confirm correctness
- No Vercel-specific code at this stage — use the standard `playwright` package locally

### Todo List
- [ ] Add `playwright` (full package) and `tsx` as dev dependencies
- [ ] Create `/scripts/probe-local.ts`:
  - Launch Chromium headless via standard `playwright`
  - Navigate to `DEMO_APP_FAIL_URL/login`, fill credentials, submit
  - Refresh, take screenshot, assert redirect to login page (FAIL confirmed)
  - Repeat for `DEMO_APP_PASS_URL` — assert dashboard still visible after refresh (PASS confirmed)
  - Save both screenshots to `/tmp/probe-fail.png` and `/tmp/probe-pass.png`
- [ ] Run `npx tsx scripts/probe-local.ts` and inspect both screenshots
- [ ] Confirm the failure scenario is visually unambiguous (login page visible after refresh)
- [ ] Confirm the pass scenario is visually unambiguous (dashboard visible after refresh)

### Relevant Context
- This phase uses the full `playwright` package, not `playwright-core` — only for local scripting
- The production runner (Phase 3+) uses `playwright-core` + `@sparticuz/chromium`
- Fix any selector or timing issues in the demo app now — before they become Vercel debugging problems

---

## Phase 3 — Vercel Playwright Proof-of-Concept

**Status:** [ ] pending

### Intent
This is the hard technical blocker. Prove that `playwright-core` + `@sparticuz/chromium` runs inside a real Vercel serverless function, takes a screenshot, uploads it to Vercel Blob, and returns the Blob URL. Nothing downstream starts until this is confirmed on a live Vercel deployment.

### Deliverable
A deployed Vercel API route that accepts a target URL (from the allowlist), navigates to it, captures a screenshot, stores it in Blob, and returns the Blob URL. Confirmed working on real Vercel infrastructure.

### Expected Outcomes
- `GET /api/probe?target=fail` hits the Vercel deployment and returns a Blob URL containing a screenshot of `DEMO_APP_FAIL_URL`
- `GET /api/probe?target=pass` returns a screenshot of `DEMO_APP_PASS_URL`
- Response time is within the 60-second `maxDuration` budget
- Vercel function logs show no binary or memory errors

### Todo List
- [ ] Create `/app/api/probe/route.ts`:
  - Accept query param `target`: `"fail"` → `DEMO_APP_FAIL_URL`, `"pass"` → `DEMO_APP_PASS_URL`; reject all other values with 400
  - Launch Chromium via `chromium.executablePath()` from `@sparticuz/chromium`
  - Navigate to target URL, take a full-page screenshot as a Buffer
  - Upload screenshot Buffer to Vercel Blob with `put()` from `@vercel/blob`
  - Return `{ url: blobUrl }` as JSON
- [ ] Confirm `vercel.json` has `memory: 1024` and `maxDuration: 60` for the API routes
- [ ] Deploy to Vercel: `vercel deploy`
- [ ] Call both probe endpoints and confirm screenshot Blob URLs are reachable and correct
- [ ] If deployment fails: check Vercel function logs for binary path errors, memory errors, or timeout; resolve before continuing
- [ ] Once confirmed: build `/lib/runner.ts` with `runChecks(checks: AcceptanceCheck[], targetUrl: string): Promise<CheckResult[]>` using the same `playwright-core` + `@sparticuz/chromium` pattern
- [ ] Runner: for each `AcceptanceCheck`, execute its `steps` as Playwright calls, capture screenshot after each check, upload to Blob, record the Blob URL in `CheckResult.evidence`
- [ ] Runner: unrecognised `ActionType` values → `INCONCLUSIVE` for that check
- [ ] Runner: Playwright errors or timeouts → `INCONCLUSIVE` for the affected check (never crash the whole run)
- [ ] Build `/lib/evidence.ts`: collect `{ timestamp, actionType, selector, outcome }` log entries alongside screenshots

### Relevant Context
- Use `playwright-core` (not `playwright`) in production — the full package bundles its own Chromium which conflicts with `@sparticuz/chromium`
- `@sparticuz/chromium` binary path: `await chromium.executablePath()` (async in recent versions)
- `vercel.json` function config must cover `app/api/**/*.ts` — confirm this pattern matches the Next.js App Router output
- The allowlist check (`target` → env var URL) must happen before any browser is launched

---

## Phase 4 — LLM Requirement → Acceptance-Check Parser

**Status:** [ ] pending

### Intent
Build the LLM-powered component that converts a free-text feature request into a validated `AcceptanceCheck[]`. This is the only place an LLM is used. The runner from Phase 3 is already working; this phase feeds it structured input.

### Deliverable
`/lib/parser.ts` — `parseRequirement(featureRequest: string): Promise<AcceptanceCheck[]>` — with unit tests confirming valid generation, Zod validation, and graceful handling of invalid LLM output.

### Expected Outcomes
- `parseRequirement("Keep users logged in after refreshing the page")` returns a valid `AcceptanceCheck[]` that the Phase 3 runner can execute
- Zod validation rejects invalid LLM output; one retry is attempted; a typed error is thrown if the retry also fails
- Unit tests pass for: valid output, invalid JSON from LLM, unknown `ActionType` in output

### Todo List
- [ ] Create `/lib/parser.ts` with `parseRequirement()`:
  - Use `openai` SDK with `model: "gpt-4o-mini"` and `response_format: { type: "json_object" }`
  - System prompt must: define the closed `ActionType` vocabulary, provide the exact JSON schema matching `AcceptanceCheck[]`, and instruct the model to use only allowed action types
  - Wrap the user's feature request in explicit delimiters in the prompt (`<feature_request>...</feature_request>`) to mitigate prompt injection
  - Parse response with `JSON.parse`, validate with `z.array(AcceptanceCheckSchema)`
  - Retry once on Zod validation failure; throw a typed `ParserError` if retry also fails
- [ ] Add `vitest` as a dev dependency
- [ ] Write `/lib/__tests__/parser.test.ts` with mocked `openai` client covering:
  - Valid LLM output → correct `AcceptanceCheck[]`
  - Invalid JSON → retry → second failure → `ParserError` thrown
  - Unknown `ActionType` in output → Zod rejection → retry path
- [ ] Run `npx vitest run lib/__tests__/parser.test.ts` — all tests pass

### Relevant Context
- `AcceptanceCheck` and `ActionStep` schemas are imported from `/types/index.ts` — do not redefine them
- Never pass raw user input or application page text directly into the LLM prompt without explicit data framing
- The system prompt should include the full `ActionType` enum values and example JSON to minimise hallucination

---

## Phase 5 — Deterministic Verdict Engine + Verification API

**Status:** [ ] pending

### Intent
Build the verdict engine and the single API route that wires the full pipeline together. The API is synchronous — it runs everything and returns the complete result. No polling, no storage, no database.

### Deliverable
`/lib/verdict.ts` and `POST /api/verify` — a fully working pipeline from feature request to `Verification` result, testable with `curl` against the deployed Vercel app.

### Expected Outcomes
- `deriveVerdict(results: CheckResult[])` returns the correct verdict for all input combinations
- `POST /api/verify` with `{ featureRequest, target: "fail" }` returns a complete `Verification` with FAIL verdict and screenshot evidence
- `POST /api/verify` with `{ featureRequest, target: "pass" }` returns a complete `Verification` with PASS verdict and screenshot evidence
- Both confirmed via `curl` against the live Vercel deployment

### Todo List
- [ ] Build `/lib/verdict.ts` with `deriveVerdict(results: CheckResult[]): "PASS" | "FAIL" | "INCONCLUSIVE"`:
  - FAIL if any check has status `"FAIL"`
  - INCONCLUSIVE if no FAIL but any check has status `"INCONCLUSIVE"`
  - PASS only if every check has status `"PASS"`
- [ ] Write unit tests for `deriveVerdict()` covering: all PASS, any FAIL, any INCONCLUSIVE, mixed FAIL+INCONCLUSIVE
- [ ] Create `POST /app/api/verify/route.ts`:
  - Validate request body with Zod: `{ featureRequest: string, target: "fail" | "pass" }`
  - Map `target` to the corresponding env var URL server-side (never accept a raw URL from the client)
  - Call `parseRequirement(featureRequest)` → `AcceptanceCheck[]`
  - Call `runChecks(checks, targetUrl)` → `CheckResult[]`
  - Call `deriveVerdict(checkResults)` → verdict
  - Assemble and return the complete `Verification` object as JSON
  - On `ParserError`: return 422 with `{ error: "Could not generate checks from that request" }`
  - On unexpected error: return 500 with `{ error: "Verification failed" }` — never leak internals
- [ ] Verify with `curl -X POST https://<vercel-url>/api/verify -d '{"featureRequest":"Keep users logged in after refreshing","target":"fail"}'`
- [ ] Verify PASS scenario with `target: "pass"`
- [ ] Confirm verdict is derived from observed evidence, not from LLM output

### Relevant Context
- The `Verification` object returned by this route is the complete payload the UI will use — design the shape carefully as it is the contract between backend and frontend
- No IDs, no storage — the client receives the full result in the POST response and owns it from that point
- `target: "fail" | "pass"` replaces the freeform URL input — the server resolves the actual URL

---

## Phase 6 — Six-Screen UI

**Status:** [ ] pending

### Intent
Build the complete user-facing UI following the 6-screen flow. The full backend pipeline is already working; this phase is presentation and wiring only.

### Deliverable
A complete, deployable Next.js frontend that guides the user through the full verification journey and presents the Evidence screen as the product's centrepiece.

### Expected Outcomes
- All six screens render correctly and the full user journey works end-to-end in the browser
- Design matches the spec: dark developer-tool aesthetic, one action per screen, no chatbot styling
- Live Run screen is honest: shows a genuine loading state while the POST executes, then reveals the real `CheckResult[]` when it returns — no fake intermediate step progress
- Evidence screen shows real Blob-hosted screenshots and the action log for each check
- The before/after demo story (FAIL → PASS) is immediately legible on the Result screen without explanation

### Todo List

**Screen 1 — Landing (`/app/page.tsx`)**
- [ ] Product name, one-sentence tagline, pre-filled example task, single CTA "Verify a feature"
- [ ] Dark background, strong typography, minimal copy — no decorative elements

**Screen 2 — Verify (`/app/verify/page.tsx`)**
- [ ] Feature request textarea (pre-filled with demo scenario text)
- [ ] Target selector: two labelled radio options — "Demo app — broken session" / "Demo app — fixed session"
- [ ] "Generate checks" button — calls `POST /api/parse` (or handles locally) and navigates to Screen 3

**Screen 3 — Check Plan (`/app/verify/plan/page.tsx`)**
- [ ] Display the generated `AcceptanceCheck[]` before execution
- [ ] Each check is editable (description text field)
- [ ] "Run checks" button — calls `POST /api/verify` and transitions to Screen 4

**Screen 4 — Live Run (`/app/verify/run/page.tsx`)**
- [ ] While the POST to `/api/verify` is in-flight, show a genuine "Running verification..." loading state (spinner or animated indicator) — do not fake individual step progress
- [ ] When the POST response returns, immediately reveal the real `CheckResult[]` (e.g. briefly animate through the returned checks to make the result legible before auto-advancing)
- [ ] Automatically navigate to Screen 5 once results are displayed

**Screen 5 — Result (`/app/verify/result/page.tsx`)**
- [ ] Summary badge: overall PASS / FAIL / INCONCLUSIVE with count (e.g. "3 / 4 checks passed")
- [ ] Per-check row: status icon, description, "View evidence" button
- [ ] FAIL rows visually prominent (e.g. highlighted border or colour)

**Screen 6 — Evidence (`/app/verify/evidence/[checkIndex]/page.tsx`)**
- [ ] Three-section layout: WHAT WE EXPECTED → WHAT THE APP DID → WHAT THE CHECK OBSERVED
- [ ] Screenshot(s) loaded from Blob URLs (`CheckResult.evidence`)
- [ ] Action timeline: timestamp, action type, selector, outcome
- [ ] Status badge (PASS / FAIL / INCONCLUSIVE)

### Relevant Context
- Client state (the `Verification` object) must be passed between screens — use URL search params, `sessionStorage`, or React context; do not re-fetch from an API (there is no storage)
- The Live Run screen has two honest states only: (1) POST in-flight → genuine loading indicator; (2) POST complete → reveal real `CheckResult[]`. No fake intermediate steps at any point.
- No freeform URL input anywhere in the UI — `target: "fail" | "pass"` only
- Keep the Evidence panel as the visual centrepiece — large screenshots, clear layout

---

## Phase 7 — Security Hardening + Submission

**Status:** [ ] pending

### Intent
Harden the security boundaries identified in spec §9, run the complete demo scenario end-to-end, and assemble all hackathon submission artifacts.

### Deliverable
A hardened, deployed application with a working before/after demo, a populated `bob_sessions/` directory, and a complete `README.md`.

### Expected Outcomes
- All spec §9 security threats are addressed
- The full demo (broken session → FAIL, fixed session → PASS) runs without manual intervention
- `bob_sessions/` contains exported Bob task history Markdown and session screenshots for each significant phase
- `README.md` describes the product, stack, and demo instructions
- `npm run build` passes with no errors on the final deployed version

### Todo List

**Security**
- [ ] Confirm server-side `target` → URL resolution is the only path into the runner — no raw URL from client ever reaches Playwright
- [ ] Validate all Playwright `selector` and `value` inputs: max length 500 chars, reject inputs containing `javascript:`, `<script`, or shell metacharacters
- [ ] Scrub environment variable names and values from all text captured from the browser before Blob upload
- [ ] Confirm no secrets appear in any Blob-stored evidence file (manual spot-check of a captured screenshot's associated action log)
- [ ] Review LLM system prompt for prompt injection surface — confirm user feature request text is enclosed in delimiters and cannot escape into the instruction section

**Demo scenario**
- [ ] Run the full demo flow end-to-end: enter feature request → generate checks → run against broken version → view FAIL evidence → run against fixed version → view PASS evidence
- [ ] Confirm the before/after story is immediately legible on the Result screen without a spoken explanation
- [ ] Record the demo flow as a screen recording (required for the submission video)

**Bob session evidence**
- [ ] Export Bob task history Markdown for each significant phase and save to `bob_sessions/`
- [ ] Capture Bob session screenshots and save to `bob_sessions/`
- [ ] Confirm `bob_sessions/` is committed and non-empty

**Submission artifacts**
- [ ] Write `README.md`: product description, demo instructions, stack, how to run locally
- [ ] Final `npm run build` with zero errors
- [ ] Confirm live Vercel URL works end-to-end before submission

---

## Phase Dependency Diagram

```
Phase 0 — Scaffold + Types
        |
Phase 1 — Controlled Demo App
        |
Phase 2 — Local Playwright Proof-of-Concept
        |
Phase 3 — Vercel Playwright Proof-of-Concept  ← HARD BLOCKER
        |                                         Do not proceed until
Phase 4 — LLM Parser                             confirmed on live Vercel
        |
Phase 5 — Verdict Engine + Verification API
        |
Phase 6 — Six-Screen UI
        |
Phase 7 — Security Hardening + Submission
```

Each phase depends on the one above it. There are no parallel tracks. Phase 3 is the hard technical gate — if Playwright does not run on Vercel, stop and resolve it before any further work.

---

## What Is Explicitly Out of Scope

Per spec §15 — cut these if time is tight, do not build them at all:

- User authentication / accounts
- Database or server-side verification persistence
- GitHub OAuth
- Arbitrary repository or URL execution
- History dashboard
- Multi-user sessions

---

## IBM Bob Usage Per Phase

| Phase | Bob Mode | Task |
|---|---|---|
| 0 | Agent | Scaffold project, generate shared Zod types, configure tooling |
| 1 | Agent | Build and deploy demo login app — both versions |
| 2 | Agent | Write and run local Playwright probe script |
| 3 | Agent | Build probe API route, deploy to Vercel, debug until confirmed working |
| 4 | Agent | Implement LLM parser, write Vitest unit tests |
| 5 | Agent | Implement verdict engine, verification API route, curl integration test |
| 6 | Agent | Build all six UI screens |
| 7 | Agent + Plan | Security review, demo run, export Bob session evidence, submission artifacts |

Export a Bob task history Markdown after each phase and save to `bob_sessions/`.
