
import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
import { requireSaaSUser, safeJsonError } from "@/lib/server/apiGuard";

type Body = { doctype?: string; name?: string; action?: string; user?: string; values?: Record<string, unknown> };

export async function POST(req: Request) {
  try {
    requireSaaSUser();
    const body = (await req.json().catch(() => ({}))) as Body;
    const doctype = String(body.doctype || "");
    const name = String(body.name || "");
    const action = String(body.action || "").toLowerCase();
    if (!doctype || !name || !action) return NextResponse.json({ ok: false, error: "Missing action details" }, { status: 400 });
    try { await erpMethod("hr.ensure_runtime_context", {}); } catch {}
    if (action === "submit" || action === "cancel") {
      const result = await erpMethod("business_crud.submit_or_cancel", { doctype, name, action });
      return NextResponse.json({ ok: true, data: result });
    }
    if (action === "approve_leave") {
      const result = await erpMethod("hr.approve_leave_request", { leave_id: name });
      return NextResponse.json({ ok: true, data: result });
    }
    if (action === "reject_leave") {
      const result = await erpMethod("hr.reject_leave_request", { leave_id: name, reason: body.values?.reason || "Rejected" });
      return NextResponse.json({ ok: true, data: result });
    }
    if (action === "approve_expense") {
      const result = await erpMethod("hr.approve_expense_claim", { claim_id: name });
      return NextResponse.json({ ok: true, data: result });
    }
    if (action === "assign") {
      const result = await erpMethod("frappe.desk.form.assign_to.add", { doctype, name, assign_to: [body.user], description: "Assigned from Business Suite HR" });
      return NextResponse.json({ ok: true, data: result });
    }
    return NextResponse.json({ ok: false, error: "Unsupported action" }, { status: 400 });
  } catch (error: unknown) {
    return safeJsonError(error, "Could not complete HR action.");
  }
}
