import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams;
    const invoice = p.get("invoice") || p.get("name") || "";
    if (!invoice) return NextResponse.json({ ok: false, error: "invoice is required" }, { status: 400 });
    return NextResponse.json(await erpMethod("portal.get_customer_invoice", { invoice, site: p.get("site") || undefined }));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not load invoice" }, { status: 500 });
  }
}
