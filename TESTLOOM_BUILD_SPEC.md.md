# IBM Bob 2.0 Hackathon — Testloom Build Spec

## 1. Working Product Name

**Testloom**

### Tagline

> **Turn a feature request into checks that can catch it failing.**

This is a working hackathon name, not a trademark/domain decision.

---

## 2. Product in Plain English

AI coding agents can say a feature is finished, and ordinary tests can still miss the real requirement.

**Testloom takes the user's feature request, turns it into concrete acceptance checks, runs those checks against a live web app, and shows the evidence.**

The product should prefer:

- `PASS` — the check produced the expected result
- `FAIL` — the check produced evidence of failure
- `INCONCLUSIVE` — the environment/check could not establish the result reliably

Never claim that a feature is “guaranteed correct.”

---

## 3. Important Differentiation

The general “AI agent + verification/evidence” space is already crowded. Existing projects include RunProof, Receipts, Synrail, RealityCheck and others.

Therefore Testloom must NOT be presented as:

> “Another AI code reviewer.”

or:

> “Another receipt generator.”

### Our narrow angle

**Behavior-first, black-box verification of a feature request against a running web application.**

The strongest demo is:

```text
Feature request
      ↓
Executable acceptance checks
      ↓
Real browser interaction
      ↓
Observed result + screenshot/trace
      ↓
PASS / FAIL / INCONCLUSIVE
```

The verifier should judge what the application actually did, not what the coding agent claims it did.

---

## 4. Target User

Primary:

**Developers using AI coding agents** (Bob, Claude Code, Codex, Cursor, etc.).

Secondary:

**Technical reviewers / team leads** who need a fast answer to: “Did this change actually satisfy the requirement?”

---

## 5. 30-Second User Experience

Landing page should communicate the whole product without a tutorial.

### Hero

**Did the feature actually work?**

> Turn a feature request into real browser checks and inspect what happened.

Primary CTA:

**Verify a feature**

### First interaction

User enters:

> Keep users logged in after refreshing the page.

Then sees:

```text
Preparing checks…
✓ Login succeeds
✓ Session is created
✓ Page refreshes
✓ Session survives refresh
```

Then the result screen shows the real evidence.

---

## 6. MVP User Flow

### Screen 1 — Landing

Purpose: explain the product immediately.

Elements:

- Product name
- One-sentence explanation
- Example task
- Primary CTA
- Very little marketing copy

### Screen 2 — Verify

User enters:

- Feature request
- Target app URL

For the hackathon MVP, use a controlled demo application rather than arbitrary public repositories.

### Screen 3 — Check Plan

Show the generated acceptance checks before execution.

Example:

```text
FEATURE
Keep users logged in after refresh

CHECKS
1. Login succeeds
2. Session is established
3. Browser refreshes
4. User remains authenticated
```

Allow the user to edit a check before running it.

### Screen 4 — Live Run

Show execution as it happens:

```text
Running checks

✓ Open login page
✓ Enter credentials
✓ Submit form
✓ Confirm authenticated state
✓ Refresh browser
◉ Checking session...
```

### Screen 5 — Result

The most important screen.

```text
3 / 4 checks passed

✓ Login succeeds
✓ Session is established
✗ Session survives refresh
? Logout behavior could not be verified
```

Each check has a **View evidence** action.

### Screen 6 — Evidence

Show:

- Screenshot
- Browser action timeline
- Expected behavior
- Actual behavior
- Technical evidence
- Final status

Avoid unnecessary dashboards.

---

## 7. Technical Architecture

Use a simple architecture that can be built in the 48-hour window.

```text
Next.js app
│
├── Landing / Verify UI
│
├── API route: create verification
│
├── Requirement parser
│     └── LLM converts natural language → structured checks
│
├── Verification runner
│     └── Playwright
│
├── Evidence collector
│     ├── screenshots
│     ├── action/result log
│     └── optional trace
│
└── Verdict engine
      └── deterministic PASS / FAIL / INCONCLUSIVE
```

### Suggested stack

- Next.js + TypeScript
- Tailwind CSS or equivalent existing UI system
- Playwright
- Zod for structured schemas
- GitHub
- Vercel for deployment

Use free/open-source components where possible. Avoid paid APIs unless the hackathon provides them.

---

## 8. Verification Model

The LLM may help with:

- interpreting the feature request
- generating structured acceptance checks
- mapping natural language to browser actions

The LLM should **not** be the final authority that says “PASS.”

A check should produce structured evidence such as:

```json
{
  "check": "Session survives refresh",
  "status": "FAIL",
  "expected": "Authenticated user remains logged in",
  "observed": "User returned to login screen",
  "evidence": [
    "screenshot-before-refresh.png",
    "screenshot-after-refresh.png"
  ]
}
```

The final status is derived from the observed check result and deterministic rules wherever possible.

---

## 9. Security Boundaries

### Do NOT build

A public service that blindly downloads arbitrary GitHub repositories and executes their code on the Vercel server.

That creates an arbitrary-code-execution boundary we cannot safely build in a 48-hour hackathon.

### Hackathon-safe approach

Use:

- a controlled demo repository
- a controlled deployed demo app
- bounded Playwright actions
- strict input validation
- no secrets in test fixtures

### Threats to explicitly handle

