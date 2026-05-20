import { getCrudConfig, toERPDoc } from "@/lib/crudConfig";
import { erpMethod, BusinessSuiteError } from "@/lib/server/erpnext";

type Row = Record<string, unknown>;

type ModuleMethods = {
  list?: string;
  get?: string;
  create?: string;
  update?: string;
  delete?: string;
  submit?: string;
  cancel?: string;
  listArg?: string;
  getArg?: string;
  updateArg?: string;
  deleteArg?: string;
  submitArg?: string;
  cancelArg?: string;
  createWrap?: "data" | "values" | "doc" | false;
};

const METHODS: Record<string, ModuleMethods> = {
  customers: { list: "selling.get_customers", get: "selling.get_customer", create: "selling.create_customer", update: "selling.update_customer", listArg: "company", getArg: "name", updateArg: "name", createWrap: "data" },
  contacts: { list: "crm.get_contacts", create: "crm.create_contact", listArg: "search", createWrap: "data" },
  leads: { list: "crm.get_leads", get: "crm.get_lead", create: "crm.create_lead", update: "crm.update_lead", delete: "crm.delete_lead", getArg: "lead", updateArg: "lead", deleteArg: "lead", createWrap: "data" },
  opportunities: { list: "crm.get_pipeline", get: "crm.get_deal", create: "crm.create_deal", update: "crm.update_deal", getArg: "deal", updateArg: "deal", createWrap: "data" },
  quotes: { list: "sales.get_quotations", get: "sales.get_quotation", create: "sales.create_quotation", submit: "sales.submit_quotation", cancel: "sales.cancel_quotation", getArg: "name", submitArg: "name", cancelArg: "name", createWrap: "data" },
  "sales-orders": { list: "sales.get_sales_orders", get: "sales.get_sales_order", create: "sales.create_sales_order", submit: "sales.submit_sales_order", cancel: "sales.cancel_sales_order", getArg: "name", submitArg: "name", cancelArg: "name", createWrap: "data" },
  contracts: { list: "crm.get_contracts", create: "crm.create_contract_from_crm", listArg: "customer", createWrap: "data" },
  invoices: { list: "sales.get_invoices", get: "sales.get_invoice", create: "sales.create_sales_invoice", cancel: "sales.cancel_sales_invoice", getArg: "name", cancelArg: "name", createWrap: "data" },
  payments: { list: "accounting.get_payments", get: "accounting.get_payment", create: "sales.create_payment_entry", getArg: "name", createWrap: "data" },
  suppliers: { list: "buying.get_suppliers", get: "buying.get_supplier", create: "buying.create_supplier", update: "buying.update_supplier", getArg: "name", updateArg: "name", createWrap: "data" },
  items: { list: "sales.get_products", create: "business_crud.create_doctype", createWrap: false },
  projects: { list: "projects.get_projects", get: "projects.get_project", create: "projects.create_project", update: "projects.update_project", delete: "projects.delete_project", getArg: "project_id", updateArg: "project_id", deleteArg: "project_id", createWrap: "data" },
  tasks: { list: "projects.get_tasks", get: "projects.get_task", create: "projects.create_task", update: "projects.update_task", delete: "projects.delete_task", getArg: "task_id", updateArg: "task_id", deleteArg: "task_id", createWrap: "data" },
  appointments: { list: "appointments.get_appointments", create: "business_crud.create_doctype", createWrap: false },
  employees: { list: "hr.get_employees", get: "hr.get_employee", create: "hr.create_employee", update: "hr.update_employee", getArg: "employee_id", updateArg: "employee_id", createWrap: "data" },
  attendance: { list: "hr.get_attendance", create: "hr.mark_attendance", createWrap: "data" },
  leave: { list: "hr.get_leave_requests", create: "hr.create_leave_request", createWrap: "data" },
  payroll: { list: "hr.get_payroll_entries" },
};

function unwrapRows(value: unknown): Row[] {
  const v = value as any;
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.data)) return v.data;
  if (Array.isArray(v?.message)) return v.message;
  for (const key of ["rows", "items", "records", "leads", "deals", "customers", "contacts", "suppliers", "products", "projects", "tasks", "employees", "appointments", "invoices", "payments", "quotations", "orders"]) {
    if (Array.isArray(v?.[key])) return v[key];
  }
  return [];
}

function unwrapDoc(value: unknown): Row {
  const v = value as any;
  if (v?.data && !Array.isArray(v.data)) return v.data;
  if (v?.message && !Array.isArray(v.message)) return v.message;
  if (v?.doc) return v.doc;
  if (v && typeof v === "object") return v as Row;
  return {};
}

