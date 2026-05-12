/**
 * /api/insights
 * Connects the fuze_suite.api.insights API to the Reports module.
 * Returns a unified insights payload used by the ReportsPage.
 */
import { NextResponse } from "next/server";
import {
  insightsGetBusinessOverview,
  insightsGetRevenueChart,
  insightsGetCustomerGrowth,
  insightsGetTopCustomers,
  insightsGetPipelineSummary,
  insightsGetInsightsQueries,
  insightsGetInsightsDashboards,
} from "@/lib/server/apiClient";

type AnyRecord = Record<string, unknown>;

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const company = searchParams.get("company") || undefined;
    const months = Number(searchParams.get("months") || 6);

    const [
      overview,
      revenueChart,
      customerGrowth,
      topCustomers,
      pipelineSummary,
      insightsQueries,
      insightsDashboards,
    ] = await Promise.all([
      safe(() => insightsGetBusinessOverview(company), {} as AnyRecord),
      safe(() => insightsGetRevenueChart(company, months), {} as AnyRecord),
      safe(() => insightsGetCustomerGrowth(months), {} as AnyRecord),
      safe(() => insightsGetTopCustomers(company, 10), {} as AnyRecord),
      safe(() => insightsGetPipelineSummary(company), {} as AnyRecord),
      safe(() => insightsGetInsightsQueries(50), {} as AnyRecord),
      safe(() => insightsGetInsightsDashboards(20), {} as AnyRecord),
    ]);

    return NextResponse.json({
      overview,
      revenueChart,
      customerGrowth,
      topCustomers,
      pipelineSummary,
      insightsQueries,
      insightsDashboards,
      _source: "fuze_insights_api",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load insights" },
      { status: 500 }
    );
  }
}
