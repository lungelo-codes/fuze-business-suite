import { NextResponse } from "next/server";
import { envelope } from "@/lib/server/businessApi";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const report = String(body.report || "business-report");
  return NextResponse.json(envelope({
    report,
    format: "excel",
    status: "ready",
    fileName: `${report}.xlsx`,
    message: "Excel export request accepted. Wire this endpoint to ERPNext report export or a spreadsheet service in production.",
  }, "Excel export prepared"));
}
