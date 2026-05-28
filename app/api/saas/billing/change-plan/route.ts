import { NextResponse } from "next/server";
import { calculatePlanChange } from "@/lib/billingRules";
import { sanitizeSubscriptionSelection } from "@/lib/saasAccess";
import { getModulesForPlan } from "@/lib/modules";

type PlanChangeBody = {
  currentPlan?: string;
  currentModules?: string[];
  newPlan?: string;
  nextPlan?: string;
  modules?: string[];
  outstandingAmount?: number;
  balanceDue?: number;
  nextDueDate?: string;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as PlanChangeBody;
  const next = sanitizeSubscriptionSelection({ plan: body.newPlan || body.nextPlan, modules: body.modules });
  const currentPlan = body.currentPlan || "Starter";
  const currentModules = Array.isArray(body.currentModules) && body.currentModules.length ? body.currentModules : getModulesForPlan(currentPlan);
  const decision = calculatePlanChange({
    currentPlan,
    currentModules,
    nextPlan: next.plan,
    nextModules: next.modules,
    outstandingAmount: Number(body.outstandingAmount ?? body.balanceDue ?? 0),
    nextDueDate: body.nextDueDate,
  });

  if (decision.effective === "blocked") {
    return NextResponse.json({ ok: false, action: "blocked", next, decision, message: decision.message }, { status: 402 });
  }

  const action = decision.direction === "upgrade" ? "upgrade_now" : decision.direction === "downgrade" ? "schedule_downgrade" : "apply_now";
  return NextResponse.json({ ok: true, action, next, decision, message: decision.message });
}
