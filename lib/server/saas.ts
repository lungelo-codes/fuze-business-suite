import { erpCreate, erpList, erpMethod, erpPatch } from "@/lib/server/erpnext";
import { ALL_MODULES, type ModuleDef } from "@/lib/modules";
export interface SaaSModuleRecord extends ModuleDef { name?: string; module_id: string; price: number; is_active: boolean; }
export interface TenantModuleRecord { name?: string; tenant?: string; module?: string; module_id?: string; module_name?: string; enabled?: 0 | 1 | boolean; is_active?: 0 | 1 | boolean; price?: number; status?: string; [key: string]: unknown; }
function asBool(value: unknown, fallback = true): boolean { if (value === undefined || value === null || value === "") return fallback; return value === true || value === 1 || value === "1" || String(value).toLowerCase() === "yes" || String(value).toLowerCase() === "active"; }
export async function getSaaSModules(): Promise<SaaSModuleRecord[]> {
  const rows = await erpList<Record<string, unknown>>("Fuze SaaS Module", { fields: ["name", "module_id", "module_name", "label", "title", "description", "group", "path", "icon", "price", "addon_price", "monthly_price", "is_active", "active", "enabled"], limit: 200, orderBy: "modified desc" });
  if (!rows.length) return ALL_MODULES.map((m) => ({ ...m, module_id: m.id, price: m.addonPrice, is_active: m.active !== false }));
  const byId = new Map(ALL_MODULES.map((m) => [m.id, m]));
  return rows.map((row) => { const id = String(row.module_id || row.name || ""); const fallback = byId.get(id); const price = Number(row.price || row.addon_price || row.monthly_price || fallback?.addonPrice || 0); return { ...(fallback || { id, label: id, icon: "▣", description: "SaaS module", path: `/portal/${id}`, group: "Operations" as const, addonPrice: price, active: true }), id, module_id: id, name: String(row.name || id), label: String(row.module_name || row.label || row.title || fallback?.label || id), description: String(row.description || fallback?.description || "SaaS module"), path: String(row.path || fallback?.path || `/portal/${id}`), icon: String(row.icon || fallback?.icon || "▣"), price, addonPrice: price, is_active: asBool(row.is_active ?? row.active ?? row.enabled, fallback?.active !== false), active: asBool(row.is_active ?? row.active ?? row.enabled, fallback?.active !== false) } as SaaSModuleRecord; });
}
export async function upsertSaaSModule(input: Partial<SaaSModuleRecord>) {
  const moduleId = String(input.module_id || input.id || input.name || "").trim(); if (!moduleId) throw new Error("module_id is required");
  const existing = await erpList<{ name: string }>("Fuze SaaS Module", { fields: ["name"], filters: [["module_id", "=", moduleId]], limit: 1 });
  const active = input.is_active ?? input.active ?? true; const payload: Record<string, unknown> = { module_id: moduleId, module_name: input.label || moduleId, label: input.label || moduleId, description: input.description || "", group: input.group || "Operations", path: input.path || `/portal/${moduleId}`, icon: input.icon || "▣", price: Number(input.price ?? input.addonPrice ?? 0), addon_price: Number(input.price ?? input.addonPrice ?? 0), is_active: active ? 1 : 0, enabled: active ? 1 : 0 };
  if (existing[0]?.name) return erpPatch("Fuze SaaS Module", existing[0].name, payload); return erpCreate("Fuze SaaS Module", payload);
}
export async function getTenantModules(tenant?: string): Promise<TenantModuleRecord[]> { return erpList<TenantModuleRecord>("Fuze SaaS Tenant Module", { fields: ["name", "tenant", "module", "module_id", "module_name", "enabled", "is_active", "price", "status", "creation", "modified"], filters: tenant ? [["tenant", "=", tenant]] : undefined, limit: 300, orderBy: "modified desc" }); }
export async function setTenantModule(tenant: string, moduleId: string, enabled: boolean, price = 0) {
  try { const result = await erpMethod("fuze_suite.api.saas.set_tenant_module", { tenant, module: moduleId, module_id: moduleId, enabled: enabled ? 1 : 0, is_active: enabled ? 1 : 0, price }); if (result) return result; } catch {}
  const existing = await erpList<{ name: string }>("Fuze SaaS Tenant Module", { fields: ["name"], filters: [["tenant", "=", tenant], ["module", "=", moduleId]], limit: 1 });
  const payload = { tenant, module: moduleId, module_id: moduleId, module_name: moduleId, enabled: enabled ? 1 : 0, is_active: enabled ? 1 : 0, status: enabled ? "Active" : "Disabled", price };
  if (existing[0]?.name) return erpPatch("Fuze SaaS Tenant Module", existing[0].name, payload); return erpCreate("Fuze SaaS Tenant Module", payload);
}

export async function setTenantPlan(tenant: string, plan: string) {
  if (!tenant || !plan) return null;
  try { const result = await erpMethod("fuze_suite.api.saas.update_tenant_plan", { tenant, plan }); if (result) return result; } catch {}
  const rows = await erpList<{ name: string }>("Fuze SaaS Tenant", { fields: ["name"], filters: [["name", "=", tenant]], limit: 1 });
  if (!rows[0]?.name) return null;
  try { return await erpPatch("Fuze SaaS Tenant", rows[0].name, { plan, subscription_plan: plan, selected_plan: plan }); } catch { return null; }
}
