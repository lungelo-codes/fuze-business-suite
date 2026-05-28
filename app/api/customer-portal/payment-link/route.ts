import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.invoice) return NextResponse.json({ ok: false, error: "invoice is required" }, { status: 400 });
    return NextResponse.json(await erpMethod("portal.create_customer_payment_link", body));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not create payment link" }, { status: 500 });
  }
}


export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams;
    const invoice = p.get("invoice") || "";
    if (!invoice) return NextResponse.json({ ok: false, error: "invoice is required" }, { status: 400 });
    const data = await erpMethod("portal.create_customer_payment_link", { invoice, site: p.get("site") || undefined });
    const link = (data as any)?.payment_link || (data as any)?.payment_url || (data as any)?.url;
    if (link) return NextResponse.redirect(link);
    return NextResponse.json(data || { ok: false, error: "No payment link returned" });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not create payment link" }, { status: 500 });
  }
}
