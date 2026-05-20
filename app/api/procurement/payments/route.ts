import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
import { requireSaaSUser, safeJsonError, tenantArgs, tenantData } from "@/lib/server/apiGuard";

export async function GET(req: Request) {
  try {
    const session = requireSaaSUser();
    const p = new URL(req.url).searchParams;
    const args: Record<string, unknown> = {};
    for (const k of ["supplier"]) if (p.get(k)) args[k] = p.get(k);
    if (p.get("limit")) args.limit = Number(p.get("limit"));
    if (p.get("offset")) args.offset = Number(p.get("offset"));
    return NextResponse.json({ ok: true, data: await erpMethod("buying.get_supplier_payments", tenantArgs(args, session)) });
  } catch (e: unknown) {
    return safeJsonError(e, "Could not load supplier payments.");
  }
}

export async function POST(req: Request) {
  try {
    const session = requireSaaSUser();
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({ ok: true, data: await erpMethod("buying.create_supplier_payment", tenantArgs({ data: tenantData(body, session) }, session)) }, { status: 201 });
  } catch (e: unknown) {
    return safeJsonError(e, "Could not record supplier payment.");
  }
}
