import { NextRequest, NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
// PUT /api/hr/leave-requests/[id]/approve
export async function PUT(_req: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json(await erpMethod("fuze_suite.api.hr.approve_leave_request", { leave_id: params.id }));
}
