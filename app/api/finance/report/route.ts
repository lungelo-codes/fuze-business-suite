import { NextResponse } from "next/server";
import { runFinancialReport } from "@/lib/server/finance";
export async function POST(req: Request) { try { const b = await req.json(); return NextResponse.json(await runFinancialReport(String(b.report_name || b.reportName || "Profit and Loss Statement"), b.filters || {})); } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 }); } }
