import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

// Job openings endpoint. Lists open positions with optional status filter and pagination.
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const company = params.get("company") || undefined;
    const status = params.get("status") || undefined;
    const limitStr = params.get("limit");
    const offsetStr = params.get("offset");
    const args: any = {};
    if (company) args.company = company;
    if (status && status !== "all") args.status = status;
    if (limitStr) args.limit = parseInt(limitStr, 10);
    if (offsetStr) args.offset = parseInt(offsetStr, 10);
    const result = await erpMethod("hr.get_job_openings", args);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch job openings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}