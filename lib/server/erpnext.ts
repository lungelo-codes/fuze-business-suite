import { cookies } from "next/headers";

const ERPNEXT_URL = process.env.ERPNEXT_URL || process.env.NEXT_PUBLIC_ERPNEXT_URL;
const ERPNEXT_API_KEY = process.env.ERPNEXT_API_KEY;
const ERPNEXT_API_SECRET = process.env.ERPNEXT_API_SECRET;

export class BusinessSuiteError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "BusinessSuiteError";
    this.status = status;
  }
}

function authHeaders(): HeadersInit {
  if (ERPNEXT_API_KEY && ERPNEXT_API_SECRET) return { Authorization: `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}` };
  try {
    const sid = cookies().get("sid")?.value;
    if (sid) return { Cookie: `sid=${sid}` };
  } catch {}
  return {};
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
    const data = json as { exception?: string; exc_type?: string; message?: string; _server_messages?: string; exc?: string };
    let serverMessage = "";
    if (data._server_messages) {
      try {
        const outer = JSON.parse(data._server_messages) as string[];
        serverMessage = outer.map((item) => { try { return JSON.parse(item).message || item; } catch { return item; } }).join(" ");
      } catch { serverMessage = String(data._server_messages); }
    }
    throw new BusinessSuiteError(data.message || serverMessage || data.exception || data.exc_type || data.exc || fallbackMessage, res.status);
  }
  return json as T;
}

export async function erpGet<T>(path: string): Promise<T> {
  if (!ERPNEXT_URL) throw new BusinessSuiteError("Missing ERPNEXT_URL");
  const res = await fetch(`${ERPNEXT_URL}${path}`, { headers: authHeaders(), cache: "no-store" });
  return parseResponse<T>(res, "Could not load data");
}

export async function erpPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  if (!ERPNEXT_URL) throw new BusinessSuiteError("Missing ERPNEXT_URL");
  const res = await fetch(`${ERPNEXT_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  return parseResponse<T>(res, "Could not save data");
}

export async function erpPatch<T>(doctype: string, name: string, body: Record<string, unknown>): Promise<T> {
  if (!ERPNEXT_URL) throw new BusinessSuiteError("Missing ERPNEXT_URL");
  const res = await fetch(`${ERPNEXT_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  const response = await parseResponse<ERPDocumentResponse<T>>(res, "Could not update record");
  return (response.data ?? response.message) as T;
}

export async function erpDelete(doctype: string, name: string): Promise<boolean> {
  if (!ERPNEXT_URL) throw new BusinessSuiteError("Missing ERPNEXT_URL");
  const res = await fetch(`${ERPNEXT_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
    cache: "no-store"
  });
  await parseResponse<unknown>(res, "Could not delete record");
  return true;
}

export async function erpList<T>(doctype: string, options: { fields?: string[]; filters?: unknown[]; limit?: number; orderBy?: string } = {}): Promise<T[]> {
  const response = await erpGet<ERPListResponse<T>>(resourceListPath(doctype, options));
  return response.data ?? response.message ?? [];
}

export async function erpCreate<T>(doctype: string, doc: Record<string, unknown>): Promise<T> {
  const response = await erpPost<ERPDocumentResponse<T>>(`/api/resource/${encodeURIComponent(doctype)}`, doc);
  const created = response.data ?? response.message;
  if (!created) throw new BusinessSuiteError(`Could not create ${doctype}`);
  return created;
}

export async function erpExists(doctype: string, name: string): Promise<boolean> {
  try {
    await erpGet(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`);
    return true;
  } catch { return false; }
}

export async function erpMethod<T>(method: string, body: Record<string, unknown>): Promise<T | null> {
  const response = await erpPost<ERPDocumentResponse<T>>(`/api/method/${method}`, body);
  return response.data ?? response.message ?? null;
}
