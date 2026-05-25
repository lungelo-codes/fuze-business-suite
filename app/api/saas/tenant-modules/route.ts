import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ALL_MODULES, MODULE_COOKIE, PLAN_COOKIE, COMPANY_COOKIE, TENANT_COOKIE, calculateSubscriptionTotal, getModulesForPlan } from "@/lib/modules";
import { erpMethod, BusinessSuiteError } from "@/lib/server/erpnext";

function parseModules(raw?: string): string[] { try { return raw ? JSON.parse(decodeURIComponent(raw)) : []; } catch { return []; } }
function ctx() {
  const store = cookies();
  const rawCompany = store.get(COMPANY_COOKIE)?.value || "";
  const company = rawCompany ? decodeURIComponent(rawCompany) : "";
  const tenant = store.get(TENANT_COOKIE)?.value || company;
  return { store, company, tenant };
}

export async function GET() {
  const { store, company, tenant } = ctx();
  // FIX: Read the cookie-stored plan/modules first as the source of truth.
  // Only override with backend data if the backend actually returns a valid plan.
  let plan = store.get(PLAN_COOKIE)?.value || "Starter";
  let activeModules = parseModules(store.get(MODULE_COOKIE)?.value);

  try {
    const result = await erpMethod<any>("settings.get_tenant_plan", { company, tenant });
    // FIX: Only use backend result if it actually contains a plan value.
    // Prevent silent reset to Starter when the backend returns empty/null.
    if (result?.plan) {
      plan = result.plan;
    }
    if (Array.isArray(result?.active_modules) && result.active_modules.length > 0) {
      activeModules = result.active_modules;
    }
  } catch {}

  const modules = activeModules.length ? activeModules : getModulesForPlan(plan);
  return NextResponse.json({ modules: ALL_MODULES, activeModules: modules, plan, total: calculateSubscriptionTotal(plan, modules) });
}

export async function POST(req: Request) {
  const { company, tenant } = ctx();
  const body = await req.json().catch(() => ({})) as { plan?: string; modules?: string[]; outstandingAmount?: number; nextDueDate?: string };
  const plan = body.plan || "Starter";
  const modules = Array.isArray(body.modules) && body.modules.length ? body.modules : getModulesForPlan(plan);
  try {
    await erpMethod<any>("settings.save_tenant_plan", { data: { company, tenant, plan, modules, next_billing_date: body.nextDueDate || undefined } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not save plan/module settings" }, { status: e instanceof BusinessSuiteError ? e.status : 500 });
  }
  const res = NextResponse.json({ ok: true, modules: ALL_MODULES, activeModules: modules, plan, total: calculateSubscriptionTotal(plan, modules), decision: { effective: "immediate", message: "Plan and module selection saved to backend settings." } });
  // FIX: Use long-lived expiry (365 days) so plan persists across logout/login.
  res.cookies.set(PLAN_COOKIE, plan, { path: "/", sameSite: "lax", maxAge: 365 * 86400 });
  res.cookies.set(MODULE_COOKIE, encodeURIComponent(JSON.stringify(modules)), { path: "/", sameSite: "lax", maxAge: 365 * 86400 });
  return res;
}
