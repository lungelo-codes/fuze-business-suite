import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const company = p.get("company") || undefined;
  try { return NextResponse.json(await erpMethod("hr.get_org_chart", company ? { company } : {})); }
  catch (e:any) { return NextResponse.json({ error: e?.message }, { status:500 }); }
}
