import Link from "next/link";
import {
  difficultyLabel,
  formatRelativeSessionTime,
  trackLabel,
  trackMeta,
} from "@/lib/tracks";
import { SessionSummary } from "@/lib/api";
import { Icon } from "./Icon";

type SessionListItemProps = {
  session: SessionSummary;
};

export function SessionListItem({ session }: SessionListItemProps) {
  const meta = trackMeta(session.track);
  const score =
    session.score_correct != null && session.score_total != null
      ? `${session.score_correct}/${session.score_total}`
      : "—";
  const pct = session.percent ?? 0;
  const chipClass =
    pct >= 70
      ? "bg-success-container text-on-success-container"
      : "bg-warning-container text-on-warning-container";

  return (
    <li className="flex items-center justify-between gap-gutter-sm p-gutter-sm rounded-md bg-surface-container">
      <div className="flex items-center gap-gutter-sm min-w-0">
        <span
          className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${meta.textClass}`}
        >
          <Icon name={meta.icon === "data_array" ? "code" : meta.icon} className="text-title-md" />
        </span>
        <div className="flex flex-col min-w-0">
          <span className="font-body text-label-lg text-on-surface">
            {trackLabel(session.track)} · {difficultyLabel(session.difficulty)}
          </span>
          <span className="font-body text-body-sm text-on-surface-variant tabular-nums">
            {session.question_count} MCQs ·{" "}
            {formatRelativeSessionTime(session.submitted_at || session.created_at)}
          </span>
        </div>
      </div>
      <Link
        href={`/results/${session.id}`}
        className={`px-gutter-sm py-gutter-xs rounded-full font-mono text-mono-sm tabular-nums shrink-0 ${chipClass}`}
      >
        {score}
      </Link>
    </li>
  );
}
