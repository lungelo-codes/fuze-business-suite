import { PLANS, calculateSubscriptionTotal, getModulesForPlan } from "@/lib/appModules";

export type PlanChangeDirection = "same" | "upgrade" | "downgrade";
export type PlanChangeEffective = "immediate" | "next_cycle" | "blocked";
export function planPrice(planId: string): number { return PLANS.find((p) => p.id === planId)?.price ?? 0; }
export function planRank(planId: string): number { const i = PLANS.findIndex((p) => p.id === planId); return i < 0 ? 0 : i; }
export function planChangeDirection(currentPlan: string, nextPlan: string): PlanChangeDirection { if (currentPlan === nextPlan) return "same"; const c = planPrice(currentPlan); const n = planPrice(nextPlan); if (n > c || planRank(nextPlan) > planRank(currentPlan)) return "upgrade"; return "downgrade"; }
export function calculatePlanChange(input: { currentPlan: string; currentModules: string[]; nextPlan: string; nextModules: string[]; outstandingAmount?: number; nextDueDate?: string; }) {
  const currentTotal = calculateSubscriptionTotal(input.currentPlan, input.currentModules.length ? input.currentModules : getModulesForPlan(input.currentPlan));
  const nextTotal = calculateSubscriptionTotal(input.nextPlan, input.nextModules.length ? input.nextModules : getModulesForPlan(input.nextPlan));
  const direction = planChangeDirection(input.currentPlan, input.nextPlan);
  const outstanding = Number(input.outstandingAmount || 0);
  if (outstanding > 0 && direction === "downgrade") return { direction, effective: "blocked" as PlanChangeEffective, currentTotal, nextTotal, amountDueNow: outstanding, message: `You have an outstanding balance of R${Math.round(outstanding)}. Please settle it before downgrading.` };
  if (direction === "upgrade") { const amountDueNow = Math.max(0, nextTotal - currentTotal); return { direction, effective: "immediate" as PlanChangeEffective, currentTotal, nextTotal, amountDueNow, message: amountDueNow > 0 ? `Upgrade is active immediately. A prorated/top-up charge of R${Math.round(amountDueNow)} should be billed for this cycle.` : "Upgrade is active immediately." }; }
  if (direction === "downgrade") return { direction, effective: "next_cycle" as PlanChangeEffective, currentTotal, nextTotal, amountDueNow: 0, message: `Downgrade is scheduled for the next billing cycle${input.nextDueDate ? ` on ${input.nextDueDate}` : ""}. Current access remains active until then.` };
  return { direction, effective: "immediate" as PlanChangeEffective, currentTotal, nextTotal, amountDueNow: Math.max(0, nextTotal - currentTotal), message: "Module selection updated." };
}
