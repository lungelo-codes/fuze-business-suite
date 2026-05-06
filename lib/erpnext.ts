/**
 * Client-safe ERPNext data fetching utilities.
 * These call the Next.js API routes which proxy to ERPNext on the server.
 * Safe to import in both server and client components (via API routes).
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface ERPCustomer {
  name: string;
  customer_name?: string;
  customer_type?: string;
  customer_group?: string;
  territory?: string;
  mobile_no?: string;
  email_id?: string;
  modified?: string;
}

export interface ERPInvoice {
  name: string;
  customer?: string;
  posting_date?: string;
  due_date?: string;
  grand_total?: number;
  outstanding_amount?: number;
  status?: string;
  modified?: string;
}

export interface ERPProject {
  name: string;
  project_name?: string;
  status?: string;
  expected_start_date?: string;
  expected_end_date?: string;
  percent_complete?: number;
  modified?: string;
}

export interface ERPTask {
  name: string;
  subject?: string;
  status?: string;
  priority?: string;
  exp_start_date?: string;
  exp_end_date?: string;
  project?: string;
  modified?: string;
}

export interface ERPItem {
  name: string;
  item_name?: string;
  item_group?: string;
  stock_uom?: string;
  disabled?: number;
  modified?: string;
}

async function apiGet<T>(url: string): Promise<T[]> {
  try {
    const res = await fetch(`${BASE}${url}`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data ?? json.message ?? []) as T[];
  } catch {
    return [];
  }
}

function encodeQuery(fields: string[], limit = 100, orderBy = "modified desc"): string {
  return `fields=${encodeURIComponent(JSON.stringify(fields))}&limit_page_length=${limit}&order_by=${encodeURIComponent(orderBy)}`;
}

/** Fetch customers from ERPNext */
export async function fetchCustomers(limit = 100): Promise<ERPCustomer[]> {
  const fields = ["name", "customer_name", "customer_type", "customer_group", "territory", "mobile_no", "email_id", "modified"];
  return apiGet<ERPCustomer>(`/api/resource/Customer?${encodeQuery(fields, limit)}`);
}

/** Fetch sales invoices from ERPNext */
export async function fetchInvoices(limit = 100): Promise<ERPInvoice[]> {
  const fields = ["name", "customer", "posting_date", "due_date", "grand_total", "outstanding_amount", "status", "modified"];
  return apiGet<ERPInvoice>(`/api/resource/Sales%20Invoice?${encodeQuery(fields, limit)}`);
}

/** Fetch projects from ERPNext */
export async function fetchProjects(limit = 100): Promise<ERPProject[]> {
  const fields = ["name", "project_name", "status", "expected_start_date", "expected_end_date", "percent_complete", "modified"];
  return apiGet<ERPProject>(`/api/resource/Project?${encodeQuery(fields, limit)}`);
}

/** Fetch tasks from ERPNext */
export async function fetchTasks(limit = 100): Promise<ERPTask[]> {
  const fields = ["name", "subject", "status", "priority", "exp_start_date", "exp_end_date", "project", "modified"];
  return apiGet<ERPTask>(`/api/resource/Task?${encodeQuery(fields, limit)}`);
}

/** Fetch inventory items from ERPNext */
export async function fetchItems(limit = 100): Promise<ERPItem[]> {
  const fields = ["name", "item_name", "item_group", "stock_uom", "disabled", "modified"];
  return apiGet<ERPItem>(`/api/resource/Item?${encodeQuery(fields, limit)}`);
}
