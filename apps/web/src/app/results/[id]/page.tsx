"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getResults, ResultsResponse } from "@/lib/api";

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
      <main>
        <p className="error">{error}</p>
        <Link href="/start">Try again</Link>
      </main>
    );
  }

  if (!results) {
    return (
      <main>
        <p className="muted">Loading results…</p>
      </main>
    );
  }

  return (
    <main>
      <p className="placeholder-banner">Placeholder results screen</p>
      <h1>Results</h1>
      <p>
        Score: <strong>{results.correct}/{results.total}</strong> ({results.percent}%)
      </p>
      <p className="muted">
        {results.track} · {results.difficulty}
      </p>

      {results.items.map((item, i) => (
        <div className="card" key={item.question_id}>
          <p>
            <strong>Q{i + 1}.</strong> {item.stem}
          </p>
          <p className={item.is_correct ? "" : "error"}>
            {item.is_correct ? "Correct" : "Incorrect"} — you chose{" "}
            {item.selected_option_id ?? "—"}; answer is {item.correct_option_id}
          </p>
          <p className="muted">{item.explanation}</p>
        </div>
      ))}

      <div className="row">
        <Link className="btn" href="/start">
          Try again
        </Link>
        <Link className="btn secondary" href="/">
          Home
        </Link>
      </div>
    </main>
  );
}
