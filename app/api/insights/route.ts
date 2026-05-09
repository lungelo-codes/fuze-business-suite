import { fuzeData } from "@/lib/server/fuzeApi";

type Row = Record<string, unknown>;

export async function GET(): Promise<Response> {
  const [overview, revenueChart] = await Promise.all([
    fuzeData<Row>("fuze_suite.api.insights.get_business_overview", {}, {}),
    fuzeData<Row>("fuze_suite.api.insights.get_revenue_chart", {}, {}),
  ]);
  return Response.json({ success: true, installed: true, data: { overview, revenueChart }, message: "Loaded from controlled Fuze Insights API" });
}
