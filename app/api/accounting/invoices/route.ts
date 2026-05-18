import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const args: Record<string, unknown> = {};
  if (p.get("status")) args.status = p.get("status");
  if (p.get("customer")) args.customer = p.get("customer");
  if (p.get("company")) args.company = p.get("company");
  if (p.get("limit"))  args.limit  = Number(p.get("limit"));
  if (p.get("offset")) args.offset = Number(p.get("offset"));
  try {
    const result = await erpMethod("accounting.get_invoices", args);
    return NextResponse.json(result);
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
