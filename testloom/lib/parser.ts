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
// Prompt
// ---------------------------------------------------------------------------

const INSTRUCTIONS = `
You are Testloom's acceptance-test generator.

Convert the feature request below into executable browser acceptance checks.

Return ONLY valid JSON.
Do not return markdown.
Do not return code fences.
Do not return explanations.

The JSON must have this shape:

{
  "checks": [
    {
      "id": "check-1",
      "description": "one sentence",
      "steps": []
    }
  ]
}

Rules:

1. Generate 2 to 6 checks.

2. Every check must contain:
   - id
   - description
   - steps

3. Every check must contain at least one step.

4. Allowed step types are ONLY:
   - navigate
   - reload
   - click
   - fill
   - expectVisible
   - expectText
   - expectUrl

5. Step rules:

navigate:
  include "value"

reload:
  include no selector, value, expectedText, or expectedUrl

click:
  include "selector"

fill:
  include "selector" and "value"

expectVisible:
  include "selector"

expectText:
  include "selector" and "expectedText"

expectUrl:
  include "expectedUrl"

6. Never output null values.

7. Omit irrelevant properties completely.

8. Never invent action types.

9. Prefer [data-testid=...] selectors whenever possible.

10. Generate checks that together verify the feature end-to-end.

11. IMPORTANT:
If the feature request involves a user remaining logged in,
remaining authenticated, or remaining signed in after refreshing
or reloading:

- explicitly use the "reload" action
- do NOT replace reload with navigate
- do NOT use logout as a substitute
- verify the authenticated state AFTER reload

For example, for:

"Keep users logged in after refreshing the page."

produce checks similar to:

{
  "checks": [
    {
      "id": "check-login",
      "description": "A valid user can reach the dashboard",
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
    },
    {
      "id": "check-refresh",
      "description": "The authenticated session survives a browser refresh",
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
          "type": "reload"
        },
        {
          "type": "expectUrl",
          "expectedUrl": "/dashboard"
        },
        {
          "type": "expectVisible",
          "selector": "[data-testid=dashboard-heading]"
        }
      ]
    }
  ]
}

Now generate checks for:

<feature_request>
`;

// ---------------------------------------------------------------------------
// Response schema
// ---------------------------------------------------------------------------

const LLMResponseSchema = z.object({
  checks: z.array(AcceptanceCheckSchema),
});

// ---------------------------------------------------------------------------
// Normalize model output
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
  const groqClient = getClient();

  const response =
    await groqClient.chat.completions.create({
      model: "openai/gpt-oss-20b",

      response_format: {
        type: "json_object",
      },

      temperature: 0.1,

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
    console.error(
      "[parser] First attempt failed:",
      firstError,
    );

    try {
      return await callLLM(featureRequest);
    } catch (secondError) {
      console.error(
        "[parser] Second attempt failed:",
        secondError,
      );

      throw new ParserError(
        "Failed to generate valid acceptance checks after 2 attempts.",
        secondError,
      );
    }
  }
}