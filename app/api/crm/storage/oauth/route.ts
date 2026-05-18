import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function GET() {
  try { return NextResponse.json(await erpMethod("fuze_suite.api.crm.get_storage_oauth_options", {})); }
  catch (error: any) { return NextResponse.json({ error: error?.message || "Could not get storage options" }, { status: 500 }); }
}
export async function POST(req: Request) {
  try { const body = await req.json(); return NextResponse.json(await erpMethod("fuze_suite.api.crm.save_storage_connection", body)); }
  catch (error: any) { return NextResponse.json({ error: error?.message || "Could not save storage connection" }, { status: 500 }); }
}
