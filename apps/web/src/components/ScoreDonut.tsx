type ScoreDonutProps = {
  percent: number;
  label?: string;
  sublabel?: string;
  className?: string;
  textClassName?: string;
};

export function ScoreDonut({
  percent,
  label,
  sublabel,
  className = "w-32 h-32",
  textClassName = "text-on-card-sky",
}: ScoreDonutProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const circumference = 2 * Math.PI * 38;
  const dash = (clamped / 100) * circumference;

  return (
    <div className={`relative shrink-0 flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full -rotate-90"
        aria-label={`${clamped} percent`}
      >
        <circle cx="50" cy="50" r="38" fill="none" stroke="#1C2024" strokeWidth="18" />
        <circle
          cx="50"
          cy="50"
          r="38"
          fill="none"
          stroke="#9AE647"
          strokeWidth="18"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="butt"
        />
      </svg>
      <div className={`absolute inset-0 flex flex-col items-center justify-center ${textClassName}`}>
        <span className="font-mono text-headline-md tabular-nums">
          {label ?? `${clamped}%`}
        </span>
        {sublabel ? (
          <span className="font-mono text-mono-sm opacity-75 tabular-nums">{sublabel}</span>
        ) : null}
      </div>
    </div>
  );
}
