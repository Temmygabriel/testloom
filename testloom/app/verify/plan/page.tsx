"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { store } from "@/lib/store";
import type { AcceptanceCheck } from "@/types";

export default function PlanPage() {
  const router = useRouter();
  const [checks, setChecks] = useState<AcceptanceCheck[]>([]);

  useEffect(() => {
    const savedChecks = store.getChecks();

    if (!savedChecks) {
      router.replace("/verify");
      return;
    }

    setChecks(savedChecks);
  }, [router]);

  function updateDescription(id: string, description: string) {
    setChecks((current) =>
      current.map((check) =>
        check.id === id
          ? { ...check, description }
          : check,
      ),
    );
  }

  function handleRun() {
    store.setChecks(checks);
    router.push("/verify/run");
  }

  if (checks.length === 0) {
    return (
      <main className="min-h-screen px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm text-[var(--muted)]">
            Preparing your checks…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-4xl space-y-8">

        <header className="space-y-3">
          <Link
            href="/verify"
            className="text-xs font-mono text-[var(--muted)] hover:text-[var(--text)]"
          >
            ← Back
          </Link>

          <p className="text-xs font-mono uppercase tracking-widest text-[var(--muted)]">
            Check plan
          </p>

          <h1 className="text-4xl font-semibold">
            Here’s how Testloom will verify it.
          </h1>

          <p className="text-sm text-[var(--muted)]">
            Review the checks before the browser runs them.
          </p>
        </header>

        <section className="space-y-4">
          {checks.map((check, index) => (
            <article
              key={check.id}
              className="rounded-xl border border-[var(--border)] p-5"
            >
              <div className="flex gap-4">

                <div className="shrink-0 text-xs font-mono text-[var(--muted)]">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="min-w-0 flex-1 space-y-4">

                  <div>
                    <label
                      htmlFor={`description-${check.id}`}
                      className="text-xs font-mono uppercase tracking-widest text-[var(--muted)]"
                    >
                      Check
                    </label>

                    <input
                      id={`description-${check.id}`}
                      value={check.description}
                      onChange={(event) =>
                        updateDescription(
                          check.id,
                          event.target.value,
                        )
                      }
                      className="mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-white/30"
                    />
                  </div>

                  <div>
                    <p className="text-xs font-mono uppercase tracking-widest text-[var(--muted)]">
                      Steps
                    </p>

                    <div className="mt-2 space-y-2">
                      {check.steps.map((step, stepIndex) => (
                        <div
                          key={`${check.id}-${stepIndex}`}
                          className="rounded-lg bg-white/[0.03] px-3 py-2 text-xs font-mono"
                        >
                          <span className="text-[var(--muted)]">
                            {stepIndex + 1}.
                          </span>{" "}
                          <span>{step.type}</span>

                          {step.selector && (
                            <span className="text-[var(--muted)]">
                              {" "}
                              {step.selector}
                            </span>
                          )}

                          {step.value !== undefined && (
                            <span className="text-[var(--muted)]">
                              {" "}
                              → {step.value}
                            </span>
                          )}

                          {step.expectedText && (
                            <span className="text-[var(--muted)]">
                              {" "}
                              → “{step.expectedText}”
                            </span>
                          )}

                          {step.expectedUrl && (
                            <span className="text-[var(--muted)]">
                              {" "}
                              → {step.expectedUrl}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </article>
          ))}
        </section>

        <button
          type="button"
          onClick={handleRun}
          className="w-full rounded-lg border border-white/20 bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90"
        >
          Run checks →
        </button>

      </div>
    </main>
  );
}