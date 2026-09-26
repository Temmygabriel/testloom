/**
 * probe-local.ts — Phase 2: Local Playwright proof-of-concept
 *
 * Proves that browser automation works against the demo app locally.
 * Uses playwright-core (already in testloom/node_modules) + system Chrome.
 * No new packages required.
 *
 * BEFORE running this script, start the demo app in a separate terminal:
 *
 *   Windows (PowerShell):
 *     cd demo-app
 *     $env:SESSION_MODE="cookie"; npx next dev -p 3001     ← PASS version
 *     $env:SESSION_MODE="memory"; npx next dev -p 3001     ← FAIL version
 *
 *   Mac/Linux:
 *     cd demo-app
 *     SESSION_MODE=cookie npx next dev -p 3001             ← PASS version
 *     SESSION_MODE=memory npx next dev -p 3001             ← FAIL version
 *
 * THEN run this script from the testloom/ directory:
 *
 *   npx tsx scripts/probe-local.ts
 *
 * Screenshots are saved to the OS temp directory and paths are printed.
 */

import { chromium } from "playwright-core";
import { existsSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// ── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = process.env.DEMO_APP_URL ?? "http://localhost:3001";

// Known system Chrome/Chromium paths — first one found is used
const CHROME_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
];

// ── Action log ───────────────────────────────────────────────────────────────

type LogEntry = { ts: string; action: string; outcome: string; selector?: string };
const actionLog: LogEntry[] = [];

function log(action: string, outcome: string, selector?: string) {
  const ts = new Date().toISOString().slice(11, 23); // HH:mm:ss.mmm
  actionLog.push({ ts, action, outcome, selector });
  const icon = outcome.startsWith("PASS") ? "✓" : outcome.startsWith("FAIL") ? "✗" : "·";
  const sel = selector ? `  (${selector})` : "";
  console.log(`  ${icon} [${ts}] ${action}${sel}  →  ${outcome}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Testloom Phase 2 — Local Playwright Probe ===");
  console.log(`Target: ${BASE_URL}\n`);

  // Locate system Chrome
  const executablePath = CHROME_CANDIDATES.find(existsSync);
  if (!executablePath) {
    console.error(
      "ERROR: No system Chrome found at the known paths.\n" +
      "Install Chrome, or set PLAYWRIGHT_EXECUTABLE_PATH to your browser binary."
    );
    process.exit(1);
  }
  console.log(`Browser: ${executablePath}\n`);

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const screenshotPaths: string[] = [];
  let failed = false;

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // ── Step 1: Navigate to login page ───────────────────────────────────────
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector("[data-testid=login-heading]");
    log("navigate", "PASS — login page loaded", "/login");

    // ── Step 2: Fill credentials ──────────────────────────────────────────────
    await page.getByTestId("username-input").fill("demo");
    log("fill", "PASS", "[data-testid=username-input]");

    await page.getByTestId("password-input").fill("demo123");
    log("fill", "PASS", "[data-testid=password-input]");

    // ── Step 3: Submit login form ─────────────────────────────────────────────
    await page.getByTestId("login-submit").click();

    // Wait for navigation — either dashboard (success) or login (bad creds)
    await page.waitForURL(/\/(dashboard|login)/, { timeout: 10_000 });
    const urlAfterLogin = page.url();

    if (urlAfterLogin.includes("/dashboard")) {
      log("click submit + waitForURL", "PASS — reached /dashboard", "[data-testid=login-submit]");
    } else {
      log("click submit + waitForURL", `FAIL — still on login after submit: ${urlAfterLogin}`, "[data-testid=login-submit]");
      failed = true;
    }

    // ── Step 4: Verify dashboard heading ─────────────────────────────────────
    if (!failed) {
      await page.waitForSelector("[data-testid=dashboard-heading]");
      const heading = await page.getByTestId("dashboard-heading").textContent();
      if (heading?.includes("Welcome")) {
        log("expectText", `PASS — "${heading}"`, "[data-testid=dashboard-heading]");
      } else {
        log("expectText", `FAIL — unexpected heading: "${heading}"`, "[data-testid=dashboard-heading]");
        failed = true;
      }
    }

    // ── Step 5: Screenshot after login ───────────────────────────────────────
    const afterLoginPath = join(tmpdir(), "probe-after-login.png");
    writeFileSync(afterLoginPath, await page.screenshot({ fullPage: true }));
    screenshotPaths.push(afterLoginPath);
    log("screenshot", `PASS — saved to ${afterLoginPath}`);

    // ── Step 6: Refresh — observe session behaviour ───────────────────────────
    await page.reload();
    await page.waitForSelector("[data-testid=login-heading],[data-testid=dashboard-heading]");
    const urlAfterRefresh = page.url();

    if (urlAfterRefresh.includes("/dashboard")) {
      log("reload", "PASS — session survived refresh (cookie mode)", urlAfterRefresh);
    } else {
      log("reload", "PASS — session lost on refresh (memory mode)", urlAfterRefresh);
    }

    const afterRefreshPath = join(tmpdir(), "probe-after-refresh.png");
    writeFileSync(afterRefreshPath, await page.screenshot({ fullPage: true }));
    screenshotPaths.push(afterRefreshPath);
    log("screenshot", `PASS — saved to ${afterRefreshPath}`);

    await context.close();

  } finally {
    await browser.close();
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n=== Action Log ===");
  actionLog.forEach(({ ts, action, outcome, selector }) => {
    const sel = selector ? `  (${selector})` : "";
    console.log(`  [${ts}] ${action}${sel}  →  ${outcome}`);
  });

  console.log("\n=== Screenshots ===");
  screenshotPaths.forEach((p) => console.log(`  · ${p}`));

  if (failed) {
    console.error("\n❌  Probe FAILED — browser automation did not confirm the expected flow.");
    process.exit(1);
  } else {
    console.log("\n✅  Probe PASSED — browser automation confirmed working locally.");
    console.log("    Inspect the screenshots above to verify the session behaviour visually.");
  }
}

main().catch((err: unknown) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
