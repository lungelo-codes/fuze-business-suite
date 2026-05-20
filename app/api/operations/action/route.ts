import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

type Action =
  | "supplier" | "material-request" | "rfq" | "supplier-quotation" | "purchase-order" | "purchase-receipt" | "purchase-invoice" | "supplier-payment"
  | "project" | "task" | "timesheet" | "project-billing"
  | "quality-goal" | "quality-inspection" | "non-conformance" | "supplier-quality" | "quality-meeting" | "quality-review" | "quality-action"
  | "data-import";

const METHODS: Record<Action, string> = {
  supplier: "buying.create_supplier",
  "material-request": "buying.create_material_request",
  rfq: "buying.create_rfq",
  "supplier-quotation": "buying.create_supplier_quotation",
  "purchase-order": "buying.create_purchase_order",
  "purchase-receipt": "buying.create_purchase_receipt",
  "purchase-invoice": "buying.create_purchase_invoice",
  "supplier-payment": "buying.create_supplier_payment",
  project: "projects.create_project",
  task: "projects.create_task",
  timesheet: "projects.create_timesheet",
  "project-billing": "projects.create_sales_invoice_from_timesheet",
  "quality-goal": "quality.create_quality_goal",
  "quality-inspection": "quality.create_quality_inspection",
  "non-conformance": "quality.create_non_conformance",
  "supplier-quality": "quality.create_supplier_quality_issue",
  "quality-meeting": "quality.create_quality_meeting",
  "quality-review": "quality.create_quality_review",
  "quality-action": "quality.create_quality_action",
  "data-import": "data_management.create_data_import",
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "") as Action;
    const method = METHODS[action];
    if (!method) return NextResponse.json({ error: "Unsupported operation action" }, { status: 400 });
    const payload = body.data && typeof body.data === "object" ? body.data : {};
    const args = action === "project-billing" ? payload : { data: payload };
    const result = await erpMethod(method, args as Record<string, unknown>);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not complete operation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
