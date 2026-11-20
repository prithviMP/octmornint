"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession, SessionResponse, submitSession } from "@/lib/api";

export default function InterviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getSession(params.id)
      .then(setSession)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [params.id]);

  if (error) {
    return (
      <main>
        <p className="error">{error}</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main>
        <p className="muted">Loading interview…</p>
      </main>
    );
  }

  const question = session.questions[index];
  const total = session.questions.length;

  async function onSubmit() {
    if (!session) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = session.questions
        .filter((q) => answers[q.id])
        .map((q) => ({
          question_id: q.id,
          selected_option_id: answers[q.id],
        }));
      if (payload.length !== session.questions.length) {
        throw new Error("Answer every question before submitting");
      }
      await submitSession(session.id, payload);
      router.push(`/results/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
      setSubmitting(false);
    }
  }

  return (
    <main>
      <p className="placeholder-banner">Placeholder interview room</p>
      <h1>
        {session.track.toUpperCase()} · {session.difficulty}
      </h1>
      <p className="muted">
        Question {index + 1} of {total}
      </p>

      <div className="card">
        <h2 style={{ fontSize: "1.15rem" }}>{question.stem}</h2>
        {question.options.map((opt) => {
          const selected = answers[question.id] === opt.id;
          return (
            <label
              key={opt.id}
              className={`option${selected ? " selected" : ""}`}
            >
              <input
                type="radio"
                name={question.id}
                value={opt.id}
                checked={selected}
                onChange={() =>
                  setAnswers((prev) => ({ ...prev, [question.id]: opt.id }))
                }
                style={{ marginRight: "0.5rem" }}
              />
              {opt.text}
            </label>
          );
        })}
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="row">
        <button
          className="btn secondary"
          type="button"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          Previous
        </button>
        {index < total - 1 ? (
          <button
            className="btn"
            type="button"
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
          >
            Next
          </button>
        ) : (
          <button
            className="btn"
            type="button"
            disabled={submitting}
            onClick={onSubmit}
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        )}
      </div>
    </main>
  );
}
