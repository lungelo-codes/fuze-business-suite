import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

// Endpoint to list leave allocations. Supports filtering by employee and leave_type
// and pagination via limit and offset. Delegates to hr.get_leave_allocations.
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const employee = params.get("employee") || undefined;
    const leave_type = params.get("leave_type") || undefined;
    const limitStr = params.get("limit");
    const offsetStr = params.get("offset");
    const args: any = {};
    if (employee) args.employee = employee;
    if (leave_type) args.leave_type = leave_type;
    if (limitStr) args.limit = parseInt(limitStr, 10);
    if (offsetStr) args.offset = parseInt(offsetStr, 10);
    const result = await erpMethod("hr.get_leave_allocations", args);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch leave allocations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}