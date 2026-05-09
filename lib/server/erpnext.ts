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

function unwrapMethodData<T>(value: unknown): T | null {
  const outer = value as { message?: unknown; data?: unknown };
  const payload = outer?.message ?? outer?.data ?? outer;
  if (payload && typeof payload === "object") {
    const body = payload as { success?: boolean; data?: T; message?: string };
    if (body.success === false) throw new BusinessSuiteError(body.message || "Business Suite API failed");
    if ("data" in body) return body.data as T;
  }
  return payload as T;
}

export function getERPNextBaseUrl(): string {
  return getRuntimeBackendUrl();
}

export async function erpGet<T>(path: string): Promise<T> {
  const resource = path.match(/^\/api\/resource\/([^/?]+)\/([^?]+)$/);
  if (resource && decodeURIComponent(resource[1]) !== "DocType") {
    const doctype = decodeURIComponent(resource[1]);
    const name = decodeURIComponent(resource[2]);
    const doc = await erpMethod<T>("fuze_suite.api.business_crud.get_doctype", { doctype, name });
    return doc as T;
  }

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
  const result = await erpMethod<T>("fuze_suite.api.business_crud.update_doctype", {
    doctype,
    name,
    values: body,
  });
  if (!result) throw new BusinessSuiteError(`Could not update ${doctype}`);
  return result;
}

export async function erpDelete(doctype: string, name: string): Promise<boolean> {
  await erpMethod("fuze_suite.api.business_crud.delete_doctype", { doctype, name });
  return true;
}

export async function erpList<T>(
  doctype: string,
  options: { fields?: string[]; filters?: unknown[]; limit?: number; orderBy?: string } = {}
): Promise<T[]> {
  const rows = await erpMethod<T[]>("fuze_suite.api.business_crud.list_doctype", {
    doctype,
    fields: options.fields || ["name", "modified"],
    filters: options.filters || [],
    limit: options.limit ?? 100,
    order_by: options.orderBy || "modified desc",
  });
  return Array.isArray(rows) ? rows : [];
}

export async function erpCreate<T>(doctype: string, doc: Record<string, unknown>): Promise<T> {
  const created = await erpMethod<T>("fuze_suite.api.business_crud.create_doctype", {
    doctype,
    values: doc,
  });
  if (!created) throw new BusinessSuiteError(`Could not create ${doctype}`);
  return created;
}

export async function erpExists(doctype: string, name: string): Promise<boolean> {
  try {
    await erpMethod("fuze_suite.api.business_crud.get_doctype", { doctype, name });
    return true;
  } catch {
    return false;
  }
}

export async function erpMethod<T>(method: string, body: Record<string, unknown>): Promise<T | null> {
  const response = await erpPost<ERPDocumentResponse<T> | { message?: unknown; data?: unknown }>(`/api/method/${method}`, body);
  return unwrapMethodData<T>(response);
}
