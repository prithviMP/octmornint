const STORAGE_KEY = "preppulse_client_token";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getClientToken(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const token = uuid();
  window.localStorage.setItem(STORAGE_KEY, token);
  return token;
}

export function ensureClientToken(preferred?: string | null): string {
  if (typeof window === "undefined") return preferred || "";
  if (preferred) {
    window.localStorage.setItem(STORAGE_KEY, preferred);
    return preferred;
  }
  return getClientToken();
}
