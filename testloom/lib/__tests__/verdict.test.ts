import { describe, it, expect } from "vitest";
import { deriveVerdict } from "@/lib/verdict";
import type { CheckResult } from "@/types";

// Minimal factory — only fields needed for verdict logic
function makeCheck(status: CheckResult["status"]): CheckResult {
  return {
    checkId: "test",
    description: "test check",
    status,
    expected: "x",
    observed: "x",
    evidence: [],
    actionLog: [],
  };
}

describe("deriveVerdict", () => {
  it("returns INCONCLUSIVE for empty array", () => {
    expect(deriveVerdict([])).toBe("INCONCLUSIVE");
  });

  it("returns PASS when all checks pass", () => {
    expect(deriveVerdict([makeCheck("PASS"), makeCheck("PASS")])).toBe("PASS");
  });

  it("returns FAIL when any check fails", () => {
    expect(deriveVerdict([makeCheck("PASS"), makeCheck("FAIL")])).toBe("FAIL");
  });

  it("returns FAIL over INCONCLUSIVE when both present", () => {
    expect(
      deriveVerdict([makeCheck("INCONCLUSIVE"), makeCheck("FAIL"), makeCheck("PASS")]),
    ).toBe("FAIL");
  });

  it("returns INCONCLUSIVE when no FAIL but some INCONCLUSIVE", () => {
    expect(deriveVerdict([makeCheck("PASS"), makeCheck("INCONCLUSIVE")])).toBe(
      "INCONCLUSIVE",
    );
  });

  it("returns INCONCLUSIVE for a single INCONCLUSIVE check", () => {
    expect(deriveVerdict([makeCheck("INCONCLUSIVE")])).toBe("INCONCLUSIVE");
  });

  it("returns FAIL for a single FAIL check", () => {
    expect(deriveVerdict([makeCheck("FAIL")])).toBe("FAIL");
  });

  it("returns PASS for a single PASS check", () => {
    expect(deriveVerdict([makeCheck("PASS")])).toBe("PASS");
  });
});
