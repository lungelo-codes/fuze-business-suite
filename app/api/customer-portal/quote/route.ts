import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams;
    const quotation = p.get("quotation") || p.get("quote") || p.get("name") || "";
    if (!quotation) return NextResponse.json({ ok: false, error: "quotation is required" }, { status: 400 });
    return NextResponse.json(await erpMethod("portal.get_customer_quotation", { quotation, site: p.get("site") || undefined }));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not load quotation" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(await erpMethod("portal.accept_customer_quotation", body));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not update quotation" }, { status: 500 });
  }
}
