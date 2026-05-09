import { fuzeData, rowsFrom } from "./fuzeApi";
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
  mapSupport,
  mapTasks
} from "@/lib/mappers";
import { DashboardData } from "@/lib/types";

type Row = Record<string, unknown>;

async function controlledRows(method: string, keys: string[], args: Row = {}): Promise<Row[]> {
  const data = await fuzeData<Row>(method, args, {});
  return rowsFrom(data, keys);
}

export async function getDashboardData(): Promise<DashboardData> {
  const [
    crmDashboard,
    invoices,
    quotes,
    employees,
    products,
    projects,
    tasks,
    tickets,
    complianceDashboard,
  ] = await Promise.all([
    fuzeData<Row>("fuze_suite.api.crm.get_dashboard", {}, {}),
    controlledRows("fuze_suite.api.accounting.get_invoices", ["invoices", "rows", "data"]),
    controlledRows("fuze_suite.api.sales.get_quotations", ["quotations", "quotes", "rows", "data"]),
    controlledRows("fuze_suite.api.hr.get_employees", ["employees", "rows", "data"]),
    controlledRows("fuze_suite.api.sales.get_products", ["products", "items", "rows", "data"]),
    controlledRows("fuze_suite.api.projects.get_projects", ["projects", "rows", "data"]),
    controlledRows("fuze_suite.api.projects.get_tasks", ["tasks", "rows", "data"]),
    controlledRows("fuze_suite.api.helpdesk.get_tickets", ["tickets", "issues", "rows", "data"]),
    fuzeData<Row>("fuze_suite.api.compliance.get_compliance_dashboard", {}, {}),
  ]);

  const crmCards = (crmDashboard.cards || {}) as Row;
  const complianceCards = complianceDashboard as Row;

  const syntheticCustomers = Array.from({ length: Number(crmCards.customers || 0) }, (_, i) => ({
    name: `CUSTOMER-${i + 1}`,
    customer_name: `Customer ${i + 1}`,
  }));

  const syntheticCompliance = [
    { name: "VAT Returns", company: complianceCards.company, status: "Open", kind: "VAT", amount_due: complianceCards.vat_returns },
    { name: "PAYE Returns", company: complianceCards.company, status: "Open", kind: "PAYE", amount_due: complianceCards.paye_returns },
    { name: "CIPC Returns", company: complianceCards.company, status: "Open", kind: "CIPC", amount_due: complianceCards.cipc_returns },
  ];

  return {
    customers: mapCustomers(syntheticCustomers),
    invoices: mapInvoices(invoices),
    quotes: mapQuotes(quotes),
    payments: mapPayments([]),
    employees: mapEmployees(employees),
    items: mapItems(products),
    projects: mapProjects(projects),
    tasks: mapTasks(tasks),
    support: mapSupport(tickets),
    appointments: mapAppointments([]),
    chat: mapCommunications([]),
    compliance: mapCompliance(syntheticCompliance, "VAT"),
  };
}

export async function getModuleData(module: string): Promise<Record<string, unknown>[]> {
  switch (module) {
    case "leads": return controlledRows("fuze_suite.api.crm.get_leads", ["leads", "rows", "data"]);
    case "quotes": return controlledRows("fuze_suite.api.sales.get_quotations", ["quotations", "quotes", "rows", "data"]);
    case "invoices": return controlledRows("fuze_suite.api.accounting.get_invoices", ["invoices", "rows", "data"]);
    case "employees": return controlledRows("fuze_suite.api.hr.get_employees", ["employees", "rows", "data"]);
    case "items": return controlledRows("fuze_suite.api.sales.get_products", ["products", "items", "rows", "data"]);
    case "suppliers": return controlledRows("fuze_suite.api.procurement.get_suppliers", ["suppliers", "rows", "data"]);
    case "projects": return controlledRows("fuze_suite.api.projects.get_projects", ["projects", "rows", "data"]);
    case "tasks": return controlledRows("fuze_suite.api.projects.get_tasks", ["tasks", "rows", "data"]);
    case "support": return controlledRows("fuze_suite.api.helpdesk.get_tickets", ["tickets", "issues", "rows", "data"]);
    default: return [];
  }
}