**Prompt injection from repository/application content**

Treat application text and repository text as untrusted data.

**False-green tests**

A passing weak test must not prove a broad requirement.

**Flaky browser/network conditions**

Use `INCONCLUSIVE` where infrastructure prevents a reliable conclusion.

**Secret exposure**

Never display or send environment secrets as evidence.

**Unbounded actions**

Do not let generated checks execute arbitrary shell commands.

**Cross-site abuse**

For the MVP, limit the target URL to the demo application or an allowlisted domain.

---

## 10. Demo Scenario

Use one scenario that creates a visible failure.

Example:

### Requested feature

> Users should stay logged in after refreshing the page.

### Application version A

The feature is broken.

Testloom shows:

```text
LOGIN                   PASS
SESSION CREATED         PASS
REFRESH                 PASS
SESSION SURVIVES        FAIL
```

Open evidence and show the browser returning to the login page.

Then show a corrected version.

Run again:

```text
LOGIN                   PASS
SESSION CREATED         PASS
REFRESH                 PASS
SESSION SURVIVES        PASS
```

This gives the judges an immediate before/after story.

---

## 11. Visual / UI Direction

This must NOT look like generic AI SaaS.

### Design language

Think:

**Linear + Raycast + modern testing/observability tooling**

Not:

**chatbot + purple gradient + giant rounded cards**

### Principles

- Dark, refined developer-tool aesthetic
- Strong typography
- Large amounts of intentional whitespace
- Minimal chrome
- Subtle motion only when it explains progress
- Real screenshots and execution evidence should dominate over decorative UI
- Clear status hierarchy
- One main action per screen

### Visual hook

The browser evidence panel should feel like a **flight recorder for the feature**.

The user should be able to see:

```text
WHAT WE EXPECTED
        ↓
WHAT THE APP DID
        ↓
WHAT THE CHECK OBSERVED
```

---

## 12. IBM Bob Usage Plan

IBM Bob must be a genuine core part of building the project.

### Phase A — Plan mode

Open the project in Bob.

Read this file.

Ask Bob to:

1. Understand the product requirements.
2. Inspect the workspace.
3. Propose the technical architecture.
4. Identify risks and implementation order.
5. Write a concrete implementation plan.

Do not start by asking Bob to “build the whole app.”

### Phase B — Agent mode

Use Bob to implement the approved plan in slices:

1. Project scaffold
2. Landing page
3. Verification input flow
4. Requirement/check schema
5. Playwright verification runner
6. Evidence storage
7. Results UI
8. Error/unknown handling
9. Tests
10. Polish

### Phase C — Bob review/debugging

Ask Bob to:

- run tests
- inspect failures
- review security boundaries
- improve error handling
- review UX against this specification

IBM Bob supports Plan mode for planning and Agent mode for implementation, and `/init` generates persistent `AGENTS.md` project context. citeturn231190search0turn231190search2

---

## 13. Bob Project Context

After opening the project folder in Bob:

1. Run `/init` in **Agent mode**.
2. Bob generates `AGENTS.md` and `.bob/` mode-specific context files.
3. Review the generated `AGENTS.md`.
4. Add the important project rules from this specification if Bob missed them.

Bob automatically uses `AGENTS.md` as persistent project context in later conversations. citeturn231190search0turn231190search3

This specification file is still useful as the detailed product/build document, but `AGENTS.md` is the file Bob is designed to load automatically.

---

## 14. Hackathon Evidence

Maintain a `bob_sessions/` directory in the repository.

For each important Bob task/session relevant to the project:

- export the Bob task history Markdown file
- capture the required task-session consumption screenshot
- place both in `bob_sessions/`

IBM's hackathon guide explicitly requires these Bob session artifacts in the final repository. citeturn231190search33

Never commit API keys, tokens, passwords, or other secrets.

---

## 15. Build Order for the 48-Hour Hackathon

```text
1. Bob setup + /init
2. Architecture plan
3. UI shell
4. Requirement → check generation
5. Playwright runner
6. Evidence capture
7. Deterministic verdict engine
8. Results/evidence UI
9. Security hardening
10. Demo scenario
11. Vercel deployment
12. README + Bob session evidence
13. Demo video + submission
```

### Scope rule

If time becomes tight, cut:

- authentication
- multi-user accounts
- database persistence
- GitHub OAuth
- arbitrary repository execution
- complex history dashboards

Do NOT cut:

- requirement → checks
- real browser verification
- visible evidence
- PASS / FAIL / INCONCLUSIVE
- polished result screen
- clear Bob usage evidence

---

## 16. Success Test

Before submission, a person who has never seen the project should be able to answer these three questions after ~30 seconds:

1. **What does this do?**
2. **Why is it useful?**
3. **What makes it different from a normal AI code review?**

The demo should answer all three visually, without a long spoken explanation.

---

## 17. Critical Build Principle

**Do not optimize for the number of features. Optimize for one undeniable demonstration.**

The best hackathon flow is:

```text
“I asked an AI to build this.”
          ↓
“Here is what the task actually required.”
          ↓
“Here is Testloom checking the running application.”
          ↓
“Here is the browser evidence.”
          ↓
“Here is exactly what passed — and what failed.”
```

That is the product story, the security story, and the demo story in one flow.
