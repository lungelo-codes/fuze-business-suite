import { erpList } from "@/lib/server/erpnext";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get("type") || "all";

    const [queries, dashboards, dataSources, charts] = await Promise.all([
      (type === "all" || type === "queries")
        ? erpList<Record<string, unknown>>("Insights Query", {
            fields: ["name", "title", "status", "modified"],
            limit: 100,
            orderBy: "modified desc",
          }).catch(() => [])
        : Promise.resolve([]),
      (type === "all" || type === "dashboards")
        ? erpList<Record<string, unknown>>("Insights Dashboard", {
            fields: ["name", "title", "modified"],
            limit: 50,
            orderBy: "modified desc",
          }).catch(() => [])
        : Promise.resolve([]),
      (type === "all" || type === "sources")
        ? erpList<Record<string, unknown>>("Insights Data Source", {
            fields: ["name", "title", "database_type", "status", "modified"],
            limit: 50,
            orderBy: "modified desc",
          }).catch(() => [])
        : Promise.resolve([]),
      (type === "all" || type === "charts")
        ? erpList<Record<string, unknown>>("Insights Chart", {
            fields: ["name", "title", "chart_type", "modified"],
            limit: 100,
            orderBy: "modified desc",
          }).catch(() => [])
        : Promise.resolve([]),
    ]);

    const installed = queries.length > 0 || dashboards.length > 0 || dataSources.length > 0;

    return Response.json({
      success: true,
      installed,
      data: { queries, dashboards, dataSources, charts },
      message: installed
        ? "Frappe Insights is active"
        : "Frappe Insights app not installed or no data yet. Install via: bench get-app insights && bench install-app insights",
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch Insights data" },
      { status: 500 }
    );
  }
}
