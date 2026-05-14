import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

/**
 * GET  /api/crm/tasks?reference_doctype=CRM Lead&reference_name=CRM-LEAD-0001
 * POST /api/crm/tasks  body: { reference_doctype, reference_name, title, description, status, assigned_to, due_date, priority }
 */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const reference_doctype = searchParams.get("reference_doctype");
  const reference_name    = searchParams.get("reference_name");
  const limit  = searchParams.get("limit");
  const offset = searchParams.get("offset");

  if (!reference_doctype || !reference_name) {
    return NextResponse.json({ error: "reference_doctype and reference_name are required" }, { status: 400 });
  }

  try {
    const args: Record<string, string | number> = { reference_doctype, reference_name };
    if (limit)  args.limit  = Number(limit);
    if (offset) args.offset = Number(offset);

    const result = await erpMethod("crm.get_tasks", args);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reference_doctype, reference_name, title, ...rest } = body;

    if (!reference_doctype || !reference_name) {
      return NextResponse.json({ error: "reference_doctype and reference_name are required" }, { status: 400 });
    }

    const result = await erpMethod("crm.create_task", {
      reference_doctype,
      reference_name,
      title: title || "Task",
      data: rest,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to create task" },
      { status: 500 }
    );
  }
}
