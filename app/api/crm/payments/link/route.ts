import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function POST(req: Request) {
  try { const body = await req.json(); return NextResponse.json(await erpMethod("fuze_suite.api.payments.create_invoice_payment_link", body)); }
  catch (error: any) { return NextResponse.json({ error: error?.message || "Could not create payment link" }, { status: 500 }); }
}
