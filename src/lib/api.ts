/**
 * Django REST API client for Territory Watch Japan.
 * Set NEXT_PUBLIC_API_URL in .env.local to override (e.g. http://localhost:8000).
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    let message = text || `HTTP ${res.status}`;
    if (res.headers.get("content-type")?.includes("application/json")) {
      try {
        const j = JSON.parse(text) as Record<string, unknown>;
        if (typeof j.error_message === "string") message = j.error_message;
        else if (typeof j.detail === "string") message = j.detail;
        else if (Array.isArray(j.detail)) message = (j.detail[0] as string) ?? message;
        else if (Array.isArray(j.non_field_errors) && j.non_field_errors.length)
          message = j.non_field_errors[0] as string;
        else if (typeof j.detail === "object" && j.detail !== null) {
          const first = Object.values(j.detail as object)[0];
          message = Array.isArray(first) ? (first[0] as string) : String(first);
        } else {
          const firstKey = Object.keys(j).find((k) => Array.isArray(j[k]));
          if (firstKey && Array.isArray(j[firstKey]) && (j[firstKey] as string[])[0])
            message = (j[firstKey] as string[])[0];
        }
      } catch {
        /* use message as-is */
      }
    }
    throw new Error(message);
  }
  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) return res.json() as Promise<T>;
  return undefined as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
  });
  return handleResponse<T>(res);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
}
