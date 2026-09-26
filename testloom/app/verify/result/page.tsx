"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { store } from "@/lib/store";
import type { CheckResult, Verification } from "@/types";

type Props = {
  params: {
    checkId: string;
  };
};

export default function EvidencePage({ params }: Props) {
  const [verification, setVerification] = useState<Verification | null>(null);
  const [check, setCheck] = useState<CheckResult | null>(null);

  useEffect(() => {
    const result = store.getResult();

    setVerification(result);

    if (!result) return;

    const found = result.checks.find(
      (item) => item.checkId === decodeURIComponent(params.checkId),
    );

    setCheck(found ?? null);
  }, [params.checkId]);

  if (!verification) {
    return (
      <main className="min-h-screen px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-semibold">
            No verification result
          </h1>

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

  if (!check) {
    return (
      <main className="min-h-screen px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-semibold">
            Evidence not found
          </h1>

          <Link
            href="/verify/result"
            className="mt-6 inline-block text-sm underline underline-offset-4"
          >
            ← Back to result
          </Link>
        </div>
      </main>
    );
  }

  const statusClass =
    check.status === "PASS"
      ? "text-emerald-400"
      : check.status === "FAIL"
        ? "text-red-400"
        : "text-amber-400";

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-5xl space-y-10">

        <header className="space-y-4">
          <Link
            href="/verify/result"
            className="text-xs font-mono text-[var(--muted)] hover:text-[var(--text)]"
          >
            ← Back to result
          </Link>

          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-[var(--muted)]">
              Evidence
            </p>

            <div className="mt-3 flex items-center gap-3">
              <h1 className="text-3xl font-semibold">
                {check.description}
              </h1>

              <span className={`text-sm font-mono ${statusClass}`}>
                {check.status}
              </span>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] p-5">
            <p className="text-xs font-mono uppercase tracking-widest text-[var(--muted)]">
              What we expected
            </p>

            <p className="mt-4 text-sm leading-6">
              {check.expected}
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border)] p-5">
            <p className="text-xs font-mono uppercase tracking-widest text-[var(--muted)]">
              What the app did
            </p>

            <p className="mt-4 text-sm leading-6">
              {check.observed}
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border)] p-5">
            <p className="text-xs font-mono uppercase tracking-widest text-[var(--muted)]">
              What the check observed
            </p>

            <p className={`mt-4 text-sm leading-6 ${statusClass}`}>
              {check.status}
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-[var(--muted)]">
              Browser evidence
            </p>
          </div>

          {check.evidence.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-8">
              <p className="text-sm text-[var(--muted)]">
                No screenshot was stored for this check.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {check.evidence.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-xl border border-[var(--border)]"
                >
                  <img
                    src={url}
                    alt={`Evidence screenshot for ${check.description}`}
                    className="w-full"
                  />
                </a>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-[var(--muted)]">
              Action timeline
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border)]">
            {check.actionLog.length === 0 ? (
              <p className="p-6 text-sm text-[var(--muted)]">
                No action log was recorded.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {check.actionLog.map((entry, index) => (
                  <div
                    key={`${entry.timestamp}-${index}`}
                    className="grid gap-3 p-4 sm:grid-cols-[150px_110px_1fr]"
                  >
                    <span className="text-xs font-mono text-[var(--muted)]">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>

                    <span className="text-xs font-mono">
                      {entry.actionType}
                    </span>

                    <div className="min-w-0">
                      {entry.selector && (
                        <p className="break-all text-xs font-mono text-[var(--muted)]">
                          {entry.selector}
                        </p>
                      )}

                      <p className="mt-1 text-sm">
                        {entry.outcome}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}