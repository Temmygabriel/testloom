# Project Documentation Rules (Ask Mode)

## Single source of truth
`TESTLOOM_BUILD_SPEC.md.md` (note the double `.md` extension) is the authoritative product spec — all architecture, UX flow, and scope decisions originate there.

## 6-screen UX flow
Landing → Verify → Check Plan → Live Run → Result → Evidence.
The Evidence screen is the product's core value — everything leads to it.

## INCONCLUSIVE is a first-class status
Not a fallback or error state — it is a deliberate signal that the environment could not produce a reliable verdict. Treat it as equal in importance to PASS/FAIL.

## Demo app is controlled, not arbitrary
For MVP, the target application is a controlled demo (two versions: broken session persistence, fixed session persistence). The product does NOT accept arbitrary GitHub repos or public URLs in the hackathon build.

## Bob session evidence is a hard submission requirement
`bob_sessions/` must contain exported task history Markdown + session screenshots for each significant Bob session. This is required by the hackathon rules, not optional documentation.
