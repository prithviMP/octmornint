"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CatalogResponse, createSession, getCatalog } from "@/lib/api";

export default function StartPage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [track, setTrack] = useState("dsa");
  const [difficulty, setDifficulty] = useState("easy");
  const [count, setCount] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCatalog()
      .then(setCatalog)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load catalog"));
  }, []);

  const available = useMemo(() => {
    const t = catalog?.tracks.find((x) => x.id === track);
    return t?.difficulties?.[difficulty] ?? 0;
  }, [catalog, track, difficulty]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
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

  return (
    <main>
      <p className="placeholder-banner">Placeholder config screen</p>
      <h1>Configure interview</h1>
      <p className="muted">
        Available for {track} / {difficulty}: {available} questions
      </p>

      <form className="card" onSubmit={onSubmit}>
        <label htmlFor="track">Track</label>
        <select
          id="track"
          value={track}
          onChange={(e) => setTrack(e.target.value)}
        >
          {(catalog?.tracks || [
            { id: "dsa", label: "DSA" },
            { id: "lld", label: "LLD" },
            { id: "hld", label: "HLD" },
            { id: "fullstack", label: "Full Stack" },
          ]).map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>

        <label htmlFor="difficulty">Difficulty</label>
        <select
          id="difficulty"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <label htmlFor="count">Question count</label>
        <input
          id="count"
          type="number"
          min={1}
          max={20}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
        />

        {error ? <p className="error">{error}</p> : null}

        <div className="row">
          <button className="btn" type="submit" disabled={loading || count > available}>
            {loading ? "Starting…" : "Begin"}
          </button>
          <Link className="btn secondary" href="/">
            Back
          </Link>
        </div>
      </form>
    </main>
  );
}
