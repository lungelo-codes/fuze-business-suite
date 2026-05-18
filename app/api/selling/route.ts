import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const company = p.get("company") || undefined;
  try { return NextResponse.json(await erpMethod("fuze_suite.api.selling.get_dashboard", company ? { company } : {})); }
  catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
