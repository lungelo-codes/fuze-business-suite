import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const args: Record<string,unknown> = {};
  if (p.get("supplier")) args.supplier = p.get("supplier");
  if (p.get("status"))   args.status   = p.get("status");
  if (p.get("company"))  args.company  = p.get("company");
  if (p.get("limit"))    args.limit    = Number(p.get("limit") || 50);
  if (p.get("offset"))   args.offset   = Number(p.get("offset") || 0);
  try { return NextResponse.json(await erpMethod("procurement.get_supplier_quotations", args)); }
  catch (e:any) { return NextResponse.json({ error: e?.message }, { status:500 }); }
}
