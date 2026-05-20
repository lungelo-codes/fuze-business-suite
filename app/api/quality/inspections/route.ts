import { NextResponse } from "next/server";
import { erpCreate, erpList, erpMethod } from "@/lib/server/erpnext";
import { requireSaaSUser, safeJsonError, tenantArgs, tenantData } from "@/lib/server/apiGuard";

type Row = Record<string, unknown>;

function arrayFrom(value: unknown): Row[] {
  if (Array.isArray(value)) return value as Row[];
  const boxed = value as { data?: Row[]; message?: Row[]; results?: Row[]; inspections?: Row[] };
  return boxed?.data || boxed?.message || boxed?.results || boxed?.inspections || [];
}

export async function GET(req: Request) {
  try {
    const session = requireSaaSUser();
    const p = new URL(req.url).searchParams;
    const args: Record<string, unknown> = tenantArgs({}, session);
    for (const k of ["status", "reference_type", "reference_name", "inspection_type"]) if (p.get(k)) args[k] = p.get(k);
    args.limit = Number(p.get("limit") || 50);
    args.offset = Number(p.get("offset") || 0);

    try {
      const live = await erpMethod<unknown>("quality.get_quality_inspections", args);
      const rows = arrayFrom(live);
      return NextResponse.json({ ok: true, data: rows, inspections: rows });
    } catch {
      // Some older API patches used quality.get_inspections. Try it before CRUD fallback.
      try {
        const legacy = await erpMethod<unknown>("quality.get_inspections", args);
        const rows = arrayFrom(legacy);
        return NextResponse.json({ ok: true, data: rows, inspections: rows });
      } catch {
        const filters: unknown[] = [];
        if (args.status) filters.push(["status", "=", args.status]);
        const rows = await erpList<Row>("Quality Inspection", {
          fields: ["name", "inspection_type", "reference_type", "reference_name", "item_code", "item_name", "sample_size", "status", "docstatus", "modified"],
          filters,
          limit: Number(args.limit || 50),
          orderBy: "modified desc",
        }).catch(() => []);
        return NextResponse.json({ ok: true, data: rows, inspections: rows, source: "metadata-fallback" });
      }
    }
  } catch (error: unknown) {
    return safeJsonError(error, "Could not load quality inspections.");
  }
}

export async function POST(req: Request) {
  try {
    const session = requireSaaSUser();
    const body = await req.json().catch(() => ({}));
    const data = tenantData(body, session);
    try {
      const created = await erpMethod("quality.create_quality_inspection", { data });
      return NextResponse.json({ ok: true, data: created }, { status: 201 });
    } catch {
      const created = await erpCreate<Row>("Quality Inspection", data);
      return NextResponse.json({ ok: true, data: created }, { status: 201 });
    }
  } catch (error: unknown) {
    return safeJsonError(error, "Could not create quality inspection.");
  }
}
