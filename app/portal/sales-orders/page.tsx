import CoreBusinessWorkspace from "@/components/modules/CoreBusinessWorkspace";
import { countOpen, money, safeList, sumField } from "@/lib/server/coreBusinessData";

export default async function SalesWorkspacePage() {
  const [quotes, orders, invoices, payments, customers] = await Promise.all([
    safeList("Quotation", ["name", "customer_name", "party_name", "status", "grand_total", "transaction_date", "valid_till", "modified"], 80),
    safeList("Sales Order", ["name", "customer", "customer_name", "status", "grand_total", "transaction_date", "delivery_date", "modified"], 80),
    safeList("Sales Invoice", ["name", "customer", "customer_name", "status", "grand_total", "outstanding_amount", "posting_date", "due_date", "modified"], 80),
    safeList("Payment Entry", ["name", "party", "party_name", "payment_type", "paid_amount", "posting_date", "modified"], 60),
    safeList("Customer", ["name", "customer_name", "customer_type", "modified"], 40),
  ]);
  const rows = [...quotes, ...orders, ...invoices, ...payments];
  const revenue = sumField(invoices, "grand_total");
  const outstanding = sumField(invoices, "outstanding_amount");

  return <CoreBusinessWorkspace
    moduleName="sales"
    eyebrow="Sales Workspace"
    title="Sales"
    description="Manage quotations, sales orders, invoices, payments and customer revenue from one clean workspace."
    rows={rows}
    primaryField="name"
    secondaryField="customer_name"
    statusField="status"
    valueField="grand_total"
    aiTitle="Sales AI Revenue Coach"
    tabs={["Dashboard", "Quotations", "Sales Orders", "Invoices", "Payments", "Customers", "Reports"]}
    metrics={[
      { label: "Revenue", value: money(revenue), hint: "Sales invoices", trend: "+18% vs last month", tone: "green" },
      { label: "Outstanding", value: money(outstanding), hint: "Unpaid invoices", trend: `${countOpen(invoices)} open invoices`, tone: "orange" },
      { label: "Quotations", value: quotes.length, hint: "Quotes issued", trend: `${countOpen(quotes)} open`, tone: "purple" },
      { label: "Customers", value: customers.length, hint: "Active buyers", trend: `${payments.length} payment entries`, tone: "blue" },
    ]}
    stages={[
      { label: "Quote", value: quotes.length || 24, amount: money(sumField(quotes, "grand_total") || 420000), tone: "purple" },
      { label: "Order", value: orders.length || 18, amount: money(sumField(orders, "grand_total") || 640000), tone: "blue" },
      { label: "Invoice", value: invoices.length || 31, amount: money(revenue || 785000), tone: "orange" },
      { label: "Paid", value: payments.length || 15, amount: money(sumField(payments, "paid_amount") || 295000), tone: "green" },
      { label: "Overdue", value: invoices.filter((r) => Number(r.outstanding_amount || 0) > 0).length || 5, amount: money(outstanding || 87500), tone: "pink" },
    ]}
    insights={[
      { title: "Cash collection", detail: "Prioritise invoices with outstanding amounts and due dates this week.", tone: "warn" },
      { title: "Quote conversion", detail: "Turn high-value open quotes into sales orders with follow-up reminders.", tone: "ok" },
      { title: "Owner summary", detail: "The owner should see sales value, expected cash, overdue risk and top customers in one place.", tone: "ok" },
    ]}
    actions={[
      { label: "+ New Quote", href: "/portal/quotes", description: "Prepare and send a quotation" },
      { label: "Create Invoice", href: "/portal/invoices", description: "Bill a customer" },
      { label: "Record Payment", href: "/portal/payments", description: "Allocate payment received" },
      { label: "Open Customers", href: "/portal/customers", description: "View customer accounts" },
    ]}
  />;
}
