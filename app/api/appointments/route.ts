import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

/**
 * GET handler that returns sanitized appointments for the current tenant.
 * This endpoint proxies to a whitelisted backend method (appointments.get_appointments)
 * which controls which fields are returned and applies tenant-level filtering. Optional
 * query parameters can filter by from/to dates and status, and support pagination.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const from_date = searchParams.get("from") || undefined;
    const to_date = searchParams.get("to") || undefined;
    const status = searchParams.get("status") || undefined;
    const limitStr = searchParams.get("limit");
    const offsetStr = searchParams.get("offset");
    const args: any = {};
    if (from_date) args.from_date = from_date;
    if (to_date) args.to_date = to_date;
    if (status && status !== "all") args.status = status;
    if (limitStr) args.limit = parseInt(limitStr, 10);
    if (offsetStr) args.offset = parseInt(offsetStr, 10);
    const result = await erpMethod("appointments.get_appointments", args);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load appointments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}