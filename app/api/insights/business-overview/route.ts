import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

// Business overview endpoint. Aggregates data across modules for high-level KPIs.
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const company = params.get("company") || undefined;
    const result = await erpMethod("insights.get_business_overview", company ? { company } : {});
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch business overview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}