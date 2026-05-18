import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try { return NextResponse.json(await erpMethod("helpdesk.get_ticket", { ticket_id: params.id })); }
  catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const result = await erpMethod("helpdesk.update_ticket", { ticket_id: params.id, data: body });
    return NextResponse.json(result);
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
