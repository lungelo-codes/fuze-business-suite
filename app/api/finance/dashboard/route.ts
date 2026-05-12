import { NextResponse } from "next/server";
import { acctGetDashboard, acctGetRevenueChart } from "@/lib/server/apiClient";
import { getFinancialDashboard } from "@/lib/server/finance";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const company = searchParams.get("company") || undefined;

    // Try the shared Fuze API first; fall back to the legacy finance lib
    const [apiDash, apiChart, legacyDash] = await Promise.allSettled([
      acctGetDashboard(company),
      acctGetRevenueChart(company, 6),
      getFinancialDashboard(),
    ]);

    const apiData =
      apiDash.status === "fulfilled"
        ? (apiDash.value as Record<string, unknown>)
        : null;
    const chartData =
      apiChart.status === "fulfilled"
        ? (apiChart.value as Record<string, unknown>)
        : null;
    const legacy =
      legacyDash.status === "fulfilled"
        ? (legacyDash.value as Record<string, unknown>)
        : {};

    if (apiData) {
      const cards = (apiData.cards as Record<string, unknown>) ?? {};
      return NextResponse.json({
        ...legacy,
        kpis: {
          totalReceivables: cards.receivables ?? 0,
          totalPayables: cards.payables ?? 0,
          monthlyRevenue: cards.monthly_revenue ?? 0,
          monthlyExpenses: cards.monthly_expenses ?? 0,
          cashBalance: cards.cash_balance ?? 0,
          overdueInvoices: cards.overdue_invoices ?? 0,
          overdueBills: cards.overdue_bills ?? 0,
          ...(typeof legacy.kpis === "object" ? (legacy.kpis as object) : {}),
        },
        monthly: Array.isArray((chartData as Record<string, unknown>)?.chart)
          ? (chartData as Record<string, unknown>).chart
          : (legacy.monthly ?? []),
        _source: "fuze_api",
      });
    }

    return NextResponse.json(legacy);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
