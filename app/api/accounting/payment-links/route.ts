import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const invoice = p.get("invoice") || p.get("sales_invoice") || "";
  try {
    return NextResponse.json(await erpMethod("fuze_suite.api.accounting.get_invoice_payment_links", { invoice }));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not load payment links" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(await erpMethod("fuze_suite.api.accounting.create_invoice_payment_link", { data: body }));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not create payment link" }, { status: 500 });
  }
}
