import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { erpList } from "@/lib/server/erpnext";

type Row = Record<string, unknown>;
async function safeList(doctype: string, fields: string[]): Promise<Row[]> { try { return await erpList<Row>(doctype, { fields, limit: 100, orderBy: "modified desc" }); } catch { return []; } }

export default async function FinancePage() {
  const [invoices, payments, quotes, vat] = await Promise.all([
    safeList("Sales Invoice", ["name", "customer", "status", "grand_total", "outstanding_amount", "due_date", "modified"]),
    safeList("Payment Entry", ["name", "party", "payment_type", "paid_amount", "received_amount", "posting_date", "modified"]),
    safeList("Quotation", ["name", "party_name", "status", "grand_total", "transaction_date", "modified"]),
    safeList("Fuze VAT Return", ["name", "company", "status", "vat_payable", "to_date", "modified"]),
  ]);
  const rows = [...invoices, ...payments, ...quotes, ...vat];
  const revenue = invoices.reduce((sum, row) => sum + Number(row.grand_total || 0), 0);
  const outstanding = invoices.reduce((sum, row) => sum + Number(row.outstanding_amount || 0), 0);
  return <ModernModuleDashboard
    title="Finance & Compliance"
    eyebrow="Finance Workspace"
    description="Create invoices and quotes, track payments, monitor VAT and keep compliance records simple for South African businesses."
    rows={rows}
    tabs={["Finance Dashboard", "Invoices", "Quotes", "Payments", "Expenses", "VAT", "Compliance"]}
    metrics={[{ label: "Revenue", value: `R${revenue.toLocaleString()}`, hint: "Sales invoice total" }, { label: "Outstanding", value: `R${outstanding.toLocaleString()}`, hint: "Awaiting payment" }, { label: "Payments", value: payments.length, hint: "Payment entries" }, { label: "VAT", value: vat.length, hint: "VAT return records" }]}
    actions={[{ label: "Create Invoice", href: "/portal/invoices", description: "Bill your customer" }, { label: "Create Quote", href: "/portal/quotes", description: "Send a proposal" }, { label: "Record Payment", href: "/portal/payments", description: "Capture customer payment" }, { label: "Review VAT", href: "/portal/vat", description: "Open VAT records" }]}
    primaryField="name"
    secondaryField="customer"
    statusField="status"
    valueField="grand_total"
    mode="finance"
  />;
}
