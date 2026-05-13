import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

// List tasks. Supports filters for project, status and assigned user, with pagination.
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const project = params.get("project") || undefined;
    const status = params.get("status") || undefined;
    const assigned_to = params.get("assigned_to") || undefined;
    const limitStr = params.get("limit");
    const offsetStr = params.get("offset");
    const args: any = {};
    if (project) args.project = project;
    if (status && status !== "all") args.status = status;
    if (assigned_to) args.assigned_to = assigned_to;
    if (limitStr) args.limit = parseInt(limitStr, 10);
    if (offsetStr) args.offset = parseInt(offsetStr, 10);
    const result = await erpMethod("projects.get_tasks", args);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch tasks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}