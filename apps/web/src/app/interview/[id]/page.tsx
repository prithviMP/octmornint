"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { McqOption } from "@/components/McqOption";
import { SessionChrome } from "@/components/SessionChrome";
import {
  getSession,
  saveAnswers,
  SessionResponse,
  submitSession,
} from "@/lib/api";
import { difficultyLabel, trackLabel, trackMeta } from "@/lib/tracks";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

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
      .then((s) => {
        if (s.status === "submitted") {
          router.replace(`/results/${s.id}`);
          return;
        }
        setSession(s);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [params.id, router]);

  async function selectAnswer(questionId: string, optionId: string) {
    const next = { ...answers, [questionId]: optionId };
    setAnswers(next);
    try {
      await saveAnswers(params.id, [
        { question_id: questionId, selected_option_id: optionId },
      ]);
    } catch {
      /* best-effort mid-session save */
    }
  }

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

  if (error && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-gutter-lg">
        <p className="font-body text-body-md text-error">{error}</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-gutter-lg">
        <p className="font-body text-body-md text-on-surface-variant">Loading interview…</p>
      </div>
    );
  }

  const question = session.questions[index];
  const total = session.questions.length;
  const meta = trackMeta(session.track);
  const selected = answers[question.id];
  const isLast = index === total - 1;

  return (
    <SessionChrome
      trackLabel={trackLabel(session.track)}
      difficultyLabel={difficultyLabel(session.difficulty)}
      index={index}
      total={total}
      onEnd={() => {
        if (Object.keys(answers).length === total) {
          void onSubmit();
        } else {
          router.push("/start");
        }
      }}
    >
      <article className="bg-surface-container-low border border-outline-variant rounded-xl p-gutter-xl flex flex-col gap-gutter-md">
        <div className="flex flex-wrap items-center justify-between gap-gutter-sm">
          <span
            className={`px-gutter-md py-gutter-xs rounded-full font-label text-label-md ${meta.textClass}`}
          >
            {meta.label}
          </span>
          <span className="inline-flex items-center gap-gutter-xs px-gutter-md py-gutter-xs rounded-full bg-accent-container text-on-accent-container font-label text-label-sm">
            <Icon name="library_books" className="text-body-md" />
            Curated Bank
          </span>
        </div>
        <h1 className="font-headline text-headline-md text-on-surface text-balance">
          {question.stem}
        </h1>
      </article>

      <section className="flex flex-col gap-gutter-sm" aria-label="Answer choices">
        {question.options.map((opt, i) => (
          <McqOption
            key={opt.id}
            letter={LETTERS[i] || String(i + 1)}
            text={opt.text}
            selected={selected === opt.id}
            onSelect={() => selectAnswer(question.id, opt.id)}
          />
        ))}
      </section>

      {error ? <p className="font-body text-body-md text-error">{error}</p> : null}

      <footer className="flex items-center justify-between pt-gutter-sm gap-gutter-md flex-wrap">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          className="inline-flex items-center gap-gutter-sm px-gutter-lg py-gutter-sm bg-surface-container-low text-on-surface border border-outline-variant rounded font-label text-label-lg hover:bg-surface-container disabled:opacity-40"
        >
          Previous
        </button>

        {isLast ? (
          <button
            type="button"
            disabled={submitting}
            onClick={onSubmit}
            className="inline-flex items-center gap-gutter-sm px-gutter-lg py-gutter-sm bg-accent text-on-accent rounded font-label text-label-lg hover:bg-accent-container disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit Interview"}
            <Icon name="check" className="text-title-md" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
            className="inline-flex items-center gap-gutter-sm px-gutter-lg py-gutter-sm bg-accent text-on-accent rounded font-label text-label-lg hover:bg-accent-container"
          >
            Next Question
            <Icon name="arrow_forward" className="text-title-md" />
          </button>
        )}
      </footer>
    </SessionChrome>
  );
}
