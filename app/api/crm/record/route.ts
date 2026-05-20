import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const doctype = p.get("doctype") || p.get("kind") || "";
  const name = p.get("name") || "";
  try {
    const result = await erpMethod("crm.get_crm_record", { doctype, name });
    return NextResponse.json({ success: true, data: result, ...(typeof result === "object" && result ? result as Record<string, unknown> : {}) });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Could not load record" }, { status: e?.status || 500 });
  }
}

export async function PUT(req: Request) {
  const p = new URL(req.url).searchParams;
  const body = await req.json().catch(() => ({}));
  const doctype = body.doctype || p.get("doctype") || p.get("kind") || "";
  const name = body.name || p.get("name") || "";
  const values = body.values || body;
  try {
    const result = await erpMethod("crm.update_crm_record", { doctype, name, values });
    return NextResponse.json({ success: true, data: result, ...(typeof result === "object" && result ? result as Record<string, unknown> : {}) });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Could not save record" }, { status: e?.status || 500 });
  }
}
