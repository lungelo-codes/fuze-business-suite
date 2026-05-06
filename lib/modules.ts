export interface ModuleDef {
  id: string;
  label: string;
  icon: string;
  description: string;
  path: string;
  group: "Finance" | "Operations" | "People" | "Service";
}

export const ALL_MODULES: ModuleDef[] = [
  // Finance
  { id: "invoices",     label: "Invoices",      icon: "📄", description: "Create and manage sales invoices",         path: "/portal/invoices",     group: "Finance" },
  { id: "quotes",       label: "Quotes",         icon: "💬", description: "Generate and track quotations",           path: "/portal/quotes",       group: "Finance" },
  { id: "payments",     label: "Payments",       icon: "💳", description: "Record and reconcile payments",           path: "/portal/payments",     group: "Finance" },
  { id: "customers",   label: "Customers",      icon: "👥", description: "Manage your customer database",           path: "/portal/customers",    group: "Finance" },
  { id: "compliance",  label: "Compliance",     icon: "⚖️", description: "VAT, PAYE, UIF, SDL & CIPC tracking",    path: "/portal/compliance",   group: "Finance" },

  // Operations
  { id: "suppliers",   label: "Suppliers",      icon: "🚚", description: "Manage supplier relationships",           path: "/portal/suppliers",    group: "Operations" },
  { id: "items",       label: "Inventory",      icon: "📦", description: "Track stock and products",                path: "/portal/items",        group: "Operations" },
  { id: "projects",    label: "Projects",       icon: "📊", description: "Plan and track projects",                 path: "/portal/projects",     group: "Operations" },
  { id: "tasks",       label: "Tasks",          icon: "✅", description: "Assign and manage team tasks",            path: "/portal/tasks",        group: "Operations" },

  // People
  { id: "employees",   label: "Employees",      icon: "👤", description: "HR records and employee management",      path: "/portal/employees",    group: "People" },
  { id: "payroll",     label: "Payroll",        icon: "💰", description: "Process payroll with SARS tax tables",    path: "/portal/payroll",      group: "People" },
  { id: "leave",       label: "Leave",          icon: "🏖️", description: "Leave requests and approval workflow",   path: "/portal/leave",        group: "People" },

  // Service
  { id: "support",     label: "Support",        icon: "🎧", description: "Customer support ticket management",      path: "/portal/support",      group: "Service" },
  { id: "appointments", label: "Appointments",  icon: "📅", description: "Schedule events and appointments",        path: "/portal/appointments", group: "Service" },
  { id: "chat",        label: "Messages",       icon: "💬", description: "Customer communications log",             path: "/portal/chat",         group: "Service" },
];

export interface PlanDef {
  id: string;
  label: string;
  price: number;
  period: string;
  description: string;
  modules: string[];   // module IDs included
  highlight?: boolean;
  badge?: string;
}

export const PLANS: PlanDef[] = [
  {
    id: "Starter",
    label: "Starter",
    price: 0,
    period: "14-day free trial",
    description: "Perfect for small businesses getting started",
    modules: ["invoices", "quotes", "payments", "customers", "compliance"],
  },
  {
    id: "Growth",
    label: "Growth",
    price: 499,
    period: "/ month",
    description: "For growing businesses that need more control",
    modules: ["invoices", "quotes", "payments", "customers", "compliance", "suppliers", "items", "projects", "tasks", "support"],
    highlight: true,
    badge: "Most Popular",
  },
  {
    id: "Business Pro",
    label: "Business Pro",
    price: 999,
    period: "/ month",
    description: "Full operations suite for established businesses",
    modules: ["invoices", "quotes", "payments", "customers", "compliance", "suppliers", "items", "projects", "tasks", "support", "employees", "payroll", "leave", "appointments", "chat"],
  },
  {
    id: "Enterprise",
    label: "Enterprise",
    price: 0,
    period: "Custom pricing",
    description: "Tailored solutions for large organisations",
    modules: ALL_MODULES.map((m) => m.id),
    badge: "Contact Sales",
  },
];

export function getModulesForPlan(planId: string): string[] {
  return PLANS.find((p) => p.id === planId)?.modules ?? [];
}

export function getModuleDef(id: string): ModuleDef | undefined {
  return ALL_MODULES.find((m) => m.id === id);
}

export const MODULE_COOKIE = "fuze_modules";
export const PLAN_COOKIE = "fuze_plan";
export const COMPANY_COOKIE = "fuze_company";
export const ROLE_COOKIE = "fuze_role";
