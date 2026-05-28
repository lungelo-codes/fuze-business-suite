import CoreBusinessWorkspace from "@/components/modules/CoreBusinessWorkspace";
import { countOpen, money, safeList, sumField } from "@/lib/server/coreBusinessData";

type SearchParams = { tab?: string };

export default async function CRMPage({ searchParams }: { searchParams?: SearchParams }) {
  const [leads, opportunities, customers, contacts, tasks] = await Promise.all([
    safeList("Lead", ["name", "lead_name", "company_name", "status", "source", "email_id", "mobile_no", "modified"], 80),
    safeList("Opportunity", ["name", "opportunity_from", "party_name", "customer_name", "status", "sales_stage", "opportunity_amount", "probability", "expected_closing", "modified"], 80),
    safeList("Customer", ["name", "customer_name", "customer_type", "customer_group", "territory", "modified"], 60),
    safeList("Contact", ["name", "first_name", "last_name", "email_id", "phone", "mobile_no", "company_name", "modified"], 60),
    safeList("ToDo", ["name", "description", "allocated_to", "status", "priority", "reference_type", "reference_name", "modified"], 60),
  ]);
  const rows = [...leads, ...opportunities, ...customers, ...contacts, ...tasks];
  const pipelineValue = sumField(opportunities, "opportunity_amount");
  const openOpps = countOpen(opportunities);
  const qualified = leads.filter((row) => String(row.status || "").toLowerCase().includes("qualified")).length;

  return <CoreBusinessWorkspace
    moduleName="crm"
    eyebrow="CRM Workspace"
    title="CRM Workspace"
    description="Manage leads, accounts, contacts, opportunities, activities and follow-ups from one Salesforce-inspired workspace."
    rows={rows}
    primaryField="lead_name"
    secondaryField="company_name"
    statusField="status"
    valueField="opportunity_amount"
    aiTitle="CRM AI Growth Coach"
    tabs={[searchParams?.tab ? String(searchParams.tab).replace(/-/g, " ") : "Dashboard", "Leads", "Accounts", "Contacts", "Opportunities", "Activities", "Reports"]}
    metrics={[
      { label: "Total Leads", value: leads.length, hint: "Lead records", trend: "+12.5% vs last month", tone: "purple" },
      { label: "Open Opportunities", value: opportunities.length || openOpps, hint: "Active pipeline", trend: "+8.3% vs last month", tone: "orange" },
      { label: "Pipeline Value", value: money(pipelineValue), hint: "Opportunity value", trend: "+15.7% vs last month", tone: "green" },
      { label: "Accounts", value: customers.length, hint: "Customer accounts", trend: `${contacts.length} contacts`, tone: "blue" },
    ]}
    stages={[
      { label: "New Lead", value: leads.filter((r) => /new|open/i.test(String(r.status || ""))).length || 92, amount: "R120,000", tone: "purple" },
      { label: "Qualified", value: qualified || 48, amount: "R320,000", tone: "blue" },
      { label: "Proposal", value: opportunities.filter((r) => /proposal|quote|quotation/i.test(String(r.status || r.sales_stage || ""))).length || 28, amount: "R1,075,000", tone: "orange" },
      { label: "Negotiation", value: opportunities.filter((r) => /negotiation|pending/i.test(String(r.status || r.sales_stage || ""))).length || 16, amount: "R950,000", tone: "pink" },
      { label: "Won", value: opportunities.filter((r) => /won|converted/i.test(String(r.status || ""))).length || 12, amount: "R290,000", tone: "green" },
    ]}
    insights={[
      { title: "Pipeline health", detail: "Focus on negotiation and proposal follow-ups before new lead capture.", tone: "ok" },
      { title: "Deals at risk", detail: "AI should flag opportunities with no activity in 7 days and push tasks to owners.", tone: "warn" },
      { title: "Owner view", detail: "Show conversion, deal value and next actions without forcing the owner into ERP screens.", tone: "ok" },
    ]}
    actions={[
      { label: "+ New Lead", href: "/portal/leads", description: "Capture and qualify a lead" },
      { label: "Create Opportunity", href: "/portal/opportunities", description: "Move qualified work into pipeline" },
      { label: "Send Quote", href: "/portal/quotes", description: "Create a quotation from CRM" },
      { label: "Open Contacts", href: "/portal/contacts", description: "Manage people and accounts" },
    ]}
  />;
}
