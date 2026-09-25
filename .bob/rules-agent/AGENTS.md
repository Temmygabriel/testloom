# Project Coding Rules (Agent Mode)

## Verdict engine must be deterministic
`/lib/verdict.ts` derives PASS/FAIL/INCONCLUSIVE from structured `CheckResult` data — never from LLM text output.
INCONCLUSIVE is required (not optional) for any Playwright timeout, network error, or flaky condition.

## Zod schemas are the source of truth
All data crossing API route boundaries must be validated with the shared Zod schemas in `/types/index.ts`.
Do not duplicate type definitions — import from `/types/`.

## Playwright runner constraints
- Generated checks may only call Playwright browser actions — no `exec`, `spawn`, or `eval`
- Input validation must reject any check step that maps to a shell command
- Screenshots are stored as file paths under `/public/evidence/` or passed as base64 data URIs — never embedded raw in API responses

## Target URL allowlist enforced server-side
The API route for creating a verification must validate the target URL against an allowlist before spawning Playwright.
Client-side validation alone is insufficient.

## LLM output treated as untrusted
The LLM parser (`/lib/parser.ts`) must parse LLM output through Zod before it reaches the runner.
Never pass raw LLM text directly to Playwright or the verdict engine.

## Secrets never in evidence
The evidence collector (`/lib/evidence.ts`) must strip env var values from all text captured from the browser.
