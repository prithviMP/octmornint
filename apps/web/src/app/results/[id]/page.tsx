"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { ScoreDonut } from "@/components/ScoreDonut";
import { getResults, ResultsResponse } from "@/lib/api";
import { difficultyLabel, trackLabel } from "@/lib/tracks";

function summaryCopy(results: ResultsResponse): string {
  const wrong = results.items.filter((i) => !i.is_correct);
  if (results.percent >= 80) {
    return `Strong session — ${results.correct}/${results.total} correct (${results.percent}%). Keep drilling ${trackLabel(results.track)} at ${difficultyLabel(results.difficulty)} to stay sharp.`;
  }
  if (wrong.length === 0) {
    return `Perfect score on ${results.total} questions. Ready for a harder tier?`;
  }
  return `You scored ${results.correct}/${results.total} (${results.percent}%). Review the ${wrong.length} miss${wrong.length === 1 ? "" : "es"} below, then retake to lock in the concepts.`;
}

export default function ResultsPage() {
  const params = useParams<{ id: string }>();
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getResults(params.id)
      .then(setResults)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [params.id]);

  if (error) {
    return (
      <AppShell active="history">
        <main className="p-gutter-lg max-w-[1280px] w-full mx-auto">
          <p className="font-body text-body-md text-error mb-gutter-md">{error}</p>
          <Link href="/start" className="font-label text-label-lg text-on-surface underline">
            Try again
          </Link>
        </main>
      </AppShell>
    );
  }

  if (!results) {
    return (
      <AppShell active="history">
        <main className="p-gutter-lg">
          <p className="font-body text-body-md text-on-surface-variant">Loading results…</p>
        </main>
      </AppShell>
    );
  }

  const optionText = (item: ResultsResponse["items"][number], optionId: string | null) => {
    if (!optionId) return "—";
    return item.options.find((o) => o.id === optionId)?.text ?? optionId;
  };

  return (
    <AppShell active="history">
      <main className="flex-1 p-gutter-lg max-w-[1280px] w-full mx-auto flex flex-col gap-gutter-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg items-stretch">
          <section className="lg:col-span-4 bg-card-sky text-on-card-sky rounded-xl p-gutter-lg flex items-center gap-gutter-lg">
            <ScoreDonut
              percent={results.percent}
              sublabel={`${results.correct}/${results.total}`}
            />
            <div className="flex flex-col gap-gutter-xs min-w-0">
              <span className="px-gutter-sm py-0.5 rounded-full bg-primary text-on-primary font-label text-label-sm w-fit">
                {trackLabel(results.track)} · {difficultyLabel(results.difficulty)}
              </span>
              <h1 className="font-headline text-headline-md">Session Complete</h1>
              <p className="font-mono text-mono-sm opacity-80 tabular-nums">
                Score {results.percent}% · Curated Bank
              </p>
            </div>
          </section>

          <section className="lg:col-span-8 bg-surface-container-low border border-outline-variant rounded-xl p-gutter-lg flex flex-col justify-between gap-gutter-md">
            <div className="flex flex-col gap-gutter-xs">
              <div className="flex items-center gap-gutter-sm">
                <Icon name="auto_awesome" />
                <h2 className="font-headline text-title-lg text-on-surface">
                  Session evaluation summary
                </h2>
              </div>
              <p className="font-body text-body-md text-on-surface-variant text-pretty">
                {summaryCopy(results)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-gutter-md">
              <Link
                href={`/start?track=${results.track}`}
                className="inline-flex items-center gap-gutter-sm px-gutter-lg py-gutter-sm bg-accent text-on-accent rounded font-label text-label-lg hover:bg-accent-container"
              >
                Retake Weak Topics
              </Link>
              <Link
                href="/start"
                className="inline-flex items-center gap-gutter-sm px-gutter-lg py-gutter-sm bg-surface-container-low text-on-surface border border-outline-variant rounded font-label text-label-lg hover:bg-surface-container"
              >
                New Interview
              </Link>
            </div>
          </section>
        </div>

        <section className="bg-surface-container-low border border-outline-variant rounded-xl p-gutter-lg flex flex-col gap-gutter-md">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-title-lg text-on-surface">
              Question-by-Question Review
            </h2>
            <span className="font-mono text-mono-sm text-on-surface-variant tabular-nums">
              Showing {results.items.length} items
            </span>
          </div>

          <ul className="flex flex-col gap-gutter-sm">
            {results.items.map((item, i) => (
              <li
                key={item.question_id}
                className="p-gutter-md rounded-md bg-surface-container flex flex-col gap-gutter-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-gutter-md">
                  <div className="flex flex-col gap-gutter-xs min-w-0">
                    <span className="font-body text-title-md text-on-surface">
                      Q{i + 1}. {item.stem}
                    </span>
                    <p className="font-body text-body-sm text-on-surface-variant">
                      Your answer: {optionText(item, item.selected_option_id)}
                      {!item.is_correct
                        ? ` · Correct: ${optionText(item, item.correct_option_id)}`
                        : ""}
                    </p>
                    <p className="font-body text-body-sm text-on-surface-variant text-pretty">
                      {item.explanation}
                    </p>
                  </div>
                  <span
                    className={`px-gutter-sm py-gutter-xs rounded-full font-label text-label-sm shrink-0 h-fit ${
                      item.is_correct
                        ? "bg-success-container text-on-success-container"
                        : "bg-error-container text-on-error-container"
                    }`}
                  >
                    {item.is_correct ? "Correct" : "Review"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </AppShell>
  );
}
