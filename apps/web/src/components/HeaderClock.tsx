"use client";

import { useEffect, useState } from "react";

export function HeaderClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!now) {
    return (
      <div className="hidden sm:flex flex-col items-end">
        <span className="font-mono text-mono-md text-on-surface tabular-nums">--:--:--</span>
        <span className="font-body text-body-sm text-on-surface-variant">Loading</span>
      </div>
    );
  }

  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const date = now.toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="hidden sm:flex flex-col items-end">
      <span className="font-mono text-mono-md text-on-surface tabular-nums">{time}</span>
      <span className="font-body text-body-sm text-on-surface-variant">{date}</span>
    </div>
  );
}
