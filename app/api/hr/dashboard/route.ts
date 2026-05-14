import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

// HR dashboard endpoint. Returns summary metrics, grouped cards and tabs for the HR module.
// Optional query parameter `company` can scope the dashboard to a specific tenant.
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const company = params.get("company") || undefined;
    const result = await erpMethod("hr.get_dashboard", company ? { company } : {});
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch HR dashboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}