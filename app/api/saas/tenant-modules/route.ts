import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ALL_MODULES, MODULE_COOKIE, PLAN_COOKIE, COMPANY_COOKIE, TENANT_COOKIE, calculateSubscriptionTotal, getModulesForPlan } from "@/lib/modules";
import { erpMethod, BusinessSuiteError } from "@/lib/server/erpnext";
import { calculatePlanChange } from "@/lib/billingRules";
import { parseCookieModules, sanitizeSubscriptionSelection } from "@/lib/saasAccess";

function ctx() {
  const store = cookies();
  const rawCompany = store.get(COMPANY_COOKIE)?.value || "";
  const company = rawCompany ? decodeURIComponent(rawCompany) : "";
  const tenant = store.get(TENANT_COOKIE)?.value || company;
  return { store, company, tenant };
}

export async function GET() {
  const { store, company, tenant } = ctx();
  const cookiePlan = store.get(PLAN_COOKIE)?.value || "Starter";
  let plan = cookiePlan;
  let activeModules = parseCookieModules(store.get(MODULE_COOKIE)?.value);

  try {
    const result = await erpMethod<any>("settings.get_tenant_plan", { company, tenant });
    if (result?.plan) plan = result.plan === "Starter" && cookiePlan !== "Starter" ? cookiePlan : String(result.plan);
    if (Array.isArray(result?.active_modules) && result.active_modules.length > 0) activeModules = result.active_modules.map(String);
  } catch {}

  const selected = sanitizeSubscriptionSelection({ plan, modules: activeModules.length ? activeModules : getModulesForPlan(plan) });
  return NextResponse.json({ modules: ALL_MODULES, activeModules: selected.modules, plan: selected.plan, total: calculateSubscriptionTotal(selected.plan, selected.modules) });
}

export async function POST(req: Request) {
  const { company, tenant } = ctx();
  const body = await req.json().catch(() => ({})) as { currentPlan?: string; currentModules?: string[]; plan?: string; modules?: string[]; outstandingAmount?: number; nextDueDate?: string };
  const selected = sanitizeSubscriptionSelection({ plan: body.plan, modules: body.modules });
  const currentPlan = body.currentPlan || "Starter";
  const currentModules = Array.isArray(body.currentModules) && body.currentModules.length ? body.currentModules : getModulesForPlan(currentPlan);
  const decision = calculatePlanChange({ currentPlan, currentModules, nextPlan: selected.plan, nextModules: selected.modules, outstandingAmount: Number(body.outstandingAmount || 0), nextDueDate: body.nextDueDate });

  if (decision.effective === "blocked") {
    return NextResponse.json({ error: decision.message, decision }, { status: 402 });
  }

  try {
    await erpMethod<any>("settings.save_tenant_plan", {
      data: {
        company,
        tenant,
        plan: selected.plan,
        modules: selected.modules,
        next_billing_date: body.nextDueDate || undefined,
        pending_plan: decision.effective === "next_cycle" ? selected.plan : undefined,
        billing_change_effective: decision.effective,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not save plan/module settings" }, { status: e instanceof BusinessSuiteError ? e.status : 500 });
  }

  const res = NextResponse.json({ ok: true, modules: ALL_MODULES, activeModules: selected.modules, plan: selected.plan, total: calculateSubscriptionTotal(selected.plan, selected.modules), decision });
  res.cookies.set(PLAN_COOKIE, selected.plan, { path: "/", sameSite: "lax", maxAge: 365 * 86400 });
  res.cookies.set(MODULE_COOKIE, encodeURIComponent(JSON.stringify(selected.modules)), { path: "/", sameSite: "lax", maxAge: 365 * 86400 });
  return res;
}
