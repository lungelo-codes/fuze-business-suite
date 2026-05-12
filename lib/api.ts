// lib/api.ts – Fuze Business Suite API Client
// Connects to the Fuze backend API (fuze.* methods) with full mock data fallback.
// Auth (login / logout / signup / forgot-password) goes through Next.js API routes
// (/api/auth/login, /api/auth/logout, /api/signup, /api/auth/forgot-password)
// which proxy to ERPNext server-side — credentials never exposed to the browser.
// All other modules use the Fuze method layer — no direct ERPNext resource calls.

const FUZE_API_URL = process.env.NEXT_PUBLIC_FUZE_API_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_FUZE_API_KEY || "";
const API_SECRET = process.env.NEXT_PUBLIC_FUZE_API_SECRET || "";

// ─── Auth interfaces ──────────────────────────────────────────────────────────

export interface AuthResult {
  success: boolean;
  message: string;
  user?: string;
  full_name?: string;
  home_page?: string;
}

export interface SessionUser {
  logged_in: boolean;
  user?: string;
  full_name?: string;
  user_image?: string;
  roles?: string[];
}

// ─── Auth — all routed through Next.js API routes (server-side ERPNext proxy) ─
// The browser never calls ERPNext directly. Each function below calls a
// /api/auth/* or /api/signup route which handles the ERPNext call server-side,
// then sets the appropriate session cookies in the response.

/**
 * Login — POSTs to /api/auth/login which proxies to ERPNext server-side.
 * On success the Next.js route sets sid, user_id, full_name cookies.
 */
export async function authLogin(usr: string, pwd: string): Promise<AuthResult> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: usr, password: pwd }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, message: json.error || "Invalid credentials" };
    return {
      success: true,
      message: "Logged in successfully",
      user: json.user?.email || usr,
      full_name: json.user?.full_name,
      home_page: json.redirect || "/portal",
    };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Login failed" };
  }
}

/**
 * Logout — POSTs to /api/auth/logout which clears all session cookies.
 */
export async function authLogout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch {
    // Ignore
  }
}

/**
 * Check current session via the sid cookie (read client-side).
 */
export async function getSession(): Promise<SessionUser> {
  if (typeof document === "undefined") return { logged_in: false };
  const sid = document.cookie.match(/sid=([^;]+)/)?.[1];
  const userId = document.cookie.match(/user_id=([^;]+)/)?.[1];
  if (!sid || !userId) return { logged_in: false };
  return {
    logged_in: true,
    user: decodeURIComponent(userId),
  };
}

/**
 * Signup — POSTs to /api/signup which calls ERPNext sign_up server-side.
 */
export async function authSignup(data: {
  email: string;
  first_name: string;
  last_name?: string;
  company?: string;
  phone?: string;
}): Promise<AuthResult> {
  try {
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, message: json.error || "Registration failed." };
    return { success: true, message: json.message || "Account created. Check your email to verify." };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Signup failed" };
  }
}

/**
 * Password reset — POSTs to /api/auth/forgot-password which calls ERPNext server-side.
 */
export async function authResetPassword(user: string): Promise<AuthResult> {
  try {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, message: json.error || "Could not send reset email." };
    return { success: true, message: json.message || "Password reset email sent." };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Reset failed" };
  }
}

export interface FuzeResponse<T = unknown> {
  success: boolean;
  data: T;
  message: string;
  meta?: Record<string, unknown>;
}

