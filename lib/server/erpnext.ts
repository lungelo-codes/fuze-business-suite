import { cookies } from "next/headers";

const DEFAULT_ERPNEXT_URL = process.env.ERPNEXT_URL || process.env.NEXT_PUBLIC_ERPNEXT_URL;
const ERPNEXT_API_KEY = process.env.ERPNEXT_API_KEY;
const ERPNEXT_API_SECRET = process.env.ERPNEXT_API_SECRET;

const SESSION_COOKIE = "sid";
const TENANT_BACKEND_COOKIE = "tenant_backend";
const ROLE_COOKIE = "fuze_role";

export class BusinessSuiteError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "BusinessSuiteError";
    this.status = status;
  }
}

function normaliseUrl(url?: string | null): string {
  return String(url || "").trim().replace(/\/$/, "");
}

function isAdminRole(role?: string) {
  return role === "admin" || role === "Administrator" || role === "System Manager";
}

function getCookieValue(name: string): string {
  try {
    return cookies().get(name)?.value || "";
  } catch {
    return "";
  }
}

function getRuntimeBackendUrl(): string {
  const tenantBackend = normaliseUrl(getCookieValue(TENANT_BACKEND_COOKIE));
  if (tenantBackend) return tenantBackend;

  const fallback = normaliseUrl(DEFAULT_ERPNEXT_URL);
  if (!fallback) throw new BusinessSuiteError("Missing ERPNEXT_URL");
  return fallback;
}

function authHeaders(): HeadersInit {
  const sid = getCookieValue(SESSION_COOKIE);
  if (sid) return { Cookie: `sid=${sid}` };

  const role = getCookieValue(ROLE_COOKIE);
  if (isAdminRole(role) && ERPNEXT_API_KEY && ERPNEXT_API_SECRET) {
    return { Authorization: `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}` };
  }

  return {};
}

export interface ERPListResponse<T> {
  data?: T[];
  message?: T[];
}

export interface ERPDocumentResponse<T> {
  data?: T;
  message?: T;
}

function encodeFields(fields?: string[]): string {
  return fields ? `fields=${encodeURIComponent(JSON.stringify(fields))}` : "";
}

function encodeFilters(filters?: unknown[]): string {
  return filters ? `filters=${encodeURIComponent(JSON.stringify(filters))}` : "";
}

export function resourceListPath(
  doctype: string,
  options: { fields?: string[]; filters?: unknown[]; limit?: number; orderBy?: string } = {}
): string {
  const params = [
    encodeFields(options.fields),
    encodeFilters(options.filters),
    `limit_page_length=${options.limit ?? 100}`,
    options.orderBy ? `order_by=${encodeURIComponent(options.orderBy)}` : "",
  ]
    .filter(Boolean)
    .join("&");

  return `/api/resource/${encodeURIComponent(doctype)}?${params}`;
}

async function parseResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  const text = await res.text();
  let json: unknown = {};

  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const data = json as {
      exception?: string;
      exc_type?: string;
      message?: string;
      _server_messages?: string;
      exc?: string;
    };

    let serverMessage = "";

    if (data._server_messages) {
      try {
        const raw =
          typeof data._server_messages === "string"
            ? data._server_messages
            : JSON.stringify(data._server_messages);
        const outer = JSON.parse(raw);
        const items = Array.isArray(outer) ? outer : [outer];
        serverMessage = items
          .map((item: unknown) => {
            if (typeof item === "string") {
              try {
                return (JSON.parse(item) as { message?: string }).message || item;
              } catch {
                return item;
              }
            }
            return String(item || "");
          })
          .filter(Boolean)
          .join(" ");
      } catch {
        serverMessage = String(data._server_messages);
      }
    }

    let excMessage = "";
    if (data.exc) {
      try {
        const parsed = JSON.parse(data.exc) as unknown;
        excMessage = typeof parsed === "string" ? parsed.split("\n")[0] : "";
      } catch {
        excMessage = String(data.exc).split("\n")[0];
      }
    }

    const message =
      serverMessage ||
      data.message ||
      data.exception ||
      excMessage ||
      data.exc_type ||
      fallbackMessage;

    throw new BusinessSuiteError(message, res.status);
  }

  return json as T;
}

export function getERPNextBaseUrl(): string {
  return getRuntimeBackendUrl();
}

