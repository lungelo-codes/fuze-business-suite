import { NextResponse } from "next/server";
import { erpCreate, erpList, erpMethod } from "@/lib/server/erpnext";
import { requireSaaSUser, safeJsonError, tenantArgs, tenantData } from "@/lib/server/apiGuard";

type Row = Record<string, unknown>;

export async function GET(req: Request) {
  try {
    const session = requireSaaSUser();
    const params = new URL(req.url).searchParams;
    const args: Record<string, unknown> = tenantArgs({}, session);
    if (params.get("from_date")) args.from_date = params.get("from_date");
    if (params.get("to_date")) args.to_date = params.get("to_date");
    args.limit = Number(params.get("limit") || 100);
    try {
      const result = await erpMethod("hr.get_payroll_summary", args);
      return NextResponse.json(result || { ok: true, data: [] });
    } catch {
      const rows = await erpList<Row>("Salary Slip", { fields: ["name", "employee", "employee_name", "start_date", "end_date", "gross_pay", "net_pay", "total_deduction", "status", "docstatus", "payroll_frequency", "modified"], limit: Number(args.limit), orderBy: "modified desc" }).catch(() => []);
      const total_net = rows.reduce((sum, row) => sum + Number(row.net_pay || 0), 0);
      return NextResponse.json({ ok: true, data: rows, payroll: rows, total_net, source: "metadata-fallback" });
    }
  } catch (error: unknown) {
    return safeJsonError(error, "Could not load payroll summary.");
  }
}

export async function POST(req: Request) {
  try {
    const session = requireSaaSUser();
    const body = await req.json().catch(() => ({}));
    const data = tenantData(body, session);
    try {
      const created = await erpMethod("hr.create_salary_slip", { data });
      return NextResponse.json({ ok: true, data: created }, { status: 201 });
    } catch {
      const created = await erpCreate<Row>("Salary Slip", data);
      return NextResponse.json({ ok: true, data: created }, { status: 201 });
    }
  } catch (error: unknown) {
    return safeJsonError(error, "Could not create salary slip.");
  }
}
