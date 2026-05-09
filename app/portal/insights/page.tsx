import InsightsDashboard from "./InsightsDashboard";
import { erpList } from "@/lib/server/erpnext";

type Row = Record<string, unknown>;
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

export default async function InsightsPage() {
  const [
    invoices, payments, customers, salesOrders,
    purchaseOrders, employees, salarySlips,
    tasks, issues, leads, opportunities,
    expenseClaims, jobApplicants,
    // Frappe Insights app doctypes (gracefully fail if not installed)
    insightsQueries, insightsDashboards, insightsSources, insightsCharts,
  ] = await Promise.all([
    safe(() => erpList<Row>("Sales Invoice",   { fields: ["name","posting_date","grand_total","outstanding_amount","status","customer"], limit: 500, orderBy: "posting_date desc" }), []),
    safe(() => erpList<Row>("Payment Entry",   { fields: ["name","posting_date","paid_amount","payment_type","party"], limit: 500, orderBy: "posting_date desc" }), []),
    safe(() => erpList<Row>("Customer",        { fields: ["name","customer_group","territory"], limit: 500 }), []),
    safe(() => erpList<Row>("Sales Order",     { fields: ["name","posting_date","grand_total","status"], limit: 200, orderBy: "posting_date desc" }), []),
    safe(() => erpList<Row>("Purchase Order",  { fields: ["name","transaction_date","grand_total","status"], limit: 200, orderBy: "transaction_date desc" }), []),
    safe(() => erpList<Row>("Employee",        { fields: ["name","department","status"], limit: 500 }), []),
    safe(() => erpList<Row>("Salary Slip",     { fields: ["name","net_pay","gross_pay","docstatus"], limit: 200 }), []),
    safe(() => erpList<Row>("Task",            { fields: ["name","status","priority"], limit: 500 }), []),
    safe(() => erpList<Row>("Issue",           { fields: ["name","status","priority"], limit: 300 }), []),
    safe(() => erpList<Row>("Lead",            { fields: ["name","status","lead_name"], limit: 200 }), []),
    safe(() => erpList<Row>("Opportunity",     { fields: ["name","status","opportunity_amount"], limit: 200 }), []),
    safe(() => erpList<Row>("Expense Claim",   { fields: ["name","total_claimed_amount","status"], limit: 200 }), []),
    safe(() => erpList<Row>("Job Applicant",   { fields: ["name","status"], limit: 200 }), []),
    // Frappe Insights app
    safe(() => erpList<Row>("Insights Query",       { fields: ["name","title","status","modified"], limit: 50, orderBy: "modified desc" }), []),
    safe(() => erpList<Row>("Insights Dashboard",   { fields: ["name","title","modified"], limit: 20, orderBy: "modified desc" }), []),
    safe(() => erpList<Row>("Insights Data Source", { fields: ["name","title","database_type","status"], limit: 20 }), []),
    safe(() => erpList<Row>("Insights Chart",       { fields: ["name","title","chart_type","modified"], limit: 50, orderBy: "modified desc" }), []),
  ]);

  return (
    <InsightsDashboard
      invoices={invoices}
      payments={payments}
      customers={customers}
      salesOrders={salesOrders}
      purchaseOrders={purchaseOrders}
      employees={employees}
      salarySlips={salarySlips}
      tasks={tasks}
      issues={issues}
      leads={leads}
      opportunities={opportunities}
      expenseClaims={expenseClaims}
      jobApplicants={jobApplicants}
      insightsQueries={insightsQueries}
      insightsDashboards={insightsDashboards}
      insightsSources={insightsSources}
      insightsCharts={insightsCharts}
    />
  );
}
