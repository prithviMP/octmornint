export type TrackMeta = {
  id: string;
  label: string;
  subtitle: string;
  icon: string;
  cardClass: string;
  textClass: string;
};

export const TRACK_META: Record<string, TrackMeta> = {
  dsa: {
    id: "dsa",
    label: "DSA & Algorithms",
    subtitle: "Arrays, Trees, Graphs, DP",
    icon: "data_array",
    cardClass: "bg-card-amber text-on-card-amber",
    textClass: "bg-card-amber text-on-card-amber",
  },
  lld: {
    id: "lld",
    label: "Low-Level Design",
    subtitle: "SOLID, Patterns, Concurrency",
    icon: "schema",
    cardClass: "bg-card-sky text-on-card-sky",
    textClass: "bg-card-sky text-on-card-sky",
  },
  hld: {
    id: "hld",
    label: "High-Level Design",
    subtitle: "Sharding, Caching, Queues",
    icon: "hub",
    cardClass: "bg-card-lavender text-on-card-lavender",
    textClass: "bg-card-lavender text-on-card-lavender",
  },
  fullstack: {
    id: "fullstack",
    label: "Full Stack Web",
    subtitle: "React, Node.js, SQL, Auth",
    icon: "layers",
    cardClass: "bg-card-mint text-on-card-mint",
    textClass: "bg-card-mint text-on-card-mint",
  },
};

export function trackMeta(id: string): TrackMeta {
  return (
    TRACK_META[id] || {
      id,
      label: id.toUpperCase(),
      subtitle: "Interview track",
      icon: "bolt",
      cardClass: "bg-card-sky text-on-card-sky",
      textClass: "bg-card-sky text-on-card-sky",
    }
  );
}

export function trackLabel(id: string): string {
  const map: Record<string, string> = {
    dsa: "DSA",
    lld: "LLD",
    hld: "HLD",
    fullstack: "Full Stack",
  };
  return map[id] || id.toUpperCase();
}

export function difficultyLabel(d: string): string {
  return d.charAt(0).toUpperCase() + d.slice(1);
}

export function formatRelativeSessionTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startToday.getTime() - startThat.getTime()) / 86400000);

  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  if (dayDiff === 0) return `Today, ${time}`;
  if (dayDiff === 1) return "Yesterday";
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}
