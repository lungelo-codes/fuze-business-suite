import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
import { assertWorkflowAction, requireSaaSUser, safeJsonError, tenantArgs } from "@/lib/server/apiGuard";

type Params = { params: { id: string } };

export async function PUT(req: Request, { params }: Params) {
  try {
    const session = requireSaaSUser();
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || body._action || "submit");
    assertWorkflowAction(action);
    const result = await erpMethod("business_crud.submit_or_cancel", tenantArgs({ doctype: "Payment Entry", name: params.id, action }, session));
    return NextResponse.json({ ok: true, data: result });
  } catch (e: unknown) {
    return safeJsonError(e, "Could not update payment.");
  }
}
