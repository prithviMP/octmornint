const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ? JSON.stringify(body.detail) : detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export type Option = { id: string; text: string };
export type Question = { id: string; stem: string; options: Option[] };

export type CatalogResponse = {
  tracks: {
    id: string;
    label: string;
    difficulties: Record<string, number>;
  }[];
};

export type SessionResponse = {
  id: string;
  track: string;
  difficulty: string;
  status: string;
  question_count: number;
  questions: Question[];
};

export type ResultsResponse = {
  session_id: string;
  track: string;
  difficulty: string;
  status: string;
  total: number;
  correct: number;
  percent: number;
  items: {
    question_id: string;
    stem: string;
    options: Option[];
    selected_option_id: string | null;
    correct_option_id: string;
    is_correct: boolean;
    explanation: string;
  }[];
};

export function getCatalog() {
  return request<CatalogResponse>("/api/v1/catalog");
}

export function createSession(body: {
  track: string;
  difficulty: string;
  question_count: number;
}) {
  return request<SessionResponse>("/api/v1/sessions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getSession(id: string) {
  return request<SessionResponse>(`/api/v1/sessions/${id}`);
}

export function submitSession(
  id: string,
  answers: { question_id: string; selected_option_id: string }[]
) {
  return request<ResultsResponse>(`/api/v1/sessions/${id}/submit`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
}

export function getResults(id: string) {
  return request<ResultsResponse>(`/api/v1/sessions/${id}/results`);
}

export { API_URL };
