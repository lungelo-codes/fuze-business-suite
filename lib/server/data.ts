import { erpMethod } from "./erpnext";
import { listModuleRows } from "@/lib/server/moduleApi";
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

type Row = Record<string, unknown>;

function rows(value: unknown): Row[] {
  const v = value as any;
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.data)) return v.data;
  if (Array.isArray(v?.message)) return v.message;
  for (const key of ["rows", "items", "records", "tickets", "communications", "vat_returns", "paye_returns", "uif_declarations", "sdl_declarations", "cipc_returns", "reminders"]) {
    if (Array.isArray(v?.[key])) return v[key];
  }
  return [];
}

async function safeModule(moduleId: string): Promise<Row[]> {
  try { return await listModuleRows(moduleId); } catch { return []; }
}

async function safeMethod(method: string, args: Row = {}): Promise<Row[]> {
  try { return rows(await erpMethod<unknown>(method, args)); } catch { return []; }
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
    safeModule("customers"),
    safeModule("invoices"),
    safeModule("quotes"),
    safeModule("payments"),
    safeModule("employees"),
    safeModule("items"),
    safeModule("projects"),
    safeModule("tasks"),
    safeMethod("helpdesk.get_tickets", { limit: 50, offset: 0 }),
    safeModule("appointments"),
    safeMethod("crm.get_communications", { limit: 50, offset: 0 }),
    safeMethod("compliance.list_vat_returns", { limit: 50, offset: 0 }),
    safeMethod("compliance.list_paye_returns", { limit: 50, offset: 0 }),
    safeMethod("compliance.list_tasks", { task_type: "UIF", limit: 50, offset: 0 }),
    safeMethod("compliance.list_tasks", { task_type: "SDL", limit: 50, offset: 0 }),
    safeMethod("compliance.list_cipc_returns", { limit: 50, offset: 0 })
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
    case "customers": return mapCustomers(await safeModule("customers"));
    case "invoices": return mapInvoices(await safeModule("invoices"));
    case "quotes": return mapQuotes(await safeModule("quotes"));
    case "payments": return mapPayments(await safeModule("payments"));
    case "employees": return mapEmployees(await safeModule("employees"));
    case "items": return mapItems(await safeModule("items"));
    case "suppliers": return mapSuppliers(await safeModule("suppliers"));
    case "projects": return mapProjects(await safeModule("projects"));
    case "tasks": return mapTasks(await safeModule("tasks"));
    case "support": return mapSupport(await safeMethod("helpdesk.get_tickets", { limit: 100, offset: 0 }));
    case "appointments": return mapAppointments(await safeModule("appointments"));
    case "chat": return mapCommunications(await safeMethod("crm.get_communications", { limit: 100, offset: 0 }));
    default: return [];
  }
}
