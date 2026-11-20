import { ensureClientToken, getClientToken } from "./client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(
  path: string,
  init?: RequestInit & { clientToken?: boolean }
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  if (init?.clientToken !== false && typeof window !== "undefined") {
    const token = getClientToken();
    if (token) headers["X-Client-Token"] = token;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
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
  client_token: string;
  track: string;
  difficulty: string;
  status: string;
  question_count: number;
  source?: "bank" | "groq";
  generation_fallback?: boolean;
  questions: Question[];
};

export type SessionSummary = {
  id: string;
  track: string;
  difficulty: string;
  question_count: number;
  score_correct: number | null;
  score_total: number | null;
  percent: number | null;
  status: string;
  submitted_at: string | null;
  created_at: string;
};

export type DashboardResponse = {
  recent: SessionSummary[];
  sessions_this_week: number;
  overall_percent: number;
  total_correct: number;
  total_questions: number;
  ready_label: string;
};

export type HistoryResponse = {
  items: SessionSummary[];
  total: number;
  limit: number;
  offset: number;
};

export type ResultsResponse = {
  session_id: string;
  track: string;
  difficulty: string;
  status: string;
  total: number;
  correct: number;
  percent: number;
  source?: "bank" | "groq";
  coach_summary?: string | null;
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
  return request<CatalogResponse>("/api/v1/catalog", { clientToken: false });
}

export function getDashboard() {
  return request<DashboardResponse>("/api/v1/dashboard");
}

export function getHistory(limit = 20, offset = 0) {
  return request<HistoryResponse>(`/api/v1/history?limit=${limit}&offset=${offset}`);
}

export async function createSession(body: {
  track: string;
  difficulty: string;
  question_count: number;
  mode?: "bank" | "groq";
}) {
  const session = await request<SessionResponse>("/api/v1/sessions", {
    method: "POST",
    body: JSON.stringify(body),
  });
  ensureClientToken(session.client_token);
  return session;
}

export function getSession(id: string) {
  return request<SessionResponse>(`/api/v1/sessions/${id}`, { clientToken: false });
}

export function saveAnswers(
  id: string,
  answers: { question_id: string; selected_option_id: string }[]
) {
  return request<{ ok: boolean }>(`/api/v1/sessions/${id}/answers`, {
    method: "PUT",
    body: JSON.stringify({ answers }),
    clientToken: false,
  });
}

export function submitSession(
  id: string,
  answers: { question_id: string; selected_option_id: string }[]
) {
  return request<ResultsResponse>(`/api/v1/sessions/${id}/submit`, {
    method: "POST",
    body: JSON.stringify({ answers }),
    clientToken: false,
  });
}

export function getResults(id: string) {
  return request<ResultsResponse>(`/api/v1/sessions/${id}/results`, {
    clientToken: false,
  });
}

export { API_URL };
