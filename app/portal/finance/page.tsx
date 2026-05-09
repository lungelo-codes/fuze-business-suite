import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { fuzeData, money, rowsFrom } from "@/lib/server/fuzeApi";

type Row = Record<string, unknown>;

export default async function FinancePage() {
  const [accounting, sales, compliance, invoicesData, quotesData] = await Promise.all([
    fuzeData<Row>("fuze_suite.api.accounting.get_dashboard", {}, {}),
    fuzeData<Row>("fuze_suite.api.sales.get_dashboard", {}, {}),
    fuzeData<Row>("fuze_suite.api.compliance.get_compliance_dashboard", {}, {}),
    fuzeData<Row>("fuze_suite.api.accounting.get_invoices", {}, {}),
    fuzeData<Row>("fuze_suite.api.sales.get_quotations", {}, {}),
  ]);
  const cards = (accounting.cards || {}) as Row;
  const salesCards = (sales.cards || {}) as Row;
  const invoices = rowsFrom(invoicesData, ["invoices", "rows", "data"]);
  const quotes = rowsFrom(quotesData, ["quotations", "quotes", "rows", "data"]);
  return <ModernModuleDashboard
    title="Finance & Compliance"
    eyebrow="Finance Workspace"
    description="Invoices, quotes, VAT and SA compliance are loaded from controlled Fuze APIs."
    rows={[...invoices, ...quotes]}
    tabs={["Finance Dashboard", "Invoices", "Quotes", "Payments", "VAT", "Compliance"]}
    metrics={[
      { label: "Revenue", value: money(cards.monthly_revenue || salesCards.revenue), hint: "Current month" },
      { label: "Outstanding", value: money(cards.receivables), hint: "Awaiting payment" },
      { label: "Quotes", value: Number(salesCards.quotations || quotes.length), hint: "Sales proposals" },
      { label: "Compliance Tasks", value: Number(compliance.open_tasks || 0), hint: "SA compliance" },
    ]}
    actions={[{ label: "Create Invoice", href: "/portal/invoices", description: "Bill your customer" }, { label: "Create Quote", href: "/portal/quotes", description: "Send a proposal" }, { label: "Record Payment", href: "/portal/payments", description: "Capture customer payment" }, { label: "Review VAT", href: "/portal/vat", description: "Open VAT records" }]}
    primaryField="name"
    secondaryField="customer"
    statusField="status"
    valueField="grand_total"
    mode="finance"
  />;
}
