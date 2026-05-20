import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(await erpMethod("projects.create_sales_invoice_from_timesheet", body), { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not bill timesheet" }, { status: 500 });
  }
}
