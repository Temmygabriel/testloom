import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import {
  getSessionMode,
  memoryStoreSet,
} from "@/lib/session";

const DEMO_USERNAME = "demo";
const DEMO_PASSWORD = "demo123";
const COOKIE_NAME = "session_token";
// 1 hour — long enough for a demo, short enough to feel realistic
const COOKIE_MAX_AGE = 60 * 60;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const { username, password } = body as { username?: string; password?: string };

  if (username !== DEMO_USERNAME || password !== DEMO_PASSWORD) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 },
    );
  }

  const token = randomBytes(16).toString("hex");
  const mode = getSessionMode();

  if (mode === "memory") {
    // FAIL scenario: token stored in module-level Map.
    // On Vercel serverless, this Map is discarded between invocations,
    // so /api/me will return 401 after a page refresh.
    memoryStoreSet(token, DEMO_USERNAME);

    const response = NextResponse.json({ ok: true, mode: "memory" });
    // Set a cookie so the browser sends the token back on the next request,
    // but the server-side Map won't have it after a refresh/cold start.
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
    return response;
  }

  // PASS scenario: token stored only in the HttpOnly cookie.
  // No server-side lookup needed — the cookie itself is the proof of auth.
  const response = NextResponse.json({ ok: true, mode: "cookie" });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return response;
}
