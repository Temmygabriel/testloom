import { z } from "zod";

// ---------------------------------------------------------------------------
// ActionType — closed vocabulary of Playwright actions.
// ---------------------------------------------------------------------------

export const ActionTypeSchema = z.enum([
  "navigate",
  "reload",
  "click",
  "fill",
  "expectVisible",
  "expectText",
  "expectUrl",
]);

export type ActionType = z.infer<typeof ActionTypeSchema>;

// ---------------------------------------------------------------------------
// ActionStep
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
// AcceptanceCheck
// ---------------------------------------------------------------------------

export const AcceptanceCheckSchema = z.object({
  id: z.string(),
  description: z.string(),
  steps: z.array(ActionStepSchema),
});

export type AcceptanceCheck = z.infer<typeof AcceptanceCheckSchema>;

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------

export const VerdictSchema = z.enum([
  "PASS",
  "FAIL",
  "INCONCLUSIVE",
]);

export type Verdict = z.infer<typeof VerdictSchema>;

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export const EvidenceEntrySchema = z.object({
  timestamp: z.string(),
  actionType: ActionTypeSchema,
  selector: z.string().optional(),
  outcome: z.string(),
});

export type EvidenceEntry = z.infer<typeof EvidenceEntrySchema>;

// ---------------------------------------------------------------------------
// CheckResult
// ---------------------------------------------------------------------------

export const CheckResultSchema = z.object({
  checkId: z.string(),
  description: z.string(),
  status: VerdictSchema,
  expected: z.string(),
  observed: z.string(),
  evidence: z.array(z.string()),
  actionLog: z.array(EvidenceEntrySchema),
});

export type CheckResult = z.infer<typeof CheckResultSchema>;

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

export const VerificationSchema = z.object({
  id: z.string(),
  featureRequest: z.string(),
  targetUrl: z.string(),
  checks: z.array(CheckResultSchema),
  verdict: VerdictSchema,
  createdAt: z.string(),
});

export type Verification = z.infer<typeof VerificationSchema>;