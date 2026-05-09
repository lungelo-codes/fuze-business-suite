export interface ModuleDef {
  id: string;
  label: string;
  icon: string;
  description: string;
  path: string;
  group: "Finance" | "CRM" | "Operations" | "People" | "Service";
  addonPrice: number;
  doctype?: string;
  active?: boolean;
  includedIn?: string[];
}

export const ALL_MODULES: ModuleDef[] = [
  { id: "customers", label: "Customers", icon: "👥", description: "Manage your customer database", path: "/portal/customers", group: "Finance", addonPrice: 99, doctype: "Customer", active: true, includedIn: ["Starter", "Growth", "Business Pro"] },
  { id: "invoices", label: "Invoices", icon: "📄", description: "Create and manage sales invoices", path: "/portal/invoices", group: "Finance", addonPrice: 149, doctype: "Sales Invoice", active: true, includedIn: ["Starter", "Growth", "Business Pro"] },
  { id: "quotes", label: "Quotes", icon: "💬", description: "Generate and track quotations", path: "/portal/quotes", group: "Finance", addonPrice: 99, doctype: "Quotation", active: true, includedIn: ["Starter", "Growth", "Business Pro"] },

  { id: "crm", label: "CRM Pipeline", icon: "📌", description: "Lead and opportunity pipeline with sales stages", path: "/portal/crm", group: "CRM", addonPrice: 149, doctype: "Opportunity", active: true, includedIn: ["Growth", "Business Pro"] },
  { id: "leads", label: "Leads", icon: "🧲", description: "Capture and qualify new leads", path: "/portal/leads", group: "CRM", addonPrice: 99, doctype: "Lead", active: true, includedIn: ["Growth", "Business Pro"] },
  { id: "opportunities", label: "Opportunities", icon: "🎯", description: "Manage deals and sales opportunities", path: "/portal/opportunities", group: "CRM", addonPrice: 99, doctype: "Opportunity", active: true, includedIn: ["Growth", "Business Pro"] },
  { id: "sales-orders", label: "Sales Orders", icon: "🧾", description: "Convert won sales into confirmed orders", path: "/portal/sales-orders", group: "CRM", addonPrice: 149, doctype: "Sales Order", active: true, includedIn: ["Business Pro"] },
  { id: "contracts", label: "Contracts", icon: "📑", description: "Track customer agreements and contract dates", path: "/portal/contracts", group: "CRM", addonPrice: 129, doctype: "Contract", active: true, includedIn: ["Business Pro"] },
  { id: "campaigns", label: "Campaigns", icon: "📣", description: "Plan and monitor sales and marketing campaigns", path: "/portal/campaigns", group: "CRM", addonPrice: 79, doctype: "Campaign", active: true, includedIn: ["Business Pro"] },
  { id: "payments", label: "Payments", icon: "💳", description: "Record and reconcile payments", path: "/portal/payments", group: "Finance", addonPrice: 99, doctype: "Payment Entry", active: true, includedIn: ["Starter", "Growth", "Business Pro"] },
  { id: "compliance", label: "Compliance", icon: "⚖️", description: "VAT, PAYE, UIF, SDL & CIPC tracking", path: "/portal/compliance", group: "Finance", addonPrice: 129, doctype: "ToDo", active: true, includedIn: ["Starter", "Growth", "Business Pro"] },
  { id: "suppliers", label: "Suppliers", icon: "🚚", description: "Manage supplier relationships", path: "/portal/suppliers", group: "Operations", addonPrice: 99, doctype: "Supplier", active: true, includedIn: ["Growth", "Business Pro"] },
  { id: "purchase-orders", label: "Purchase Orders", icon: "🛒", description: "Create and track purchase orders", path: "/portal/purchase-orders", group: "Operations", addonPrice: 149, doctype: "Purchase Order", active: true, includedIn: ["Growth", "Business Pro"] },
  { id: "items", label: "Inventory", icon: "📦", description: "Track stock, products and services", path: "/portal/items", group: "Operations", addonPrice: 149, doctype: "Item", active: true, includedIn: ["Growth", "Business Pro"] },
  { id: "projects", label: "Projects", icon: "📊", description: "Plan and track projects", path: "/portal/projects", group: "Operations", addonPrice: 149, doctype: "Project", active: true, includedIn: ["Growth", "Business Pro"] },
  { id: "tasks", label: "Tasks", icon: "✅", description: "Assign and manage team tasks", path: "/portal/tasks", group: "Operations", addonPrice: 79, doctype: "Task", active: true, includedIn: ["Growth", "Business Pro"] },
  { id: "documents", label: "Documents", icon: "📁", description: "Google Drive, Dropbox and ERPNext files", path: "/portal/documents", group: "Operations", addonPrice: 129, doctype: "File", active: true, includedIn: ["Business Pro"] },
  { id: "employees", label: "Employees", icon: "👤", description: "HR records and employee management", path: "/portal/employees", group: "People", addonPrice: 149, doctype: "Employee", active: true, includedIn: ["Business Pro"] },
  { id: "payroll", label: "Payroll", icon: "💰", description: "Payroll and salary processing", path: "/portal/payroll", group: "People", addonPrice: 249, doctype: "Salary Slip", active: true, includedIn: ["Business Pro"] },
  { id: "leave", label: "Leave", icon: "🏖️", description: "Leave requests and approval workflow", path: "/portal/leave", group: "People", addonPrice: 99, doctype: "Leave Application", active: true, includedIn: ["Business Pro"] },
  { id: "attendance", label: "Attendance", icon: "📋", description: "Track employee attendance and hours", path: "/portal/attendance", group: "People", addonPrice: 99, doctype: "Attendance", active: true, includedIn: ["Business Pro"] },
  { id: "support", label: "Support", icon: "🎧", description: "Customer support ticket management", path: "/portal/support", group: "Service", addonPrice: 99, doctype: "Issue", active: true, includedIn: ["Growth", "Business Pro"] },
  { id: "helpdesk", label: "Helpdesk", icon: "🎫", description: "Frappe Helpdesk tickets, SLAs and customer portal", path: "/portal/helpdesk", group: "Service", addonPrice: 149, doctype: "HD Ticket", active: true, includedIn: ["Business Pro"] },
  { id: "appointments", label: "Appointments", icon: "📅", description: "Schedule events and appointments", path: "/portal/appointments", group: "Service", addonPrice: 79, doctype: "Event", active: true, includedIn: ["Business Pro"] },
  { id: "chat", label: "Messages", icon: "💬", description: "Customer communications log", path: "/portal/chat", group: "Service", addonPrice: 79, doctype: "Communication", active: true, includedIn: ["Business Pro"] },
  { id: "insights", label: "Insights", icon: "📊", description: "Business intelligence dashboards and analytics", path: "/portal/insights", group: "Finance", addonPrice: 199, doctype: "Insights Query", active: true, includedIn: ["Business Pro"] },
  { id: "accounting", label: "Accounting", icon: "🏦", description: "Full general ledger, journal entries and financial reports", path: "/portal/accounting", group: "Finance", addonPrice: 199, doctype: "Journal Entry", active: true, includedIn: ["Growth", "Business Pro"] },
];

export interface PlanDef { id: string; label: string; price: number; period: string; description: string; modules: string[]; highlight?: boolean; badge?: string; }
export const PLANS: PlanDef[] = [
  { id: "Starter", label: "Starter", price: 0, period: "14-day free trial", description: "Finance basics for a new small business.", modules: ["customers", "invoices", "quotes", "payments", "compliance"] },
  { id: "Growth", label: "Growth", price: 499, period: "/ month", description: "Finance plus operations modules for growing businesses.", modules: ["customers", "invoices", "quotes", "payments", "compliance", "crm", "leads", "opportunities", "suppliers", "purchase-orders", "items", "projects", "tasks", "support"], highlight: true, badge: "Most Popular" },
  { id: "Business Pro", label: "Business Pro", price: 999, period: "/ month", description: "Full business operations suite with HR, helpdesk, insights and accounting.", modules: ALL_MODULES.map((m) => m.id) },
  { id: "Enterprise", label: "Enterprise", price: 0, period: "Custom pricing", description: "Tailored white-label deployment and custom modules.", modules: ALL_MODULES.map((m) => m.id), badge: "Contact Sales" },
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
