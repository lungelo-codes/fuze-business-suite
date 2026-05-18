import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const args: Record<string, unknown> = { limit: Number(p.get("limit") || 10) };
  if (p.get("company")) args.company = p.get("company");
  try { return NextResponse.json(await erpMethod("insights.get_top_customers", args)); }
  catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
