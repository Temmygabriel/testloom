/**
 * GET /api/probe?target=fail|pass
 *
 * Minimal Vercel serverless probe used to confirm that playwright-core +
 * @sparticuz/chromium can launch a browser, navigate to the demo app,
 * capture a screenshot, upload it to Vercel Blob, and return the URL.
 *
 * This is the Phase 3 technical gate: nothing downstream (parser, verdict
 * engine, UI) is built until this route is confirmed working on a live
 * Vercel deployment.
 *
 * Security: target is resolved server-side from env vars only.
 *           No raw URL is accepted from the query string.
 *
 * Usage:
 *   GET /api/probe?target=fail   → screenshots DEMO_APP_FAIL_URL
 *   GET /api/probe?target=pass   → screenshots DEMO_APP_PASS_URL
 *
 * Response:
 *   200  { ok: true,  url: "https://blob.vercel.com/...", target, elapsed_ms }
 *   400  { ok: false, error: "..." }   — invalid target or missing env vars
 *   500  { ok: false, error: "..." }   — browser/upload failure
 */

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { launchBrowser } from "@/lib/browser";

// Allowlist: only these two values are accepted as `target`
const TARGET_MAP: Record<string, string | undefined> = {
  fail: process.env.DEMO_APP_FAIL_URL,
  pass: process.env.DEMO_APP_PASS_URL,
};

export async function GET(request: Request) {
  const start = Date.now();
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("target") ?? "";

  // ── Input validation ──────────────────────────────────────────────────────
  if (target !== "fail" && target !== "pass") {
    return NextResponse.json(
      { ok: false, error: `Invalid target "${target}". Use target=fail or target=pass.` },
      { status: 400 }
    );
  }

  const targetUrl = TARGET_MAP[target];
  if (!targetUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: `DEMO_APP_${target.toUpperCase()}_URL is not set. Add it to your Vercel environment variables.`,
      },
      { status: 400 }
    );
  }

  // ── Browser run ───────────────────────────────────────────────────────────
  let browser;
  try {
    browser = await launchBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(targetUrl, { timeout: 20_000 });
    const screenshotBuffer = Buffer.from(await page.screenshot({ fullPage: true }));

    await context.close();
    await browser.close();
    browser = undefined;

    // ── Blob upload ───────────────────────────────────────────────────────────
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      // In local dev without a Blob token, return a success with no URL
      return NextResponse.json({
        ok: true,
        url: null,
        note: "BLOB_READ_WRITE_TOKEN not set — screenshot captured but not uploaded.",
        target,
        elapsed_ms: Date.now() - start,
      });
    }

    const filename = `probe/${target}-${Date.now()}.png`;
    const { url } = await put(filename, screenshotBuffer, { access: "public" });

    return NextResponse.json({
      ok: true,
      url,
      target,
      elapsed_ms: Date.now() - start,
    });

  } catch (err) {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message, target, elapsed_ms: Date.now() - start },
      { status: 500 }
    );
  }
}
