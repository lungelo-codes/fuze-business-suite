import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET() {
  const [sla, assignmentRules] = await Promise.allSettled([
    erpMethod("fuze_suite.api.crm.get_sla_settings", {}),
    erpMethod("fuze_suite.api.crm.get_assignment_rules", {}),
  ]);
  return NextResponse.json({
    sla: sla.status === "fulfilled" ? sla.value : null,
    assignment_rules: assignmentRules.status === "fulfilled" ? assignmentRules.value : null,
  });
}
