/**
 * POST /api/verify
 *
 * Runs the reviewed acceptance checks against one of the two
 * server-configured demo applications.
 *
 * Flow:
 *   1. Validate feature request, target, and reviewed checks
 *   2. Resolve target URL server-side from the allowlist
 *   3. Run the reviewed checks with Playwright
 *   4. Derive deterministic PASS / FAIL / INCONCLUSIVE verdict
 *   5. Return the complete Verification object
 *
 * Security:
 * - The client never supplies a raw target URL.
 * - The target is limited to "fail" or "pass".
 * - The actual URL comes only from server environment variables.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { AcceptanceCheckSchema } from "@/types";
import type { Verification } from "@/types";
import { runChecks } from "@/lib/runner";
import { deriveVerdict } from "@/lib/verdict";

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------

const RequestSchema = z.object({
  featureRequest: z
    .string()
    .min(1, "featureRequest must not be empty")
    .max(2000),

  target: z.enum(["fail", "pass"]),

  // These are the checks shown to the user on the Check Plan screen.
  // They are intentionally accepted here so the runner executes exactly
  // what the user reviewed rather than silently generating a new plan.
  checks: z
    .array(AcceptanceCheckSchema)
    .min(1)
    .max(6),
});

// ---------------------------------------------------------------------------
// Server-side target allowlist
// ---------------------------------------------------------------------------

function resolveTargetUrl(
  target: "fail" | "pass",
): string | null {
  if (target === "fail") {
    return process.env.DEMO_APP_FAIL_URL ?? null;
  }

  return process.env.DEMO_APP_PASS_URL ?? null;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // 1. Parse JSON
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Request body must be valid JSON",
      },
      { status: 400 },
    );
  }

  // 2. Validate request
  const parsed = RequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
        details:
          parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const {
    featureRequest,
    target,
    checks,
  } = parsed.data;

  // 3. Resolve target URL ONLY from environment variables
  const targetUrl = resolveTargetUrl(target);

  if (!targetUrl) {
    return NextResponse.json(
      {
        error:
          `DEMO_APP_${target.toUpperCase()}_URL is not configured. ` +
          "Set it in your environment variables.",
      },
      { status: 400 },
    );
  }

  // 4. Run the reviewed checks
  try {
    const checkResults = await runChecks(
      checks,
      targetUrl,
    );

    // 5. Deterministic verdict — the LLM does not decide this.
    const verdict = deriveVerdict(checkResults);

    const verification: Verification = {
      id: randomUUID(),
      featureRequest,
      targetUrl,
      checks: checkResults,
      verdict,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(
      verification,
      { status: 200 },
    );
  } catch (err) {
    // Log details server-side, but do not expose internal
    // implementation details to the browser.
    console.error(
      "[/api/verify] Unexpected error:",
      err,
    );

    return NextResponse.json(
      {
        error:
          "Verification failed. Please try again.",
      },
      { status: 500 },
    );
  }
}