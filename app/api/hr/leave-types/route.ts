import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function GET() {
  try { return NextResponse.json(await erpMethod("hr.get_leave_types", {})); }
  catch (e:any) { return NextResponse.json({ error: e?.message }, { status:500 }); }
}
