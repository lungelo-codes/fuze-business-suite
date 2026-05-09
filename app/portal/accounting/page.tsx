import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { fuzeData, money, rowsFrom } from "@/lib/server/fuzeApi";

type Row = Record<string, unknown>;

export default async function AccountingPage() {
  const [dashboard, invoicesData, billsData] = await Promise.all([
    fuzeData<Row>("fuze_suite.api.accounting.get_dashboard", {}, {}),
    fuzeData<Row>("fuze_suite.api.accounting.get_invoices", {}, {}),
    fuzeData<Row>("fuze_suite.api.accounting.get_bills", {}, {}),
  ]);

  const cards = (dashboard.cards || {}) as Row;
  const invoices = rowsFrom(invoicesData, ["invoices", "rows", "data"]);
  const bills = rowsFrom(billsData, ["bills", "purchase_invoices", "rows", "data"]);

  return (
    <ModernModuleDashboard
      title="Accounting"
      eyebrow="Finance Workspace"
      description="Income, expenses, receivables, payables and profit are now loaded through your simplified Fuze accounting API."
      rows={[...invoices, ...bills]}
      tabs={["Accounting Dashboard", "Sales Invoices", "Supplier Bills", "Profit & Loss", "VAT"]}
      metrics={[
        { label: "Receivables", value: money(cards.receivables), hint: "Customer amounts due" },
        { label: "Payables", value: money(cards.payables), hint: "Supplier amounts due" },
        { label: "Revenue", value: money(cards.monthly_revenue), hint: "Current month" },
        { label: "Profit", value: money(cards.monthly_profit), hint: "Revenue less expenses" },
      ]}
      actions={[
        { label: "Create Invoice", href: "/portal/invoices", description: "Bill your customer" },
        { label: "Record Payment", href: "/portal/payments", description: "Capture money received" },
        { label: "VAT", href: "/portal/vat", description: "Review VAT compliance" },
        { label: "Reports", href: "/portal/reports", description: "P&L and balance reports" },
      ]}
      primaryField="customer"
      secondaryField="posting_date"
      statusField="status"
      valueField="grand_total"
      mode="finance"
    />
  );
}
