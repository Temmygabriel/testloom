import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { memoryStoreDelete } from "@/lib/session";

const COOKIE_NAME = "session_token";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    // Clean up memory store if present (no-op in cookie mode)
    memoryStoreDelete(token);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
