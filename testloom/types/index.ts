import { z } from "zod";

// ---------------------------------------------------------------------------
// ActionType — closed vocabulary of Playwright actions the LLM may generate.
// Any action type outside this enum produces an INCONCLUSIVE check result.
// ---------------------------------------------------------------------------
export const ActionTypeSchema = z.enum([
  "navigate",
  "click",
  "fill",
  "expectVisible",
  "expectText",
  "expectUrl",
]);
export type ActionType = z.infer<typeof ActionTypeSchema>;

// ---------------------------------------------------------------------------
// ActionStep — a single browser action within an acceptance check.
// ---------------------------------------------------------------------------
export const ActionStepSchema = z.object({
  type: ActionTypeSchema,
  selector: z.string().optional(),
  value: z.string().optional(),
  expectedText: z.string().optional(),
  expectedUrl: z.string().optional(),
});
export type ActionStep = z.infer<typeof ActionStepSchema>;

// ---------------------------------------------------------------------------
// AcceptanceCheck — one named check composed of ordered action steps.
// Produced by the LLM parser; consumed by the Playwright runner.
// ---------------------------------------------------------------------------
export const AcceptanceCheckSchema = z.object({
  id: z.string(),
  description: z.string(),
  steps: z.array(ActionStepSchema),
});
export type AcceptanceCheck = z.infer<typeof AcceptanceCheckSchema>;

// ---------------------------------------------------------------------------
// Verdict — the only three allowed outcomes. Never inferred by an LLM.
// ---------------------------------------------------------------------------
export const VerdictSchema = z.enum(["PASS", "FAIL", "INCONCLUSIVE"]);
export type Verdict = z.infer<typeof VerdictSchema>;

// ---------------------------------------------------------------------------
// CheckResult — the observed result of executing one AcceptanceCheck.
// evidence[] holds Vercel Blob URLs pointing to screenshots captured during
// the run. The action log is embedded in the actionLog field.
// ---------------------------------------------------------------------------
export const EvidenceEntrySchema = z.object({
  timestamp: z.string(), // ISO-8601
  actionType: ActionTypeSchema,
  selector: z.string().optional(),
  outcome: z.string(),
});
export type EvidenceEntry = z.infer<typeof EvidenceEntrySchema>;

export const CheckResultSchema = z.object({
  checkId: z.string(),
  description: z.string(),
  status: VerdictSchema,
  expected: z.string(),
  observed: z.string(),
  evidence: z.array(z.string()), // Vercel Blob screenshot URLs
  actionLog: z.array(EvidenceEntrySchema),
});
export type CheckResult = z.infer<typeof CheckResultSchema>;

// ---------------------------------------------------------------------------
// Verification — the complete result of one verification run.
// Returned synchronously by POST /api/verify. Not stored server-side.
// ---------------------------------------------------------------------------
export const VerificationSchema = z.object({
  id: z.string(),
  featureRequest: z.string(),
  targetUrl: z.string(),
  checks: z.array(CheckResultSchema),
  verdict: VerdictSchema,
  createdAt: z.string(), // ISO-8601
});
export type Verification = z.infer<typeof VerificationSchema>;
