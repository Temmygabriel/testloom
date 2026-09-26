/**
 * parser.ts — LLM requirement → AcceptanceCheck[] parser
 *
 * This is the ONLY place an LLM is used in the pipeline.
 * All other verdict and execution logic is deterministic.
 *
 * Flow:
 *   1. Send featureRequest to gpt-4o-mini with a constrained system prompt.
 *   2. Parse the JSON response.
 *   3. Validate against z.array(AcceptanceCheckSchema).
 *   4. On validation failure, retry once.
 *   5. If the retry also fails, throw ParserError.
 *
 * Security: the feature request is wrapped in explicit XML-style delimiters
 * so it cannot escape into the instruction section of the prompt.
 */

import OpenAI from "openai";
import { z } from "zod";
import { randomUUID } from "crypto";
import { AcceptanceCheckSchema } from "@/types";
import type { AcceptanceCheck } from "@/types";

// ── Typed error ───────────────────────────────────────────────────────────────

export class ParserError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ParserError";
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────
// Defines the closed ActionType vocabulary and the exact JSON schema the model
// must produce. Example output is included to reduce hallucination.

const SYSTEM_PROMPT = `You convert a software feature request into a list of browser acceptance checks.

Return ONLY a JSON object with this exact shape — no markdown, no explanation:
{
  "checks": [
    {
      "id": "<unique string>",
      "description": "<one sentence describing what this check verifies>",
      "steps": [
        { "type": "<ActionType>", "selector": "<CSS or data-testid selector>", "value": "<string>", "expectedText": "<string>", "expectedUrl": "<string>" }
      ]
    }
  ]
}

Rules:
- "checks" must be an array of 2–6 checks.
- Each check must have a non-empty "id", "description", and at least one step.
- "steps[].type" must be EXACTLY one of these values (case-sensitive):
    navigate | click | fill | expectVisible | expectText | expectUrl
- Only include fields that are relevant to the step type:
    navigate   → requires "value" (the URL or path to navigate to)
    click      → requires "selector"
    fill       → requires "selector" and "value"
    expectVisible → requires "selector"
    expectText → requires "selector" and "expectedText"
    expectUrl  → requires "expectedUrl"
- Do NOT invent new action types. Use only the list above.
- Keep selectors simple: prefer [data-testid=X] over complex CSS.
- Generate checks that together verify the feature end-to-end.

Example output for "Users can log in":
{
  "checks": [
    {
      "id": "check-1",
      "description": "Login page is reachable",
      "steps": [
        { "type": "navigate", "value": "/login" },
        { "type": "expectVisible", "selector": "[data-testid=login-form]" }
      ]
    },
    {
      "id": "check-2",
      "description": "Valid credentials reach the dashboard",
      "steps": [
        { "type": "navigate", "value": "/login" },
        { "type": "fill", "selector": "[data-testid=username-input]", "value": "demo" },
        { "type": "fill", "selector": "[data-testid=password-input]", "value": "demo123" },
        { "type": "click", "selector": "[data-testid=login-submit]" },
        { "type": "expectUrl", "expectedUrl": "/dashboard" }
      ]
    }
  ]
}`;

// ── Response schema ───────────────────────────────────────────────────────────
// The model must return { checks: AcceptanceCheck[] }

const LLMResponseSchema = z.object({
  checks: z.array(AcceptanceCheckSchema),
});

// ── Singleton client ──────────────────────────────────────────────────────────

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new ParserError("OPENAI_API_KEY is not set");
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

// ── Core call ─────────────────────────────────────────────────────────────────

async function callLLM(featureRequest: string): Promise<AcceptanceCheck[]> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.2, // Low temperature for consistent structured output
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        // Feature request wrapped in delimiters — prevents prompt injection
        content: `<feature_request>\n${featureRequest}\n</feature_request>`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    throw new ParserError("LLM returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new ParserError(`LLM response is not valid JSON: ${raw.slice(0, 200)}`, e);
  }

  const result = LLMResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw new ParserError(
      `LLM output failed schema validation: ${result.error.message}`,
      result.error,
    );
  }

  // Ensure every check has a stable unique ID (the LLM may reuse IDs)
  return result.data.checks.map((check) => ({
    ...check,
    id: check.id || randomUUID(),
  }));
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Parse a natural-language feature request into a validated AcceptanceCheck[].
 *
 * Retries once on validation failure.
 * Throws ParserError if both attempts fail.
 */
export async function parseRequirement(
  featureRequest: string,
): Promise<AcceptanceCheck[]> {
  try {
    return await callLLM(featureRequest);
  } catch {
    // Retry once — the LLM occasionally produces malformed JSON on first attempt
    try {
      return await callLLM(featureRequest);
    } catch (secondError) {
      throw new ParserError(
        "Failed to generate valid acceptance checks after 2 attempts. " +
          (secondError instanceof Error ? secondError.message : String(secondError)),
        secondError,
      );
    }
  }
}
