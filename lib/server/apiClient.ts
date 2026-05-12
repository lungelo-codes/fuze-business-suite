/**
 * apiClient.ts
 * Central server-side client for the Fuze Business Suite shared API.
 * All module data flows through fuze_suite.api.* endpoints instead of raw ERPNext resources.
 */
import { getServerSession } from "@/lib/server/auth";
import { cookies } from "next/headers";

// ─── Runtime base URL ────────────────────────────────────────────────────────
function getBaseUrl(): string {
  const store = cookies();
  const tenantUrl = store.get("fuze_tenant_url")?.value;
  if (tenantUrl) return tenantUrl.replace(/\/$/, "");
  return (process.env.FRAPPE_URL || "http://localhost:8000").replace(/\/$/, "");
}

function authHeaders(): Record<string, string> {
  const store = cookies();
  const sid = store.get("sid")?.value;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (sid) headers["Cookie"] = `sid=${sid}`;
  return headers;
}

// ─── Core fetch wrapper ──────────────────────────────────────────────────────
async function apiCall<T = unknown>(
  method: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}/api/method/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(params),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || json.success === false) {
    const msg =
      (json.message as string) ||
      (json.error as string) ||
      `API call failed: ${method}`;
    throw new Error(msg);
  }
  // Frappe wraps in { message: ... }
  const data = (json.message ?? json) as Record<string, unknown>;
  return (data.data ?? data) as T;
}

async function apiGet<T = unknown>(
  method: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  const base = getBaseUrl();
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  }
  const url = `${base}/api/method/${method}${qs.toString() ? "?" + qs.toString() : ""}`;
  const res = await fetch(url, {
    method: "GET",
    headers: authHeaders(),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || json.success === false) {
    const msg =
      (json.message as string) ||
      (json.error as string) ||
      `API call failed: ${method}`;
    throw new Error(msg);
  }
  const data = (json.message ?? json) as Record<string, unknown>;
  return (data.data ?? data) as T;
}

// ─── CRM API ─────────────────────────────────────────────────────────────────
const CRM = "fuze_suite.api.crm";

export async function crmGetDashboard(company?: string) {
  return apiGet(`${CRM}.get_dashboard`, company ? { company } : {});
}

export async function crmGetPipeline(params?: {
  limit?: number;
  offset?: number;
  stage?: string;
  search?: string;
}) {
  return apiGet(`${CRM}.get_pipeline`, params ?? {});
}

export async function crmGetLeads(params?: {
  limit?: number;
  offset?: number;
  status?: string;
  search?: string;
}) {
  return apiGet(`${CRM}.get_leads`, params ?? {});
}

export async function crmCreateLead(data: Record<string, unknown>) {
  return apiCall(`${CRM}.create_lead`, { data: JSON.stringify(data) });
}

export async function crmGetCustomers(params?: {
  limit?: number;
  offset?: number;
  search?: string;
}) {
  return apiGet(`${CRM}.get_customers`, params ?? {});
}

export async function crmGetContacts(params?: {
  limit?: number;
  offset?: number;
  search?: string;
}) {
  return apiGet(`${CRM}.get_contacts`, params ?? {});
}

// ─── Sales API ───────────────────────────────────────────────────────────────
const SALES = "fuze_suite.api.sales";

export async function salesGetDashboard(company?: string) {
  return apiGet(`${SALES}.get_dashboard`, company ? { company } : {});
}

