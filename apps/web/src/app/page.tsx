import Link from "next/link";
import { getCatalog } from "@/lib/api";

export default async function HomePage() {
  let tracks: { id: string; label: string }[] = [
    { id: "dsa", label: "DSA" },
    { id: "lld", label: "LLD" },
    { id: "hld", label: "HLD" },
    { id: "fullstack", label: "Full Stack" },
  ];
  let catalogError: string | null = null;

  try {
    const catalog = await getCatalog();
    tracks = catalog.tracks.map((t) => ({ id: t.id, label: t.label }));
  } catch (err) {
    catalogError = err instanceof Error ? err.message : "API unreachable";
  }

  return (
    <main>
      <p className="placeholder-banner">
        Placeholder UI — real design arrives later. Wired to the FastAPI backend.
      </p>
      <h1>Interview Practice</h1>
      <p className="muted">
        Pick a track, set difficulty and count, take MCQs from the question bank,
        get an instant score.
      </p>

      <h2>Tracks</h2>
      <div className="track-list">
        {tracks.map((t) => (
          <span key={t.id}>{t.label}</span>
        ))}
      </div>

      {catalogError ? (
        <p className="error">Catalog unavailable: {catalogError}</p>
      ) : null}

      <Link className="btn" href="/start">
        Start Interview
      </Link>
    </main>
  );
}
