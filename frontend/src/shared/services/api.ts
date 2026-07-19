const API = import.meta.env.VITE_API_URL || "/api/v1";

function getToken(): string {
  return localStorage.getItem("pl_token") || "";
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const raw = await res.text();
    let detail = `HTTP ${res.status}`;
    try {
      const json = JSON.parse(raw);
      detail = json.detail || json.message || detail;
    } catch {
      detail = raw || detail;
    }
    throw new Error(detail);
  }

  if (res.status === 204) return null as T;
  return res.json();
}

export function apiGet<T>(path: string) {
  return apiFetch<T>(path, { method: "GET" });
}

export function apiPost<T>(path: string, body: object) {
  return apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function apiPatch<T>(path: string, body: object) {
  return apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function apiDelete(path: string) {
  return apiFetch<null>(path, { method: "DELETE" });
}

export interface Paginated<T> {
  total: number;
  page: number;
  size: number;
  items: T[];
}
