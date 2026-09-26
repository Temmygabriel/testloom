/**
 * POST /api/verify
 *
 * Synchronous verification pipeline:
 *   1. Validate request body (featureRequest + target)
 *   2. Resolve target → URL from env vars (allowlist, server-side only)
 *   3. parseRequirement()  → AcceptanceCheck[]
 *   4. runChecks()         → CheckResult[]
 *   5. deriveVerdict()     → "PASS" | "FAIL" | "INCONCLUSIVE"
 *   6. Return complete Verification as JSON
 *
 * No database. No polling. The client receives the full result in this response.
 *
 * Error responses:
 *   400 — invalid request body
 *   422 — could not generate acceptance checks from the feature request
 *   500 — unexpected error (message is generic — no internals leaked)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { parseRequirement, ParserError } from "@/lib/parser";
import { runChecks } from "@/lib/runner";
import { deriveVerdict } from "@/lib/verdict";
import type { Verification } from "@/types";

// ── Request schema ────────────────────────────────────────────────────────────

const RequestSchema = z.object({
  featureRequest: z.string().min(1, "featureRequest must not be empty").max(2000),
  target: z.enum(["fail", "pass"]),
});

// ── Allowlist — server-side resolution only ───────────────────────────────────

function resolveTargetUrl(target: "fail" | "pass"): string | null {
  if (target === "fail") return process.env.DEMO_APP_FAIL_URL ?? null;
  if (target === "pass") return process.env.DEMO_APP_PASS_URL ?? null;
  return null;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // 1. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { featureRequest, target } = parsed.data;

  // 2. Resolve target URL (never from client input)
  const targetUrl = resolveTargetUrl(target);
  if (!targetUrl) {
    return NextResponse.json(
      {
        error: `DEMO_APP_${target.toUpperCase()}_URL is not configured. Set it in your environment variables.`,
      },
      { status: 400 },
    );
  }

  // 3–5. Run the pipeline
  try {
    const checks = await parseRequirement(featureRequest);
    const checkResults = await runChecks(checks, targetUrl);
    const verdict = deriveVerdict(checkResults);

    const verification: Verification = {
      id: randomUUID(),
      featureRequest,
      targetUrl,
      checks: checkResults,
      verdict,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(verification, { status: 200 });

  } catch (err) {
    if (err instanceof ParserError) {
      // The LLM could not produce valid acceptance checks
      return NextResponse.json(
        { error: "Could not generate acceptance checks from that request. Please try rephrasing." },
        { status: 422 },
      );
    }

    // Unexpected error — log server-side, return generic message to client
    console.error("[/api/verify] Unexpected error:", err);
    return NextResponse.json(
      { error: "Verification failed. Please try again." },
      { status: 500 },
    );
  }
}
