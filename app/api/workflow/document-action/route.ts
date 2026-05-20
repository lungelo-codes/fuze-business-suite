import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
import { assertWorkflowAction, requireSaaSUser, safeJsonError, tenantArgs } from "@/lib/server/apiGuard";

const ALLOWED = new Set([
  "Sales Invoice", "Payment Entry", "Purchase Order", "Purchase Receipt", "Purchase Invoice",
  "Material Request", "Request for Quotation", "Supplier Quotation", "Timesheet", "Quality Inspection",
  "Leave Application", "Expense Claim", "Project", "Task"
]);

export async function POST(req: Request) {
  try {
    const session = requireSaaSUser();
    const body = await req.json().catch(() => ({}));
    const doctype = String(body.doctype || "");
    const name = String(body.name || "");
    const action = String(body.action || "submit");
    assertWorkflowAction(action);
    if (!ALLOWED.has(doctype) || !name) return NextResponse.json({ ok: false, error: "Unsupported document action" }, { status: 400 });
    const result = await erpMethod("business_crud.submit_or_cancel", tenantArgs({ doctype, name, action }, session));
    return NextResponse.json({ ok: true, data: result });
  } catch (e: unknown) {
    return safeJsonError(e, "Could not submit document.");
  }
}
