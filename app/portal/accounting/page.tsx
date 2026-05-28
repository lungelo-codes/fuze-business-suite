import ERPModuleWorkspace from "@/components/modules/ERPModuleWorkspace";
import { safeList, money, sumField } from "@/lib/server/coreBusinessData";

export default async function AccountingPage() {
  const [salesInvoices, purchaseInvoices, payments, journals] = await Promise.all([
    safeList("Sales Invoice", ["name", "customer", "status", "grand_total", "outstanding_amount", "posting_date", "modified"], 100),
    safeList("Purchase Invoice", ["name", "supplier", "status", "grand_total", "outstanding_amount", "posting_date", "modified"], 100),
    safeList("Payment Entry", ["name", "party", "party_type", "status", "paid_amount", "posting_date", "modified"], 100),
    safeList("Journal Entry", ["name", "title", "status", "total_debit", "total_credit", "posting_date", "modified"], 50),
  ]);
  const rows = [...salesInvoices, ...purchaseInvoices, ...payments, ...journals];
  const receivable = sumField(salesInvoices, "outstanding_amount");
  const payable = sumField(purchaseInvoices, "outstanding_amount");
  return <ERPModuleWorkspace
    moduleName="accounting"
    eyebrow="ERPNext Accounting"
    title="Accounting Workspace"
    description="Owner-level financial control for invoices, payments, receivables, payables, journals, cash flow and reporting. This replaces scattered finance pages with one ERPNext-style workspace."
    rows={rows}
    tabs={["Overview", "Sales Invoices", "Purchase Invoices", "Payments", "Banking", "Reports"]}
    metrics={[
      { label: "Receivable", value: money(receivable), hint: "Outstanding customer invoices", tone: "green" },
      { label: "Payable", value: money(payable), hint: "Supplier invoices due", tone: "orange" },
      { label: "Payments", value: payments.length, hint: "Payment entries", tone: "blue" },
      { label: "Journals", value: journals.length, hint: "Journal entries", tone: "purple" },
    ]}
    flow={[
      { label: "Quote / Order", hint: "Selling", tone: "blue" },
      { label: "Sales Invoice", count: salesInvoices.length, tone: "green" },
      { label: "Payment Entry", count: payments.length, tone: "purple" },
      { label: "Bank Reconciliation", hint: "Match payments", tone: "orange" },
      { label: "Reports", hint: "P&L / AR / AP", tone: "pink" },
    ]}
    actions={[
      { label: "New Invoice", href: "/portal/invoices", description: "Create and send a customer invoice" },
      { label: "Record Payment", href: "/portal/payments", description: "Capture payment against invoice" },
      { label: "Bank Reconciliation", href: "/portal/bank-reconciliation", description: "Match bank payments" },
      { label: "Reports", href: "/portal/insights", description: "Open financial insights" },
    ]}
    insights={[
      { title: "Cash flow focus", detail: `Collect ${money(receivable)} in outstanding customer invoices before it affects working capital.`, tone: receivable > 0 ? "warn" : "ok" },
      { title: "Supplier discipline", detail: `Track ${money(payable)} in supplier obligations to avoid surprise cash pressure.`, tone: payable > 0 ? "warn" : "ok" },
      { title: "Owner reporting", detail: "Use AI summaries to explain profit, cash movement and overdue invoices in simple language.", tone: "ok" },
    ]}
    primaryField="name"
    secondaryField="customer"
    statusField="status"
    valueField="grand_total"
    aiTitle="Accounting AI Analyst"
    ownerQuestion="Where is cash blocked, who owes us money, and what must be paid next?"
  />;
}
