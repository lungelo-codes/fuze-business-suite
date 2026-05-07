import { erpCreate, erpList, erpMethod, erpPatch } from "@/lib/server/erpnext";
import { ALL_MODULES, type ModuleDef } from "@/lib/modules";

export interface SaaSModuleRecord extends ModuleDef {
  name?: string;
  module_key: string;
  price: number;
  is_active: boolean;
}

export interface TenantModuleRecord {
  name?: string;
  tenant?: string;
  module?: string;
  enabled?: 0 | 1 | boolean;
  activated_on?: string;
  [key: string]: unknown;
}

function asBool(value: unknown, fallback = true): boolean {
  if (value === undefined || value === null || value === "") return fallback;
  return value === true || value === 1 || value === "1" || String(value).toLowerCase() === "yes" || String(value).toLowerCase() === "active";
}

function moduleFallback(id: string): ModuleDef {
  return ALL_MODULES.find((m) => m.id === id) || {
    id,
    label: id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    icon: "▣",
    description: "Business Suite module",
    path: `/portal/${id}`,
    group: "Operations",
    addonPrice: 0,
    active: true,
  };
}

export async function getSaaSModules(): Promise<SaaSModuleRecord[]> {
  try {
    const rows = await erpList<Record<string, unknown>>("Fuze SaaS Module", {
      fields: ["name", "module_name", "module_key", "app_name", "description", "enabled"],
      limit: 200,
      orderBy: "module_name asc",
    });

    if (!rows.length) {
      return ALL_MODULES.map((m) => ({ ...m, name: m.id, module_key: m.id, price: m.addonPrice, is_active: m.active !== false }));
    }

    return rows.map((row) => {
      const id = String(row.module_key || row.name || "").trim();
      const fallback = moduleFallback(id);
      return {
        ...fallback,
        id,
        name: String(row.name || id),
        module_key: id,
        label: String(row.module_name || fallback.label || id),
        description: String(row.description || fallback.description || "Business Suite module"),
        price: fallback.addonPrice || 0,
        addonPrice: fallback.addonPrice || 0,
        is_active: asBool(row.enabled, fallback.active !== false),
        active: asBool(row.enabled, fallback.active !== false),
      } as SaaSModuleRecord;
    });
  } catch {
    return ALL_MODULES.map((m) => ({ ...m, name: m.id, module_key: m.id, price: m.addonPrice, is_active: m.active !== false }));
  }
}

export async function upsertSaaSModule(input: Partial<SaaSModuleRecord> & Partial<ModuleDef>) {
  const moduleKey = String(input.module_key || input.id || input.name || "").trim();
  if (!moduleKey) throw new Error("module_key is required");

  const existing = await erpList<{ name: string }>("Fuze SaaS Module", {
    fields: ["name"],
    filters: [["module_key", "=", moduleKey]],
    limit: 1,
  });

  const payload: Record<string, unknown> = {
    module_key: moduleKey,
    module_name: input.label || moduleFallback(moduleKey).label || moduleKey,
    app_name: "erpnext",
    description: input.description || moduleFallback(moduleKey).description || "Business Suite module",
    enabled: input.active === false || input.is_active === false ? 0 : 1,
  };

  if (existing[0]?.name) return erpPatch("Fuze SaaS Module", existing[0].name, payload);
  return erpCreate("Fuze SaaS Module", payload);
}

export async function getTenantModules(tenant?: string): Promise<TenantModuleRecord[]> {
  return erpList<TenantModuleRecord>("Fuze SaaS Tenant Module", {
    fields: ["name", "tenant", "module", "enabled", "activated_on"],
    filters: tenant ? [["tenant", "=", tenant]] : undefined,
    limit: 300,
    orderBy: "modified desc",
  });
}

export async function setTenantModule(tenant: string, moduleId: string, enabled: boolean) {
  try {
    const result = await erpMethod("fuze_suite.api.saas.enable_tenant_module", { tenant, module: moduleId });
    if (result) return result;
  } catch {}

  const existing = await erpList<{ name: string }>("Fuze SaaS Tenant Module", {
    fields: ["name"],
    filters: [["tenant", "=", tenant], ["module", "=", moduleId]],
    limit: 1,
  });

  const payload = { tenant, module: moduleId, enabled: enabled ? 1 : 0 };
  if (existing[0]?.name) return erpPatch("Fuze SaaS Tenant Module", existing[0].name, payload);
  return erpCreate("Fuze SaaS Tenant Module", payload);
}

export async function setTenantPlan(tenant: string, plan: string) {
  if (!tenant || !plan) return null;
  try {
    const result = await erpMethod("fuze_suite.api.saas.update_tenant_plan", { tenant, plan });
    if (result) return result;
  } catch {}

  const rows = await erpList<{ name: string }>("Fuze SaaS Tenant", {
    fields: ["name"],
    filters: [["name", "=", tenant]],
    limit: 1,
  });
  if (!rows[0]?.name) return null;

  try {
    return await erpPatch("Fuze SaaS Tenant", rows[0].name, { plan, subscription_plan: plan, selected_plan: plan });
  } catch {
    return null;
  }
}
