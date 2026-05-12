import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { erpList } from "@/lib/server/erpnext";

type Row = Record<string, unknown>;
async function safeList(doctype: string, fields: string[]): Promise<Row[]> {
  try { return await erpList<Row>(doctype, { fields, limit: 100, orderBy: "modified desc" }); } catch { return []; }
}

export default async function CRMPage() {
  const [leads, opportunities, quotes] = await Promise.all([
    safeList("Lead", ["name", "lead_name", "company_name", "status", "email_id", "mobile_no", "modified"]),
    safeList("Opportunity", ["name", "party_name", "status", "opportunity_amount", "expected_closing", "modified"]),
    safeList("Quotation", ["name", "party_name", "status", "grand_total", "transaction_date", "modified"]),
  ]);
  const rows = [...leads, ...opportunities, ...quotes];
  const pipelineValue = opportunities.reduce((sum, row) => sum + Number(row.opportunity_amount || 0), 0);
  return <ModernModuleDashboard
    title="CRM Workspace"
    eyebrow="CRM & Sales"
    description="Manage leads, opportunities, contacts, quotes and activities in a clean sales workspace. Pipeline stages help customers run sales daily without ERPNext complexity."
    rows={rows}
    tabs={["CRM Dashboard", "Pipeline", "Leads", "Opportunities", "Contacts", "Quotes", "Activities"]}
    metrics={[{ label: "Open Leads", value: leads.length, hint: "Lead records" }, { label: "Opportunities", value: opportunities.length, hint: `R${pipelineValue.toLocaleString()} pipeline` }, { label: "Quotes", value: quotes.length, hint: "Quotation records" }, { label: "Won Deals", value: "Live", hint: "Track conversions" }]}
    actions={[{ label: "Create Lead", href: "/portal/leads", description: "Capture a new sales prospect" }, { label: "Add Contact", href: "/portal/customers", description: "Save decision makers" }, { label: "Create Quote", href: "/portal/quotes", description: "Send a customer proposal" }, { label: "Open Pipeline", href: "/portal/crm", description: "Review active opportunities" }]}
    primaryField="lead_name"
    secondaryField="company_name"
    statusField="status"
    valueField="opportunity_amount"
    mode="crm"
  />;
}
