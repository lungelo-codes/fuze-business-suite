import { ALL_MODULES, PLANS, getModulesForPlan } from "@/lib/modules";

export type SaaSRole = "admin" | "owner" | "manager" | "member" | "customer" | string;
export type BillingStatus = "Trial" | "Active" | "Past Due" | "Suspended" | "Cancelled" | string;

export const MODULE_ALIASES: Record<string, string[]> = {
  dashboard: ["dashboard"],
  crm: ["crm", "leads", "opportunities", "quotes", "campaigns", "contacts", "customers"],
  selling: ["selling", "sales", "sales-orders", "quotes", "invoices", "customers"],
  sales: ["selling", "sales", "sales-orders", "quotes", "invoices", "customers"],
  accounting: ["accounting", "finance", "invoices", "payments", "banking", "compliance"],
  finance: ["accounting", "finance", "invoices", "payments", "banking", "compliance"],
  buying: ["buying", "procurement", "suppliers", "purchase-orders"],
  procurement: ["buying", "procurement", "suppliers", "purchase-orders"],
  assets: ["assets", "asset-management"],
  subcontracting: ["subcontracting"],
  projects: ["projects", "tasks"],
  support: ["support", "helpdesk", "issues", "chat"],
  hr: ["hr", "employees", "attendance", "leave", "payroll"],
  insights: ["insights", "reports", "ai"],
  ai: ["ai", "insights", "reports"],
  "portal-login": ["portal-login", "client-portal", "customer-portal", "appointments"],
};

export const MODULE_PATH_RULES: Array<{ module: string; paths: string[] }> = [
  { module: "crm", paths: ["/portal/crm", "/portal/leads", "/portal/opportunities", "/portal/campaigns", "/portal/contacts"] },
  { module: "selling", paths: ["/portal/sales-orders", "/portal/quotes", "/portal/customers"] },
  { module: "accounting", paths: ["/portal/accounting", "/portal/finance", "/portal/invoices", "/portal/payments", "/portal/bank-reconciliation", "/portal/compliance", "/portal/vat", "/portal/paye", "/portal/uif", "/portal/sdl", "/portal/cipc", "/portal/sars-profile", "/portal/company-compliance", "/portal/compliance-reminders"] },
  { module: "buying", paths: ["/portal/buying", "/portal/procurement", "/portal/suppliers", "/portal/purchase-orders"] },
  { module: "assets", paths: ["/portal/assets"] },
  { module: "subcontracting", paths: ["/portal/subcontracting"] },
  { module: "projects", paths: ["/portal/projects", "/portal/tasks"] },
  { module: "support", paths: ["/portal/support", "/portal/chat"] },
  { module: "hr", paths: ["/portal/hr", "/portal/employees", "/portal/attendance", "/portal/leave", "/portal/payroll"] },
  { module: "insights", paths: ["/portal/insights", "/portal/reports"] },
  { module: "portal-login", paths: ["/customer-portal", "/portal/appointments"] },
  { module: "inventory", paths: ["/portal/inventory", "/portal/items"] },
  { module: "documents", paths: ["/portal/documents"] },
];

const VALID_MODULES = new Set(ALL_MODULES.map((module) => module.id));
const VALID_PLANS = new Set(PLANS.map((plan) => plan.id));

function uniq(values: string[]) {
  return Array.from(new Set(values.map((v) => String(v || "").trim()).filter(Boolean)));
}

export function normalizePlanId(plan?: string | null) {
  const value = String(plan || "Starter").trim();
  return VALID_PLANS.has(value) ? value : "Starter";
}

export function normalizeModules(modules?: unknown, plan?: string | null) {
  let raw: string[] = [];
  if (Array.isArray(modules)) raw = modules.map(String);
  else if (typeof modules === "string" && modules.trim()) {
    try {
      const parsed = JSON.parse(modules);
      raw = Array.isArray(parsed) ? parsed.map(String) : modules.split(",").map((v) => v.trim());
    } catch {
      raw = modules.split(",").map((v) => v.trim());
    }
  }
  const selected = uniq(raw).filter((id) => VALID_MODULES.has(id));
  if (selected.length) return selected;
  return getModulesForPlan(normalizePlanId(plan));
}

export function expandModuleAliases(moduleId: string) {
  const own = [moduleId];
  const explicit = MODULE_ALIASES[moduleId] || [];
  const reverse = Object.entries(MODULE_ALIASES)
    .filter(([, aliases]) => aliases.includes(moduleId))
    .map(([id]) => id);
  return uniq([...own, ...explicit, ...reverse]);
}

export function moduleIsActive(activeModules: string[], moduleId?: string) {
  if (!moduleId) return true;
  if (!activeModules.length) return true;
  const active = new Set(activeModules.map((m) => m.toLowerCase()));
  return expandModuleAliases(moduleId).some((alias) => active.has(alias.toLowerCase()));
}

export function pathMatches(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(path + "/");
}

export function resolveModuleForPath(pathname: string) {
  const match = MODULE_PATH_RULES.find((rule) => rule.paths.some((path) => pathMatches(pathname, path)));
  return match?.module || null;
}

export function isSaaSAdmin(role?: string | null) {
  return ["admin", "Administrator", "System Manager"].includes(String(role || ""));
}

export function canAccessBillingArea(role?: string | null) {
  return isSaaSAdmin(role) || ["owner", "manager", "customer"].includes(String(role || "customer"));
}

export function sanitizeSubscriptionSelection(input: { plan?: string | null; modules?: unknown }) {
  const plan = normalizePlanId(input.plan);
  const planModules = getModulesForPlan(plan);
  const modules = normalizeModules(input.modules, plan);
  const merged = uniq([...planModules, ...modules]).filter((id) => VALID_MODULES.has(id));
  return { plan, modules: merged.length ? merged : planModules };
}

export function canUsePortal(status?: BillingStatus, role?: SaaSRole) {
  if (isSaaSAdmin(role)) return true;
  const value = String(status || "Active");
  return !["Suspended", "Cancelled"].includes(value);
}

export function parseCookieModules(value?: string | null) {
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    return normalizeModules(parsed);
  } catch {
    return [] as string[];
  }
}
