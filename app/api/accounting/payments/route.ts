import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const args: Record<string, unknown> = {};
  for (const k of ["payment_type", "company", "mode_of_payment", "party_type"]) if (p.get(k)) args[k] = p.get(k);
  if (p.get("limit")) args.limit = Number(p.get("limit"));
  if (p.get("offset")) args.offset = Number(p.get("offset"));
  try {
    return NextResponse.json(await erpMethod("fuze_suite.api.accounting.get_payments", args));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not load payments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const method = body.invoice || body.sales_invoice || body.reference_name
      ? "fuze_suite.api.accounting.receive_invoice_payment"
      : "fuze_suite.api.accounting.create_payment_entry";
    return NextResponse.json(await erpMethod(method, { data: body }));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not record payment" }, { status: 500 });
  }
}
