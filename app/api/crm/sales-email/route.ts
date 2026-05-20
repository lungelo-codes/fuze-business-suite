import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  try {
    const result = await erpMethod("crm.email_sales_document", body);
    return NextResponse.json({ success: true, data: result, ...(typeof result === "object" && result ? result as Record<string, unknown> : {}) });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Could not send email" }, { status: e?.status || 500 });
  }
}
