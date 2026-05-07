import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
import { MODULE_COOKIE, PLAN_COOKIE, COMPANY_COOKIE, TENANT_COOKIE, calculateSubscriptionTotal, getModuleDef } from "@/lib/modules";
import { getSaaSModules, setTenantModule, upsertSaaSModule } from "@/lib/server/saas";

interface CreateDemoTenantResponse {
  ok?: boolean;
  message?: string;
  tenant?: string | number;
  provisioning_job?: string | number;
  site_name?: string;
  login_url?: string;
  email?: string;
}

function cleanModules(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(String).map((v) => v.trim()).filter(Boolean)));
}

function moduleLabel(moduleId: string): string {
  return getModuleDef(moduleId)?.label || moduleId;
}

async function ensureSelectedModulesExist(moduleIds: string[]) {
  // Some backend provisioning methods validate Fuze SaaS Module records.
  // Ensure the selected frontend module IDs exist in Fuze SaaS Module before provisioning.
  await Promise.all(moduleIds.map(async (moduleId) => {
    const def = getModuleDef(moduleId);
    if (!def) return;
    try {
      await upsertSaaSModule({
        ...def,
        module_id: def.id,
        label: def.label,
        price: def.addonPrice,
        is_active: true,
        active: true,
      });
    } catch {
      // Do not block signup if catalogue sync fails; tenant-module assignment below still retries.
    }
  }));
}

async function createTenantWithFallback(payload: Record<string, unknown>, moduleIds: string[]) {
  // The old backend expects requested_module to be a single module, not a comma-separated list.
  // Send a safe product-level module first, then retry with the first selected module label, then without requested_module.
  const attempts: Record<string, unknown>[] = [
    {
      ...payload,
      requested_module: "Small Business Management",
      requested_modules: moduleIds,
      modules: moduleIds,
      selected_modules: moduleIds,
      module_labels: moduleIds.map(moduleLabel),
    },
    {
      ...payload,
      requested_module: moduleLabel(moduleIds[0] || "customers"),
      requested_modules: moduleIds,
      modules: moduleIds,
      selected_modules: moduleIds,
      module_labels: moduleIds.map(moduleLabel),
    },
    {
      ...payload,
      requested_modules: moduleIds,
      modules: moduleIds,
      selected_modules: moduleIds,
      module_labels: moduleIds.map(moduleLabel),
    },
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const backend = await erpMethod<CreateDemoTenantResponse>("fuze_suite.api.saas.create_demo_tenant", attempt);
      if (backend?.ok) return backend;
      lastError = new Error(backend?.message || "Could not create SaaS tenant");
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error || "");
      // Only retry module-name validation errors. Other errors are still retried once without requested_module.
      if (!message.toLowerCase().includes("requested module") && !message.toLowerCase().includes("module")) {
        // Continue through fallback attempts because older backend methods may simply reject unknown keys.
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Could not create SaaS tenant");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const required = ["full_name", "company_name", "email", "phone", "plan"];
    const missing = required.filter((field) => !body[field]);
    if (missing.length) {
      return NextResponse.json({ error: `Missing required fields: ${missing.join(", ")}` }, { status: 400 });
    }

    const modules = cleanModules(body.modules);
    await ensureSelectedModulesExist(modules);

    const basePayload: Record<string, unknown> = {
      full_name: String(body.full_name || ""),
      company_name: String(body.company_name || ""),
      email: String(body.email || ""),
      phone: String(body.phone || ""),
      password: String(body.password || ""),
      preferred_site_name: String(body.preferred_site_name || ""),
      plan: String(body.plan || "Starter"),
      trial_days: 14,
    };

    const backend = await createTenantWithFallback(basePayload, modules);

    const tenantId = backend.tenant ? String(backend.tenant) : "";
    if (tenantId && modules.length) {
      const allModules = await getSaaSModules();
      const priceById = new Map(allModules.map((m) => [m.id, m.addonPrice || m.price || 0]));
      await Promise.all(modules.map((moduleId) => setTenantModule(tenantId, moduleId, true, priceById.get(moduleId) || 0)));
    }

    const response = NextResponse.json({
      success: true,
      message: backend.message || "Business workspace created. Login details are being sent by email.",
      tenant: backend.tenant,
      provisioning_job: backend.provisioning_job,
      site_name: backend.site_name,
      site_url: backend.login_url,
      login_url: backend.login_url,
      modules,
      total: calculateSubscriptionTotal(String(body.plan || "Starter"), modules),
      backend,
    });

    response.cookies.set(MODULE_COOKIE, JSON.stringify(modules), { path: "/", maxAge: 365 * 86400 });
    response.cookies.set(PLAN_COOKIE, String(body.plan || "Starter"), { path: "/", maxAge: 365 * 86400 });
    response.cookies.set(COMPANY_COOKIE, String(body.company_name || ""), { path: "/", maxAge: 365 * 86400 });
    if (tenantId) response.cookies.set(TENANT_COOKIE, tenantId, { path: "/", maxAge: 365 * 86400 });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Signup failed" },
      { status: 500 }
    );
  }
}
