/**
 * parser.ts — LLM requirement → AcceptanceCheck[] parser
 *
 * Uses Groq through the OpenAI-compatible SDK.
 *
 * The parser is the only LLM-powered part of Testloom.
 * Everything after this point is deterministic.
 */

import OpenAI from "openai";
import { z } from "zod";
import { randomUUID } from "crypto";
import { AcceptanceCheckSchema } from "@/types";
import type { AcceptanceCheck } from "@/types";

// ---------------------------------------------------------------------------
// Typed error
// ---------------------------------------------------------------------------

export class ParserError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ParserError";
  }
}

// ---------------------------------------------------------------------------
// Groq client
// ---------------------------------------------------------------------------

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (client) {
    return client;
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new ParserError("GROQ_API_KEY is not set");
  }

  client = new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });

  return client;
}

// ---------------------------------------------------------------------------
// Instructions
//
// Groq's GPT-OSS models support JSON Object Mode. We keep the instructions
// in the user message and explicitly require omitted optional fields rather
// than null values.
// ---------------------------------------------------------------------------

const INSTRUCTIONS = `
You are Testloom's acceptance-test generator.

Convert the feature request below into browser acceptance checks.

Return ONLY valid JSON.
Do not return markdown.
Do not return code fences.
Do not return explanations.

The JSON must have exactly this top-level shape:

{
  "checks": [
    {
      "id": "check-1",
      "description": "one sentence",
      "steps": [
        {
          "type": "navigate",
          "value": "/login"
        }
      ]
    }
  ]
}

Rules:

1. "checks" must contain 2 to 6 checks.
2. Every check must contain:
   - id
   - description
   - steps
3. Every check must contain at least one step.
4. A step type MUST be exactly one of:
   - navigate
   - click
   - fill
   - expectVisible
   - expectText
   - expectUrl

5. For each step:
   - navigate: include "value"
   - click: include "selector"
   - fill: include "selector" and "value"
   - expectVisible: include "selector"
   - expectText: include "selector" and "expectedText"
   - expectUrl: include "expectedUrl"

6. IMPORTANT:
   - Omit irrelevant optional properties completely.
   - Never output null values.
   - Never invent action types.
   - Prefer data-testid selectors.
   - Generate checks that verify the feature end-to-end.

For the example feature:
"Users can log in"

a valid response is:

{
  "checks": [
    {
      "id": "check-1",
      "description": "The login page is reachable",
      "steps": [
        {
          "type": "navigate",
          "value": "/login"
        },
        {
          "type": "expectVisible",
          "selector": "[data-testid=login-form]"
        }
      ]
    },
    {
      "id": "check-2",
      "description": "Valid credentials reach the dashboard",
      "steps": [
        {
          "type": "navigate",
          "value": "/login"
        },
        {
          "type": "fill",
          "selector": "[data-testid=username-input]",
          "value": "demo"
        },
        {
          "type": "fill",
          "selector": "[data-testid=password-input]",
          "value": "demo123"
        },
        {
          "type": "click",
          "selector": "[data-testid=login-submit]"
        },
        {
          "type": "expectUrl",
          "expectedUrl": "/dashboard"
        }
      ]
    }
  ]
}

Now generate checks for the feature request below.

<feature_request>
`;

const LLMResponseSchema = z.object({
  checks: z.array(AcceptanceCheckSchema),
});

// ---------------------------------------------------------------------------
// Normalize model output before Zod validation.
//
// Some models may return null for optional properties even when instructed
// to omit them. We remove those null properties because our TypeScript schema
// represents them as optional, not nullable.
// ---------------------------------------------------------------------------

function normalizeOutput(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeOutput);
  }

  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(input)) {
      if (entry === null) {
        continue;
      }

      output[key] = normalizeOutput(entry);
    }

    return output;
  }

  return value;
}

// ---------------------------------------------------------------------------
// One Groq call
// ---------------------------------------------------------------------------

async function callLLM(
  featureRequest: string,
): Promise<AcceptanceCheck[]> {
  const openaiCompatibleClient = getClient();

  const response =
    await openaiCompatibleClient.chat.completions.create({
      model: "openai/gpt-oss-20b",

      response_format: {
        type: "json_object",
      },

      temperature: 0.2,

      messages: [
        {
          role: "user",
          content:
            INSTRUCTIONS +
            featureRequest +
            "\n</feature_request>",
        },
      ],
    });

  const raw = response.choices[0]?.message?.content;

  if (!raw) {
    throw new ParserError("Groq returned an empty response");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new ParserError(
      `Groq response was not valid JSON: ${raw.slice(0, 200)}`,
      error,
    );
  }

  const normalized = normalizeOutput(parsed);

  const result = LLMResponseSchema.safeParse(normalized);

  if (!result.success) {
    throw new ParserError(
      `Groq output failed schema validation: ${result.error.message}`,
      result.error,
    );
  }

  return result.data.checks.map((check) => ({
    ...check,
    id: check.id || randomUUID(),
  }));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function parseRequirement(
  featureRequest: string,
): Promise<AcceptanceCheck[]> {
  try {
    return await callLLM(featureRequest);
  } catch (firstError) {
    console.error("[parser] First Groq attempt failed:", firstError);

    try {
      return await callLLM(featureRequest);
    } catch (secondError) {
      console.error("[parser] Second Groq attempt failed:", secondError);

      throw new ParserError(
        "Failed to generate valid acceptance checks after 2 attempts.",
        secondError,
      );
    }
  }
}