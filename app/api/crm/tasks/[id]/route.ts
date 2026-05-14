import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

type Params = { params: { id: string } };

/** PUT /api/crm/tasks/[id]  body: { title?, description?, status?, assigned_to?, due_date?, priority? } */
export async function PUT(req: Request, { params }: Params) {
  try {
    const body = await req.json();
    const result = await erpMethod("fuze_suite.api.crm.update_task", { task: params.id, data: body });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update task" },
      { status: 500 }
    );
  }
}