async function callFuze<T = unknown>(
  method: string,
  params: Record<string, unknown> = {}
): Promise<FuzeResponse<T>> {
  if (!FUZE_API_URL) {
    return getMockData(method, params) as FuzeResponse<T>;
  }

  const url = `${FUZE_API_URL}/api/method/${method}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (API_KEY && API_SECRET) {
    headers["Authorization"] = `token ${API_KEY}:${API_SECRET}`;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(params),
      credentials: "include",
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    // Fuze API wraps response in { message: ... } following the Frappe convention
    return json.message ?? json;
  } catch (err) {
    console.error(`[Fuze API] ${method}:`, err);
    return getMockData(method, params) as FuzeResponse<T>;
  }
}

// ─── Rich South African mock data ─────────────────────────────────────────────

function getMockData(method: string, _params: Record<string, unknown>): FuzeResponse {
  const currency = "ZAR";

  const mock: Record<string, FuzeResponse> = {

    // ── Insights / Business Overview ─────────────────────────────────────────
    "fuze.insights.get_business_overview": {
      success: true, message: "OK",
      data: {
        currency,
        cards: {
          total_revenue: 2847500, total_expenses: 1923400, total_profit: 924100,
          month_revenue: 342800, month_expenses: 218600, month_profit: 124200,
          receivables: 486200, payables: 139800, overdue_invoices: 7,
          customers: 142, suppliers: 38, active_employees: 24,
          open_projects: 11, open_tasks: 43,
        },
        period: { month_start: "2025-05-01", month_end: "2025-05-31" },
      },
    },
    "fuze.insights.get_revenue_chart": {
      success: true, message: "OK",
      data: {
        currency,
        chart: [
          { month: "2024-12", revenue: 198000, expenses: 142000, profit: 56000, outstanding: 32000 },
          { month: "2025-01", revenue: 224000, expenses: 158000, profit: 66000, outstanding: 41000 },
          { month: "2025-02", revenue: 251000, expenses: 171000, profit: 80000, outstanding: 38000 },
          { month: "2025-03", revenue: 298000, expenses: 189000, profit: 109000, outstanding: 52000 },
          { month: "2025-04", revenue: 318000, expenses: 201000, profit: 117000, outstanding: 44000 },
          { month: "2025-05", revenue: 342800, expenses: 218600, profit: 124200, outstanding: 61000 },
        ],
      },
    },
    "fuze.insights.get_top_customers": {
      success: true, message: "OK",
      data: {
        currency,
        customers: [
          { name: "Mkhize Construction", total_revenue: 428000, invoice_count: 14, saas_member: true, plan: "Professional" },
          { name: "Dlamini & Associates", total_revenue: 312000, invoice_count: 9, saas_member: true, plan: "Growth" },
          { name: "Ndlovu Retail Group", total_revenue: 289000, invoice_count: 22, saas_member: true, plan: "Professional" },
          { name: "Sithole Technologies", total_revenue: 198000, invoice_count: 7, saas_member: false, plan: null },
          { name: "Zulu Logistics", total_revenue: 167000, invoice_count: 11, saas_member: true, plan: "Starter" },
        ],
      },
    },
    "fuze.insights.get_pipeline_summary": {
      success: true, message: "OK",
      data: {
        currency,
        stages: [
          { stage: "Prospecting", count: 18, value: 284000 },
          { stage: "Qualified", count: 12, value: 398000 },
          { stage: "Proposal", count: 8, value: 512000 },
          { stage: "Negotiation", count: 5, value: 389000 },
          { stage: "Won", count: 4, value: 218000 },
        ],
        total: 1801000,
      },
    },

    // ── Reports (per-customer SaaS member full company reports) ─────────────
    "fuze.reports.get_saas_members": {
      success: true, message: "OK",
      data: {
        members: [
          {
            id: "CUST-001", name: "Mkhize Construction", plan: "Professional",
            reg_number: "2018/123456/07", vat_number: "4820192837",
            industry: "Construction", territory: "Gauteng",
            joined: "2023-03-15", status: "Active",
            contacts: 3, employees: 47, projects: 4,
            total_revenue: 428000, outstanding: 128000, overdue: 89400,
            compliance_score: 82, last_activity: "2025-05-08",
          },
          {
            id: "CUST-002", name: "Dlamini & Associates", plan: "Growth",
            reg_number: "2015/087654/21", vat_number: "4891023847",
            industry: "Legal Services", territory: "Gauteng",
            joined: "2023-07-22", status: "Active",
            contacts: 2, employees: 12, projects: 2,
            total_revenue: 312000, outstanding: 47200, overdue: 0,
            compliance_score: 95, last_activity: "2025-05-07",
          },
          {
            id: "CUST-003", name: "Ndlovu Retail Group", plan: "Professional",
            reg_number: "2010/234567/07", vat_number: "4712938401",
            industry: "Retail", territory: "KwaZulu-Natal",
            joined: "2022-11-01", status: "Active",
            contacts: 5, employees: 89, projects: 6,
            total_revenue: 289000, outstanding: 89400, overdue: 89400,
            compliance_score: 71, last_activity: "2025-05-06",
          },
          {
            id: "CUST-004", name: "Zulu Logistics", plan: "Starter",
            reg_number: "2019/345678/07", vat_number: null,
            industry: "Logistics", territory: "Gauteng",
            joined: "2024-01-10", status: "Active",
            contacts: 1, employees: 8, projects: 1,
            total_revenue: 167000, outstanding: 34100, overdue: 0,
            compliance_score: 88, last_activity: "2025-05-05",
          },
          {
            id: "CUST-005", name: "Sithole Technologies", plan: "Growth",
            reg_number: "2017/456789/07", vat_number: "4903847261",
            industry: "Technology", territory: "Western Cape",
            joined: "2023-09-05", status: "Active",
            contacts: 2, employees: 15, projects: 3,
            total_revenue: 198000, outstanding: 66800, overdue: 66800,
            compliance_score: 63, last_activity: "2025-05-04",
          },
        ],
      },
    },
    "fuze.reports.get_customer_full_report": {
      success: true, message: "OK",
      data: {
        customer: {
          id: "CUST-001", name: "Mkhize Construction", plan: "Professional",
          reg_number: "2018/123456/07", vat_number: "4820192837",
          industry: "Construction", territory: "Gauteng",
          joined: "2023-03-15", status: "Active",
        },
        financials: {
          currency,
          total_revenue: 428000, total_invoiced: 456000,
          outstanding: 128000, overdue: 89400, paid: 328000,
          monthly_trend: [
            { month: "2025-01", revenue: 62000, paid: 62000 },
            { month: "2025-02", revenue: 78000, paid: 78000 },
            { month: "2025-03", revenue: 84000, paid: 84000 },
            { month: "2025-04", revenue: 92000, paid: 92000 },
            { month: "2025-05", revenue: 112000, paid: 12000 },
          ],
        },
        invoices: [
          { id: "SINV-00142", date: "2025-05-08", due: "2025-06-08", amount: 128000, status: "Unpaid" },
          { id: "SINV-00138", date: "2025-04-28", due: "2025-05-12", amount: 89400, status: "Overdue" },
          { id: "SINV-00130", date: "2025-04-01", due: "2025-05-01", amount: 92000, status: "Paid" },
        ],
        projects: [
          { id: "PROJ-001", name: "Mkhize ERP Implementation", status: "Open", progress: 65, due: "2025-07-31" },
          { id: "PROJ-005", name: "Mkhize HR Module", status: "Open", progress: 30, due: "2025-09-30" },
        ],
        helpdesk: [
          { id: "HDT-00089", subject: "Cannot generate VAT report", status: "Open", priority: "High", created: "2025-05-08" },
          { id: "HDT-00072", subject: "Invoice template issue", status: "Resolved", priority: "Medium", created: "2025-04-15" },
        ],
        compliance: {
          score: 82,
          vat_registered: true,
          cipc_status: "Good Standing",
          last_vat_filed: "2025-04-30",
          last_paye_filed: "2025-04-07",
        },
        crm: {
          lead_source: "Referral",
          converted_date: "2023-03-15",
          deals_won: 3,
          deals_total: 4,
          last_contact: "2025-05-08",
        },
      },
    },
    "fuze.reports.get_operations_summary": {
      success: true, message: "OK",
      data: {
        currency,
        period: "May 2025",
        revenue: { total: 342800, vs_last_month: 7.8, vs_last_year: 22.4 },
        expenses: { total: 218600, vs_last_month: 8.8 },
        profit: { total: 124200, margin: 36.2 },
        saas_metrics: {
          total_members: 142, active_members: 138, churned: 4,
          mrr: 184200, arr: 2210400, avg_revenue_per_user: 1297,
          new_this_month: 8,
          plan_breakdown: { Starter: 48, Growth: 62, Professional: 28, Enterprise: 4 },
        },
        crm: { leads: 47, deals: 28, pipeline_value: 1801000, won_this_month: 218000, conversion_rate: 18.4 },
        hr: { headcount: 24, payroll: 486200, open_positions: 2 },
        projects: { open: 11, completed_this_month: 2, overdue_tasks: 6, billable_hours: 342.5 },
        helpdesk: { open: 14, resolved_this_month: 28, avg_resolution_days: 2.4, satisfaction: 4.2 },
        compliance: { overdue_items: 2, pending_items: 2, total_liability: 136500 },
      },
    },

    // ── CRM ──────────────────────────────────────────────────────────────────
    "fuze.crm.get_dashboard": {
      success: true, message: "OK",
      data: {
        currency,
        cards: { leads: 47, deals: 28, customers: 142, contacts: 213, pipeline_value: 1801000, won_this_month: 218000 },
      },
    },
    "fuze.crm.get_leads": {
      success: true, message: "OK",
      data: {
        leads: [
          { id: "LEAD-001", name: "Bongani Khumalo", company: "Khumalo Logistics", email: "b.khumalo@logistics.co.za", phone: "082 441 3892", source: "Website", status: "New", city: "Johannesburg", country: "South Africa", last_updated: "2025-05-08", notes: "Interested in full ERP suite" },
          { id: "LEAD-002", name: "Precious Mokoena", company: "Mokoena Legal", email: "p.mokoena@legal.co.za", phone: "074 882 1193", source: "Referral", status: "Contacted", city: "Pretoria", country: "South Africa", last_updated: "2025-05-07", notes: "Needs CRM + compliance module" },
          { id: "LEAD-003", name: "Thabo Nkosi", company: "Nkosi Manufacturing", email: "thabo@nkosimfg.co.za", phone: "011 884 2211", source: "LinkedIn", status: "Qualified", city: "Sandton", country: "South Africa", last_updated: "2025-05-06", notes: "Budget approved, awaiting proposal" },
          { id: "LEAD-004", name: "Zanele Dube", company: "Dube Events", email: "zanele@dubevents.co.za", phone: "083 992 0041", source: "Website", status: "New", city: "Durban", country: "South Africa", last_updated: "2025-05-05", notes: "Small events company, starter plan" },
          { id: "LEAD-005", name: "Siphamandla Cele", company: "Cele Consulting", email: "s.cele@celeconsult.co.za", phone: "071 334 8821", source: "Trade Show", status: "Qualified", city: "Cape Town", country: "South Africa", last_updated: "2025-05-04", notes: "Professional services firm, 20 staff" },
        ],
      },
      meta: { total: 47, limit: 50, offset: 0 },
    },
    "fuze.crm.get_pipeline": {
      success: true, message: "OK",
      data: {
        currency,
        deals: [
          { id: "OPP-001", title: "Mkhize Construction ERP", customer: "Mkhize Construction", stage: "Proposal", value: 128000, probability: 65, expected_close: "2025-06-15", last_updated: "2025-05-08", owner: "admin@fuze.co.za", lead_id: null },
          { id: "OPP-002", title: "Dlamini Legal Suite", customer: "Dlamini & Associates", stage: "Negotiation", value: 89000, probability: 80, expected_close: "2025-05-31", last_updated: "2025-05-07", owner: "admin@fuze.co.za", lead_id: null },
          { id: "OPP-003", title: "Ndlovu Retail Platform", customer: "Ndlovu Retail Group", stage: "Qualified", value: 215000, probability: 40, expected_close: "2025-07-01", last_updated: "2025-05-06", owner: "admin@fuze.co.za", lead_id: null },
          { id: "OPP-004", title: "Sithole Tech Upgrade", customer: "Sithole Technologies", stage: "Prospecting", value: 62000, probability: 20, expected_close: "2025-08-01", last_updated: "2025-05-05", owner: "admin@fuze.co.za", lead_id: null },
          { id: "OPP-005", title: "Zulu Logistics Suite", customer: "Zulu Logistics", stage: "Won", value: 98000, probability: 100, expected_close: "2025-05-01", last_updated: "2025-05-01", owner: "admin@fuze.co.za", lead_id: null },
          { id: "OPP-006", title: "Khumalo Transport ERP", customer: "Khumalo Logistics", stage: "Proposal", value: 74000, probability: 55, expected_close: "2025-06-30", last_updated: "2025-05-04", owner: "admin@fuze.co.za", lead_id: "LEAD-001" },
          { id: "OPP-007", title: "Mokoena CRM Setup", customer: "Mokoena Legal", stage: "Qualified", value: 38000, probability: 45, expected_close: "2025-06-15", last_updated: "2025-05-03", owner: "admin@fuze.co.za", lead_id: "LEAD-002" },
          { id: "OPP-008", title: "Nkosi MFG Operations", customer: "Nkosi Manufacturing", stage: "Negotiation", value: 156000, probability: 75, expected_close: "2025-05-28", last_updated: "2025-05-08", owner: "admin@fuze.co.za", lead_id: "LEAD-003" },
        ],
      },
      meta: { total: 28, limit: 50, offset: 0 },
    },
    "fuze.crm.get_customers": {
      success: true, message: "OK",
      data: {
        customers: [
          { id: "CUST-001", name: "Mkhize Construction", type: "Company", group: "Commercial", territory: "Gauteng", modified: "2025-05-08", email: "finance@mkhize.co.za", phone: "011 234 5678", contacts: 3, open_invoices: 2, total_revenue: 428000, plan: "Professional" },
          { id: "CUST-002", name: "Dlamini & Associates", type: "Company", group: "Professional Services", territory: "Gauteng", modified: "2025-05-07", email: "admin@dlamini.co.za", phone: "012 345 6789", contacts: 2, open_invoices: 0, total_revenue: 312000, plan: "Growth" },
          { id: "CUST-003", name: "Ndlovu Retail Group", type: "Company", group: "Retail", territory: "KwaZulu-Natal", modified: "2025-05-06", email: "accounts@ndlovu.co.za", phone: "031 456 7890", contacts: 5, open_invoices: 2, total_revenue: 289000, plan: "Professional" },
          { id: "CUST-004", name: "Zulu Logistics", type: "Company", group: "Logistics", territory: "Gauteng", modified: "2025-05-05", email: "ops@zululogistics.co.za", phone: "011 567 8901", contacts: 1, open_invoices: 1, total_revenue: 167000, plan: "Starter" },
          { id: "CUST-005", name: "Sithole Technologies", type: "Company", group: "Technology", territory: "Western Cape", modified: "2025-05-04", email: "info@sithole.tech", phone: "021 678 9012", contacts: 2, open_invoices: 1, total_revenue: 198000, plan: "Growth" },
        ],
      },
      meta: { total: 142, limit: 50, offset: 0 },
    },
    "fuze.crm.get_customer_360": {
      success: true, message: "OK",
      data: {
        customer: { id: "CUST-001", name: "Mkhize Construction", type: "Company", territory: "Gauteng", email: "finance@mkhize.co.za", phone: "011 234 5678", plan: "Professional" },
        journey: [
          { date: "2023-02-10", event: "Lead created", type: "lead", detail: "Source: Referral" },
          { date: "2023-02-18", event: "Lead qualified", type: "stage", detail: "Budget confirmed: R128,000" },
          { date: "2023-02-28", event: "Proposal sent", type: "quote", detail: "QTN-00001 — R128,000" },
          { date: "2023-03-10", event: "Deal won", type: "won", detail: "OPP-001 closed" },
          { date: "2023-03-15", event: "Customer created", type: "customer", detail: "Converted from lead" },
          { date: "2023-04-01", event: "First invoice", type: "invoice", detail: "SINV-00001 — R42,000" },
          { date: "2025-05-08", event: "Latest invoice", type: "invoice", detail: "SINV-00142 — R128,000" },
        ],
        financials: { currency, total_revenue: 428000, outstanding: 128000, overdue: 89400, invoices: 14 },
        contacts: [
          { name: "Sipho Mkhize", role: "Director", email: "sipho@mkhize.co.za", phone: "082 111 2222" },
          { name: "Nomvula Mkhize", role: "Finance Manager", email: "finance@mkhize.co.za", phone: "083 222 3333" },
        ],
        deals: [
          { id: "OPP-001", title: "Mkhize Construction ERP", stage: "Proposal", value: 128000, probability: 65 },
        ],
        invoices: [
          { id: "SINV-00142", date: "2025-05-08", amount: 128000, status: "Unpaid" },
          { id: "SINV-00140", date: "2025-05-04", amount: 89400, status: "Overdue" },
          { id: "SINV-00130", date: "2025-04-01", amount: 92000, status: "Paid" },
        ],
        projects: [
          { id: "PROJ-001", name: "Mkhize ERP Implementation", status: "Open", progress: 65 },
        ],
        helpdesk: [
          { id: "HDT-00089", subject: "Cannot generate VAT report", status: "Open", priority: "High" },
        ],
      },
    },
    "fuze.crm.convert_lead": {
      success: true, message: "Lead converted successfully",
      data: { customer_id: "CUST-NEW", deal_id: "OPP-NEW", message: "Lead converted to customer and opportunity" },
    },
    "fuze.crm.create_lead": {
      success: true, message: "Lead created",
      data: { id: "LEAD-NEW", message: "Lead created successfully" },
    },
    "fuze.crm.send_quote": {
      success: true, message: "Quotation created",
      data: { quote_id: "QTN-NEW", message: "Quotation created and sent" },
    },
    "fuze.crm.create_invoice": {
      success: true, message: "Invoice created",
      data: { invoice_id: "SINV-NEW", message: "Invoice created successfully" },
    },

    // ── Accounting ───────────────────────────────────────────────────────────
    "fuze.accounting.get_dashboard": {
      success: true, message: "OK",
      data: {
        currency,
        cards: {
          receivables: 486200, payables: 139800,
          monthly_revenue: 342800, monthly_expenses: 218600, monthly_profit: 124200,
          cash_balance: 892400, overdue_invoices: 7, overdue_bills: 3,
        },
        period: { start: "2025-05-01", end: "2025-05-31" },
      },
    },
    "fuze.accounting.get_invoices": {
      success: true, message: "OK",
      data: {
        currency,
        invoices: [
          { id: "SINV-00142", customer: "CUST-001", customer_name: "Mkhize Construction", date: "2025-05-08", due: "2025-06-08", amount: 128000, outstanding: 128000, status: "Unpaid" },
          { id: "SINV-00141", customer: "CUST-002", customer_name: "Dlamini & Associates", date: "2025-05-06", due: "2025-06-06", amount: 47200, outstanding: 0, status: "Paid" },
          { id: "SINV-00140", customer: "CUST-003", customer_name: "Ndlovu Retail Group", date: "2025-05-04", due: "2025-05-18", amount: 89400, outstanding: 89400, status: "Overdue" },
          { id: "SINV-00139", customer: "CUST-004", customer_name: "Zulu Logistics", date: "2025-05-02", due: "2025-06-02", amount: 34100, outstanding: 0, status: "Paid" },
          { id: "SINV-00138", customer: "CUST-005", customer_name: "Sithole Technologies", date: "2025-04-28", due: "2025-05-12", amount: 66800, outstanding: 66800, status: "Overdue" },
        ],
      },
      meta: { total: 89 },
    },
    "fuze.accounting.get_bills": {
      success: true, message: "OK",
      data: {
        currency,
        bills: [
          { id: "PINV-00089", supplier: "TechParts SA", date: "2025-05-06", due: "2025-06-06", amount: 42800, outstanding: 42800, status: "Unpaid" },
          { id: "PINV-00088", supplier: "Office Essentials", date: "2025-05-04", due: "2025-05-18", amount: 8400, outstanding: 0, status: "Paid" },
          { id: "PINV-00087", supplier: "Cloud Services Ltd", date: "2025-05-01", due: "2025-05-31", amount: 28600, outstanding: 28600, status: "Unpaid" },
        ],
      },
      meta: { total: 31 },
    },
    "fuze.accounting.get_payments": {
      success: true, message: "OK",
      data: {
        currency,
        payments: [
          { id: "PAY-00089", party: "Mkhize Construction", type: "Receive", date: "2025-05-07", amount: 92000, mode: "EFT", reference: "MKH-20250507" },
          { id: "PAY-00088", party: "TechParts SA", type: "Pay", date: "2025-05-06", amount: 38400, mode: "EFT", reference: "TP-INV-88" },
          { id: "PAY-00087", party: "Dlamini & Associates", type: "Receive", date: "2025-05-05", amount: 47200, mode: "EFT", reference: "DLA-20250505" },
        ],
      },
      meta: { total: 67 },
    },
    "fuze.accounting.get_profit_loss": {
      success: true, message: "OK",
      data: {
        currency,
        period: { from: "2025-05-01", to: "2025-05-31" },
        income: { total: 342800, breakdown: [{ account: "Service Revenue", amount: 298000 }, { account: "Product Sales", amount: 44800 }] },
        expenses: { total: 218600, breakdown: [{ account: "Payroll", amount: 148200 }, { account: "Rent & Utilities", amount: 32400 }, { account: "Software & Subscriptions", amount: 18600 }, { account: "Marketing", amount: 12400 }, { account: "Other", amount: 7000 }] },
        profit: 124200,
        margin: 36.2,
      },
    },

    // ── Compliance ───────────────────────────────────────────────────────────
    "fuze.compliance.get_dashboard": {
      success: true, message: "OK",
      data: {
        vat: { next_due: "2025-05-30", period: "Apr 2025", amount_due: 84200, status: "pending", filed_this_year: 4, vat_number: "4820192837", registration_date: "2019-03-01" },
        paye: { next_due: "2025-05-07", period: "Apr 2025", amount_due: 38400, status: "overdue", filed_this_year: 4, emp_number: "7482910384" },
        uif: { next_due: "2025-05-07", period: "Apr 2025", amount_due: 9100, status: "overdue", filed_this_year: 4 },
        sdl: { next_due: "2025-05-07", period: "Apr 2025", amount_due: 4800, status: "pending", filed_this_year: 4 },
        cipc: { next_due: "2025-09-14", period: "Annual", amount_due: 1500, status: "ok", filed_this_year: 1, reg_number: "2018/123456/07", company_status: "In Business", directors: 2 },
        workmen: { next_due: "2025-06-30", period: "Annual", amount_due: 12800, status: "ok", filed_this_year: 0 },
        provisional_tax: { next_due: "2025-08-31", period: "First Provisional 2025", amount_due: 0, status: "upcoming" },
        overall_score: 74,
        total_liability: 136500,
      },
    },
    "fuze.compliance.get_vat_returns": {
      success: true, message: "OK",
      data: {
        returns: [
          { period: "Apr 2025", due: "2025-05-30", output_vat: 51300, input_vat: 32800, net_vat: 18500, status: "pending" },
          { period: "Mar 2025", due: "2025-04-30", output_vat: 47200, input_vat: 29100, net_vat: 18100, status: "filed", filed_date: "2025-04-28" },
          { period: "Feb 2025", due: "2025-03-31", output_vat: 43800, input_vat: 27400, net_vat: 16400, status: "filed", filed_date: "2025-03-29" },
        ],
      },
    },
    "fuze.compliance.get_payroll_submissions": {
      success: true, message: "OK",
      data: {
        submissions: [
          { period: "Apr 2025", due: "2025-05-07", paye: 38400, uif: 9100, sdl: 4800, total: 52300, status: "overdue" },
          { period: "Mar 2025", due: "2025-04-07", paye: 36800, uif: 8900, sdl: 4600, total: 50300, status: "filed", filed_date: "2025-04-05" },
          { period: "Feb 2025", due: "2025-03-07", paye: 35200, uif: 8700, sdl: 4400, total: 48300, status: "filed", filed_date: "2025-03-06" },
        ],
      },
    },

    // ── HR ───────────────────────────────────────────────────────────────────
    "fuze.hr.get_dashboard": {
      success: true, message: "OK",
      data: {
        cards: { active_employees: 24, present_today: 21, pending_leave: 4, open_positions: 2, pending_appraisals: 3, departments: 5, monthly_payroll: 486200 },
        departments: [
          { department: "Engineering", count: 8 },
          { department: "Sales", count: 6 },
          { department: "Finance", count: 4 },
          { department: "Operations", count: 4 },
          { department: "HR & Admin", count: 2 },
        ],
        period: { start: "2025-05-01", end: "2025-05-31" },
      },
    },
    "fuze.hr.get_employees": {
      success: true, message: "OK",
      data: {
        employees: [
          { id: "EMP-001", name: "Sipho Dlamini", department: "Engineering", designation: "Senior Developer", status: "Active", joined: "2022-03-01" },
          { id: "EMP-002", name: "Nomsa Zulu", department: "Sales", designation: "Sales Manager", status: "Active", joined: "2021-07-15" },
          { id: "EMP-003", name: "Lungelo Mthembu", department: "Finance", designation: "Accountant", status: "Active", joined: "2023-01-10" },
          { id: "EMP-004", name: "Ayanda Nkosi", department: "Operations", designation: "Operations Manager", status: "Active", joined: "2020-11-01" },
          { id: "EMP-005", name: "Phumzile Khumalo", department: "HR & Admin", designation: "HR Manager", status: "Active", joined: "2021-04-20" },
        ],
      },
      meta: { total: 24 },
    },
    "fuze.hr.get_leave_requests": {
      success: true, message: "OK",
      data: {
        requests: [
          { id: "LR-001", employee: "Sipho Dlamini", type: "Annual Leave", from: "2025-05-19", to: "2025-05-23", days: 5, status: "Pending" },
          { id: "LR-002", employee: "Nomsa Zulu", type: "Sick Leave", from: "2025-05-08", to: "2025-05-09", days: 2, status: "Approved" },
        ],
      },
    },
    "fuze.hr.get_payroll_summary": {
      success: true, message: "OK",
      data: {
        currency,
        period: "May 2025",
        total_gross: 548600, total_deductions: 62400, total_net: 486200,
        employees_paid: 24, paye_withheld: 38400, uif_withheld: 9100,
      },
    },
    "fuze.hr.get_attendance": {
      success: true, message: "OK",
      data: {
        date: "2025-05-08",
        present: 21, absent: 2, on_leave: 1, total: 24,
        records: [
          { employee: "Sipho Dlamini", status: "Present", in_time: "08:02", out_time: "17:15" },
          { employee: "Nomsa Zulu", status: "Present", in_time: "08:30", out_time: "17:00" },
        ],
      },
    },
    "fuze.hr.get_job_openings": {
      success: true, message: "OK",
      data: {
        openings: [
          { id: "JOB-001", title: "Full Stack Developer", department: "Engineering", status: "Open", applications: 12, posted: "2025-04-20" },
          { id: "JOB-002", title: "Sales Executive", department: "Sales", status: "Open", applications: 8, posted: "2025-04-28" },
        ],
      },
    },

    // ── Projects ─────────────────────────────────────────────────────────────
    "fuze.projects.get_dashboard": {
      success: true, message: "OK",
      data: {
        cards: { total_projects: 15, open_projects: 11, completed_projects: 4, open_tasks: 43, completed_tasks: 128, overdue_tasks: 6, billable_hours: 342.5 },
      },
    },
    "fuze.projects.get_projects": {
      success: true, message: "OK",
      data: {
        currency,
        projects: [
          { id: "PROJ-001", name: "Mkhize ERP Implementation", status: "Open", progress: 65, customer: "Mkhize Construction", due: "2025-07-31", priority: "High" },
          { id: "PROJ-002", name: "Dlamini Legal Platform", status: "Open", progress: 40, customer: "Dlamini & Associates", due: "2025-06-30", priority: "Medium" },
          { id: "PROJ-003", name: "Internal Website Upgrade", status: "Open", progress: 80, customer: "", due: "2025-05-31", priority: "Low" },
          { id: "PROJ-004", name: "Q1 Compliance Audit", status: "Completed", progress: 100, customer: "", due: "2025-04-15", priority: "High" },
        ],
      },
      meta: { total: 15 },
    },
    "fuze.projects.get_tasks": {
      success: true, message: "OK",
      data: {
        tasks: [
          { id: "TASK-001", subject: "Database schema design", project: "PROJ-001", status: "Completed", priority: "High", due: "2025-05-01" },
          { id: "TASK-002", subject: "API integration testing", project: "PROJ-001", status: "Working", priority: "High", due: "2025-05-20" },
          { id: "TASK-003", subject: "User acceptance testing", project: "PROJ-002", status: "Open", priority: "Medium", due: "2025-06-15" },
          { id: "TASK-004", subject: "Homepage redesign", project: "PROJ-003", status: "Working", priority: "Low", due: "2025-05-25" },
          { id: "TASK-005", subject: "Content migration", project: "PROJ-003", status: "Open", priority: "Low", due: "2025-05-30" },
        ],
      },
      meta: { total: 43 },
    },

    // ── Procurement ──────────────────────────────────────────────────────────
    "fuze.procurement.get_dashboard": {
      success: true, message: "OK",
      data: {
        currency,
        cards: { suppliers: 38, purchase_orders: 24, pending_orders: 9, receipts: 18, bills: 31, unpaid_bills: 8, total_spend: 1923400, this_month_spend: 218600, low_stock_items: 5 },
      },
    },
    "fuze.procurement.get_suppliers": {
      success: true, message: "OK",
      data: {
        suppliers: [
          { id: "SUP-001", name: "TechParts SA", group: "Technology", country: "South Africa", modified: "2025-05-06" },
          { id: "SUP-002", name: "Office Essentials", group: "Office Supplies", country: "South Africa", modified: "2025-05-05" },
          { id: "SUP-003", name: "Cloud Services Ltd", group: "Technology", country: "South Africa", modified: "2025-05-04" },
        ],
      },
      meta: { total: 38 },
    },
    "fuze.procurement.get_purchase_orders": {
      success: true, message: "OK",
      data: {
        currency,
        orders: [
          { id: "PO-00089", supplier: "TechParts SA", date: "2025-05-06", amount: 42800, status: "To Receive" },
          { id: "PO-00088", supplier: "Office Essentials", date: "2025-05-04", amount: 8400, status: "Completed" },
          { id: "PO-00087", supplier: "Cloud Services Ltd", date: "2025-05-01", amount: 28600, status: "To Bill" },
        ],
      },
      meta: { total: 24 },
    },
    "fuze.procurement.get_low_stock": {
      success: true, message: "OK",
      data: {
        items: [
          { id: "ITEM-001", name: "Laptop Stand", current_stock: 2, reorder_level: 5, warehouse: "Main Warehouse" },
          { id: "ITEM-002", name: "USB-C Hub", current_stock: 1, reorder_level: 10, warehouse: "Main Warehouse" },
        ],
      },
    },

    // ── Helpdesk ─────────────────────────────────────────────────────────────
    "fuze.helpdesk.get_dashboard": {
      success: true, message: "OK",
      data: {
        cards: { open: 14, in_progress: 7, resolved: 28, closed: 91, high_priority: 3, total: 140 },
        avg_resolution_days: 2.4,
        available: true,
      },
    },
    "fuze.helpdesk.get_tickets": {
      success: true, message: "OK",
      data: {
        tickets: [
          { id: "HDT-00089", subject: "Cannot generate VAT report", customer: "Mkhize Construction", raised_by: "finance@mkhize.co.za", status: "Open", priority: "High", created: "2025-05-08", updated: "2025-05-08" },
          { id: "HDT-00088", subject: "Invoice template not printing logo", customer: "Dlamini & Associates", raised_by: "admin@dlamini.co.za", status: "In Progress", priority: "Medium", created: "2025-05-07", updated: "2025-05-08" },
          { id: "HDT-00087", subject: "Cannot add new employee", customer: "Ndlovu Retail Group", raised_by: "hr@ndlovu.co.za", status: "Resolved", priority: "Low", created: "2025-05-06", updated: "2025-05-07" },
        ],
      },
      meta: { total: 140 },
    },

    // ── Sales ────────────────────────────────────────────────────────────────
    "fuze.sales.get_dashboard": {
      success: true, message: "OK",
      data: {
        currency,
        cards: { quotations: 18, sales_orders: 34, pending_orders: 9, invoices: 89, total_revenue: 2847500, month_revenue: 342800, outstanding: 486200, overdue_invoices: 7 },
        period: { month_start: "2025-05-01", month_end: "2025-05-31" },
      },
    },
    "fuze.sales.get_quotations": {
      success: true, message: "OK",
      data: {
        currency,
        quotations: [
          { id: "QTN-00034", customer: "Khumalo Logistics", date: "2025-05-07", valid_till: "2025-06-06", amount: 74000, status: "Open" },
          { id: "QTN-00033", customer: "Mokoena Legal", date: "2025-05-05", valid_till: "2025-06-04", amount: 38000, status: "Open" },
          { id: "QTN-00032", customer: "Nkosi Manufacturing", date: "2025-05-03", valid_till: "2025-06-02", amount: 156000, status: "Ordered" },
        ],
      },
      meta: { total: 18 },
    },
    "fuze.sales.get_sales_orders": {
      success: true, message: "OK",
      data: {
        currency,
        orders: [
          { id: "SO-00034", customer: "Nkosi Manufacturing", date: "2025-05-05", amount: 156000, status: "To Deliver and Bill" },
          { id: "SO-00033", customer: "Zulu Logistics", date: "2025-04-28", amount: 98000, status: "Completed" },
        ],
      },
      meta: { total: 34 },
    },

    "fuze.ai.chat": {
      success: true, message: "OK",
      data: { reply: "I'm Fuze AI running in demo mode. Connect your Fuze backend to enable live AI assistance." },
    },
  };

  return mock[method] ?? { success: true, message: "OK", data: {} };
}

// ─── Typed API functions ───────────────────────────────────────────────────────

export const api = {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  login: (usr: string, pwd: string) => authLogin(usr, pwd),
  logout: () => authLogout(),
  session: () => getSession(),
  signup: (data: Parameters<typeof authSignup>[0]) => authSignup(data),
  resetPassword: (user: string) => authResetPassword(user),

  // ── AI Chat (routed through Fuze backend) ────────────────────────────────────
  chat: async (message: string, history: { role: string; content: string }[] = []): Promise<string> => {
    const res = await callFuze<{ reply: string }>("fuze.ai.chat", {
      message,
      history: JSON.stringify(history.slice(-10)), // last 10 messages for context
    });
    return res?.data?.reply || res?.message || "No response";
  },
  // ── Insights ────────────────────────────────────────────────────────────────
  getBusinessOverview: (company?: string) =>
    callFuze("fuze.insights.get_business_overview", { company }),
  getRevenueChart: (company?: string, months = 6) =>
    callFuze("fuze.insights.get_revenue_chart", { company, months }),
  getTopCustomers: (company?: string, limit = 5) =>
    callFuze("fuze.insights.get_top_customers", { company, limit }),
  getPipelineSummary: (company?: string) =>
    callFuze("fuze.insights.get_pipeline_summary", { company }),

  // ── Reports ─────────────────────────────────────────────────────────────────
  getSaasMembers: (plan?: string, limit = 50) =>
    callFuze("fuze.reports.get_saas_members", { plan, limit }),
  getCustomerFullReport: (customer_id: string) =>
    callFuze("fuze.reports.get_customer_full_report", { customer_id }),
  getOperationsSummary: (company?: string, period?: string) =>
    callFuze("fuze.reports.get_operations_summary", { company, period }),

  // ── CRM ─────────────────────────────────────────────────────────────────────
  getCRMDashboard: (company?: string) =>
    callFuze("fuze.crm.get_dashboard", { company }),
  getPipeline: (limit = 50, offset = 0, stage?: string) =>
    callFuze("fuze.crm.get_pipeline", { limit, offset, stage }),
  getLeads: (limit = 50, offset = 0, status?: string) =>
    callFuze("fuze.crm.get_leads", { limit, offset, status }),
  createLead: (data: Record<string, unknown>) =>
    callFuze("fuze.crm.create_lead", { data: JSON.stringify(data) }),
  getCustomers: (limit = 50, offset = 0, search?: string) =>
    callFuze("fuze.crm.get_customers", { limit, offset, search }),
  getCustomer360: (customer_id: string) =>
    callFuze("fuze.crm.get_customer_360", { customer_id }),
  convertLead: (lead_id: string, data: Record<string, unknown>) =>
    callFuze("fuze.crm.convert_lead", { lead_id, data: JSON.stringify(data) }),
  sendQuote: (deal_id: string, data: Record<string, unknown>) =>
    callFuze("fuze.crm.send_quote", { deal_id, data: JSON.stringify(data) }),
  createInvoiceFromDeal: (deal_id: string) =>
    callFuze("fuze.crm.create_invoice", { deal_id }),

  // ── Accounting ───────────────────────────────────────────────────────────────
  getAccountingDashboard: (company?: string) =>
    callFuze("fuze.accounting.get_dashboard", { company }),
  getInvoices: (company?: string, status?: string, limit = 50, offset = 0) =>
    callFuze("fuze.accounting.get_invoices", { company, status, limit, offset }),
  getBills: (company?: string, status?: string, limit = 50, offset = 0) =>
    callFuze("fuze.accounting.get_bills", { company, status, limit, offset }),
  getPayments: (company?: string, limit = 50) =>
    callFuze("fuze.accounting.get_payments", { company, limit }),
  getProfitLoss: (company?: string, from_date?: string, to_date?: string) =>
    callFuze("fuze.accounting.get_profit_loss", { company, from_date, to_date }),

  // ── Compliance ───────────────────────────────────────────────────────────────
  getComplianceDashboard: (company?: string) =>
    callFuze("fuze.compliance.get_dashboard", { company }),
  getVatReturns: (company?: string, limit = 12) =>
    callFuze("fuze.compliance.get_vat_returns", { company, limit }),
  getPayrollSubmissions: (company?: string, limit = 12) =>
    callFuze("fuze.compliance.get_payroll_submissions", { company, limit }),

  // ── HR ───────────────────────────────────────────────────────────────────────
  getHRDashboard: (company?: string) =>
    callFuze("fuze.hr.get_dashboard", { company }),
  getEmployees: (status = "Active", company?: string, limit = 50) =>
    callFuze("fuze.hr.get_employees", { status, company, limit }),
  getLeaveRequests: (status?: string, limit = 50) =>
    callFuze("fuze.hr.get_leave_requests", { status, limit }),
  getPayrollSummary: (company?: string) =>
    callFuze("fuze.hr.get_payroll_summary", { company }),
  getAttendance: (date?: string, limit = 50) =>
    callFuze("fuze.hr.get_attendance", { date, limit }),
  getJobOpenings: (company?: string) =>
    callFuze("fuze.hr.get_job_openings", { company }),

  // ── Projects ─────────────────────────────────────────────────────────────────
  getProjectsDashboard: (company?: string) =>
    callFuze("fuze.projects.get_dashboard", { company }),
  getProjects: (status?: string, company?: string, limit = 50) =>
    callFuze("fuze.projects.get_projects", { status, company, limit }),
  getTasks: (project?: string, status?: string, limit = 50) =>
    callFuze("fuze.projects.get_tasks", { project, status, limit }),
  createTask: (data: Record<string, unknown>) =>
    callFuze("fuze.projects.create_task", { data: JSON.stringify(data) }),
  updateTaskStatus: (task_id: string, status: string) =>
    callFuze("fuze.projects.update_task_status", { task_id, status }),

  // ── Procurement ──────────────────────────────────────────────────────────────
  getProcurementDashboard: (company?: string) =>
    callFuze("fuze.procurement.get_dashboard", { company }),
  getSuppliers: (limit = 50) =>
    callFuze("fuze.procurement.get_suppliers", { limit }),
  getPurchaseOrders: (company?: string, status?: string, limit = 50) =>
    callFuze("fuze.procurement.get_purchase_orders", { company, status, limit }),
  getLowStock: () =>
    callFuze("fuze.procurement.get_low_stock", {}),

  // ── Helpdesk ─────────────────────────────────────────────────────────────────
  getHelpdeskDashboard: () =>
    callFuze("fuze.helpdesk.get_dashboard", {}),
  getTickets: (status?: string, priority?: string, limit = 50) =>
    callFuze("fuze.helpdesk.get_tickets", { status, priority, limit }),
  createTicket: (data: Record<string, unknown>) =>
    callFuze("fuze.helpdesk.create_ticket", { data: JSON.stringify(data) }),
  updateTicket: (ticket_id: string, data: Record<string, unknown>) =>
    callFuze("fuze.helpdesk.update_ticket", { ticket_id, data: JSON.stringify(data) }),

  // ── Sales ────────────────────────────────────────────────────────────────────
  getSalesDashboard: (company?: string) =>
    callFuze("fuze.sales.get_dashboard", { company }),
  getQuotations: (company?: string, status?: string, limit = 50) =>
    callFuze("fuze.sales.get_quotations", { company, status, limit }),
  getSalesOrders: (company?: string, status?: string, limit = 50) =>
    callFuze("fuze.sales.get_sales_orders", { company, status, limit }),
};

export default api;
