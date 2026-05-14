import { NextRequest, NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
// PUT /api/hr/leave-requests/[id]/reject
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  return NextResponse.json(
    await erpMethod("fuze_suite.api.hr.reject_leave_request", { leave_id: params.id, reason: body.reason })
  );
}
