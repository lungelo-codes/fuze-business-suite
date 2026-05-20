import { NextResponse } from "next/server";
import { erpCreate, erpList, erpMethod } from "@/lib/server/erpnext";
import { requireSaaSUser, safeJsonError, tenantArgs, tenantData } from "@/lib/server/apiGuard";

type Row = Record<string, unknown>;

export async function GET(req: Request) {
  try {
    const session = requireSaaSUser();
    const p = new URL(req.url).searchParams;
    const args: Record<string, unknown> = tenantArgs({}, session);
    if (p.get("status")) args.status = p.get("status");
    if (p.get("employee")) args.employee = p.get("employee");
    if (p.get("leave_type")) args.leave_type = p.get("leave_type");
    args.limit = Number(p.get("limit") || 50);
    try {
      const result = await erpMethod("hr.get_leave_requests", args);
      return NextResponse.json(result || { ok: true, data: [] });
    } catch {
      const filters: unknown[] = [];
      if (args.status) filters.push(["status", "=", args.status]);
      if (args.employee) filters.push(["employee", "=", args.employee]);
      const rows = await erpList<Row>("Leave Application", { fields: ["name", "employee", "employee_name", "leave_type", "from_date", "to_date", "total_leave_days", "status", "description", "modified"], filters, limit: Number(args.limit), orderBy: "from_date desc" }).catch(() => []);
      return NextResponse.json({ ok: true, data: rows, leave: rows, source: "metadata-fallback" });
    }
  } catch (error: unknown) {
    return safeJsonError(error, "Could not load leave requests.");
  }
}

export async function POST(req: Request) {
  try {
    const session = requireSaaSUser();
    const body = await req.json().catch(() => ({}));
    const data = tenantData(body, session);
    try {
      const created = await erpMethod("hr.create_leave_request", { data });
      return NextResponse.json({ ok: true, data: created }, { status: 201 });
    } catch {
      const created = await erpCreate<Row>("Leave Application", data);
      return NextResponse.json({ ok: true, data: created }, { status: 201 });
    }
  } catch (error: unknown) {
    return safeJsonError(error, "Could not create leave request.");
  }
}
