import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const args: Record<string,unknown> = {};
  if (p.get("search"))         args.search         = p.get("search");
  if (p.get("supplier_group")) args.supplier_group = p.get("supplier_group");
  if (p.get("limit"))          args.limit          = Number(p.get("limit") || 50);
  if (p.get("offset"))         args.offset         = Number(p.get("offset") || 0);
  try { return NextResponse.json(await erpMethod("procurement.get_suppliers", args)); }
  catch (e:any) { return NextResponse.json({ error: e?.message }, { status:500 }); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    return NextResponse.json(await erpMethod("buying.create_supplier", { data: body }), { status:201 });
  } catch (e:any) { return NextResponse.json({ error: e?.message }, { status:500 }); }
}