function cleanArgs(args: Row): Row {
  return Object.fromEntries(Object.entries(args).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

function methodPayload(moduleId: string, method: ModuleMethods, doc: Row): Row {
  const config = getCrudConfig(moduleId);
  const values = config ? toERPDoc(moduleId, { ...(config.defaults || {}), ...doc }) : doc;
  if (method.createWrap === "data") return { data: values };
  if (method.createWrap === "values") return { values };
  if (method.createWrap === "doc") return { doc: values };
  if (moduleId === "items" || moduleId === "appointments") return { doctype: config?.doctype, values, module_id: moduleId };
  return values;
}

export async function listModuleRows(moduleId: string, query: Row = {}): Promise<Row[]> {
  const config = getCrudConfig(moduleId);
  if (!config) throw new BusinessSuiteError("Unknown module", 404);
  const method = METHODS[moduleId];
  const args = cleanArgs({ limit: 200, offset: 0, ...query });
  if (method?.list) {
    const result = await erpMethod<unknown>(method.list, args);
    return unwrapRows(result);
  }
  const result = await erpMethod<unknown>("business_crud.list_doctype", {
    doctype: config.doctype,
    fields: config.listFields,
    filters: [],
    limit: 200,
    order_by: "modified desc",
    module_id: moduleId,
  });
  return unwrapRows(result);
}

export async function getModuleRow(moduleId: string, id: string): Promise<Row> {
  const config = getCrudConfig(moduleId);
  if (!config) throw new BusinessSuiteError("Unknown module", 404);
  const method = METHODS[moduleId];
  if (method?.get) {
    const result = await erpMethod<unknown>(method.get, { [method.getArg || "name"]: id });
    return unwrapDoc(result);
  }
  const result = await erpMethod<unknown>("business_crud.get_doctype", { doctype: config.doctype, name: id });
  return unwrapDoc(result);
}

export async function createModuleRow(moduleId: string, doc: Row): Promise<Row> {
  const config = getCrudConfig(moduleId);
  if (!config) throw new BusinessSuiteError("Unknown module", 404);
  const method = METHODS[moduleId];
  const doctype = config.doctype;
  const values = toERPDoc(moduleId, { ...(config.defaults || {}), ...doc });

  async function createViaBusinessCrud(): Promise<Row> {
    const result = await erpMethod<unknown>("business_crud.create_doctype", {
      doctype,
      values,
      module_id: moduleId,
    });
    return unwrapDoc(result);
  }

  if (method?.create) {
    try {
      const result = await erpMethod<unknown>(method.create, methodPayload(moduleId, method, doc));
      return unwrapDoc(result);
    } catch (error) {
      // Keep the SaaS UI stable: when a specialised backend workflow is not yet
      // available for this tenant, fall back to the controlled Business Suite wrapper.
      if (["customers", "quotes", "sales-orders", "contracts", "invoices", "payments"].includes(moduleId)) {
        return createViaBusinessCrud();
      }
      throw error;
    }
  }

  return createViaBusinessCrud();
}

export async function updateModuleRow(moduleId: string, id: string, doc: Row): Promise<Row> {
  const config = getCrudConfig(moduleId);
  if (!config) throw new BusinessSuiteError("Unknown module", 404);
  const method = METHODS[moduleId];
  const values = toERPDoc(moduleId, doc);
  if (method?.update) {
    const result = await erpMethod<unknown>(method.update, { [method.updateArg || "name"]: id, data: values });
    return unwrapDoc(result);
  }
  const result = await erpMethod<unknown>("business_crud.update_doctype", { doctype: config.doctype, name: id, values, module_id: moduleId });
  return unwrapDoc(result);
}

export async function deleteModuleRow(moduleId: string, id: string): Promise<boolean> {
  const config = getCrudConfig(moduleId);
  if (!config) throw new BusinessSuiteError("Unknown module", 404);
  const method = METHODS[moduleId];
  if (method?.delete) {
    await erpMethod<unknown>(method.delete, { [method.deleteArg || "name"]: id });
    return true;
  }
  await erpMethod<unknown>("business_crud.delete_doctype", { doctype: config.doctype, name: id });
  return true;
}

export async function actionModuleRow(moduleId: string, id: string, action: "submit" | "cancel"): Promise<Row> {
  const config = getCrudConfig(moduleId);
  if (!config) throw new BusinessSuiteError("Unknown module", 404);
  const method = METHODS[moduleId];
  const custom = action === "submit" ? method?.submit : method?.cancel;
  const arg = action === "submit" ? method?.submitArg : method?.cancelArg;
  if (custom) {
    const result = await erpMethod<unknown>(custom, { [arg || "name"]: id });
    return unwrapDoc(result);
  }
  const result = await erpMethod<unknown>("business_crud.submit_or_cancel", { doctype: config.doctype, name: id, action });
  return unwrapDoc(result);
}
