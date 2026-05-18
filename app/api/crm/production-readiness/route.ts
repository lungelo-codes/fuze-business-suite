import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function GET() {
  try { return NextResponse.json(await erpMethod("fuze_suite.api.crm.run_fresh_tenant_qa", {})); }
  catch (error: any) { return NextResponse.json({ error: error?.message || "Could not run readiness checks" }, { status: 500 }); }
}
