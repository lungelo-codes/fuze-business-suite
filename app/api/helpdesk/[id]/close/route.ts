import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await erpMethod("helpdesk.close_ticket", { ticket_id: params.id, resolution: body.resolution });
    return NextResponse.json(result);
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
