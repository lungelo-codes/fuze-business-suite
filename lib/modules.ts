export interface ModuleDef {
  id: string;
  label: string;
  icon: string;
  description: string;
  path: string;
  group: "Finance" | "CRM" | "Operations" | "People" | "Service" | "Intelligence";
  addonPrice: number;
  doctype?: string;
  active?: boolean;
  includedIn?: string[];
}

export const ALL_MODULES: ModuleDef[] = [
  { id: "customers", label: "Customers", icon: "👥", description: "ERPNext customer master and account profile", path: "/portal/customers", group: "Finance", addonPrice: 99, doctype: "Customer", active: true, includedIn: ["Starter", "Growth", "Business Pro"] },
  { id: "invoices", label: "Invoices", icon: "📄", description: "ERPNext sales invoices and payment status", path: "/portal/accounting?tab=invoices", group: "Finance", addonPrice: 149, doctype: "Sales Invoice", active: true, includedIn: ["Starter", "Growth", "Business Pro"] },
  { id: "quotes", label: "Quotes", icon: "💬", description: "ERPNext quotations and sales conversion", path: "/portal/crm?tab=quotes", group: "CRM", addonPrice: 99, doctype: "Quotation", active: true, includedIn: ["Starter", "Growth", "Business Pro"] },
  { id: "payments", label: "Payments", icon: "💳", description: "Payment Entry, payment links and reconciliation", path: "/portal/accounting?tab=payments", group: "Finance", addonPrice: 99, doctype: "Payment Entry", active: true, includedIn: ["Starter", "Growth", "Business Pro"] },
  { id: "accounting", label: "Accounting", icon: "📚", description: "ERPNext accounting, receivables, payables and ledger reporting", path: "/portal/accounting", group: "Finance", addonPrice: 249, doctype: "GL Entry", active: true, includedIn: ["Growth", "Business Pro"] },
  { id: "banking", label: "Banking", icon: "🏦", description: "Bank accounts, transactions and reconciliation", path: "/portal/accounting?tab=banking", group: "Finance", addonPrice: 129, doctype: "Bank Transaction", active: true, includedIn: ["Growth", "Business Pro"] },
  { id: "compliance", label: "Compliance", icon: "⚖️", description: "VAT, PAYE, UIF, SDL and CIPC tracking", path: "/portal/accounting?tab=compliance", group: "Finance", addonPrice: 129, doctype: "ToDo", active: true, includedIn: ["Starter", "Growth", "Business Pro"] },

  { id: "crm", label: "CRM", icon: "📌", description: "Frappe CRM workspace for leads, deals, notes and tasks", path: "/portal/crm", group: "CRM", addonPrice: 149, doctype: "CRM Deal", active: true, includedIn: ["Growth", "Business Pro"] },
  { id: "leads", label: "Leads", icon: "🧲", description: "Lead capture and qualification", path: "/portal/crm?tab=leads", group: "CRM", addonPrice: 99, doctype: "Lead", active: true, includedIn: ["Growth", "Business Pro"] },
  { id: "opportunities", label: "Opportunities", icon: "🎯", description: "ERPNext opportunities and sales pipeline", path: "/portal/crm?tab=opportunities", group: "CRM", addonPrice: 99, doctype: "Opportunity", active: true, includedIn: ["Growth", "Business Pro"] },
  { id: "selling", label: "Selling", icon: "🧾", description: "ERPNext selling flow: quotation to order to invoice", path: "/portal/sales-orders", group: "CRM", addonPrice: 149, doctype: "Sales Order", active: true, includedIn: ["Growth", "Business Pro"] },
  { id: "sales-orders", label: "Sales Orders", icon: "🧾", description: "Confirmed customer orders", path: "/portal/sales-orders", group: "CRM", addonPrice: 149, doctype: "Sales Order", active: true, includedIn: ["Business Pro"] },
  { id: "contracts", label: "Contracts", icon: "📑", description: "Customer agreements and contract dates", path: "/portal/crm?tab=contracts", group: "CRM", addonPrice: 129, doctype: "Contract", active: true, includedIn: ["Business Pro"] },
  { id: "campaigns", label: "Campaigns", icon: "📣", description: "Marketing campaigns and lead sources", path: "/portal/crm?tab=campaigns", group: "CRM", addonPrice: 79, doctype: "Campaign", active: true, includedIn: ["Business Pro"] },

  { id: "buying", label: "Buying", icon: "🛒", description: "ERPNext buying flow: MR, RFQ, SQ, PO, receipt and invoice", path: "/portal/buying", group: "Operations", addonPrice: 249, doctype: "Purchase Order", active: true, includedIn: ["Growth", "Business Pro"] },
  { id: "suppliers", label: "Suppliers", icon: "🚚", description: "Supplier master data and 360 view", path: "/portal/buying", group: "Operations", addonPrice: 99, doctype: "Supplier", active: true, includedIn: ["Growth", "Business Pro"] },
  { id: "purchase-orders", label: "Purchase Orders", icon: "🛒", description: "Create and track purchase orders", path: "/portal/buying", group: "Operations", addonPrice: 149, doctype: "Purchase Order", active: true, includedIn: ["Growth", "Business Pro"] },
  { id: "inventory", label: "Inventory", icon: "📦", description: "ERPNext stock balances, warehouses, ledger and entries", path: "/portal/inventory", group: "Operations", addonPrice: 149, doctype: "Item", active: true, includedIn: ["Growth", "Business Pro"] },
  { id: "items", label: "Items", icon: "📦", description: "Products, services and item pricing", path: "/portal/inventory", group: "Operations", addonPrice: 149, doctype: "Item", active: true, includedIn: ["Growth", "Business Pro"] },
  { id: "assets", label: "Assets", icon: "🏗️", description: "ERPNext assets, depreciation and maintenance", path: "/portal/assets", group: "Operations", addonPrice: 149, doctype: "Asset", active: true, includedIn: ["Business Pro"] },
  { id: "subcontracting", label: "Subcontracting", icon: "🤝", description: "Subcontracting orders, supplied items and receipts", path: "/portal/subcontracting", group: "Operations", addonPrice: 199, doctype: "Subcontracting Order", active: true, includedIn: ["Business Pro"] },
  { id: "projects", label: "Projects", icon: "📊", description: "ERPNext projects, tasks, timesheets and profitability", path: "/portal/projects", group: "Operations", addonPrice: 149, doctype: "Project", active: true, includedIn: ["Growth", "Business Pro"] },
  { id: "tasks", label: "Tasks", icon: "✅", description: "Task assignments and deadlines", path: "/portal/projects", group: "Operations", addonPrice: 79, doctype: "Task", active: true, includedIn: ["Growth", "Business Pro"] },
  { id: "quality", label: "Quality", icon: "🛡️", description: "Quality goals, inspections and non-conformance", path: "/portal/operations?tab=quality", group: "Operations", addonPrice: 129, doctype: "Quality Inspection", active: true, includedIn: ["Business Pro"] },
  { id: "documents", label: "Documents", icon: "📁", description: "Google Drive, Dropbox and ERPNext files", path: "/portal/documents", group: "Operations", addonPrice: 129, doctype: "File", active: true, includedIn: ["Business Pro"] },

  { id: "hr", label: "HR", icon: "👤", description: "Frappe HR workspace and employee operations", path: "/portal/hr", group: "People", addonPrice: 199, doctype: "Employee", active: true, includedIn: ["Business Pro"] },
  { id: "employees", label: "Employees", icon: "👤", description: "Employee records and org chart", path: "/portal/hr?tab=employees", group: "People", addonPrice: 149, doctype: "Employee", active: true, includedIn: ["Business Pro"] },
  { id: "payroll", label: "Payroll", icon: "💰", description: "Payroll and salary slips", path: "/portal/hr?tab=payroll", group: "People", addonPrice: 249, doctype: "Salary Slip", active: true, includedIn: ["Business Pro"] },
  { id: "leave", label: "Leave", icon: "🏖️", description: "Leave requests and allocations", path: "/portal/hr?tab=leave", group: "People", addonPrice: 99, doctype: "Leave Application", active: true, includedIn: ["Business Pro"] },
  { id: "attendance", label: "Attendance", icon: "📋", description: "Attendance and shifts", path: "/portal/hr?tab=attendance", group: "People", addonPrice: 99, doctype: "Attendance", active: true, includedIn: ["Business Pro"] },

  { id: "support", label: "Support", icon: "🎧", description: "ERPNext support issues and SLA tracking", path: "/portal/support", group: "Service", addonPrice: 99, doctype: "Issue", active: true, includedIn: ["Growth", "Business Pro"] },
  { id: "appointments", label: "Appointments", icon: "📅", description: "Appointments and event calendar", path: "/portal/appointments", group: "Service", addonPrice: 79, doctype: "Event", active: true, includedIn: ["Business Pro"] },
  { id: "portal-login", label: "Client Portal", icon: "🔐", description: "Customer login for invoices, quotes, tickets and payments", path: "/customer-portal", group: "Service", addonPrice: 149, doctype: "Portal Settings", active: true, includedIn: ["Business Pro"] },
  { id: "chat", label: "Messages", icon: "💬", description: "Communication history", path: "/portal/chat", group: "Service", addonPrice: 79, doctype: "Communication", active: true, includedIn: ["Business Pro"] },

  { id: "insights", label: "Insights", icon: "📈", description: "Frappe Insights-style analytics and reports", path: "/portal/insights", group: "Intelligence", addonPrice: 149, doctype: "Dashboard", active: true, includedIn: ["Growth", "Business Pro"] },
  { id: "ai", label: "z.ai Assistant", icon: "✨", description: "AI reporting, module summaries and improvement actions", path: "/portal/insights", group: "Intelligence", addonPrice: 199, doctype: "Fuze AI Insight", active: true, includedIn: ["Growth", "Business Pro"] },
];

