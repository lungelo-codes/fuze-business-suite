import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { erpList } from "@/lib/server/erpnext";

type Row = Record<string, unknown>;
async function safeList(doctype: string, fields: string[]): Promise<Row[]> {
  try { return await erpList<Row>(doctype, { fields, limit: 100, orderBy: "modified desc" }); } catch { return []; }
}

export default async function CRMPage() {
  // Try Frappe CRM app doctypes first, fall back to ERPNext CRM doctypes
  const [frappeDeals, leads, opportunities, quotes, crmNotes, crmActivities] = await Promise.all([
    safeList("CRM Deal", ["name", "party_name", "status", "stage", "amount", "deal_owner", "expected_closing", "probability", "modified"]),
    safeList("Lead", ["name", "lead_name", "company_name", "status", "email_id", "mobile_no", "lead_owner", "territory", "modified"]),
    safeList("Opportunity", ["name", "party_name", "status", "opportunity_amount", "expected_closing", "probability", "sales_stage", "modified"]),
    safeList("Quotation", ["name", "party_name", "status", "grand_total", "transaction_date", "modified"]),
    safeList("CRM Note", ["name", "title", "modified"]),
    safeList("CRM Activity", ["name", "type", "modified"]),
  ]);

  // Prefer Frappe CRM deals, fall back to ERPNext Opportunities for pipeline value
  const pipelineSource = frappeDeals.length ? frappeDeals : opportunities;
  const pipelineValue = pipelineSource.reduce((sum, row) =>
    sum + Number(row.amount || row.opportunity_amount || 0), 0);

  const rows = [...(frappeDeals.length ? frappeDeals : opportunities), ...leads, ...quotes];
  const wonDeals = pipelineSource.filter((r) =>
    ["Won", "Converted"].includes(String(r.status || r.stage || "")));

  return (
    <ModernModuleDashboard
      title="CRM Workspace"
      eyebrow="CRM & Sales"
      description="Manage leads, deals, contacts and pipeline stages. Uses Frappe CRM app when installed; falls back to ERPNext CRM doctypes automatically."
      rows={rows}
      tabs={["CRM Dashboard", "Pipeline", "Leads", "Opportunities", "Contacts", "Quotes", "Activities"]}
      metrics={[
        { label: "Open Leads", value: leads.length, hint: "Lead records" },
        { label: "Pipeline", value: `R${pipelineValue.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`, hint: frappeDeals.length ? "Frappe CRM deals" : "ERPNext opportunities" },
        { label: "Quotes", value: quotes.length, hint: "Quotation records" },
        { label: "Won", value: wonDeals.length, hint: "Closed won deals" },
      ]}
      actions={[
        { label: "Create Lead", href: "/portal/leads", description: "Capture a new sales prospect" },
        { label: "Add Contact", href: "/portal/contacts", description: "Save decision makers and contacts" },
        { label: "Create Quote", href: "/portal/quotes", description: "Send a customer proposal" },
        { label: "View Pipeline", href: "/portal/opportunities", description: "Review active opportunities" },
      ]}
      primaryField="lead_name"
      secondaryField="company_name"
      statusField="status"
      valueField="opportunity_amount"
      mode="crm"
    />
  );
}

