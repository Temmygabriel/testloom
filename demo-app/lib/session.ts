/**
 * session.ts — server-side session store
 *
 * SESSION_MODE=cookie  → no server-side state; auth is carried in an HttpOnly
 *                        cookie that survives browser refresh.
 *
 * SESSION_MODE=memory  → auth token stored in a module-level Map.
 *                        On Vercel, each serverless invocation may get a fresh
 *                        module instance, so the Map is effectively wiped on
 *                        every new request after a refresh — demonstrating the
 *                        broken-session scenario.
 *                        Locally (long-running dev server) the Map persists
 *                        across requests, so you must manually call /api/logout
 *                        or restart the server to reset the broken state.
 */

export type SessionMode = "cookie" | "memory";

export function getSessionMode(): SessionMode {
  return process.env.SESSION_MODE === "cookie" ? "cookie" : "memory";
}

// In-memory store used only when SESSION_MODE=memory.
// This Map lives in the module scope. In a long-running process it persists;
// in a serverless environment it is discarded between cold starts.
const memoryStore = new Map<string, string>(); // token → username

export function memoryStoreSet(token: string, username: string): void {
  memoryStore.set(token, username);
}

export function memoryStoreGet(token: string): string | undefined {
  return memoryStore.get(token);
}

export function memoryStoreDelete(token: string): void {
  memoryStore.delete(token);
}
