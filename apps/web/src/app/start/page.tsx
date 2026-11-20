"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { CatalogResponse, createSession, getCatalog } from "@/lib/api";
import { difficultyLabel, trackLabel, trackMeta } from "@/lib/tracks";

const COUNTS = [5, 10, 15, 20];

function StartPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [track, setTrack] = useState(searchParams.get("track") || "dsa");
  const [difficulty, setDifficulty] = useState("easy");
  const [count, setCount] = useState(5);
  const [engine, setEngine] = useState<"bank" | "grok">("bank");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCatalog()
      .then(setCatalog)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load catalog"));
  }, []);

  useEffect(() => {
    const t = searchParams.get("track");
    if (t) setTrack(t);
  }, [searchParams]);

  const available = useMemo(() => {
    const t = catalog?.tracks.find((x) => x.id === track);
    return t?.difficulties?.[difficulty] ?? 0;
  }, [catalog, track, difficulty]);

  const estMinutes = Math.max(1, Math.round(count * 1.5));

  async function onLaunch() {
    setLoading(true);
    setError(null);
    try {
      const session = await createSession({
        track,
        difficulty,
        question_count: count,
      });
      router.push(`/interview/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
      setLoading(false);
    }
  }

  const trackList =
    catalog?.tracks ??
    ["dsa", "lld", "hld", "fullstack"].map((id) => ({
      id,
      label: trackLabel(id),
      difficulties: {} as Record<string, number>,
    }));

  return (
    <AppShell active="start">
      <main className="flex-1 p-gutter-lg max-w-[1280px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg items-start">
        <div className="lg:col-span-8 flex flex-col gap-gutter-lg">
          <div>
            <h1 className="font-headline text-headline-lg text-on-surface">Configure interview</h1>
            <p className="font-body text-body-md text-on-surface-variant mt-gutter-xs">
              Choose track, difficulty, and question count. Launch when ready.
            </p>
          </div>

          <section className="bg-surface-container-low border border-outline-variant rounded-xl p-gutter-lg flex flex-col gap-gutter-md">
            <h2 className="font-headline text-title-lg text-on-surface">1. Domain</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter-md">
              {trackList.map((t) => {
                const meta = trackMeta(t.id);
                const selected = track === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTrack(t.id)}
                    className={`${meta.cardClass} rounded-xl p-gutter-lg text-left flex flex-col gap-gutter-sm border-2 ${
                      selected ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-gutter-sm">
                      <div>
                        <h3 className="font-headline text-title-lg">{meta.label}</h3>
                        <p className="font-body text-body-sm opacity-80">{meta.subtitle}</p>
                      </div>
                      <Icon
                        name={selected ? "check_circle" : "radio_button_unchecked"}
                        className={`text-title-lg ${selected ? "" : "opacity-40"}`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="bg-surface-container-low border border-outline-variant rounded-xl p-gutter-lg flex flex-col gap-gutter-md">
            <h2 className="font-headline text-title-lg text-on-surface">2. Difficulty</h2>
            <div className="flex flex-wrap gap-gutter-sm">
              {(["easy", "medium", "hard"] as const).map((d) => {
                const selected = difficulty === d;
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setDifficulty(d)}
                    className={`px-gutter-lg py-gutter-sm rounded-full font-label text-label-lg transition-colors duration-state-change ease-state-change ${
                      selected
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high"
                    }`}
                  >
                    {difficultyLabel(d)}
                  </button>
                );
              })}
            </div>
            <p className="font-body text-body-sm text-on-surface-variant">
              Available in bank:{" "}
              <span className="font-mono tabular-nums">{available}</span> questions
            </p>
          </section>

          <section className="bg-surface-container-low border border-outline-variant rounded-xl p-gutter-lg flex flex-col gap-gutter-md">
            <h2 className="font-headline text-title-lg text-on-surface">3. Question count</h2>
            <div className="flex flex-wrap gap-gutter-sm">
              {COUNTS.map((n) => {
                const selected = count === n;
                const disabled = available > 0 && n > available;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={disabled}
                    onClick={() => setCount(n)}
                    className={`px-gutter-lg py-gutter-sm rounded-full font-mono text-mono-sm tabular-nums transition-colors duration-state-change ease-state-change disabled:opacity-40 ${
                      selected
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="bg-surface-container-low border border-outline-variant rounded-xl p-gutter-lg flex flex-col gap-gutter-md">
            <h2 className="font-headline text-title-lg text-on-surface">4. Question source</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter-md">
              <button
                type="button"
                onClick={() => setEngine("bank")}
                className={`rounded-md p-gutter-md text-left border-2 transition-colors duration-state-change ease-state-change ${
                  engine === "bank"
                    ? "bg-accent-container border-primary"
                    : "bg-surface-container border-outline-variant"
                }`}
              >
                <div className="flex items-center gap-gutter-sm mb-gutter-xs">
                  <Icon name="library_books" className="text-title-md" />
                  <span className="font-headline text-title-md">Curated Bank</span>
                </div>
                <p className="font-body text-body-sm text-on-surface-variant">
                  Hardcoded MCQs seeded for each track and difficulty.
                </p>
              </button>
              <button
                type="button"
                disabled
                title="Coming soon"
                className="rounded-md p-gutter-md text-left border-2 bg-surface-container border-outline-variant opacity-50 cursor-not-allowed"
              >
                <div className="flex items-center gap-gutter-sm mb-gutter-xs">
                  <Icon name="auto_awesome" className="text-title-md" />
                  <span className="font-headline text-title-md">Grok AI</span>
                </div>
                <p className="font-body text-body-sm text-on-surface-variant">
                  On-the-fly generation — soon.
                </p>
              </button>
            </div>
          </section>

          {error ? <p className="font-body text-body-md text-error">{error}</p> : null}
        </div>

        <aside className="lg:col-span-4 lg:sticky lg:top-gutter-lg">
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-gutter-lg flex flex-col gap-gutter-md">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-title-lg text-on-surface">Session summary</h2>
              <span className="px-gutter-sm py-gutter-xs rounded-full bg-accent text-on-accent font-label text-label-sm">
                MCQ Only
              </span>
            </div>
            <dl className="flex flex-col gap-gutter-sm font-body text-body-md">
              <div className="flex justify-between gap-gutter-sm">
                <dt className="text-on-surface-variant">Track</dt>
                <dd className="font-label text-label-lg">{trackLabel(track)}</dd>
              </div>
              <div className="flex justify-between gap-gutter-sm">
                <dt className="text-on-surface-variant">Difficulty</dt>
                <dd className="font-label text-label-lg">{difficultyLabel(difficulty)}</dd>
              </div>
              <div className="flex justify-between gap-gutter-sm">
                <dt className="text-on-surface-variant">Questions</dt>
                <dd className="font-mono text-mono-md tabular-nums">{count}</dd>
              </div>
              <div className="flex justify-between gap-gutter-sm">
                <dt className="text-on-surface-variant">Source</dt>
                <dd className="font-label text-label-lg">Curated Bank</dd>
              </div>
              <div className="flex justify-between gap-gutter-sm">
                <dt className="text-on-surface-variant">Est. time</dt>
                <dd className="font-mono text-mono-md tabular-nums">~{estMinutes} min</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={onLaunch}
              disabled={loading || count > available || available === 0}
              className="w-full inline-flex items-center justify-center gap-gutter-sm px-gutter-lg py-gutter-sm bg-accent text-on-accent rounded font-label text-label-lg transition-colors duration-state-change ease-state-change hover:bg-accent-container disabled:opacity-50"
            >
              <Icon name="rocket_launch" />
              <span>{loading ? "Launching…" : "Launch Interview"}</span>
            </button>
            <Link
              href="/"
              className="w-full inline-flex items-center justify-center px-gutter-lg py-gutter-sm bg-surface-container-low text-on-surface border border-outline-variant rounded font-label text-label-lg hover:bg-surface-container"
            >
              Back to dashboard
            </Link>
          </div>
        </aside>
      </main>
    </AppShell>
  );
}

export default function StartPage() {
  return (
    <Suspense
      fallback={
        <AppShell active="start">
          <main className="p-gutter-lg">
            <p className="font-body text-body-md text-on-surface-variant">Loading configurator…</p>
          </main>
        </AppShell>
      }
    >
      <StartPageInner />
    </Suspense>
  );
}
