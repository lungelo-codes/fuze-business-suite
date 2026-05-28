import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams;
    const ticket = p.get("ticket") || p.get("name") || "";
    if (!ticket) return NextResponse.json({ ok: false, error: "ticket is required" }, { status: 400 });
    return NextResponse.json(await erpMethod("portal.get_customer_ticket", { ticket }));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not load ticket" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.subject) return NextResponse.json({ ok: false, error: "subject is required" }, { status: 400 });
    return NextResponse.json(await erpMethod("portal.create_customer_ticket", body));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not create ticket" }, { status: 500 });
  }
}
