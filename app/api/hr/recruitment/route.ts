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
    if (p.get("department")) args.department = p.get("department");
    args.limit = Number(p.get("limit") || 50);
    try {
      const result = await erpMethod("hr.get_job_openings", args);
      return NextResponse.json(result || { ok: true, data: [] });
    } catch {
      const rows = await erpList<Row>("Job Opening", { fields: ["name", "job_title", "department", "designation", "status", "modified"], limit: Number(args.limit), orderBy: "modified desc" }).catch(() => []);
      return NextResponse.json({ ok: true, data: rows, recruitment: rows, source: "metadata-fallback" });
    }
  } catch (error: unknown) {
    return safeJsonError(error, "Could not load recruitment records.");
  }
}

export async function POST(req: Request) {
  try {
    const session = requireSaaSUser();
    const body = await req.json().catch(() => ({}));
    const data = tenantData(body, session);
    try {
      const created = await erpMethod("hr.create_job_opening", { data });
      return NextResponse.json({ ok: true, data: created }, { status: 201 });
    } catch {
      const created = await erpCreate<Row>("Job Opening", data);
      return NextResponse.json({ ok: true, data: created }, { status: 201 });
    }
  } catch (error: unknown) {
    return safeJsonError(error, "Could not create job opening.");
  }
}
