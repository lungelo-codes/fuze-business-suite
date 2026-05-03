const ERPNEXT_URL = process.env.ERPNEXT_URL || process.env.NEXT_PUBLIC_ERPNEXT_URL;
const ERPNEXT_API_KEY = process.env.ERPNEXT_API_KEY;
const ERPNEXT_API_SECRET = process.env.ERPNEXT_API_SECRET;

export class ERPNextError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "ERPNextError";
    this.status = status;
  }
}

function authHeaders(): HeadersInit {
  if (!ERPNEXT_API_KEY || !ERPNEXT_API_SECRET) return {};
  return { Authorization: `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}` };
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
  options: {
    fields?: string[];
    filters?: unknown[];
    limit?: number;
    orderBy?: string;
  } = {}
): string {
  const params = [
    encodeFields(options.fields),
    encodeFilters(options.filters),
    `limit_page_length=${options.limit ?? 100}`,
    options.orderBy ? `order_by=${encodeURIComponent(options.orderBy)}` : ""
  ].filter(Boolean).join("&");

  return `/api/resource/${encodeURIComponent(doctype)}?${params}`;
}

export async function erpGet<T>(path: string): Promise<T> {
  if (!ERPNEXT_URL) throw new ERPNextError("Missing ERPNEXT_URL");

  const res = await fetch(`${ERPNEXT_URL}${path}`, {
    headers: authHeaders(),
    cache: "no-store"
  });

  const text = await res.text();
  let json: unknown = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    throw new ERPNextError("ERPNext GET failed", res.status);
  }

  return json as T;
}

export async function erpPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  if (!ERPNEXT_URL) throw new ERPNextError("Missing ERPNEXT_URL");

  const res = await fetch(`${ERPNEXT_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders()
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  const text = await res.text();
  let json: unknown = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    throw new ERPNextError("ERPNext POST failed", res.status);
  }

  return json as T;
}

export async function erpList<T>(
  doctype: string,
  options: {
    fields?: string[];
    filters?: unknown[];
    limit?: number;
    orderBy?: string;
  } = {}
): Promise<T[]> {
  try {
    const response = await erpGet<ERPListResponse<T>>(resourceListPath(doctype, options));
    return response.data ?? response.message ?? [];
  } catch {
    return [];
  }
}

export async function erpCreate<T>(doctype: string, doc: Record<string, unknown>): Promise<T | null> {
  try {
    const response = await erpPost<ERPDocumentResponse<T>>(`/api/resource/${encodeURIComponent(doctype)}`, doc);
    return response.data ?? response.message ?? null;
  } catch {
    return null;
  }
}

export async function erpMethod<T>(method: string, body: Record<string, unknown>): Promise<T | null> {
  try {
    const response = await erpPost<ERPDocumentResponse<T>>(`/api/method/${method}`, body);
    return response.data ?? response.message ?? null;
  } catch {
    return null;
  }
}
