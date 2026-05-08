import { erpList } from "./erpnext";
import {
  mapAppointments,
  mapCommunications,
  mapCompliance,
  mapCustomers,
  mapEmployees,
  mapInvoices,
  mapItems,
  mapPayments,
  mapProjects,
  mapQuotes,
  mapSuppliers,
  mapSupport,
  mapTasks
} from "@/lib/mappers";
import { DashboardData } from "@/lib/types";

async function safeList<T>(doctype: string, options: { fields?: string[]; filters?: unknown[]; limit?: number; orderBy?: string } = {}): Promise<T[]> {
  try { return await erpList<T>(doctype, options); } catch { return []; }
}

export async function getDashboardData(): Promise<DashboardData> {
  const [
    customersRaw,
    invoicesRaw,
    quotesRaw,
    paymentsRaw,
    employeesRaw,
    itemsRaw,
    projectsRaw,
    tasksRaw,
    supportRaw,
    appointmentsRaw,
    chatRaw,
    vatRaw,
    payeRaw,
    uifRaw,
    sdlRaw,
    cipcRaw
  ] = await Promise.all([
    safeList("Customer", { fields: ["name", "customer_name", "customer_type", "customer_group", "territory", "mobile_no", "email_id", "modified", "owner"], limit: 50, orderBy: "modified desc" }),
    safeList("Sales Invoice", { fields: ["name", "customer", "posting_date", "due_date", "grand_total", "outstanding_amount", "status", "modified", "owner"], limit: 50, orderBy: "modified desc" }),
    safeList("Quotation", { fields: ["name", "party_name", "transaction_date", "valid_till", "grand_total", "status", "modified", "owner"], limit: 50, orderBy: "modified desc" }),
    safeList("Payment Entry", { fields: ["name", "party", "party_type", "posting_date", "paid_amount", "payment_type", "status", "modified", "owner"], limit: 50, orderBy: "modified desc" }),
    safeList("Employee", { fields: ["name", "employee_name", "department", "designation", "status", "company_email", "modified", "owner"], limit: 50, orderBy: "modified desc" }),
    safeList("Item", { fields: ["name", "item_name", "item_group", "stock_uom", "disabled", "modified", "owner"], limit: 50, orderBy: "modified desc" }),
    safeList("Project", { fields: ["name", "project_name", "status", "expected_start_date", "expected_end_date", "percent_complete", "modified", "owner"], limit: 50, orderBy: "modified desc" }),
    safeList("Task", { fields: ["name", "subject", "status", "priority", "exp_start_date", "exp_end_date", "project", "modified", "owner"], limit: 50, orderBy: "modified desc" }),
    safeList("Issue", { fields: ["name", "subject", "issue_type", "status", "priority", "customer", "raised_by", "description", "opening_date", "modified", "owner"], limit: 50, orderBy: "modified desc" }),
    safeList("Event", { fields: ["name", "subject", "starts_on", "ends_on", "status", "event_type", "description", "modified", "owner"], limit: 50, orderBy: "starts_on desc" }),
    safeList("Communication", { fields: ["name", "subject", "content", "sender", "communication_type", "creation", "reference_doctype", "reference_name", "modified", "owner"], limit: 50, orderBy: "creation desc" }),
    safeList("Fuze VAT Return", { fields: ["name", "company", "status", "to_date", "submission_date", "net_vat", "vat_payable", "vat_refundable", "modified", "owner"], limit: 50, orderBy: "modified desc" }),
    safeList("Fuze PAYE Return", { fields: ["name", "company", "status", "due_date", "submission_date", "month", "year", "total_emp201", "total_paye", "modified", "owner"], limit: 50, orderBy: "modified desc" }),
    safeList("Fuze UIF Declaration", { fields: ["name", "company", "status", "due_date", "submission_date", "declaration_month", "declaration_year", "total_uif", "modified", "owner"], limit: 50, orderBy: "modified desc" }),
    safeList("Fuze SDL Declaration", { fields: ["name", "company", "status", "submission_date", "declaration_month", "declaration_year", "total_sdl", "modified", "owner"], limit: 50, orderBy: "modified desc" }),
    safeList("Fuze CIPC Annual Return", { fields: ["name", "company", "status", "due_date", "submission_date", "return_year", "cipc_fee", "payment_reference", "modified", "owner"], limit: 50, orderBy: "modified desc" })
  ]);

  return {
    customers: mapCustomers(customersRaw),
    invoices: mapInvoices(invoicesRaw),
    quotes: mapQuotes(quotesRaw),
    payments: mapPayments(paymentsRaw),
    employees: mapEmployees(employeesRaw),
    items: mapItems(itemsRaw),
    projects: mapProjects(projectsRaw),
    tasks: mapTasks(tasksRaw),
    support: mapSupport(supportRaw),
    appointments: mapAppointments(appointmentsRaw),
    chat: mapCommunications(chatRaw),
    compliance: [
      ...mapCompliance(vatRaw, "VAT"),
      ...mapCompliance(payeRaw, "PAYE"),
      ...mapCompliance(uifRaw, "UIF"),
      ...mapCompliance(sdlRaw, "SDL"),
      ...mapCompliance(cipcRaw, "CIPC")
    ]
  };
}

