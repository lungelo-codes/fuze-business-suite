import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

// Sales dashboard endpoint. Returns summary KPIs for quotations, orders,
// invoices and revenue. Accepts optional company parameter.
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const company = params.get("company") || undefined;
    const result = await erpMethod("fuze_suite.api.sales.get_dashboard", company ? { company } : {});
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch sales dashboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}