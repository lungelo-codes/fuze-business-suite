import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value ? value as Record<string, unknown> : {};
}

export async function GET() {
  const [sla, assignmentRules] = await Promise.allSettled([
    erpMethod("crm.get_sla_settings", {}),
    erpMethod("crm.get_assignment_rules", {}),
  ]);
  const s = sla.status === "fulfilled" ? asRecord(sla.value) : {};
  const a = assignmentRules.status === "fulfilled" ? asRecord(assignmentRules.value) : {};
  return NextResponse.json({
    success: true,
    sla: (s.sla || s.service_levels || s.data || s) ?? [],
    service_levels: (s.sla || s.service_levels || s.data || s) ?? [],
    assignment_rules: (a.assignment_rules || a.rules || a.data || a) ?? [],
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const kind = String(body.kind || body.type || "assignment").toLowerCase();
  try {
    const result = await erpMethod(kind.includes("sla") || kind.includes("service") ? "crm.create_or_update_sla" : "crm.create_or_update_assignment_rule", { data: body });
    return NextResponse.json({ success: true, data: result, ...(typeof result === "object" && result ? result as Record<string, unknown> : {}) });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Could not save automation rule" }, { status: e?.status || 500 });
  }
}
