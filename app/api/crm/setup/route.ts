import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {}
  try {
    const result = await erpMethod("fuze_suite.api.crm.ensure_crm_sales_setup", body || {});
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || "CRM setup check failed" }, { status: 200 });
  }
}
