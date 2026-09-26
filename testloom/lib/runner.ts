/**
 * runner.ts — Playwright verification runner
 *
 * Executes an AcceptanceCheck[] against a target URL and returns CheckResult[].
 *
 * Design rules (from spec):
 * - Unknown ActionType → INCONCLUSIVE for that check (never throws)
 * - Playwright error or timeout → INCONCLUSIVE for the affected check
 * - Assertion failure (wrong text, wrong URL, element missing) → FAIL
 * - All steps pass → PASS
 * - The runner never crashes the whole run due to a single check failing
 * - Screenshots are uploaded to Vercel Blob after each check; URLs stored in evidence[]
 */

import type { Page } from "playwright-core";
import { put } from "@vercel/blob";
import { launchBrowser } from "@/lib/browser";
import { EvidenceCollector } from "@/lib/evidence";
import type {
  AcceptanceCheck,
  ActionStep,
  CheckResult,
  Verdict,
} from "@/types";

// Step timeout per individual Playwright action (ms)
const STEP_TIMEOUT = 10_000;

// ---------------------------------------------------------------------------
// Screenshot upload
// ---------------------------------------------------------------------------
async function uploadScreenshot(
  buffer: Buffer,
  label: string,
): Promise<string | null> {
  try {
    const filename = `evidence/${label}-${Date.now()}.png`;
    const { url } = await put(filename, buffer, {
      access: "public",
    });

    return url;
  } catch {
    // Never crash the verification run because screenshot upload failed.
    return null;
  }
}

// ---------------------------------------------------------------------------
// Execute a single ActionStep against an open Playwright page.
// Returns the outcome string; throws on assertion failure.
// ---------------------------------------------------------------------------
async function executeStep(
  page: Page,
  step: ActionStep,
): Promise<string> {
  switch (step.type) {
    case "navigate": {
      if (!step.value) {
        throw new Error("navigate step missing value (URL)");
      }

      await page.goto(step.value, {
        timeout: STEP_TIMEOUT,
      });

      return `navigated to ${step.value}`;
    }

    case "click": {
      if (!step.selector) {
        throw new Error("click step missing selector");
      }

      await page.locator(step.selector).click({
        timeout: STEP_TIMEOUT,
      });

      return `clicked ${step.selector}`;
    }

    case "fill": {
      if (!step.selector) {
        throw new Error("fill step missing selector");
      }

      if (step.value === undefined) {
        throw new Error("fill step missing value");
      }

      await page.locator(step.selector).fill(step.value, {
        timeout: STEP_TIMEOUT,
      });

      return `filled ${step.selector} with "${step.value}"`;
    }

    case "expectVisible": {
      if (!step.selector) {
        throw new Error("expectVisible step missing selector");
      }

      const locator = page.locator(step.selector);

      await locator.waitFor({
        state: "visible",
        timeout: STEP_TIMEOUT,
      });

      return `${step.selector} is visible`;
    }

    case "expectText": {
      if (!step.selector) {
        throw new Error("expectText step missing selector");
      }

      if (!step.expectedText) {
        throw new Error("expectText step missing expectedText");
      }

      const el = page.locator(step.selector);

      await el.waitFor({
        state: "visible",
        timeout: STEP_TIMEOUT,
      });

      const actual = await el.textContent({
        timeout: STEP_TIMEOUT,
      });

      if (!actual?.includes(step.expectedText)) {
        throw new AssertionError(
          `expected text to include "${step.expectedText}", got "${actual ?? ""}"`,
        );
      }

      return `text "${step.expectedText}" found in ${step.selector}`;
    }

    case "expectUrl": {
      if (!step.expectedUrl) {
        throw new Error("expectUrl step missing expectedUrl");
      }

      const current = page.url();

      if (!current.includes(step.expectedUrl)) {
        throw new AssertionError(
          `expected URL to include "${step.expectedUrl}", got "${current}"`,
        );
      }

      return `URL includes "${step.expectedUrl}"`;
    }

    default: {
      // Runtime safety for unexpected action types.
      const unknown = (step as ActionStep).type;

      throw new UnknownActionError(
        `Unknown ActionType: "${unknown}"`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Typed error classes
// ---------------------------------------------------------------------------
class AssertionError extends Error {
  readonly kind = "assertion" as const;

  constructor(message: string) {
    super(message);
    this.name = "AssertionError";
  }
}

class UnknownActionError extends Error {
  readonly kind = "unknown_action" as const;

  constructor(message: string) {
    super(message);
    this.name = "UnknownActionError";
  }
}

// ---------------------------------------------------------------------------
// Run a single AcceptanceCheck — returns a CheckResult.
// Never throws; all errors are converted to FAIL or INCONCLUSIVE.
// ---------------------------------------------------------------------------
async function runCheck(
  page: Page,
  check: AcceptanceCheck,
): Promise<CheckResult> {
  const collector = new EvidenceCollector();

  let verdict: Verdict = "PASS";
  let observed = "All steps completed successfully";

  for (const step of check.steps) {
    try {
      const outcome = await executeStep(page, step);

      collector.record(
        step.type,
        `PASS — ${outcome}`,
        step.selector,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err);

      if (err instanceof AssertionError) {
        // Definite observable failure — the app did the wrong thing.
        collector.record(
          step.type,
          `FAIL — ${message}`,
          step.selector,
        );

        verdict = "FAIL";
        observed = message;
        break;
      }

      if (err instanceof UnknownActionError) {
        // Unknown action type — cannot determine outcome.
        collector.record(
          step.type,
          `INCONCLUSIVE — ${message}`,
          step.selector,
        );

        verdict = "INCONCLUSIVE";
        observed = message;
        break;
      }

      // Infrastructure error (timeout, network, selector problem, etc.).
      collector.record(
        step.type,
        `INCONCLUSIVE — ${message}`,
        step.selector,
      );

      verdict = "INCONCLUSIVE";
      observed = `Environment error: ${message}`;
      break;
    }
  }

  // Capture screenshot after the check completes.
  const screenshotUrls: string[] = [];

  try {
    const buffer = Buffer.from(
      await page.screenshot({
        fullPage: true,
      }),
    );

    const url = await uploadScreenshot(
      buffer,
      `check-${check.id}-${verdict.toLowerCase()}`,
    );

    if (url) {
      screenshotUrls.push(url);
    }
  } catch {
    // Screenshot failure never changes the verdict.
  }

  // Build expected summary for the UI.
  const expected = check.steps
    .map((step) => {
      if (step.type === "expectText") {
        return `"${step.expectedText}" visible in ${step.selector}`;
      }

      if (step.type === "expectUrl") {
        return `URL includes "${step.expectedUrl}"`;
      }

      if (step.type === "expectVisible") {
        return `${step.selector} is visible`;
      }

      return step.type;
    })
    .join("; ");

  return {
    checkId: check.id,
    description: check.description,
    status: verdict,
    expected,
    observed,
    evidence: screenshotUrls,
    actionLog: collector.getEntries(),
  };
}

// ---------------------------------------------------------------------------
// Public API — run all checks sequentially against the target URL.
// ---------------------------------------------------------------------------
export async function runChecks(
  checks: AcceptanceCheck[],
  targetUrl: string,
): Promise<CheckResult[]> {
  const browser = await launchBrowser();
  const results: CheckResult[] = [];

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to the target URL once before running checks.
    await page.goto(targetUrl, {
      timeout: STEP_TIMEOUT,
    });

    for (const check of checks) {
      const result = await runCheck(page, check);
      results.push(result);
    }

    await context.close();
  } finally {
    await browser.close();
  }

  return results;
}