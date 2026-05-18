import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function GET(req: Request) {
  const invoice = new URL(req.url).searchParams.get("invoice");
  if (!invoice) return NextResponse.json({ error: "invoice is required" }, { status: 400 });
  try { return NextResponse.json(await erpMethod("fuze_suite.api.payments.get_invoice_payment_status", { invoice })); }
  catch (error: any) { return NextResponse.json({ error: error?.message || "Could not get payment status" }, { status: 500 }); }
}
