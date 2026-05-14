import { erpCreate, erpGet, erpList, erpMethod, BusinessSuiteError } from "@/lib/server/erpnext";

export type Row = Record<string, unknown>;
export type ApiEnvelope<T> = { success: boolean; message: string; data: T };

export function envelope<T>(data: T, message = "Success"): ApiEnvelope<T> {
  return { success: true, message, data };
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export async function safeList(doctype: string, fields: string[], limit = 200, orderBy = "modified desc"): Promise<Row[]> {
  const attempts = [
    fields,
    fields.filter((field) => !["source", "sales_stage", "probability", "expected_closing"].includes(field)),
    ["name", "status", "modified"],
    ["name", "modified"],
    ["name"],
  ].map((items) => Array.from(new Set(items.filter(Boolean))));

  for (const attempt of attempts) {
    try {
      return await erpList<Row>(doctype, { fields: attempt, limit, orderBy });
    } catch {
      // Try safer field set.
    }
  }
  return [];
}

function sum(rows: Row[], field: string): number {
  return rows.reduce((total, row) => total + Number(row[field] || 0), 0);
}

function countOpen(rows: Row[], statusField = "status"): number {
  return rows.filter((row) => !String(row[statusField] || "").toLowerCase().match(/closed|cancel|lost|inactive|paid/)).length;
}

export async function getCrmWorkspace() {
  const [leads, opportunities, quotes, customers, campaigns] = await Promise.all([
    safeList("Lead", ["name", "lead_name", "company_name", "status", "email_id", "mobile_no", "modified"], 150),
    safeList("Opportunity", ["name", "party_name", "customer_name", "status", "opportunity_amount", "expected_closing", "modified"], 150),
    safeList("Quotation", ["name", "party_name", "quotation_to", "status", "grand_total", "transaction_date", "modified"], 100),
    safeList("Customer", ["name", "customer_name", "customer_group", "territory", "modified"], 100),
    safeList("Campaign", ["name", "campaign_name", "status", "modified"], 80),
  ]);

  const rows = [
    ...leads.map((row) => ({ ...row, workspace_type: "Lead" })),
    ...opportunities.map((row) => ({ ...row, workspace_type: "Opportunity" })),
    ...quotes.map((row) => ({ ...row, workspace_type: "Quote" })),
    ...customers.map((row) => ({ ...row, workspace_type: "Customer" })),
    ...campaigns.map((row) => ({ ...row, workspace_type: "Campaign" })),
  ];

  return {
    leads,
    opportunities,
    quotes,
    customers,
    campaigns,
    rows,
    metrics: {
      openLeads: countOpen(leads),
      opportunities: opportunities.length,
      pipelineValue: sum(opportunities, "opportunity_amount"),
      quotes: quotes.length,
      customers: customers.length,
    },
  };
}

export async function getFinanceWorkspace() {
  const [invoices, payments, quotes, bank, vat] = await Promise.all([
    safeList("Sales Invoice", ["name", "customer", "status", "grand_total", "outstanding_amount", "posting_date", "due_date", "modified"], 200),
    safeList("Payment Entry", ["name", "party", "payment_type", "paid_amount", "received_amount", "posting_date", "modified"], 200),
    safeList("Quotation", ["name", "party_name", "status", "grand_total", "transaction_date", "modified"], 120),
    safeList("Bank Account", ["name", "account_name", "bank", "account_type", "modified"], 80),
    safeList("Fuze VAT Return", ["name", "company", "status", "vat_payable", "to_date", "modified"], 80),
  ]);

  const rows = [
    ...invoices.map((row) => ({ ...row, workspace_type: "Invoice" })),
    ...payments.map((row) => ({ ...row, workspace_type: "Payment" })),
    ...quotes.map((row) => ({ ...row, workspace_type: "Quote" })),
    ...bank.map((row) => ({ ...row, workspace_type: "Bank" })),
    ...vat.map((row) => ({ ...row, workspace_type: "VAT" })),
  ];

  return {
    invoices,
    payments,
    quotes,
    bank,
    vat,
    rows,
    metrics: {
      revenue: sum(invoices, "grand_total"),
      outstanding: sum(invoices, "outstanding_amount"),
      paymentsReceived: sum(payments, "paid_amount") + sum(payments, "received_amount"),
      invoiceCount: invoices.length,
    },
  };
}

export async function getHrWorkspace() {
  const [employees, attendance, leave, payroll] = await Promise.all([
    safeList("Employee", ["name", "employee_name", "status", "department", "designation", "modified"], 200),
    safeList("Attendance", ["name", "employee", "employee_name", "status", "attendance_date", "modified"], 150),
    safeList("Leave Application", ["name", "employee", "employee_name", "status", "from_date", "to_date", "modified"], 150),
    safeList("Salary Slip", ["name", "employee", "employee_name", "status", "gross_pay", "net_pay", "modified"], 100),
  ]);
  const rows = [
    ...employees.map((row) => ({ ...row, workspace_type: "Employee" })),
    ...attendance.map((row) => ({ ...row, workspace_type: "Attendance" })),
    ...leave.map((row) => ({ ...row, workspace_type: "Leave" })),
    ...payroll.map((row) => ({ ...row, workspace_type: "Payroll" })),
  ];
  return { employees, attendance, leave, payroll, rows, metrics: { employees: employees.length, attendance: attendance.length, leave: leave.length, payroll: payroll.length } };
}

export async function getComplianceWorkspace() {
  const [companyCompliance, vat, paye, uif, sdl, cipc, reminders] = await Promise.all([
    safeList("Fuze Company Compliance", ["name", "company", "overall_status", "last_reviewed", "modified"], 100),
    safeList("Fuze VAT Return", ["name", "company", "status", "due_date", "vat_payable", "modified"], 100),
    safeList("Fuze PAYE Return", ["name", "company", "status", "due_date", "modified"], 100),
    safeList("Fuze UIF Declaration", ["name", "company", "status", "due_date", "modified"], 100),
    safeList("Fuze SDL Return", ["name", "company", "status", "due_date", "modified"], 100),
    safeList("Fuze CIPC Annual Return", ["name", "company", "status", "due_date", "return_year", "modified"], 100),
    safeList("Fuze Compliance Reminder", ["name", "company", "status", "due_date", "reference_doctype", "modified"], 100),
  ]);
  const rows = [
    ...companyCompliance.map((row) => ({ ...row, workspace_type: "Company Compliance" })),
    ...vat.map((row) => ({ ...row, workspace_type: "VAT" })),
    ...paye.map((row) => ({ ...row, workspace_type: "PAYE" })),
    ...uif.map((row) => ({ ...row, workspace_type: "UIF" })),
    ...sdl.map((row) => ({ ...row, workspace_type: "SDL" })),
    ...cipc.map((row) => ({ ...row, workspace_type: "CIPC" })),
    ...reminders.map((row) => ({ ...row, workspace_type: "Reminder" })),
  ];
  return { companyCompliance, vat, paye, uif, sdl, cipc, reminders, rows, metrics: { compliance: companyCompliance.length, filings: vat.length + paye.length + uif.length + sdl.length + cipc.length, reminders: reminders.length, overdue: rows.filter((r) => String(r.status || "").toLowerCase().includes("overdue")).length } };
}

export async function getAppointmentsWorkspace() {
  const appointments = await safeList("Event", ["name", "subject", "status", "starts_on", "ends_on", "event_category", "modified"], 200);
  return { appointments, rows: appointments.map((row) => ({ ...row, workspace_type: "Appointment" })), metrics: { appointments: appointments.length, open: countOpen(appointments), today: appointments.filter((row) => String(row.starts_on || "").slice(0, 10) === new Date().toISOString().slice(0, 10)).length } };
}

export async function getDocumentsWorkspace() {
  const files = await safeList("File", ["name", "file_name", "file_url", "attached_to_doctype", "attached_to_name", "modified"], 200);
  return { files, rows: files.map((row) => ({ ...row, workspace_type: "File" })), metrics: { files: files.length, attached: files.filter((row) => row.attached_to_name).length } };
}

export async function getWorkspace(workspace: string) {
  if (workspace === "crm") return getCrmWorkspace();
  if (workspace === "finance") return getFinanceWorkspace();
  if (workspace === "hr") return getHrWorkspace();
  if (workspace === "compliance") return getComplianceWorkspace();
  if (workspace === "appointments") return getAppointmentsWorkspace();
  if (workspace === "documents") return getDocumentsWorkspace();
  throw new BusinessSuiteError("Unknown workspace", 404);
}

export async function convertLeadToCustomer(leadId: string) {
  const response = await erpGet<{ data?: Row; message?: Row }>(`/api/resource/Lead/${encodeURIComponent(leadId)}`);
  const lead = response.data || response.message || {};
  const customerName = String(lead.company_name || lead.lead_name || lead.name || "New Customer");
  const customer = await erpCreate<Row>("Customer", {
    customer_name: customerName,
    customer_type: "Company",
    customer_group: "All Customer Groups",
    territory: "All Territories",
  });
  try {
    await erpMethod("frappe.client.set_value", { doctype: "Lead", name: leadId, fieldname: "status", value: "Converted" });
  } catch {
    // Some tenants restrict Lead status updates. Customer creation is still useful.
  }
  return { lead, customer };
}

export async function submitDocument(doctype: string, name: string) {
  const docResponse = await erpGet<{ data?: Row; message?: Row }>(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`);
  const doc = docResponse.data || docResponse.message || docResponse;
  return erpMethod("frappe.client.submit", { doc });
}
