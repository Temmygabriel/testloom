import Link from "next/link";

const demoSteps = [
  { label: "Login succeeds", status: "PASS" },
  { label: "Session is established", status: "PASS" },
  { label: "Browser refreshes", status: "PASS" },
  { label: "Session survives refresh", status: "FAIL" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 sm:px-10">
        {/* Header */}
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight"
          >
            Testloom
          </Link>

          <span className="font-mono text-xs text-white/40">
            BEHAVIOR VERIFICATION
          </span>
        </header>

        {/* Hero */}
        <section className="grid flex-1 items-center gap-16 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
          <div className="max-w-2xl">
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.22em] text-white/40">
              For AI-built software
            </p>

            <h1 className="text-5xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Did the feature
              <br />
              actually work?
            </h1>

            <p className="mt-7 max-w-xl text-base leading-7 text-white/55 sm:text-lg">
              Testloom turns a feature request into real browser checks,
              runs them against the live app, and shows you what actually
              happened.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/verify"
                className="inline-flex items-center rounded-lg bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90"
              >
                Verify a feature
                <span className="ml-2">→</span>
              </Link>

              <span className="font-mono text-xs text-white/35">
                No code review. Real browser evidence.
              </span>
            </div>
          </div>

          {/* Demo proof panel */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#080808] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-white/25" />
                  <span className="font-mono text-xs text-white/40">
                    verification
                  </span>
                </div>

                <span className="font-mono text-[11px] text-white/30">
                  live run
                </span>
              </div>

              <div className="space-y-7 p-6 sm:p-7">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/30">
                    Requirement
                  </p>

                  <p className="mt-3 text-base leading-6 text-white/90">
                    Keep users logged in after refreshing the page.
                  </p>
                </div>

                <div className="h-px bg-white/10" />

                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/30">
                    Browser checks
                  </p>

                  <div className="mt-4 space-y-3">
                    {demoSteps.map((step) => (
                      <div
                        key={step.label}
                        className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.025] px-3 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`font-mono text-xs ${
                              step.status === "FAIL"
                                ? "text-red-400"
                                : "text-emerald-400"
                            }`}
                          >
                            {step.status === "FAIL" ? "×" : "✓"}
                          </span>

                          <span className="text-sm text-white/75">
                            {step.label}
                          </span>
                        </div>

                        <span
                          className={`font-mono text-[10px] uppercase ${
                            step.status === "FAIL"
                              ? "text-red-400/80"
                              : "text-emerald-400/70"
                          }`}
                        >
                          {step.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-red-400/20 bg-red-400/[0.04] p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-widest text-red-300/80">
                      Evidence
                    </span>

                    <span className="font-mono text-xs text-red-300">
                      FAIL
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-white/65">
                    The browser refreshed and returned to the login page.
                  </p>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-white/[0.015] blur-3xl" />
          </div>
        </section>

        {/* Bottom explanation */}
        <section className="border-t border-white/10 py-7">
          <div className="grid gap-6 text-sm sm:grid-cols-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-white/30">
                01
              </p>
              <p className="mt-2 text-white/65">
                Describe what the feature should do.
              </p>
            </div>

            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-white/30">
                02
              </p>
              <p className="mt-2 text-white/65">
                Testloom turns it into executable browser checks.
              </p>
            </div>

            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-white/30">
                03
              </p>
              <p className="mt-2 text-white/65">
                See the actual result and the evidence behind it.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}