import { NextResponse } from "next/server";
import { erpCreate, erpList, erpMethod } from "@/lib/server/erpnext";
import { requireSaaSUser, safeJsonError, tenantArgs, tenantData } from "@/lib/server/apiGuard";

type Row = Record<string, unknown>;

export async function GET(req: Request) {
  try {
    const session = requireSaaSUser();
    const params = new URL(req.url).searchParams;
    const args: Record<string, unknown> = tenantArgs({}, session);
    if (params.get("date")) args.date = params.get("date");
    if (params.get("status") && params.get("status") !== "all") args.status = params.get("status");
    if (params.get("employee")) args.employee = params.get("employee");
    args.limit = Number(params.get("limit") || 100);
    try {
      const result = await erpMethod("hr.get_attendance", args);
      return NextResponse.json(result || { ok: true, data: [] });
    } catch {
      const filters: unknown[] = [];
      if (args.status) filters.push(["status", "=", args.status]);
      if (args.employee) filters.push(["employee", "=", args.employee]);
      const rows = await erpList<Row>("Attendance", { fields: ["name", "employee", "employee_name", "attendance_date", "status", "working_hours", "shift", "docstatus", "modified"], filters, limit: Number(args.limit), orderBy: "attendance_date desc" }).catch(() => []);
      return NextResponse.json({ ok: true, data: rows, attendance: rows, source: "metadata-fallback" });
    }
  } catch (error: unknown) {
    return safeJsonError(error, "Could not load attendance records.");
  }
}

export async function POST(req: Request) {
  try {
    const session = requireSaaSUser();
    const body = await req.json().catch(() => ({}));
    const data = tenantData(body, session);
    try {
      const created = await erpMethod("hr.create_attendance", { data });
      return NextResponse.json({ ok: true, data: created }, { status: 201 });
    } catch {
      const created = await erpCreate<Row>("Attendance", data);
      return NextResponse.json({ ok: true, data: created }, { status: 201 });
    }
  } catch (error: unknown) {
    return safeJsonError(error, "Could not mark attendance.");
  }
}
