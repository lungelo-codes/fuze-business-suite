import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

// List employees endpoint. Supports optional filters such as status and department,
// together with pagination parameters. Uses the HR backend to avoid exposing all fields.
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const status = params.get("status") || undefined;
    const department = params.get("department") || undefined;
    const company = params.get("company") || undefined;
    const limitStr = params.get("limit");
    const offsetStr = params.get("offset");
    const args: any = {};
    if (status && status !== "all") args.status = status;
    if (department && department !== "all") args.department = department;
    if (company) args.company = company;
    if (limitStr) args.limit = parseInt(limitStr, 10);
    if (offsetStr) args.offset = parseInt(offsetStr, 10);
    const result = await erpMethod("hr.get_employees", args);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch employees";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}