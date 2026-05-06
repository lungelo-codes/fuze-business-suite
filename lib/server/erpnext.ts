import { cookies } from "next/headers";

const DEFAULT_ERPNEXT_URL = process.env.ERPNEXT_URL || process.env.NEXT_PUBLIC_ERPNEXT_URL || "https://business-suite.fuzedigital.co.za";
const ERPNEXT_API_KEY = process.env.ERPNEXT_API_KEY;
const ERPNEXT_API_SECRET = process.env.ERPNEXT_API_SECRET;

export const ERPNEXT_URL_COOKIE = "fuze_erp_url";

export class ERPNextError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "ERPNextError";
    this.status = status;
  }
}

function cleanUrl(url?: string | null): string {
  return (url || DEFAULT_ERPNEXT_URL).replace(/\/$/, "");
}

export async function getActiveERPNextUrl(): Promise<string> {
  try {
    const cookieStore = await cookies();
    return cleanUrl(cookieStore.get(ERPNEXT_URL_COOKIE)?.value || DEFAULT_ERPNEXT_URL);
  } catch {
    return cleanUrl(DEFAULT_ERPNEXT_URL);
  }
}

function authHeaders(): HeadersInit {
  if (!ERPNEXT_API_KEY || !ERPNEXT_API_SECRET) return {};
  return { Authorization: `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}` };
}

async function sessionHeaders(): Promise<HeadersInit> {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get("sid")?.value;
    const userId = cookieStore.get("user_id")?.value;
    const parts = [];
    if (sid) parts.push(`sid=${sid}`);
    if (userId) parts.push(`user_id=${encodeURIComponent(userId)}`);
    return parts.length ? { Cookie: parts.join("; ") } : {};
  } catch {
    return {};
  }
}

export interface ERPListResponse<T> { data?: T[]; message?: T[]; }
export interface ERPDocumentResponse<T> { data?: T; message?: T; }

function encodeFields(fields?: string[]): string {
  return fields ? `fields=${encodeURIComponent(JSON.stringify(fields))}` : "";
}
function encodeFilters(filters?: unknown[]): string {
  return filters ? `filters=${encodeURIComponent(JSON.stringify(filters))}` : "";
}

export function resourceListPath(doctype: string, options: { fields?: string[]; filters?: unknown[]; limit?: number; orderBy?: string } = {}): string {
  const params = [
    encodeFields(options.fields),
    encodeFilters(options.filters),
    `limit_page_length=${options.limit ?? 100}`,
    options.orderBy ? `order_by=${encodeURIComponent(options.orderBy)}` : ""
  ].filter(Boolean).join("&");
  return `/api/resource/${encodeURIComponent(doctype)}?${params}`;
}

async function parseResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  const text = await res.text();
  let json: unknown = {};
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) {
    const data = json as { exception?: string; exc_type?: string; message?: string; _server_messages?: string };
    throw new ERPNextError(data.message || data.exception || data.exc_type || fallbackMessage, res.status);
  }
  return json as T;
}

export async function erpGet<T>(path: string, opts: { baseUrl?: string; useToken?: boolean } = {}): Promise<T> {
  const baseUrl = cleanUrl(opts.baseUrl || (opts.useToken ? DEFAULT_ERPNEXT_URL : await getActiveERPNextUrl()));
  const headers = opts.useToken ? authHeaders() : { ...(await sessionHeaders()), ...authHeaders() };
  const res = await fetch(`${baseUrl}${path}`, { headers, cache: "no-store" });
  return parseResponse<T>(res, "ERPNext GET failed");
}

export async function erpPost<T>(path: string, body: Record<string, unknown>, opts: { baseUrl?: string; useToken?: boolean } = {}): Promise<T> {
  const baseUrl = cleanUrl(opts.baseUrl || (opts.useToken ? DEFAULT_ERPNEXT_URL : await getActiveERPNextUrl()));
  const headers = opts.useToken ? authHeaders() : { ...(await sessionHeaders()), ...authHeaders() };
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  return parseResponse<T>(res, "ERPNext POST failed");
}

export async function erpPatch<T>(doctype: string, name: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${DEFAULT_ERPNEXT_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  const response = await parseResponse<ERPDocumentResponse<T>>(res, "ERPNext update failed");
  return (response.data ?? response.message) as T;
}

export async function erpList<T>(doctype: string, options: { fields?: string[]; filters?: unknown[]; limit?: number; orderBy?: string; admin?: boolean } = {}): Promise<T[]> {
  try {
    const response = await erpGet<ERPListResponse<T>>(resourceListPath(doctype, options), { useToken: options.admin });
    return response.data ?? response.message ?? [];
  } catch {
    return [];
  }
}

export async function erpCreate<T>(doctype: string, doc: Record<string, unknown>): Promise<T | null> {
  try {
    const response = await erpPost<ERPDocumentResponse<T>>(`/api/resource/${encodeURIComponent(doctype)}`, doc);
    return response.data ?? response.message ?? null;
  } catch { return null; }
}

export async function erpMethod<T>(method: string, body: Record<string, unknown>, opts: { baseUrl?: string; useToken?: boolean } = { useToken: true }): Promise<T | null> {
  const response = await erpPost<ERPDocumentResponse<T>>(`/api/method/${method}`, body, opts);
  return (response.data ?? response.message ?? response) as T;
}
