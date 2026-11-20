"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { SessionListItem } from "@/components/SessionListItem";
import { getHistory, HistoryResponse } from "@/lib/api";
import { getClientToken } from "@/lib/client";

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getClientToken();
    getHistory(50, 0)
      .then(setHistory)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  return (
    <AppShell active="history">
      <main className="flex-1 p-gutter-lg max-w-[1280px] w-full mx-auto flex flex-col gap-gutter-lg">
        <div className="flex flex-wrap items-center justify-between gap-gutter-md">
          <div>
            <h1 className="font-headline text-headline-lg text-on-surface">Interview history</h1>
            <p className="font-body text-body-md text-on-surface-variant mt-gutter-xs">
              Submitted sessions for this browser. History resets if the API database is wiped.
            </p>
          </div>
          <Link
            href="/start"
            className="inline-flex items-center gap-gutter-sm px-gutter-lg py-gutter-sm bg-accent text-on-accent rounded font-label text-label-lg hover:bg-accent-container"
          >
            <Icon name="play_arrow" />
            Start Interview
          </Link>
        </div>

        <section className="bg-surface-container-low border border-outline-variant rounded-xl p-gutter-lg flex flex-col gap-gutter-md">
          {error ? (
            <p className="font-body text-body-md text-error">{error}</p>
          ) : null}

          {!history && !error ? (
            <p className="font-body text-body-md text-on-surface-variant">Loading history…</p>
          ) : null}

          {history && history.items.length === 0 ? (
            <p className="font-body text-body-md text-on-surface-variant">
              No submitted interviews yet.{" "}
              <Link href="/start" className="underline">
                Launch a session
              </Link>{" "}
              to see scores here.
            </p>
          ) : null}

          {history && history.items.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-headline text-title-lg text-on-surface">All sessions</h2>
                <span className="font-mono text-mono-sm text-on-surface-variant tabular-nums">
                  {history.total} total
                </span>
              </div>
              <ul className="flex flex-col gap-gutter-sm">
                {history.items.map((s) => (
                  <SessionListItem key={s.id} session={s} />
                ))}
              </ul>
            </>
          ) : null}
        </section>
      </main>
    </AppShell>
  );
}
