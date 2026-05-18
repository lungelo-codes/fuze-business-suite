import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function GET(req: Request) {
  const user = new URL(req.url).searchParams.get("user") || undefined;
  try { return NextResponse.json(await erpMethod("fuze_suite.api.crm.run_role_permission_diagnostics", user ? { user } : {})); }
  catch (error: any) { return NextResponse.json({ error: error?.message || "Could not run permission checks" }, { status: 500 }); }
}
