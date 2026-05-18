import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const args: Record<string,unknown> = { limit: Number(p.get("limit") || 50) };
  try { return NextResponse.json(await erpMethod("procurement.get_low_stock", args)); }
  catch (e:any) { return NextResponse.json({ error: e?.message }, { status:500 }); }
}
