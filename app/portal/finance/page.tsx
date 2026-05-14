import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { getFinanceWorkspace } from "@/lib/server/businessApi";

export default async function FinancePage() {
  const data = await getFinanceWorkspace();
  return <ModernModuleDashboard
    title="Finance"
    eyebrow="Finance Workspace"
    description="Create quotes and invoices, track payments, monitor banking and keep finance workflows simple for South African businesses."
    rows={data.rows}
    tabs={["Finance Dashboard", "Invoices", "Quotes", "Payments", "Banking", "VAT", "Compliance"]}
    metrics={[
      { label: "Revenue", value: `R${data.metrics.revenue.toLocaleString("en-ZA")}`, hint: "Sales invoice total" },
      { label: "Outstanding", value: `R${data.metrics.outstanding.toLocaleString("en-ZA")}`, hint: "Awaiting payment" },
      { label: "Payments", value: `R${data.metrics.paymentsReceived.toLocaleString("en-ZA")}`, hint: "Received and paid amounts" },
      { label: "Invoices", value: data.metrics.invoiceCount, hint: "Sales invoice records" },
    ]}
    actions={[
      { label: "Create Invoice", href: "/portal/invoices", description: "Bill your customer" },
      { label: "Create Quote", href: "/portal/quotes", description: "Send a proposal" },
      { label: "Record Payment", href: "/portal/payments", description: "Capture customer payment" },
      { label: "Open Banking", href: "/portal/bank-reconciliation", description: "Review bank transactions" },
    ]}
    primaryField="name"
    secondaryField="customer"
    statusField="status"
    valueField="grand_total"
    mode="finance"
  />;
}
