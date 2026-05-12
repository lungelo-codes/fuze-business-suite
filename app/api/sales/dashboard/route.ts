import { NextResponse } from "next/server";
import { salesGetDashboard, salesGetTrend, salesGetTopCustomers } from "@/lib/server/apiClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const company = searchParams.get("company") || undefined;
    const months = Number(searchParams.get("months") || 6);

    const [dash, trend, topCustomers] = await Promise.allSettled([
      salesGetDashboard(company),
      salesGetTrend(company, months),
      salesGetTopCustomers(company, 10),
    ]);

    return NextResponse.json({
      dashboard: dash.status === "fulfilled" ? dash.value : {},
      trend: trend.status === "fulfilled" ? trend.value : {},
      topCustomers: topCustomers.status === "fulfilled" ? topCustomers.value : {},
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
