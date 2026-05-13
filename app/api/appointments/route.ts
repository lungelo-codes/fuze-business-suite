import { NextResponse } from "next/server";
import { erpList } from "@/lib/server/erpnext";

/**
 * GET handler that returns all appointments (Event DocType) for the current tenant.
 * Supports optional query parameters to filter by date range. Dates should be in
 * YYYY-MM-DD format. When no dates are provided, the most recent events (up to 100)
 * are returned.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const filters: any[] = [];
  if (from) filters.push(["Event", "starts_on", ">=", from]);
  if (to) filters.push(["Event", "starts_on", "<=", to]);
  try {
    const events = await erpList<Record<string, any>>("Event", {
      fields: [
        "name",
        "subject",
        "starts_on",
        "ends_on",
        "event_type",
        "status",
        "description",
        "owner",
        "modified",
      ],
      filters: filters.length ? filters : undefined,
      limit: 100,
      orderBy: "starts_on desc",
    });
    return NextResponse.json(events);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load appointments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}