"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { store } from "@/lib/store";
import type { AcceptanceCheck } from "@/types";

const DEMO_REQUEST = "Keep users logged in after refreshing the page.";

export default function VerifyPage() {
  const router = useRouter();

  const [featureRequest, setFeatureRequest] =
    useState(DEMO_REQUEST);

  const [target, setTarget] =
    useState<"fail" | "pass">("fail");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    const request = featureRequest.trim();

    if (!request) {
      setError("Describe the feature you want to verify.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          featureRequest: request,
        }),
      });

      const data = (await res.json()) as {
        checks?: AcceptanceCheck[];
        error?: string;
      };

      if (!res.ok || !data.checks) {
        throw new Error(
          data.error ?? "Could not generate checks.",
        );
      }

      store.setInput({
        featureRequest: request,
        target,
      });

      store.setChecks(data.checks);

      router.push("/verify/plan");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-10">

        <header className="space-y-4">
          <a
            href="/"
            className="text-xs font-mono text-[var(--muted)] hover:text-[var(--text)]"
          >
            ← Testloom
          </a>

          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-[var(--muted)]">
              Verify a feature
            </p>

            <h1 className="mt-3 text-4xl font-semibold">
              What should actually work?
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Describe the behavior you expect. Testloom will turn it
              into browser checks before anything runs.
            </p>
          </div>
        </header>

        <section className="space-y-3">
          <label
            htmlFor="feature-request"
            className="text-xs font-mono uppercase tracking-widest text-[var(--muted)]"
          >
            Feature request
          </label>

          <textarea
            id="feature-request"
            value={featureRequest}
            onChange={(event) =>
              setFeatureRequest(event.target.value)
            }
            rows={6}
            maxLength={2000}
            placeholder="Example: Keep users logged in after refreshing the page."
            className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-4 text-sm leading-6 outline-none focus:ring-1 focus:ring-white/30"
          />
        </section>

        <section className="space-y-3">
          <p className="text-xs font-mono uppercase tracking-widest text-[var(--muted)]">
            Target app
          </p>

          <div className="grid gap-3 sm:grid-cols-2">

            <label
              className={`cursor-pointer rounded-xl border p-4 transition ${
                target === "fail"
                  ? "border-red-400/50 bg-red-400/5"
                  : "border-[var(--border)]"
              }`}
            >
              <input
                type="radio"
                name="target"
                value="fail"
                checked={target === "fail"}
                onChange={() => setTarget("fail")}
                className="sr-only"
              />

              <div className="flex items-center justify-between">
                <span className="font-medium">
                  Demo app — broken
                </span>

                <span className="text-xs font-mono text-red-400">
                  FAIL
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                The feature is intentionally broken.
              </p>
            </label>

            <label
              className={`cursor-pointer rounded-xl border p-4 transition ${
                target === "pass"
                  ? "border-emerald-400/50 bg-emerald-400/5"
                  : "border-[var(--border)]"
              }`}
            >
              <input
                type="radio"
                name="target"
                value="pass"
                checked={target === "pass"}
                onChange={() => setTarget("pass")}
                className="sr-only"
              />

              <div className="flex items-center justify-between">
                <span className="font-medium">
                  Demo app — fixed
                </span>

                <span className="text-xs font-mono text-emerald-400">
                  PASS
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                The same feature is working correctly.
              </p>
            </label>

          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-400/5 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="w-full rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Generating checks…" : "Generate checks →"}
        </button>

      </div>
    </main>
  );
}