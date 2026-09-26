import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
      <div className="max-w-xl w-full space-y-10">

        {/* Wordmark */}
        <p className="text-xs font-mono tracking-widest uppercase text-[var(--muted)]">
          Testloom
        </p>

        {/* Headline */}
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight leading-tight text-[var(--text)]">
            Did the feature<br />actually work?
          </h1>
          <p className="text-base text-[var(--muted)] leading-relaxed max-w-sm">
            Turn a feature request into real browser checks
            and inspect exactly what happened.
          </p>
        </div>

        {/* Example */}
        <div className="border border-[var(--border)] rounded-lg p-4 space-y-1">
          <p className="text-xs font-mono text-[var(--muted)] uppercase tracking-wider">
            Example
          </p>
          <p className="text-sm text-[var(--text)] font-mono">
            Keep users logged in after refreshing the page.
          </p>
        </div>

        {/* CTA */}
        <Link
          href="/verify"
          className="inline-block px-6 py-3 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Verify a feature →
        </Link>

      </div>
    </main>
  );
}
