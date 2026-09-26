"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { store } from "@/lib/store";
import type { Verification } from "@/types";

export default function RunPage() {
  const router = useRouter();

  const [status, setStatus] = useState<"running" | "done" | "error">(
    "running",
  );

  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    const input = store.getInput();
    const checks = store.getChecks();

    if (!input || !checks) {
      router.replace("/verify");
      return;
    }

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...input,
          checks,
        }),
      });

      const data = (await res.json()) as
        | Verification
        | { error?: string };

      if (!res.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : `HTTP ${res.status}`,
        );
      }

      const verification = data as Verification;

      store.setResult(verification);
      setStatus("done");

      router.push("/verify/result");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Verification failed.",
      );

      setStatus("error");
    }
  }, [router]);

  useEffect(() => {
    run();
  }, [run]);

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col justify-center">

        {status === "running" && (
          <section className="space-y-8">
            <div className="space-y-3">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">
                Live verification
              </p>

              <h1 className="text-4xl font-semibold tracking-tight">
                Testloom is checking the running app.
              </h1>

              <p className="max-w-xl text-sm leading-6 text-white/50">
                A real browser is executing the checks you reviewed.
                This can take a few seconds.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />

                <span className="font-mono text-sm text-white/75">
                  Running browser verification…
                </span>
              </div>
            </div>
          </section>
        )}

        {status === "error" && (
          <section className="space-y-8">
            <div className="space-y-3">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-red-400/70">
                Verification error
              </p>

              <h1 className="text-4xl font-semibold tracking-tight">
                The verification could not finish.
              </h1>

              <p className="text-sm leading-6 text-red-300/80">
                {error ?? "Something went wrong."}
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStatus("running");
                  run();
                }}
                className="rounded-lg bg-white px-5 py-3 text-sm font-medium text-black hover:bg-white/90"
              >
                Try again
              </button>

              <button
                type="button"
                onClick={() => router.push("/verify")}
                className="rounded-lg border border-white/15 px-5 py-3 text-sm text-white/70 hover:text-white"
              >
                Back to verify
              </button>
            </div>
          </section>
        )}

      </div>
    </main>
  );
}