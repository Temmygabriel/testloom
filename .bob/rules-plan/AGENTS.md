# Project Architecture Rules (Plan Mode)

## LLM is a parser, not a judge
The LLM's role ends after producing structured `CheckResult[]` via Zod. It never decides the final verdict.
Architectural decisions that give the LLM authority over PASS/FAIL violate the core product contract.

## Deterministic verdict pipeline is non-negotiable
```
LLM output → Zod parse → CheckResult[] → Playwright runner → observed evidence → deterministic verdict.ts → PASS/FAIL/INCONCLUSIVE
```
Any shortcut that collapses these stages (e.g., asking the LLM to evaluate its own Playwright output) breaks the product's differentiator.

## Security boundary: no arbitrary code execution
The verification runner is sandboxed to Playwright browser actions only. This is a hard architectural constraint imposed by the 48-hour hackathon window — no server-side code execution from check definitions.

## URL allowlist is an architectural gate, not a UI concern
URL validation belongs in the API route (`/app/api/create-verification`), before the Playwright process is ever spawned.

## Two-version demo app is load-bearing for the pitch
The architecture must support running the same check suite against two different target URLs and producing visually different results. Design the runner and result storage with this in mind from the start.

## Stateless API routes
Vercel serverless functions have no shared memory. The runner must write evidence to durable storage (filesystem in dev, object storage or `/public/` in prod) and return paths — not hold state in memory between requests.

## No DB for MVP
In-memory or filesystem-backed evidence storage is explicitly acceptable. Adding a database is in the "cut if time is tight" list.
