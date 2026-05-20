import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

const ALLOWED = new Set([
  "Sales Invoice", "Payment Entry", "Purchase Order", "Purchase Receipt", "Purchase Invoice",
  "Material Request", "Request for Quotation", "Supplier Quotation", "Timesheet", "Quality Inspection"
]);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const doctype = String(body.doctype || "");
    const name = String(body.name || "");
    const action = String(body.action || "submit");
    if (!ALLOWED.has(doctype) || !name) return NextResponse.json({ error: "Unsupported document action" }, { status: 400 });
    return NextResponse.json(await erpMethod("workflow.apply_document_action", { doctype, name, action }));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not apply workflow action" }, { status: 500 });
  }
}
