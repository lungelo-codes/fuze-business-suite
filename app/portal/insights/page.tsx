import ERPModuleWorkspace from "@/components/modules/ERPModuleWorkspace";
import { safeList, money, sumField } from "@/lib/server/coreBusinessData";

export default async function InsightsPage() {
  const [salesInvoices, opportunities, issues, projects, employees, purchaseOrders] = await Promise.all([
    safeList("Sales Invoice", ["name", "customer", "status", "grand_total", "outstanding_amount", "modified"], 100),
    safeList("Opportunity", ["name", "party_name", "status", "opportunity_amount", "modified"], 100),
    safeList("Issue", ["name", "subject", "customer", "status", "priority", "modified"], 100),
    safeList("Project", ["name", "project_name", "customer", "status", "percent_complete", "modified"], 100),
    safeList("Employee", ["name", "employee_name", "department", "status", "modified"], 100),
    safeList("Purchase Order", ["name", "supplier", "status", "grand_total", "modified"], 100),
  ]);
  const rows = [...salesInvoices, ...opportunities, ...issues, ...projects, ...employees, ...purchaseOrders];
  const revenue = sumField(salesInvoices, "grand_total");
  const pipeline = sumField(opportunities, "opportunity_amount");
  const spend = sumField(purchaseOrders, "grand_total");
  return <ERPModuleWorkspace
    moduleName="insights"
    eyebrow="Frappe Insights + z.ai"
    title="Insights Workspace"
    description="A company-owner command centre for reports, KPI dashboards, cross-module summaries and AI recommendations across CRM, finance, HR, support, projects and buying."
    rows={rows}
    tabs={["Overview", "Finance", "CRM", "Projects", "Support", "HR", "AI Summary"]}
    metrics={[
      { label: "Revenue", value: money(revenue), hint: "Sales invoices", tone: "green" },
      { label: "Pipeline", value: money(pipeline), hint: "Opportunity value", tone: "purple" },
      { label: "Supplier Spend", value: money(spend), hint: "Purchase orders", tone: "orange" },
      { label: "Support", value: issues.length, hint: "Support issues", tone: "blue" },
    ]}
    flow={[
      { label: "Collect Data", hint: "ERPNext doctypes", tone: "blue" },
      { label: "Build KPIs", hint: "Insights dashboards", tone: "purple" },
      { label: "Ask z.ai", hint: "Plain-language summary", tone: "green" },
      { label: "Recommend Action", hint: "Owner next steps", tone: "orange" },
      { label: "Track Improvement", hint: "Saved insights", tone: "pink" },
    ]}
    actions={[
      { label: "Ask AI", href: "/portal/insights?tab=ai", description: "Generate owner summary" },
      { label: "Finance Reports", href: "/portal/accounting", description: "Open accounting insights" },
      { label: "CRM Reports", href: "/portal/crm", description: "Review pipeline and leads" },
      { label: "Support Reports", href: "/portal/support", description: "Review tickets and SLA" },
    ]}
    insights={[
      { title: "Owner-first reporting", detail: "The goal is not just charts; it is clear decisions: collect, sell, hire, deliver or reduce spend.", tone: "ok" },
      { title: "Cross-module warnings", detail: "AI should connect unpaid invoices, weak pipeline, support risk and project delivery in one summary.", tone: "warn" },
      { title: "Saved AI insights", detail: "Generated insights can be saved into Fuze AI Insight on the server for audit and trend tracking.", tone: "ok" },
    ]}
    primaryField="name"
    secondaryField="customer"
    statusField="status"
    valueField="grand_total"
    aiTitle="Owner AI Business Analyst"
    ownerQuestion="What is happening in my business, what is risky, and what should I improve first?"
  />;
}
