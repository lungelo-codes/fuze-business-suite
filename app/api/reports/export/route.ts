import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

/**
 * API route for exporting ERPNext reports.
 *
 * Query parameters:
 *   report_name – the name of the report to export (required)
 *   format      – "pdf" or "xlsx" (optional, defaults to pdf)
 *   filters     – JSON string of report filters (optional)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const report_name = searchParams.get("report_name") || undefined;
  const format = searchParams.get("format") || "pdf";
  const filters = searchParams.get("filters") || undefined;
  if (!report_name) {
    return NextResponse.json({ error: "Missing report_name" }, { status: 400 });
  }
  try {
    const result = await erpMethod<any>("reports.export_report", { report_name, format, filters });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not export report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}