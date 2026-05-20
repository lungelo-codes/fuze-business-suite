import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const args: Record<string, unknown> = {};
  for (const k of ["company", "status"]) if (p.get(k)) args[k] = p.get(k);
  if (p.get("limit")) args.limit = Number(p.get("limit"));
  if (p.get("offset")) args.offset = Number(p.get("offset"));
  try { return NextResponse.json(await erpMethod("buying.get_rfqs", args)); }
  catch (e: any) { return NextResponse.json({ error: e?.message || "Could not load RFQs" }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(await erpMethod("buying.create_rfq", { data: body }), { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not create RFQ" }, { status: 500 });
  }
}
