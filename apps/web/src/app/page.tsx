"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { ScoreDonut } from "@/components/ScoreDonut";
import { SessionListItem } from "@/components/SessionListItem";
import {
  CatalogResponse,
  DashboardResponse,
  getCatalog,
  getDashboard,
} from "@/lib/api";
import { getClientToken } from "@/lib/client";
import { TRACK_META, trackMeta } from "@/lib/tracks";

export default function HomePage() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getClientToken();
    Promise.all([
      getCatalog(),
      getDashboard().catch(() => null),
    ])
      .then(([cat, dash]) => {
        setCatalog(cat);
        setDashboard(dash);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  const tracks = catalog?.tracks ?? [
    { id: "dsa", label: "DSA", difficulties: {} },
    { id: "lld", label: "LLD", difficulties: {} },
    { id: "hld", label: "HLD", difficulties: {} },
    { id: "fullstack", label: "Full Stack", difficulties: {} },
  ];

  return (
    <AppShell active="dashboard">
      <main className="flex-1 p-gutter-lg max-w-[1280px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg items-start">
        <div className="lg:col-span-8 flex flex-col gap-gutter-lg">
          <section className="bg-surface-container-low border border-outline-variant rounded-xl p-gutter-lg flex flex-col sm:flex-row sm:items-center justify-between gap-gutter-md">
            <div className="flex flex-col gap-gutter-xs max-w-xl">
              <h1 className="font-headline text-headline-lg text-on-surface text-balance">
                Practice technical interviews with instant feedback
              </h1>
              <p className="font-body text-body-md text-on-surface-variant text-pretty">
                Pick a domain, set Easy, Medium, or Hard difficulty, and test yourself with
                curated MCQs from the PrepPulse question bank.
              </p>
            </div>
            <Link
              href="/start"
              className="inline-flex items-center justify-center gap-gutter-sm px-gutter-lg py-gutter-sm bg-accent text-on-accent rounded font-label text-label-lg shrink-0 transition-colors duration-state-change ease-state-change hover:bg-accent-container"
            >
              <Icon name="play_arrow" />
              <span>Start Interview</span>
            </Link>
          </section>

          {error ? (
            <p className="font-body text-body-md text-error">Catalog unavailable: {error}</p>
          ) : null}

          <section className="flex flex-col gap-gutter-md">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-title-lg text-on-surface">
                Choose an interview track
              </h2>
              <Link
                href="/start"
                className="font-label text-label-md text-on-surface-variant hover:text-on-surface"
              >
                Custom setup →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter-md items-stretch">
              {tracks.map((t) => {
                const meta = trackMeta(t.id);
                const count = Object.values(t.difficulties || {}).reduce((a, b) => a + b, 0);
                const tiers = Object.keys(t.difficulties || {}).length || 3;
                return (
                  <article
                    key={t.id}
                    className={`${meta.cardClass} rounded-xl p-gutter-lg flex flex-col justify-between gap-gutter-md h-full`}
                  >
                    <header className="flex items-start justify-between gap-gutter-sm">
                      <div>
                        <h3 className="font-headline text-title-lg">{meta.label}</h3>
                        <p className="font-body text-body-sm opacity-80">{meta.subtitle}</p>
                      </div>
                      <span className="w-9 h-9 rounded bg-primary text-on-primary flex items-center justify-center shrink-0">
                        <Icon name={meta.icon} className="text-title-md" />
                      </span>
                    </header>
                    <div className="flex items-center justify-between pt-gutter-sm">
                      <span className="font-mono text-mono-sm tabular-nums">
                        {count} MCQs · {tiers} Tiers
                      </span>
                      <Link
                        href={`/start?track=${t.id}`}
                        className="px-gutter-md py-gutter-xs rounded-full bg-primary text-on-primary font-label text-label-md hover:bg-sidebar-surface"
                      >
                        Start
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="bg-surface-container-low border border-outline-variant rounded-xl p-gutter-lg flex flex-col gap-gutter-md">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-title-lg text-on-surface">How your session works</h2>
              <span className="px-gutter-sm py-gutter-xs rounded-full bg-accent-container text-on-accent-container font-label text-label-sm">
                MCQ · Bank
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter-md">
              {[
                {
                  step: "Step 1",
                  title: "Configure track",
                  body: "Select DSA, LLD, HLD, or Full Stack with Easy, Medium, or Hard difficulty.",
                },
                {
                  step: "Step 2",
                  title: "Answer MCQs",
                  body: "Work through curated bank questions one at a time with progress and a session timer.",
                },
                {
                  step: "Step 3",
                  title: "Review results",
                  body: "Get an instant score, correct answers, and explanations for every miss.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="p-gutter-md rounded-md bg-surface-container flex flex-col gap-gutter-xs"
                >
                  <span className="font-mono text-mono-sm text-on-surface-variant">{item.step}</span>
                  <h3 className="font-headline text-title-md text-on-surface">{item.title}</h3>
                  <p className="font-body text-body-sm text-on-surface-variant">{item.body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-gutter-lg">
          <section className="bg-surface-container-low border border-outline-variant rounded-xl p-gutter-lg flex flex-col gap-gutter-md">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="font-headline text-title-lg text-on-surface">Recent Interviews</h2>
                <p className="font-body text-body-sm text-on-surface-variant">
                  {dashboard
                    ? `${dashboard.sessions_this_week} session${dashboard.sessions_this_week === 1 ? "" : "s"} completed this week`
                    : "Loading your history…"}
                </p>
              </div>
              <Link
                href="/history"
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-accent hover:text-on-accent"
                aria-label="View all history"
              >
                <Icon name="arrow_outward" className="text-title-md" />
              </Link>
            </header>

            {dashboard?.recent?.length ? (
              <ul className="flex flex-col gap-gutter-sm">
                {dashboard.recent.map((s) => (
                  <SessionListItem key={s.id} session={s} />
                ))}
              </ul>
            ) : (
              <p className="font-body text-body-sm text-on-surface-variant p-gutter-sm">
                No interviews yet. Start your first session to build readiness stats.
              </p>
            )}
          </section>

          <section className="bg-card-sky text-on-card-sky rounded-xl p-gutter-lg flex flex-col gap-gutter-md">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-title-lg">Readiness</h2>
              <span className="font-label text-label-sm opacity-80">
                {dashboard?.ready_label ?? "—"}
              </span>
            </div>
            <div className="flex items-center gap-gutter-md">
              <ScoreDonut
                percent={dashboard?.overall_percent ?? 0}
                sublabel={
                  dashboard && dashboard.total_questions > 0
                    ? `${dashboard.total_correct}/${dashboard.total_questions}`
                    : "0/0"
                }
              />
              <div className="flex flex-col gap-gutter-xs">
                <p className="font-body text-body-sm opacity-90">
                  Aggregate accuracy across submitted sessions on this device.
                </p>
                <p className="font-mono text-mono-sm tabular-nums opacity-75">
                  Tracks: {Object.keys(TRACK_META).length}
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
