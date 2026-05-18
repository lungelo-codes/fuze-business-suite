import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function POST(_: Request, { params }: { params: { id: string } }) {
  try { return NextResponse.json(await erpMethod("hr.approve_leave_request", { leave_id: params.id })); }
  catch (e:any) { return NextResponse.json({ error: e?.message }, { status:500 }); }
}
