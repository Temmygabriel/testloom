/**
 * browser.ts — Chromium launcher abstraction
 *
 * In production (Vercel serverless): uses @sparticuz/chromium to inflate and
 * locate the bundled Chromium binary.
 *
 * In local dev (NODE_ENV=development or PLAYWRIGHT_EXECUTABLE_PATH set):
 * uses the path from PLAYWRIGHT_EXECUTABLE_PATH or known system Chrome paths,
 * so the runner can also be exercised locally without the Vercel environment.
 *
 * Always uses playwright-core — never the full playwright package which would
 * bundle its own conflicting Chromium binary.
 */

import { chromium as playwrightChromium, type Browser } from "playwright-core";
import chromium from "@sparticuz/chromium";
import { existsSync } from "fs";

// Fallback paths for local dev (Windows + Linux/Mac)
const LOCAL_CHROME_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
];

/**
 * Launches a headless Chromium browser appropriate for the current environment.
 *
 * On Vercel: inflates the @sparticuz/chromium binary from the bundle.
 * Locally:   uses PLAYWRIGHT_EXECUTABLE_PATH or the first found system Chrome.
 */
export async function launchBrowser(): Promise<Browser> {
  const isVercel = Boolean(process.env.VERCEL);
  const envPath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;

  if (isVercel) {
    // Production path: inflate and use the bundled Chromium
    const executablePath = await chromium.executablePath();
    return playwrightChromium.launch({
      executablePath,
      headless: true,
      args: chromium.args,
    });
  }

  // Local dev: prefer explicit env override, then scan known paths
  const executablePath =
    envPath ??
    LOCAL_CHROME_PATHS.find(existsSync);

  if (!executablePath) {
    throw new Error(
      "No Chrome/Chromium executable found for local dev.\n" +
        "Set PLAYWRIGHT_EXECUTABLE_PATH to your browser binary path."
    );
  }

  return playwrightChromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}
