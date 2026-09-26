"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { store } from "@/lib/store";
import type { Verification } from "@/types";

export default function ResultPage() {
  const [verification, setVerification] =
    useState<Verification | null>(null);

  useEffect(() => {
    setVerification(store.getResult());
  }, []);

  if (!verification) {
    return (
      <main className="min-h-screen px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-semibold">
            No verification result
          </h1>

          <p className="mt-2 text-sm text-[var(--muted)]">
            Run a verification first.
          </p>

          <Link
            href="/verify"
            className="mt-6 inline-block text-sm underline underline-offset-4"
          >
            Start a verification
          </Link>
        </div>
      </main>
    );
  }

  const passed = verification.checks.filter(
    (check) => check.status === "PASS",
  ).length;

  const verdictClass =
    verification.verdict === "PASS"
      ? "text-emerald-400"
      : verification.verdict === "FAIL"
        ? "text-red-400"
        : "text-amber-400";

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-4xl space-y-10">

        <header className="space-y-4">
          <Link
            href="/verify"
            className="text-xs font-mono text-[var(--muted)] hover:text-[var(--text)]"
          >
            ← New verification
          </Link>

          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-[var(--muted)]">
              Verification result
            </p>

            <div className="mt-3 flex flex-wrap items-end gap-4">
              <h1
                className={`text-5xl font-semibold ${verdictClass}`}
              >
                {verification.verdict}
              </h1>

              <p className="pb-1 text-sm text-[var(--muted)]">
                {passed} / {verification.checks.length} checks passed
              </p>
            </div>

            <p className="mt-5 max-w-2xl text-lg">
              {verification.featureRequest}
            </p>
          </div>
        </header>

        <section className="rounded-xl border border-[var(--border)] p-5">
          <p className="text-xs font-mono uppercase tracking-widest text-[var(--muted)]">
            Checks
          </p>

          <div className="mt-4 divide-y divide-[var(--border)]">
            {verification.checks.map((check) => {
              const statusClass =
                check.status === "PASS"
                  ? "text-emerald-400"
                  : check.status === "FAIL"
                    ? "text-red-400"
                    : "text-amber-400";

              return (
                <div
                  key={check.checkId}
                  className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`font-mono text-lg ${statusClass}`}
                    >
                      {check.status === "PASS"
                        ? "✓"
                        : check.status === "FAIL"
                          ? "✕"
                          : "?"}
                    </span>

                    <div>
                      <p className="font-medium">
                        {check.description}
                      </p>

                      <p
                        className={`mt-1 text-xs font-mono ${statusClass}`}
                      >
                        {check.status}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/verify/evidence?checkId=${encodeURIComponent(check.checkId)}`}
                    className="text-sm underline underline-offset-4"
                  >
                    View evidence →
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        <section className="text-xs font-mono text-[var(--muted)]">
          Verification ID: {verification.id}
        </section>

      </div>
    </main>
  );
}