export async function getModuleData(module: string): Promise<Record<string, unknown>[]> {
  switch (module) {
    case "customers": return mapCustomers(await safeList("Customer", { fields: ["name", "customer_name", "customer_type", "customer_group", "territory", "mobile_no", "email_id", "modified"], limit: 100, orderBy: "modified desc" }));
    case "invoices": return mapInvoices(await safeList("Sales Invoice", { fields: ["name", "customer", "posting_date", "due_date", "grand_total", "outstanding_amount", "status", "modified"], limit: 100, orderBy: "modified desc" }));
    case "quotes": return mapQuotes(await safeList("Quotation", { fields: ["name", "party_name", "transaction_date", "valid_till", "grand_total", "status", "modified"], limit: 100, orderBy: "modified desc" }));
    case "payments": return mapPayments(await safeList("Payment Entry", { fields: ["name", "party", "party_type", "posting_date", "paid_amount", "payment_type", "status", "modified"], limit: 100, orderBy: "modified desc" }));
    case "employees": return mapEmployees(await safeList("Employee", { fields: ["name", "employee_name", "department", "designation", "status", "company_email", "modified"], limit: 100, orderBy: "modified desc" }));
    case "items": return mapItems(await safeList("Item", { fields: ["name", "item_name", "item_group", "stock_uom", "disabled", "modified"], limit: 100, orderBy: "modified desc" }));
    case "suppliers": return mapSuppliers(await safeList("Supplier", { fields: ["name", "supplier_name", "supplier_group", "supplier_type", "modified"], limit: 100, orderBy: "modified desc" }));
    case "projects": return mapProjects(await safeList("Project", { fields: ["name", "project_name", "status", "expected_start_date", "expected_end_date", "percent_complete", "modified"], limit: 100, orderBy: "modified desc" }));
    case "tasks": return mapTasks(await safeList("Task", { fields: ["name", "subject", "status", "priority", "exp_start_date", "exp_end_date", "project", "modified"], limit: 100, orderBy: "modified desc" }));
    case "support": return mapSupport(await safeList("Issue", { fields: ["name", "subject", "issue_type", "status", "priority", "customer", "raised_by", "opening_date", "modified"], limit: 100, orderBy: "modified desc" }));
    case "appointments": return mapAppointments(await safeList("Event", { fields: ["name", "subject", "starts_on", "ends_on", "status", "event_type", "description", "modified"], limit: 100, orderBy: "starts_on desc" }));
    case "chat": return mapCommunications(await safeList("Communication", { fields: ["name", "subject", "content", "sender", "communication_type", "creation", "reference_doctype", "reference_name", "modified"], limit: 100, orderBy: "creation desc" }));
    default: return [];
  }
}
