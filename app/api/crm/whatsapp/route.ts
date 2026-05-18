import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const reference_doctype = searchParams.get("reference_doctype");
  const reference_name = searchParams.get("reference_name");
  if (!reference_doctype || !reference_name) return NextResponse.json({ error: "reference_doctype and reference_name are required" }, { status: 400 });
  try {
    const result = await erpMethod("crm.get_whatsapp_messages", { reference_doctype, reference_name });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch WhatsApp messages" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reference_doctype, reference_name, to, message, ...data } = body;
    if (!reference_doctype || !reference_name || !to || !message) return NextResponse.json({ error: "reference_doctype, reference_name, to and message are required" }, { status: 400 });
    const result = await erpMethod("crm.send_whatsapp", { reference_doctype, reference_name, to, message, data });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to send WhatsApp message" }, { status: 500 });
  }
}
