import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

// GET /api/helpdesk        → helpdesk.get_dashboard
// GET /api/helpdesk?list=1 → helpdesk.get_tickets
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  if (p.get("list")) {
    const args: Record<string, unknown> = {};
    if (p.get("status")) args.status = p.get("status");
    if (p.get("priority")) args.priority = p.get("priority");
    if (p.get("customer")) args.customer = p.get("customer");
    if (p.get("limit"))  args.limit  = Number(p.get("limit"));
    if (p.get("offset")) args.offset = Number(p.get("offset"));
    try { return NextResponse.json(await erpMethod("helpdesk.get_tickets", args)); }
    catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
  }
  try { return NextResponse.json(await erpMethod("helpdesk.get_dashboard", {})); }
  catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await erpMethod("helpdesk.create_ticket", { data: body });
    return NextResponse.json(result, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
