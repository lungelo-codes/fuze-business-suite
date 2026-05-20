import { NextResponse } from "next/server";
import { erpCreate, erpList, erpMethod } from "@/lib/server/erpnext";
import { requireSaaSUser, safeJsonError, tenantArgs, tenantData } from "@/lib/server/apiGuard";

type Row = Record<string, unknown>;

export async function GET(req: Request) {
  try {
    const session = requireSaaSUser();
    const p = new URL(req.url).searchParams;
    const args: Record<string, unknown> = tenantArgs({}, session);
    if (p.get("status") && p.get("status") !== "all") args.status = p.get("status");
    if (p.get("department") && p.get("department") !== "all") args.department = p.get("department");
    args.limit = Number(p.get("limit") || 100);
    try {
      const result = await erpMethod("hr.get_employees", args);
      return NextResponse.json(result || { ok: true, data: [] });
    } catch {
      const filters: unknown[] = [];
      if (args.status) filters.push(["status", "=", args.status]);
      if (args.department) filters.push(["department", "=", args.department]);
      const rows = await erpList<Row>("Employee", { fields: ["name", "employee_name", "first_name", "last_name", "department", "designation", "status", "company_email", "cell_number", "date_of_joining", "modified"], filters, limit: Number(args.limit), orderBy: "modified desc" }).catch(() => []);
      return NextResponse.json({ ok: true, data: rows, employees: rows, source: "metadata-fallback" });
    }
  } catch (error: unknown) {
    return safeJsonError(error, "Could not load employees.");
  }
}

export async function POST(req: Request) {
  try {
    const session = requireSaaSUser();
    const body = await req.json().catch(() => ({}));
    const data = tenantData(body, session);
    try {
      const created = await erpMethod("hr.create_employee", { data });
      return NextResponse.json({ ok: true, data: created }, { status: 201 });
    } catch {
      const created = await erpCreate<Row>("Employee", data);
      return NextResponse.json({ ok: true, data: created }, { status: 201 });
    }
  } catch (error: unknown) {
    return safeJsonError(error, "Could not create employee.");
  }
}
