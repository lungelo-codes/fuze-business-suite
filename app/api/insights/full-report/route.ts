import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const company = p.get("company") || undefined;
  try {
    const result = await erpMethod("insights.get_full_report", company ? { company } : {});
    return NextResponse.json(result);
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
