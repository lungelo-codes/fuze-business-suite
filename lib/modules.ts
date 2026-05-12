// lib/modules.ts – Central module registry for Fuze Business Suite

export type ModuleId =
  | "dashboard" | "crm" | "accounting" | "compliance" | "hr"
  | "projects" | "procurement" | "helpdesk" | "insights" | "settings";

export interface Module {
  id: ModuleId;
  label: string;
  icon: string;
  description: string;
  path: string;
  group: string;
  color: string;
  apiModules: string[]; // which backend python modules this uses
}

export const ALL_MODULES: Module[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "⬡",
    description: "Business overview and daily priorities",
    path: "/portal",
    group: "core",
    color: "navy",
    apiModules: ["insights"],
  },
  {
    id: "crm",
    label: "CRM & Sales",
    icon: "◈",
    description: "Pipeline, leads, opportunities, quotes",
    path: "/portal/crm",
    group: "sales",
    color: "violet",
    apiModules: ["crm", "sales"],
  },
  {
    id: "accounting",
    label: "Finance",
    icon: "◇",
    description: "Invoices, bills, payments, P&L",
    path: "/portal/accounting",
    group: "finance",
    color: "teal",
    apiModules: ["accounting"],
  },
  {
    id: "compliance",
    label: "Compliance",
    icon: "◉",
    description: "VAT, PAYE, UIF, SDL, CIPC",
    path: "/portal/compliance",
    group: "finance",
    color: "orange",
    apiModules: ["compliance"],
  },
  {
    id: "hr",
    label: "People & HR",
    icon: "◎",
    description: "Employees, leave, payroll, attendance",
    path: "/portal/hr",
    group: "people",
    color: "green",
    apiModules: ["hr"],
  },
  {
    id: "projects",
    label: "Projects",
    icon: "◫",
    description: "Projects, tasks, timesheets",
    path: "/portal/projects",
    group: "operations",
    color: "blue",
    apiModules: ["projects"],
  },
  {
    id: "procurement",
    label: "Procurement",
    icon: "◭",
    description: "Suppliers, purchase orders, inventory",
    path: "/portal/procurement",
    group: "operations",
    color: "amber",
    apiModules: ["procurement"],
  },
  {
    id: "helpdesk",
    label: "Helpdesk",
    icon: "◬",
    description: "Support tickets and SLA management",
    path: "/portal/helpdesk",
    group: "people",
    color: "red",
    apiModules: ["helpdesk"],
  },
  {
    id: "insights",
    label: "Reports",
    icon: "◯",
    description: "Operations reports, SaaS member company reports, BI dashboards",
    path: "/portal/insights",
    group: "core",
    color: "indigo",
    apiModules: ["insights"],
  },
  {
    id: "settings",
    label: "Settings",
    icon: "◌",
    description: "Workspace, users, modules",
    path: "/portal/settings",
    group: "core",
    color: "grey",
    apiModules: [],
  },
];

export type PlanId = "Starter" | "Growth" | "Professional" | "Enterprise";

export interface Plan {
  id: PlanId;
  label: string;
  price?: number;
  period: string;
  description: string;
  highlight?: boolean;
  badge?: string;
  modules: ModuleId[];
}

export const PLANS: Plan[] = [
  {
    id: "Starter",
    label: "Starter",
    period: "Free, no credit card",
    description: "For sole traders and micro businesses getting organised.",
    modules: ["dashboard", "accounting", "settings"],
  },
  {
    id: "Growth",
    label: "Growth",
    price: 499,
    period: "per month · billed monthly",
    description: "For growing teams that need CRM, compliance and projects.",
    modules: ["dashboard", "crm", "accounting", "compliance", "projects", "settings"],
    highlight: true,
    badge: "Most popular",
  },
  {
    id: "Professional",
    label: "Professional",
    price: 1299,
    period: "per month · billed monthly",
    description: "Full suite with HR, helpdesk, procurement and insights.",
    modules: [
      "dashboard", "crm", "accounting", "compliance", "hr",
      "projects", "procurement", "helpdesk", "insights", "settings",
    ],
  },
  {
    id: "Enterprise",
    label: "Enterprise",
    period: "Custom · contact sales",
    description: "Custom tenants, white-label, dedicated support.",
    modules: [
      "dashboard", "crm", "accounting", "compliance", "hr",
      "projects", "procurement", "helpdesk", "insights", "settings",
    ],
  },
];

// Helper: get modules for a plan
export function getPlanModules(planId: PlanId): ModuleId[] {
  return PLANS.find((p) => p.id === planId)?.modules ?? ["dashboard", "settings"];
}

// Helper: group modules for sidebar display
export function groupModules(modules: Module[]) {
  const groups: Record<string, Module[]> = {};
  for (const m of modules) {
    if (!groups[m.group]) groups[m.group] = [];
    groups[m.group].push(m);
  }
  return groups;
}

export const GROUP_LABELS: Record<string, string> = {
  core: "Workspace",
  sales: "Sales",
  finance: "Finance",
  operations: "Operations",
  people: "People",
};
