import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { getCrmWorkspace } from "@/lib/server/businessApi";

export default async function CRMPage() {
  const data = await getCrmWorkspace();
  return <ModernModuleDashboard
    title="CRM Workspace"
    eyebrow="CRM & Sales"
    description="Manage leads, opportunities, contacts, quotes and activities in one clean sales workspace. The UI stays simple while the API layer handles ERPNext business logic."
    rows={data.rows}
    tabs={["CRM Dashboard", "Pipeline", "Leads", "Opportunities", "Customers", "Quotes", "Campaigns", "Activities"]}
    metrics={[
      { label: "Open Leads", value: data.metrics.openLeads, hint: "Prospects to qualify" },
      { label: "Opportunities", value: data.metrics.opportunities, hint: `R${data.metrics.pipelineValue.toLocaleString("en-ZA")} pipeline` },
      { label: "Quotes", value: data.metrics.quotes, hint: "Proposals created" },
      { label: "Customers", value: data.metrics.customers, hint: "Converted accounts" },
    ]}
    actions={[
      { label: "Create Lead", href: "/portal/leads", description: "Capture a new sales prospect" },
      { label: "Convert Lead", href: "/portal/leads", description: "Move a lead into the customer journey" },
      { label: "Create Quote", href: "/portal/quotes", description: "Send a customer proposal" },
      { label: "Create Invoice", href: "/portal/invoices", description: "Bill from an approved sales flow" },
    ]}
    primaryField="lead_name"
    secondaryField="company_name"
    statusField="status"
    valueField="opportunity_amount"
    mode="crm"
  />;
}
