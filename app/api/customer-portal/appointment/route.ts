import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(await erpMethod("portal.create_customer_appointment", body));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not create appointment" }, { status: 500 });
  }
}
