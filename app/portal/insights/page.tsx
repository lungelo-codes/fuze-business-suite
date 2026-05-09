import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { fuzeData, money, rowsFrom } from "@/lib/server/fuzeApi";

type Row = Record<string, unknown>;

export default async function InsightsPage() {
  const [overview, chartData] = await Promise.all([
    fuzeData<Row>("fuze_suite.api.insights.get_business_overview", {}, {}),
    fuzeData<Row>("fuze_suite.api.insights.get_revenue_chart", {}, {}),
  ]);

  const cards = (overview.cards || {}) as Row;
  const chart = rowsFrom(chartData, ["chart", "rows", "data"]);

  return (
    <ModernModuleDashboard
      title="Business Insights"
      eyebrow="Executive Dashboard"
      description="A clean business overview from your Fuze Insights API, not scattered raw ERPNext reports."
      rows={chart}
      tabs={["Overview", "Revenue", "Customers", "Projects", "Tasks"]}
      metrics={[
        { label: "Revenue", value: money(cards.revenue), hint: "Confirmed income" },
        { label: "Expenses", value: money(cards.expenses), hint: "Confirmed spend" },
        { label: "Profit", value: money(cards.profit), hint: "Revenue less expenses" },
        { label: "Customers", value: Number(cards.customers || 0), hint: "Customer base" },
        { label: "Employees", value: Number(cards.employees || 0), hint: "Team size" },
        { label: "Open Tasks", value: Number(cards.open_tasks || 0), hint: "Work needing action" },
      ]}
      actions={[
        { label: "CRM", href: "/portal/crm", description: "Review pipeline" },
        { label: "Accounting", href: "/portal/accounting", description: "Review revenue" },
        { label: "Projects", href: "/portal/projects", description: "Track delivery" },
        { label: "Compliance", href: "/portal/compliance", description: "SA compliance" },
      ]}
      primaryField="month"
      secondaryField="revenue"
      valueField="revenue"
      mode="standard"
    />
  );
}
