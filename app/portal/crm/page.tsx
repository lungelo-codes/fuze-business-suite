import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { erpList } from "@/lib/server/erpnext";

type Row = Record<string, unknown>;
async function safeList(doctype: string, fields: string[]): Promise<Row[]> {
  try { return await erpList<Row>(doctype, { fields, limit: 100, orderBy: "modified desc" }); } catch { return []; }
}

export default async function CRMPage() {
  // Aggregate data from leads, opportunities, quotes and campaigns. The CRM workspace
  // now owns all sales pipeline objects, so leads, opportunities and campaigns
  // are displayed together without separate sidebar entries.
  const [leads, opportunities, quotes, campaigns] = await Promise.all([
    safeList("Lead", ["name", "lead_name", "company_name", "status", "email_id", "mobile_no", "modified"]),
    safeList("Opportunity", ["name", "party_name", "status", "opportunity_amount", "expected_closing", "modified"]),
    safeList("Quotation", ["name", "party_name", "status", "grand_total", "transaction_date", "modified"]),
    // Fallback to an empty list if Campaign doctype is not available. Fields align with campaign name and status.
    safeList("Campaign", ["name", "campaign_name", "status", "expected_revenue", "modified"]),
  ]);
  const rows = [...leads, ...opportunities, ...quotes, ...campaigns];
  const pipelineValue = opportunities.reduce((sum, row) => sum + Number(row.opportunity_amount || 0), 0);
  const totalCampaigns = campaigns.length;
  return <ModernModuleDashboard
    title="CRM Workspace"
    eyebrow="CRM & Sales"
    // Updated description: remove ERPNext mention and highlight streamlined sales process.
    description="Manage leads, opportunities, campaigns, contacts, quotes and invoices in a clean sales workspace. Pipeline stages help your team run sales daily without unnecessary complexity."
    rows={rows}
    // Added an 'Invoices' tab so users can view invoice records directly from the CRM dashboard.
    tabs={["Dashboard", "Pipeline", "Leads", "Opportunities", "Campaigns", "Contacts", "Quotes", "Invoices", "Activities"]}
    metrics={[
      { label: "Open Leads", value: leads.length, hint: "Lead records" },
      { label: "Opportunities", value: opportunities.length, hint: `R${pipelineValue.toLocaleString()} pipeline` },
      { label: "Campaigns", value: totalCampaigns, hint: "Campaign records" },
      { label: "Quotes", value: quotes.length, hint: "Quotation records" },
    ]}
    actions={[
      { label: "Create Lead", href: "/portal/leads", description: "Capture a new sales prospect" },
      { label: "Create Opportunity", href: "/portal/opportunities", description: "Start a new opportunity" },
      { label: "Create Campaign", href: "/portal/campaigns", description: "Launch a marketing campaign" },
      { label: "Create Quote", href: "/portal/quotes", description: "Send a customer proposal" },
      { label: "Create Invoice", href: "/portal/invoices", description: "Bill your customer" },
    ]}
    primaryField="lead_name"
    secondaryField="company_name"
    statusField="status"
    valueField="opportunity_amount"
    mode="crm"
  />;
}
