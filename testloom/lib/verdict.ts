/**
 * verdict.ts — Deterministic verdict engine
 *
 * Derives the overall PASS / FAIL / INCONCLUSIVE verdict from a set of
 * CheckResult objects. Never calls an LLM — purely deterministic logic.
 *
 * Rules (from spec §8 and plan Phase 5):
 *   FAIL        — if ANY check has status "FAIL"
 *   INCONCLUSIVE — if no FAIL but ANY check has status "INCONCLUSIVE"
 *   PASS        — only if EVERY check has status "PASS"
 *
 * Edge case: empty checks array → INCONCLUSIVE (no evidence either way)
 */

import type { CheckResult, Verdict } from "@/types";

export function deriveVerdict(checks: CheckResult[]): Verdict {
  if (checks.length === 0) return "INCONCLUSIVE";

  if (checks.some((c) => c.status === "FAIL")) return "FAIL";
  if (checks.some((c) => c.status === "INCONCLUSIVE")) return "INCONCLUSIVE";
  return "PASS";
}
