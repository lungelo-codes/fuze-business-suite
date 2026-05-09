import { getCrudConfig } from "@/lib/crudConfig";
import { fuzeData, rowsFrom } from "@/lib/server/fuzeApi";

type Row = Record<string, unknown>;

const MODULE_METHODS: Record<string, { method: string; keys: string[] }> = {
  leads: { method: "fuze_suite.api.crm.get_leads", keys: ["leads", "rows", "data"] },
  opportunities: { method: "fuze_suite.api.crm.get_pipeline", keys: ["pipeline", "opportunities", "deals", "rows", "data"] },
  "crm-deals": { method: "fuze_suite.api.crm.get_pipeline", keys: ["pipeline", "deals", "opportunities", "rows", "data"] },
  quotes: { method: "fuze_suite.api.sales.get_quotations", keys: ["quotations", "quotes", "rows", "data"] },
  invoices: { method: "fuze_suite.api.accounting.get_invoices", keys: ["invoices", "rows", "data"] },
  employees: { method: "fuze_suite.api.hr.get_employees", keys: ["employees", "rows", "data"] },
  leave: { method: "fuze_suite.api.hr.get_leave_requests", keys: ["leave_requests", "leaves", "rows", "data"] },
  attendance: { method: "fuze_suite.api.hr.get_attendance", keys: ["attendance", "rows", "data"] },
  items: { method: "fuze_suite.api.sales.get_products", keys: ["products", "items", "rows", "data"] },
  suppliers: { method: "fuze_suite.api.procurement.get_suppliers", keys: ["suppliers", "rows", "data"] },
  "purchase-orders": { method: "fuze_suite.api.procurement.get_purchase_orders", keys: ["purchase_orders", "orders", "rows", "data"] },
  projects: { method: "fuze_suite.api.projects.get_projects", keys: ["projects", "rows", "data"] },
  tasks: { method: "fuze_suite.api.projects.get_tasks", keys: ["tasks", "rows", "data"] },
  support: { method: "fuze_suite.api.helpdesk.get_tickets", keys: ["tickets", "issues", "rows", "data"] },
  "helpdesk-tickets": { method: "fuze_suite.api.helpdesk.get_tickets", keys: ["tickets", "issues", "rows", "data"] },
  vat: { method: "fuze_suite.api.compliance.list_vat_returns", keys: ["vat_returns", "rows", "data"] },
  cipc: { method: "fuze_suite.api.compliance.list_cipc", keys: ["cipc", "rows", "data"] },
  paye: { method: "fuze_suite.api.compliance.list_payroll_compliance", keys: ["payroll_compliance", "rows", "data"] },
  uif: { method: "fuze_suite.api.compliance.list_payroll_compliance", keys: ["payroll_compliance", "rows", "data"] },
  sdl: { method: "fuze_suite.api.compliance.list_payroll_compliance", keys: ["payroll_compliance", "rows", "data"] },
};

async function controlledRows(moduleId: string): Promise<Row[]> {
  const config = MODULE_METHODS[moduleId];
  if (!config) return [];
  const data = await fuzeData<Row>(config.method, {}, {});
  return rowsFrom(data, config.keys);
}

export async function getCrudRows(moduleId: string): Promise<Row[]> {
  const config = getCrudConfig(moduleId);
  if (!config) return [];
  return controlledRows(moduleId);
}
