import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseRequirement, ParserError } from "@/lib/parser";

// ── Mock the openai module ────────────────────────────────────────────────────
// We intercept client.chat.completions.create and control its return value.

const mockCreate = vi.fn();

vi.mock("openai", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeResponse(content: string) {
  return {
    choices: [{ message: { content } }],
  };
}

const VALID_RESPONSE = JSON.stringify({
  checks: [
    {
      id: "check-1",
      description: "Login page loads",
      steps: [
        { type: "navigate", value: "/login" },
        { type: "expectVisible", selector: "[data-testid=login-form]" },
      ],
    },
    {
      id: "check-2",
      description: "Valid credentials reach dashboard",
      steps: [
        { type: "fill", selector: "[data-testid=username-input]", value: "demo" },
        { type: "fill", selector: "[data-testid=password-input]", value: "demo123" },
        { type: "click", selector: "[data-testid=login-submit]" },
        { type: "expectUrl", expectedUrl: "/dashboard" },
      ],
    },
  ],
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("parseRequirement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The production parser uses Groq through OpenAI's compatible SDK.
    process.env.GROQ_API_KEY = "test-key";
  });

  it("returns AcceptanceCheck[] on valid LLM output", async () => {
    mockCreate.mockResolvedValue(makeResponse(VALID_RESPONSE));

    const checks = await parseRequirement("Users can log in");

    expect(checks).toHaveLength(2);
    expect(checks[0].id).toBe("check-1");
    expect(checks[0].description).toBe("Login page loads");
    expect(checks[0].steps[0].type).toBe("navigate");
    expect(checks[1].steps[3].type).toBe("expectUrl");
  });

  it("retries on invalid JSON and throws ParserError if retry also fails", async () => {
    mockCreate.mockResolvedValue(makeResponse("not valid json {{"));

    await expect(parseRequirement("bad request")).rejects.toThrow(ParserError);
    // Called twice — original attempt + one retry
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("retries on Zod validation failure (unknown ActionType) and throws ParserError", async () => {
    const invalidAction = JSON.stringify({
      checks: [
        {
          id: "c1",
          description: "test",
          steps: [
            { type: "unknownAction", selector: "#foo" }, // not in ActionType enum
          ],
        },
      ],
    });
    mockCreate.mockResolvedValue(makeResponse(invalidAction));

    await expect(parseRequirement("session stays after refresh")).rejects.toThrow(
      ParserError,
    );
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("retries on empty LLM response and throws ParserError", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: "" } }] });

    await expect(parseRequirement("test")).rejects.toThrow(ParserError);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("succeeds on second attempt after first fails", async () => {
    mockCreate
      .mockResolvedValueOnce(makeResponse("bad json"))
      .mockResolvedValueOnce(makeResponse(VALID_RESPONSE));

    const checks = await parseRequirement("Users can log in");
    expect(checks).toHaveLength(2);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("throws ParserError (not a generic error) on double failure", async () => {
    mockCreate.mockResolvedValue(makeResponse("{}")); // valid JSON but missing "checks"

    const err = await parseRequirement("test").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ParserError);
    expect((err as ParserError).name).toBe("ParserError");
  });
});
