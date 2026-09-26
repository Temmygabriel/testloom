import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionMode, memoryStoreGet } from "@/lib/session";

const COOKIE_NAME = "session_token";

/**
 * GET /api/me
 *
 * Returns { authenticated: true, username: "demo" } when the session is valid.
 * Returns 401 when the session is missing or (in memory mode) has been lost.
 *
 * cookie mode:  presence of the session_token cookie is sufficient proof.
 * memory mode:  token must exist in the in-memory Map; after a serverless
 *               cold start the Map is empty, so this returns 401 — which is
 *               exactly the broken-session behaviour we want to demonstrate.
 */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const mode = getSessionMode();

  if (mode === "memory") {
    const username = memoryStoreGet(token);
    if (!username) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json({ authenticated: true, username });
  }

  // cookie mode: the existence of a non-empty token is sufficient.
  return NextResponse.json({ authenticated: true, username: "demo" });
}
