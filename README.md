# Testloom

**Testloom turns a plain-English feature request into real browser checks and shows whether the feature actually works.**

AI-generated software can look correct without satisfying the behavior it was supposed to implement. Testloom closes that gap by generating acceptance checks, letting the user review them, executing them in a real Playwright browser, capturing evidence, and producing a deterministic **PASS / FAIL / INCONCLUSIVE** result.

## Live demo

**Production:** https://testloom-two.vercel.app/

**GitHub:** https://github.com/Temmygabriel/testloom

## Demo scenario

Use this feature request:

> Keep users logged in after refreshing the page.

Testloom generates checks that:

1. log in with the controlled demo account;
2. verify the dashboard is reached;
3. reload the browser page;
4. verify the dashboard is still reachable and visible.

The demo includes two controlled implementations:

- **Broken:** the session is lost after refresh → Testloom reports **FAIL**.
- **Working:** the session survives refresh → Testloom reports **PASS**.

Demo credentials:

- Username: `demo`
- Password: `demo123`

## How it works

**Feature request → AI check plan → human review → Playwright browser run → evidence → deterministic verdict**

The LLM is used to generate the acceptance-check plan. It is not the final authority on PASS or FAIL. The verification result is derived from the browser execution.

## Technology

- Next.js 14
- TypeScript
- Playwright
- Zod
- Groq (OpenAI-compatible API)
- Vercel
- Vercel Blob

## Repository structure

- `testloom/` — Testloom web app and verification API
- `demo-app/` — controlled PASS/FAIL demo application
- `bob_sessions/` — IBM Bob task-session summary evidence
- `TESTLOOM_BUILD_SPEC.md.md` — product/build specification
- `testloom-implementation-plan.md` — implementation plan

## Local checks

From `testloom/`:

```bash
npm run lint
npm run typecheck
npm test
```

## Environment variables

See:

- `testloom/.env.local.example`
- `demo-app/.env.local.example`

Production secrets are configured through the deployment platform and are not committed to the repository.