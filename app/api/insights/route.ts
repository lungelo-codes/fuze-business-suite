import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const company = p.get("company") || undefined;
  try {
    const [overview, revenue, customers, pipeline] = await Promise.all([
      erpMethod("insights.get_business_overview", company ? { company } : {}),
      erpMethod("insights.get_revenue_chart", { months: 6, ...(company ? { company } : {}) }),
      erpMethod("insights.get_customer_growth", { months: 6 }),
      erpMethod("insights.get_pipeline_summary", company ? { company } : {}),
    ]);
    return NextResponse.json({ overview, revenue, customers, pipeline });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
