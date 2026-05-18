import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

type Action =
  | "supplier"
  | "material-request"
  | "purchase-order"
  | "project"
  | "task"
  | "timesheet"
  | "quality-goal"
  | "quality-meeting"
  | "quality-review"
  | "data-import";

const METHODS: Record<Action, string> = {
  supplier: "buying.create_supplier",
  "material-request": "buying.create_material_request",
  "purchase-order": "buying.create_purchase_order",
  project: "projects.create_project",
  task: "projects.create_task",
  timesheet: "projects.create_timesheet",
  "quality-goal": "quality.create_quality_goal",
  "quality-meeting": "quality.create_quality_meeting",
  "quality-review": "quality.create_quality_review",
  "data-import": "data_management.create_data_import",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = String(body.action || "") as Action;
    const method = METHODS[action];
    if (!method) return NextResponse.json({ error: "Unsupported operation action" }, { status: 400 });
    const payload = body.data && typeof body.data === "object" ? body.data : {};
    const result = await erpMethod(method, { data: payload });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not complete operation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
