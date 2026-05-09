import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { fuzeData, money, rowsFrom } from "@/lib/server/fuzeApi";

type Row = Record<string, unknown>;

export default async function CRMPage() {
  const [dashboard, pipelineData, leadsData] = await Promise.all([
    fuzeData<Row>("fuze_suite.api.crm.get_dashboard", {}, {}),
    fuzeData<Row>("fuze_suite.api.crm.get_pipeline", {}, {}),
    fuzeData<Row>("fuze_suite.api.crm.get_leads", {}, {}),
  ]);

  const cards = (dashboard.cards || {}) as Row;
  const pipeline = rowsFrom(pipelineData, ["pipeline", "deals", "opportunities", "rows", "data"]);
  const leads = rowsFrom(leadsData, ["leads", "rows", "data"]);
  const rows = [...pipeline, ...leads];

  return (
    <ModernModuleDashboard
      title="CRM Workspace"
      eyebrow="CRM & Sales"
      description="A simplified sales workspace powered by your controlled Fuze Business Suite CRM API, not raw ERPNext fields."
      rows={rows}
      tabs={["CRM Dashboard", "Pipeline", "Leads", "Customers", "Activities"]}
      metrics={[
        { label: "Leads", value: Number(cards.leads || leads.length), hint: "Controlled lead records" },
        { label: "Deals", value: Number(cards.deals || pipeline.length), hint: "Pipeline opportunities" },
        { label: "Customers", value: Number(cards.customers || 0), hint: "Active customer base" },
        { label: "Pipeline", value: money(cards.pipeline_value), hint: "Expected deal value" },
      ]}
      actions={[
        { label: "Create Lead", href: "/portal/leads", description: "Capture a new prospect" },
        { label: "Pipeline", href: "/portal/opportunities", description: "Review active deals" },
        { label: "Create Quote", href: "/portal/quotes", description: "Send a proposal" },
        { label: "Customers", href: "/portal/customers", description: "View customer records" },
      ]}
      primaryField="title"
      secondaryField="customer"
      statusField="stage"
      valueField="value"
      mode="crm"
    />
  );
}
