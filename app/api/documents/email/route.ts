import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
import { requireSaaSUser, safeJsonError, tenantArgs } from "@/lib/server/apiGuard";

export async function POST(req: Request) {
  try {
    const session = requireSaaSUser();
    const body = await req.json().catch(() => ({}));
    const doctype = String(body.doctype || "");
    const name = String(body.name || "");
    const recipient = String(body.recipient || body.email || "");
    if (!doctype || !name || !recipient) return NextResponse.json({ ok: false, error: "Document and recipient are required." }, { status: 400 });
    const result = await erpMethod("documents.email_document", tenantArgs({ doctype, name, recipient, subject: body.subject, message: body.message }, session));
    return NextResponse.json({ ok: true, data: result });
  } catch (e: unknown) {
    return safeJsonError(e, "Could not email document.");
  }
}
