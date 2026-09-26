"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { store } from "@/lib/store";
import type { Verification } from "@/types";

export default function RunPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"running" | "done" | "error">("running");
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    const input = store.getInput();
    if (!input) {
      router.replace("/verify");
      return;
    }

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const verification = await res.json() as Verification;
      store.setResult(verification);
      setStatus("done");
      router.push("/verify/result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
      setStatus("error");
    }
  }, [router]);

  useEffect(() => {
    run();
  }, [run]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
      <div className="max-w-xl w-full space-y-8">

        <div className="space-y-1">
          <a href="/verify" className="text-xs font-mono text-[var(--muted)] hover:text-[var(--text)] transition-colors">
            ← Back
          </a>
          <h1 className="text-2xl font-semibold text-[var(--text)]">Running verification</h1>
        </div>

        {status === "running" && (
          <div className="space-y-6">
            <div className="border border-[var(--border)] rounded-lg p-6 space-y-4">
              {/* Honest loading indicator — no fake steps */}
              <div className="flex items-center gap-3">
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                <span className="text-sm text-[var(--muted)] font-mono">
                  Running checks against the demo app…
                </span>
              </div>
              <p className="text-xs text-[var(--muted)]">
                This may take up to 60 seconds. The browser is executing your checks right now.
              </p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="border border-[var(--fail)] rounded-lg p-6 space-y-4">
            <p className="text-sm font-medium text-[var(--fail)]">Verification failed</p>
            <p className="text-xs text-[var(--muted)]">{error}</p>
            <a
              href="/verify"
              className="inline-block px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text)] hover:border-[var(--muted)] transition-colors"
            >
              ← Try again
            </a>
          </div>
        )}

      </div>
    </main>
  );
}
