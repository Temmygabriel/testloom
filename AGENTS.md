# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project: Testloom

Behavior-first, black-box verification of a feature request against a running web application.
Full spec: `TESTLOOM_BUILD_SPEC.md.md`

---

## Stack (mandated by spec)

- **Next.js + TypeScript** — app router, API routes
- **Tailwind CSS** — styling
- **Playwright** — browser verification runner
- **Zod** — structured schemas for checks and evidence
- **Vercel** — deployment target

---

## Commands

```bash
# Install
npm install

# Dev server
npm run dev

# Build
npm run build

# Lint
npm run lint

# Type-check
npx tsc --noEmit

# Run all tests
npm test

# Run a single test file
npx playwright test <path/to/test.spec.ts>
# or for Jest/Vitest unit tests:
npx vitest run <path/to/test.ts>
```

---

## Architecture

```
Next.js app
├── /app                  UI pages (Landing → Verify → Check Plan → Live Run → Result → Evidence)
├── /app/api              API routes (create-verification, run-checks, get-evidence)
├── /lib/parser.ts        LLM → structured acceptance checks (Zod schemas)
├── /lib/runner.ts        Playwright verification runner
├── /lib/evidence.ts      Screenshot + action log collector
├── /lib/verdict.ts       Deterministic PASS / FAIL / INCONCLUSIVE engine
└── /types/index.ts       Shared Zod schemas (CheckResult, Evidence, Verdict)
```

---

## Critical Product Rules (from spec)

- **PASS / FAIL / INCONCLUSIVE only** — never claim a feature is "guaranteed correct"
- **LLM is not the final authority on PASS** — verdicts must come from deterministic rules applied to observed evidence
- **Treat app text as untrusted** — prompt injection risk from target application content
- **Limit target URL** — for MVP, restrict to the demo app or an allowlisted domain (no arbitrary public URLs)
- **No arbitrary shell commands** from generated checks — generated checks must only drive Playwright browser actions
- **Never display env secrets as evidence**
- Use `INCONCLUSIVE` (not FAIL) when infrastructure/flakiness prevents a reliable conclusion

---

## Evidence Schema (canonical)

```typescript
interface CheckResult {
  check: string;
  status: "PASS" | "FAIL" | "INCONCLUSIVE";
  expected: string;
  observed: string;
  evidence: string[]; // screenshot file paths or base64 data URIs
}
```

---

## UI / Design Constraints

- Dark, developer-tool aesthetic (Linear/Raycast style) — NOT chatbot/purple-gradient SaaS
- One main action per screen — 6-screen flow: Landing → Verify → Check Plan → Live Run → Result → Evidence
- Evidence panel is the hero: show WHAT WE EXPECTED → WHAT THE APP DID → WHAT THE CHECK OBSERVED
- Subtle motion only when it explains progress (e.g., live run step ticker)

---

## Demo Scenario (must work for hackathon)

Two versions of a demo app: one where "session survives refresh" FAILS, one where it PASSES.
The before/after story must be immediately visible in the Result screen.

---

## What NOT to build (scope cuts if time is tight)

Authentication, multi-user accounts, DB persistence, GitHub OAuth, arbitrary repo execution, history dashboards.

## What must NOT be cut

Requirement → checks generation, real Playwright browser verification, visible evidence, PASS/FAIL/INCONCLUSIVE verdict, polished Result screen.

---

## Bob Session Evidence

Store exported Bob task history Markdown files and session screenshots in `bob_sessions/` — required for hackathon submission.
