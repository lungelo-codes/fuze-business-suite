import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(await erpMethod("hr.reject_leave_request", { leave_id: params.id, reason: body.reason }));
  } catch (e:any) { return NextResponse.json({ error: e?.message }, { status:500 }); }
}
