import { NextResponse } from "next/server";
import { erpCreate, erpList, erpMethod } from "@/lib/server/erpnext";
import { requireSaaSUser, safeJsonError, tenantArgs, tenantData } from "@/lib/server/apiGuard";

type Row = Record<string, unknown>;

export async function GET(req: Request) {
  try {
    const session = requireSaaSUser();
    const p = new URL(req.url).searchParams;
    const args: Record<string, unknown> = tenantArgs({}, session);
    if (p.get("employee")) args.employee = p.get("employee");
    if (p.get("status")) args.status = p.get("status");
    args.limit = Number(p.get("limit") || 50);
    try {
      const live = await erpMethod("hr.get_expense_claims", args);
      return NextResponse.json(live || { ok: true, data: [] });
    } catch {
      const rows = await erpList<Row>("Expense Claim", {
        fields: ["name", "employee", "employee_name", "posting_date", "total_claimed_amount", "total_sanctioned_amount", "approval_status", "status", "docstatus", "modified"],
        limit: Number(args.limit || 50),
        orderBy: "modified desc",
      }).catch(() => []);
      return NextResponse.json({ ok: true, data: rows, expenses: rows, source: "metadata-fallback" });
    }
  } catch (error: unknown) {
    return safeJsonError(error, "Could not load expense claims.");
  }
}

export async function POST(req: Request) {
  try {
    const session = requireSaaSUser();
    const body = await req.json().catch(() => ({}));
    const data = tenantData(body, session);
    try {
      const created = await erpMethod("hr.create_expense_claim", { data });
      return NextResponse.json({ ok: true, data: created }, { status: 201 });
    } catch {
      const created = await erpCreate<Row>("Expense Claim", data);
      return NextResponse.json({ ok: true, data: created }, { status: 201 });
    }
  } catch (error: unknown) {
    return safeJsonError(error, "Could not create expense claim.");
  }
}
