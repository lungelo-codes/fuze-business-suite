import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

// Payroll summary endpoint. Accepts optional company and date range filters
// and returns aggregate payroll totals and salary slips for the period.
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const company = params.get("company") || undefined;
    const from_date = params.get("from_date") || undefined;
    const to_date = params.get("to_date") || undefined;
    const args: any = {};
    if (company) args.company = company;
    if (from_date) args.from_date = from_date;
    if (to_date) args.to_date = to_date;
    const result = await erpMethod("hr.get_payroll_summary", args);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch payroll summary";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}