export async function erpGet<T>(path: string): Promise<T> {
  const baseUrl = getRuntimeBackendUrl();
  const res = await fetch(`${baseUrl}${path}`, {
    headers: authHeaders(),
    cache: "no-store",
  });

  return parseResponse<T>(res, "Could not load data");
}

export async function erpPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const baseUrl = getRuntimeBackendUrl();
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  return parseResponse<T>(res, "Could not save data");
}

export async function erpPatch<T>(doctype: string, name: string, body: Record<string, unknown>): Promise<T> {
  const baseUrl = getRuntimeBackendUrl();
  const res = await fetch(
    `${baseUrl}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    }
  );

  const response = await parseResponse<ERPDocumentResponse<T>>(res, "Could not update record");
  return (response.data ?? response.message) as T;
}

export async function erpDelete(doctype: string, name: string): Promise<boolean> {
  const baseUrl = getRuntimeBackendUrl();
  const res = await fetch(
    `${baseUrl}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
    {
      method: "DELETE",
      headers: authHeaders(),
      cache: "no-store",
    }
  );

  await parseResponse<unknown>(res, "Could not delete record");
  return true;
}

export async function erpList<T>(
  doctype: string,
  options: { fields?: string[]; filters?: unknown[]; limit?: number; orderBy?: string } = {}
): Promise<T[]> {
  const response = await erpGet<ERPListResponse<T>>(resourceListPath(doctype, options));
  return response.data ?? response.message ?? [];
}

export async function erpCreate<T>(doctype: string, doc: Record<string, unknown>): Promise<T> {
  const response = await erpPost<ERPDocumentResponse<T>>(
    `/api/resource/${encodeURIComponent(doctype)}`,
    doc
  );

  const created = response.data ?? response.message;
  if (!created) throw new BusinessSuiteError(`Could not create ${doctype}`);
  return created;
}

export async function erpExists(doctype: string, name: string): Promise<boolean> {
  try {
    await erpGet(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`);
    return true;
  } catch {
    return false;
  }
}

function unwrapERPMethodResponse<T>(response: ERPDocumentResponse<T> | T): T | null {
  const boxed = response as ERPDocumentResponse<T>;
  return (boxed.data ?? boxed.message ?? (response as T) ?? null) as T | null;
}

function methodCandidates(method: string): string[] {
  const clean = String(method || "").trim().replace(/^\/+/, "");
  const configured = (process.env.ERPNEXT_API_METHOD_PREFIX || process.env.NEXT_PUBLIC_API_METHOD_PREFIX || "fuze_suite.api")
    .trim()
    .replace(/\.$/, "");
  const candidates: string[] = [];

  // CRM is installed on the server in the fuze_suite app. Do not let an old
  // Vercel/env prefix such as business_suite.api break CRM calls.
  if (clean.startsWith("crm.")) {
    candidates.push(`fuze_suite.api.${clean}`);
    if (configured && configured !== "fuze_suite.api" && configured !== "business_suite.api") {
      candidates.push(`${configured}.${clean}`);
    }
    candidates.push(clean);
    return Array.from(new Set(candidates));
  }

  // Fully-qualified methods should be attempted as provided first.
  if (clean) candidates.push(clean);

  // Short app methods like selling.get_customers live under fuze_suite.api.*
  // on this server. Keep a custom configured prefix only when it is not the old
  // missing business_suite app.
  if (clean.split(".").length === 2) {
    candidates.push(`fuze_suite.api.${clean}`);
    if (configured && configured !== "fuze_suite.api" && configured !== "business_suite.api") {
      candidates.push(`${configured}.${clean}`);
    }
  }

  return Array.from(new Set(candidates));
}

export async function erpMethod<T>(method: string, body: Record<string, unknown> = {}): Promise<T | null> {
  let lastError: unknown = null;
  for (const candidate of methodCandidates(method)) {
    try {
      const response = await erpPost<ERPDocumentResponse<T>>(`/api/method/${candidate}`, body);
      return unwrapERPMethodResponse<T>(response);
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : String(error || "");
      const missing = /not found|failed to get method|module.*has no attribute|no module named|does not exist|app .* is not installed|not installed/i.test(msg);
      if (!missing) throw error;
    }
  }
  if (lastError) throw lastError;
  return null;
}
