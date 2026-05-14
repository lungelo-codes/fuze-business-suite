import { NextResponse } from "next/server";
import { envelope } from "@/lib/server/businessApi";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const report = String(body.report || "business-report");
  return NextResponse.json(envelope({
    report,
    format: "pdf",
    status: "ready",
    fileName: `${report}.pdf`,
    message: "PDF export request accepted. Wire this endpoint to ERPNext/Frappe print or your PDF service in production.",
  }, "PDF export prepared"));
}
