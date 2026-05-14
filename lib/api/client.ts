export type ApiEnvelope<T> = { success: boolean; message: string; data: T };

function getToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("access_token") || window.localStorage.getItem("fuze_access_token") || "";
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok || json?.success === false) {
    throw new Error(json?.message || json?.error || "Business Suite API request failed");
  }
  return (json?.data ?? json) as T;
}

export function apiGet<T>(path: string) {
  return apiRequest<T>(path);
}

export function apiPost<T>(path: string, body?: Record<string, unknown>) {
  return apiRequest<T>(path, { method: "POST", body: JSON.stringify(body || {}) });
}

export function apiPut<T>(path: string, body?: Record<string, unknown>) {
  return apiRequest<T>(path, { method: "PUT", body: JSON.stringify(body || {}) });
}

export function apiDelete<T>(path: string) {
  return apiRequest<T>(path, { method: "DELETE" });
}
