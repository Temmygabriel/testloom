/**
 * store.ts — client-side state bridge using sessionStorage
 *
 * Passes the Verification result and the parsed AcceptanceChecks between
 * pages without a server round-trip. SSR-safe: all calls are no-ops on the
 * server and during hydration.
 *
 * Keys:
 *   tl_checks    — AcceptanceCheck[] from the parser (Check Plan screen)
 *   tl_result    — Verification from POST /api/verify (Result + Evidence screens)
 *   tl_input     — { featureRequest, target } (preserved across screens)
 */

import type { AcceptanceCheck, Verification } from "@/types";

type VerifyInput = { featureRequest: string; target: "fail" | "pass" };

function safeParse<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or private mode — fail silently
  }
}

export const store = {
  setInput: (v: VerifyInput) => safeSet("tl_input", v),
  getInput: () => safeParse<VerifyInput>("tl_input"),

  setChecks: (v: AcceptanceCheck[]) => safeSet("tl_checks", v),
  getChecks: () => safeParse<AcceptanceCheck[]>("tl_checks"),

  setResult: (v: Verification) => safeSet("tl_result", v),
  getResult: () => safeParse<Verification>("tl_result"),
};
