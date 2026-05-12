import { cookies } from "next/headers";

const DEFAULT_ERPNEXT_URL = process.env.ERPNEXT_URL || process.env.NEXT_PUBLIC_ERPNEXT_URL;
const API_KEY = process.env.ERPNEXT_API_KEY;
const API_SECRET = process.env.ERPNEXT_API_SECRET;

function normaliseUrl(url?: string | null): string {
  return String(url || "").trim().replace(/\/$/, "");
}

function getCookieValue(name: string): string {
  try {
    return cookies().get(name)?.value || "";
  } catch {
    return "";
  }
}

function isAdminRole(role?: string) {
  return role === "admin" || role === "Administrator" || role === "System Manager";
}

function getBaseUrl() {
  const tenantBackend = normaliseUrl(getCookieValue("tenant_backend"));
  if (tenantBackend) return tenantBackend;

  const fallback = normaliseUrl(DEFAULT_ERPNEXT_URL);
  if (!fallback) throw new Error("ERPNEXT_URL is not configured");
  return fallback;
}

function getAuthHeaders(): Record<string, string> {
  const sid = getCookieValue("sid");
  if (sid) return { Cookie: `sid=${sid}` };

  const role = getCookieValue("fuze_role");
  if (isAdminRole(role) && API_KEY && API_SECRET) {
    return { Authorization: `token ${API_KEY}:${API_SECRET}` };
  }

  return {};
}

export async function erpFetch(path: string, options: RequestInit = {}) {
  const baseUrl = getBaseUrl();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  const text = await res.text();

  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { message: text };
  }

  if (!res.ok) {
    const message =
      json?._server_messages ||
      json?.exception ||
      json?.message ||
      "Business Suite request failed";

    throw new Error(String(message));
  }

  return json;
}

export function encodeFilters(filters: any[]) {
  return encodeURIComponent(JSON.stringify(filters));
}

export function encodeFields(fields: string[]) {
  return encodeURIComponent(JSON.stringify(fields));
}