export async function salesGetQuotations(params?: {
  company?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  return apiGet(`${SALES}.get_quotations`, params ?? {});
}

export async function salesGetQuotation(name: string) {
  return apiGet(`${SALES}.get_quotation`, { name });
}

export async function salesGetOrders(params?: {
  company?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  return apiGet(`${SALES}.get_sales_orders`, params ?? {});
}

export async function salesGetTopCustomers(company?: string, limit = 10) {
  return apiGet(`${SALES}.get_top_customers`, { company, limit });
}

export async function salesGetTrend(company?: string, months = 6) {
  return apiGet(`${SALES}.get_sales_trend`, { company, months });
}

export async function salesGetProducts(params?: {
  limit?: number;
  offset?: number;
  search?: string;
  item_group?: string;
}) {
  return apiGet(`${SALES}.get_products`, params ?? {});
}

// ─── Accounting API ──────────────────────────────────────────────────────────
const ACCT = "fuze_suite.api.accounting";

export async function acctGetDashboard(company?: string) {
  return apiGet(`${ACCT}.get_dashboard`, company ? { company } : {});
}

export async function acctGetInvoices(params?: {
  company?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  return apiGet(`${ACCT}.get_invoices`, params ?? {});
}

export async function acctGetInvoice(name: string) {
  return apiGet(`${ACCT}.get_invoice`, { name });
}

export async function acctGetBills(params?: {
  company?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  return apiGet(`${ACCT}.get_bills`, params ?? {});
}

export async function acctGetPayments(params?: {
  company?: string;
  payment_type?: string;
  limit?: number;
  offset?: number;
}) {
  return apiGet(`${ACCT}.get_payments`, params ?? {});
}

export async function acctGetProfitLoss(params?: {
  company?: string;
  from_date?: string;
  to_date?: string;
}) {
  return apiGet(`${ACCT}.get_profit_loss`, params ?? {});
}

export async function acctGetRevenueChart(company?: string, months = 6) {
  return apiGet(`${ACCT}.get_revenue_chart`, { company, months });
}

export async function acctGetJournalEntries(company?: string, limit = 50) {
  return apiGet(`${ACCT}.get_journal_entries`, { company, limit });
}

export async function acctGetAccounts(params?: {
  company?: string;
  account_type?: string;
  root_type?: string;
}) {
  return apiGet(`${ACCT}.get_accounts`, params ?? {});
}

// ─── Compliance API ──────────────────────────────────────────────────────────
const COMP = "fuze_suite.api.compliance";

export async function compGetDashboard(company?: string) {
  return apiGet(`${COMP}.get_dashboard`, company ? { company } : {});
}

export async function compGetSarsProfile(company?: string) {
  return apiGet(`${COMP}.get_sars_profile`, company ? { company } : {});
}

export async function compSaveSarsProfile(data: Record<string, unknown>) {
  return apiCall(`${COMP}.save_sars_profile`, { data: JSON.stringify(data) });
}

export async function compListVatReturns(params?: {
  company?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  return apiGet(`${COMP}.list_vat_returns`, params ?? {});
}

export async function compCreateVatReturn(data: Record<string, unknown>) {
  return apiCall(`${COMP}.create_vat_return`, { data: JSON.stringify(data) });
}

export async function compListPayeReturns(params?: {
  company?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  return apiGet(`${COMP}.list_paye_returns`, params ?? {});
}

export async function compListCipcReturns(params?: {
  company?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  return apiGet(`${COMP}.list_cipc_returns`, params ?? {});
}

export async function compSaveCipcReturn(data: Record<string, unknown>) {
  return apiCall(`${COMP}.save_cipc_return`, { data: JSON.stringify(data) });
}

export async function compListTasks(params?: {
  company?: string;
  status?: string;
  task_type?: string;
  limit?: number;
  offset?: number;
}) {
  return apiGet(`${COMP}.list_tasks`, params ?? {});
}

export async function compCreateTask(data: Record<string, unknown>) {
  return apiCall(`${COMP}.create_task`, { data: JSON.stringify(data) });
}

export async function compListReminders(company?: string, limit = 50) {
  return apiGet(`${COMP}.list_reminders`, { company, limit });
}

export async function compGetCompanyCompliance(company?: string) {
  return apiGet(`${COMP}.get_company_compliance`, company ? { company } : {});
}

export async function compGetAuditLog(limit = 100, offset = 0) {
  return apiGet(`${COMP}.get_audit_log`, { limit, offset });
}

// ─── Insights API ────────────────────────────────────────────────────────────
const INSIGHTS = "fuze_suite.api.insights";

export async function insightsGetBusinessOverview(company?: string) {
  return apiGet(`${INSIGHTS}.get_business_overview`, company ? { company } : {});
}

export async function insightsGetRevenueChart(company?: string, months = 6) {
  return apiGet(`${INSIGHTS}.get_revenue_chart`, { company, months });
}

export async function insightsGetCustomerGrowth(months = 6) {
  return apiGet(`${INSIGHTS}.get_customer_growth`, { months });
}

export async function insightsGetTopCustomers(company?: string, limit = 10) {
  return apiGet(`${INSIGHTS}.get_top_customers`, { company, limit });
}

export async function insightsGetPipelineSummary(company?: string) {
  return apiGet(`${INSIGHTS}.get_pipeline_summary`, company ? { company } : {});
}

export async function insightsGetInsightsQueries(limit = 50) {
  return apiGet(`${INSIGHTS}.get_insights_queries`, { limit });
}

export async function insightsGetInsightsDashboards(limit = 20) {
  return apiGet(`${INSIGHTS}.get_insights_dashboards`, { limit });
}

// ─── HR API ──────────────────────────────────────────────────────────────────
const HR = "fuze_suite.api.hr";

export async function hrGetDashboard(company?: string) {
  return apiGet(`${HR}.get_dashboard`, company ? { company } : {});
}

export async function hrGetEmployees(params?: {
  status?: string;
  department?: string;
  company?: string;
  limit?: number;
  offset?: number;
}) {
  return apiGet(`${HR}.get_employees`, params ?? {});
}

export async function hrGetLeaveRequests(params?: {
  status?: string;
  employee?: string;
  limit?: number;
  offset?: number;
}) {
  return apiGet(`${HR}.get_leave_requests`, params ?? {});
}

export async function hrGetAttendance(params?: {
  date?: string;
  status?: string;
  employee?: string;
  limit?: number;
  offset?: number;
}) {
  return apiGet(`${HR}.get_attendance`, params ?? {});
}

export async function hrGetPayrollSummary(params?: {
  company?: string;
  from_date?: string;
  to_date?: string;
}) {
  return apiGet(`${HR}.get_payroll_summary`, params ?? {});
}

// ─── Projects API ────────────────────────────────────────────────────────────
const PROJ = "fuze_suite.api.projects";

export async function projGetDashboard(company?: string) {
  return apiGet(`${PROJ}.get_dashboard`, company ? { company } : {});
}

export async function projGetProjects(params?: {
  status?: string;
  company?: string;
  limit?: number;
  offset?: number;
}) {
  return apiGet(`${PROJ}.get_projects`, params ?? {});
}

export async function projGetTasks(params?: {
  project?: string;
  status?: string;
  assigned_to?: string;
  limit?: number;
  offset?: number;
}) {
  return apiGet(`${PROJ}.get_tasks`, params ?? {});
}

export async function projCreateProject(data: Record<string, unknown>) {
  return apiCall(`${PROJ}.create_project`, { data: JSON.stringify(data) });
}

export async function projCreateTask(data: Record<string, unknown>) {
  return apiCall(`${PROJ}.create_task`, { data: JSON.stringify(data) });
}

export async function projUpdateTaskStatus(task_id: string, status: string) {
  return apiCall(`${PROJ}.update_task_status`, { task_id, status });
}
