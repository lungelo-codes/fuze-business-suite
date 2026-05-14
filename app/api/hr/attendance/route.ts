import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

// Attendance API endpoint. Fetches attendance records with optional filters
// for date, status and employee. Pagination is supported via limit and offset.
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const date = params.get("date") || undefined;
    const status = params.get("status") || undefined;
    const employee = params.get("employee") || undefined;
    const limitStr = params.get("limit");
    const offsetStr = params.get("offset");
    const args: any = {};
    if (date) args.date = date;
    if (status && status !== "all") args.status = status;
    if (employee) args.employee = employee;
    if (limitStr) args.limit = parseInt(limitStr, 10);
    if (offsetStr) args.offset = parseInt(offsetStr, 10);
    const result = await erpMethod("hr.get_attendance", args);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch attendance records";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}