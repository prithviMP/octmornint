"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { Icon } from "./Icon";

type SessionChromeProps = {
  trackLabel: string;
  difficultyLabel: string;
  index: number;
  total: number;
  onEnd: () => void;
  children: ReactNode;
};

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function SessionChrome({
  trackLabel,
  difficultyLabel,
  index,
  total,
  onEnd,
  children,
}: SessionChromeProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const progress = total > 0 ? ((index + 1) / total) * 100 : 0;

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface font-body">
      <header className="bg-sidebar text-on-sidebar px-gutter-lg py-gutter-md flex flex-wrap items-center justify-between gap-gutter-md">
        <div className="flex items-center gap-gutter-md">
          <Link
            href="/start"
            className="inline-flex items-center gap-gutter-xs text-sidebar-muted hover:text-on-sidebar font-label text-label-md"
          >
            <Icon name="arrow_back" className="text-title-md" />
            <span>Back to Setup</span>
          </Link>
          <span className="px-gutter-md py-gutter-xs rounded-full bg-sidebar-surface text-accent font-label text-label-md">
            {trackLabel} · {difficultyLabel}
          </span>
        </div>

        <div className="flex items-center gap-gutter-lg flex-wrap">
          <div className="flex items-center gap-gutter-sm">
            <span className="font-mono text-mono-md text-on-sidebar tabular-nums">
              Question {index + 1} / {total}
            </span>
            <div className="w-32 h-2 rounded-full bg-sidebar-surface overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-state-change ease-state-change"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-gutter-xs px-gutter-md py-gutter-xs rounded-full bg-sidebar-surface">
            <Icon name="timer" className="text-accent text-title-md" />
            <span className="font-mono text-mono-md text-on-sidebar tabular-nums">
              {formatElapsed(elapsed)}
            </span>
          </div>
          <button
            type="button"
            onClick={onEnd}
            className="px-gutter-md py-gutter-xs rounded bg-error-container text-on-error-container font-label text-label-md hover:opacity-90"
          >
            End Session
          </button>
        </div>
      </header>

      <main className="flex-1 p-gutter-lg max-w-4xl w-full mx-auto flex flex-col gap-gutter-lg">
        {children}
      </main>
    </div>
  );
}
