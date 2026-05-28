import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

function params(req: Request) {
  const p = new URL(req.url).searchParams;
  return {
    site: p.get("site") || undefined,
    customer: p.get("customer") || undefined,
    email: p.get("email") || undefined,
  };
}

export async function GET(req: Request) {
  try {
    const data = await erpMethod("portal.get_customer_portal_summary", params(req));
    return NextResponse.json(data || { ok: true, invoices: [], quotations: [], tickets: [], appointments: [], totals: {} });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not load customer portal" }, { status: 500 });
  }
}
