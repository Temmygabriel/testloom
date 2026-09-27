/**
 * runner.ts — Playwright verification runner
 *
 * Executes an AcceptanceCheck[] against a target URL and returns CheckResult[].
 *
 * Design rules:
 * - Unknown ActionType → INCONCLUSIVE for that check
 * - Playwright/infrastructure error → INCONCLUSIVE
 * - Assertion failure → FAIL
 * - All steps pass → PASS
 * - One failed check does not stop the remaining checks
 * - Screenshots are uploaded to Vercel Blob
 * - Navigation is restricted to the same origin as the target application
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
    // Evidence upload failure must never change the verification verdict.
    return null;
  }
}

// ---------------------------------------------------------------------------
// Execute one browser action
// ---------------------------------------------------------------------------

async function executeStep(
  page: Page,
  step: ActionStep,
  targetUrl: string,
): Promise<string> {
  switch (step.type) {
    case "navigate": {
      if (!step.value) {
        throw new Error("navigate step missing value (URL)");
      }

      const baseUrl = new URL(targetUrl);
      const resolvedUrl = new URL(step.value, targetUrl);

      if (resolvedUrl.origin !== baseUrl.origin) {
        throw new Error(
          "navigate step attempted to leave the target application",
        );
      }

      await page.goto(resolvedUrl.toString(), {
        timeout: STEP_TIMEOUT,
      });

      return `navigated to ${resolvedUrl.toString()}`;
    }

    case "reload": {
      await page.reload({
        timeout: STEP_TIMEOUT,
      });

      return "reloaded the current page";
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

      const locator = page.locator(step.selector);

      await locator.waitFor({
        state: "visible",
        timeout: STEP_TIMEOUT,
      });

      const actual = await locator.textContent({
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

      // A click and a client-side redirect do not necessarily settle before
      // Playwright returns control to the next action. Waiting here is
      // especially important for the refresh/session check: the broken demo
      // redirects from /dashboard to /login after hydration.
      try {
        await page.waitForURL(
          (url) => url.toString().includes(step.expectedUrl ?? ""),
          { timeout: STEP_TIMEOUT },
        );
      } catch {
        const currentUrl = page.url();
        throw new AssertionError(
          `expected URL to include "${step.expectedUrl}", got "${currentUrl}"`,
        );
      }

      return `URL includes "${step.expectedUrl}"`;
    }

    default: {
      const unknown = (step as ActionStep).type;

      throw new UnknownActionError(
        `Unknown ActionType: "${unknown}"`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Typed errors
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
// Run one acceptance check
// ---------------------------------------------------------------------------

async function runCheck(
  page: Page,
  check: AcceptanceCheck,
  targetUrl: string,
): Promise<CheckResult> {
  const collector = new EvidenceCollector();

  let verdict: Verdict = "PASS";
  let observed = "All steps completed successfully";

  for (const step of check.steps) {
    try {
      const outcome = await executeStep(
        page,
        step,
        targetUrl,
      );

      collector.record(
        step.type,
        `PASS — ${outcome}`,
        step.selector,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err);

      if (err instanceof AssertionError) {
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
        collector.record(
          step.type,
          `INCONCLUSIVE — ${message}`,
          step.selector,
        );

        verdict = "INCONCLUSIVE";
        observed = message;
        break;
      }

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

  // -------------------------------------------------------------------------
  // Screenshot
  // -------------------------------------------------------------------------

  const screenshotUrls: string[] = [];

  try {
    const screenshotBuffer = Buffer.from(
      await page.screenshot({
        fullPage: true,
      }),
    );

    const url = await uploadScreenshot(
      screenshotBuffer,
      `check-${check.id}-${verdict.toLowerCase()}`,
    );

    if (url) {
      screenshotUrls.push(url);
    }
  } catch {
    // Screenshot failures never alter the verdict.
  }

  // -------------------------------------------------------------------------
  // Expected summary
  // -------------------------------------------------------------------------

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

      if (step.type === "navigate") {
        return `navigate to ${step.value}`;
      }

      if (step.type === "reload") {
        return "reload the current page";
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
// Public API
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

    await page.goto(targetUrl, {
      timeout: STEP_TIMEOUT,
    });

    for (const check of checks) {
      const result = await runCheck(
        page,
        check,
        targetUrl,
      );

      results.push(result);
    }

    await context.close();
  } finally {
    await browser.close();
  }

  return results;
}
