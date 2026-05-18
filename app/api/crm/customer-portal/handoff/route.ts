import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const args: Record<string, string> = {};
  for (const key of ["customer", "lead", "deal", "invoice", "quotation"]) { const v = sp.get(key); if (v) args[key] = v; }
  try { return NextResponse.json(await erpMethod("fuze_suite.api.crm.get_customer_portal_handoff", args)); }
  catch (error: any) { return NextResponse.json({ error: error?.message || "Could not create portal handoff" }, { status: 500 }); }
}