export interface PlanDef { id: string; label: string; price: number; period: string; description: string; modules: string[]; highlight?: boolean; badge?: string; }
export const PLANS: PlanDef[] = [
  { id: "Starter", label: "Starter", price: 0, period: "14-day free trial", description: "Finance basics for a new small business.", modules: ["customers", "invoices", "quotes", "payments", "compliance"] },
  { id: "Growth", label: "Growth", price: 499, period: "/ month", description: "CRM, finance, buying, selling, support and insights for growing teams.", modules: ["customers", "invoices", "quotes", "payments", "accounting", "banking", "compliance", "crm", "leads", "opportunities", "selling", "buying", "suppliers", "purchase-orders", "inventory", "items", "projects", "tasks", "support", "insights", "ai"], highlight: true, badge: "Most Popular" },
  { id: "Business Pro", label: "Business Pro", price: 999, period: "/ month", description: "Full business suite with HR, assets, subcontracting, documents and client portal.", modules: ALL_MODULES.map((m) => m.id) },
  { id: "Enterprise", label: "Enterprise", price: 0, period: "Custom pricing", description: "Tailored white-label deployment, custom modules and dedicated infrastructure.", modules: ALL_MODULES.map((m) => m.id), badge: "Contact Sales" },
];
export function getModulesForPlan(planId: string): string[] { return PLANS.find((p) => p.id === planId)?.modules ?? []; }
export function getPlanPrice(planId: string): number { return PLANS.find((p) => p.id === planId)?.price ?? 0; }
export function getModuleDef(id: string): ModuleDef | undefined { return ALL_MODULES.find((m) => m.id === id); }
export function getAddonPrice(moduleId: string): number { return getModuleDef(moduleId)?.addonPrice ?? 0; }
export function calculateSubscriptionTotal(planId: string, selectedModules: string[]): number {
  const planModules = new Set(getModulesForPlan(planId));
  return getPlanPrice(planId) + selectedModules.filter((id) => !planModules.has(id)).reduce((sum, id) => sum + getAddonPrice(id), 0);
}
export const MODULE_COOKIE = "fuze_modules";
export const PLAN_COOKIE = "fuze_plan";
export const COMPANY_COOKIE = "fuze_company";
export const ROLE_COOKIE = "fuze_role";
export const TENANT_COOKIE = "fuze_tenant";
