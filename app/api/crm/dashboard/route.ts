import { NextResponse } from "next/server";
import { crmGetDashboard, insightsGetPipelineSummary } from "@/lib/server/apiClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const company = searchParams.get("company") || undefined;

    const [dashData, pipelineData] = await Promise.allSettled([
      crmGetDashboard(company),
      insightsGetPipelineSummary(company),
    ]);

    const dashboard =
      dashData.status === "fulfilled"
        ? (dashData.value as Record<string, unknown>)
        : {};
    const pipelineSummary =
      pipelineData.status === "fulfilled"
        ? (pipelineData.value as Record<string, unknown>)
        : {};

    return NextResponse.json({ dashboard, pipelineSummary });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load CRM dashboard" },
      { status: 500 }
    );
  }
}
