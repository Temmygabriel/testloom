/**
 * GET /api/probe?target=fail|pass
 *
 * Minimal Vercel serverless probe used to confirm that
 * playwright-core + @sparticuz/chromium can:
 * 1. launch a browser
 * 2. navigate to the demo app
 * 3. capture a screenshot
 * 4. upload it to Vercel Blob
 * 5. return the Blob URL
 *
 * Security:
 * - Only "fail" and "pass" are accepted.
 * - Target URLs are resolved server-side from environment variables.
 * - No arbitrary URL is accepted from the request.
 */

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { launchBrowser } from "@/lib/browser";

const TARGET_MAP: Record<string, string | undefined> = {
  fail: process.env.DEMO_APP_FAIL_URL,
  pass: process.env.DEMO_APP_PASS_URL,
};

export async function GET(request: Request) {
  const start = Date.now();

  const { searchParams } = new URL(request.url);
  const target = searchParams.get("target") ?? "";

  // Validate target.
  if (target !== "fail" && target !== "pass") {
    return NextResponse.json(
      {
        ok: false,
        error: `Invalid target "${target}". Use target=fail or target=pass.`,
      },
      { status: 400 },
    );
  }

  // Resolve URL only from the server-side allowlist.
  const targetUrl = TARGET_MAP[target];

  if (!targetUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: `DEMO_APP_${target.toUpperCase()}_URL is not set. Add it to your Vercel environment variables.`,
      },
      { status: 400 },
    );
  }

  let browser;

  try {
    browser = await launchBrowser();

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(targetUrl, {
      timeout: 20_000,
    });

    const screenshotBuffer = Buffer.from(
      await page.screenshot({
        fullPage: true,
      }),
    );

    await context.close();
    await browser.close();
    browser = undefined;

    // Upload through the connected Vercel Blob store.
    // On Vercel, the Blob connection provides the required authentication.
    const filename = `probe/${target}-${Date.now()}.png`;

    const { url } = await put(
      filename,
      screenshotBuffer,
      {
        access: "public",
      },
    );

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

    const message =
      err instanceof Error ? err.message : String(err);

    return NextResponse.json(
      {
        ok: false,
        error: message,
        target,
        elapsed_ms: Date.now() - start,
      },
      { status: 500 },
    );
  }
}