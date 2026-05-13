import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

// Endpoint to list leave requests. Accepts optional filters for status and employee,
// and supports pagination via limit and offset parameters. Delegates to hr.get_leave_requests.
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const status = params.get("status") || undefined;
    const employee = params.get("employee") || undefined;
    const limitStr = params.get("limit");
    const offsetStr = params.get("offset");
    const args: any = {};
    if (status && status !== "all") args.status = status;
    if (employee) args.employee = employee;
    if (limitStr) args.limit = parseInt(limitStr, 10);
    if (offsetStr) args.offset = parseInt(offsetStr, 10);
    const result = await erpMethod("hr.get_leave_requests", args);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch leave requests";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}