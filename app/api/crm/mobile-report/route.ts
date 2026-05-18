import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function GET() {
  try { return NextResponse.json(await erpMethod("fuze_suite.api.crm.get_mobile_edge_case_report", {})); }
  catch (error: any) { return NextResponse.json({ error: error?.message || "Could not get mobile report" }, { status: 500 }); }
}
