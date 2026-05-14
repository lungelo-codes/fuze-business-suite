import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

// List timesheets. Supports filtering by employee or project and pagination.
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const employee = params.get("employee") || undefined;
    const project = params.get("project") || undefined;
    const limitStr = params.get("limit");
    const offsetStr = params.get("offset");
    const args: any = {};
    if (employee) args.employee = employee;
    if (project) args.project = project;
    if (limitStr) args.limit = parseInt(limitStr, 10);
    if (offsetStr) args.offset = parseInt(offsetStr, 10);
    const result = await erpMethod("projects.get_timesheets", args);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch timesheets";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}