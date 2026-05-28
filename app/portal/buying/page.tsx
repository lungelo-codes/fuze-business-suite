import ERPModuleWorkspace from "@/components/modules/ERPModuleWorkspace";
import { safeList, money, sumField } from "@/lib/server/coreBusinessData";

export default async function BuyingPage() {
  const [suppliers, requests, quotations, orders, receipts, invoices] = await Promise.all([
    safeList("Supplier", ["name", "supplier_name", "supplier_group", "status", "modified"], 100),
    safeList("Material Request", ["name", "status", "transaction_date", "material_request_type", "modified"], 100),
    safeList("Supplier Quotation", ["name", "supplier", "status", "grand_total", "transaction_date", "modified"], 100),
    safeList("Purchase Order", ["name", "supplier", "status", "grand_total", "transaction_date", "modified"], 100),
    safeList("Purchase Receipt", ["name", "supplier", "status", "posting_date", "modified"], 100),
    safeList("Purchase Invoice", ["name", "supplier", "status", "grand_total", "outstanding_amount", "posting_date", "modified"], 100),
  ]);
  const rows = [...orders, ...requests, ...quotations, ...receipts, ...invoices, ...suppliers];
  return <ERPModuleWorkspace
    moduleName="buying"
    eyebrow="ERPNext Buying"
    title="Buying Workspace"
    description="Full procurement flow for Material Request → RFQ → Supplier Quotation → Purchase Order → Receipt → Purchase Invoice → Payment."
    rows={rows}
    tabs={["Overview", "Suppliers", "Material Requests", "RFQs", "Purchase Orders", "Receipts", "Invoices"]}
    metrics={[
      { label: "Suppliers", value: suppliers.length, hint: "Supplier records", tone: "blue" },
      { label: "PO Value", value: money(sumField(orders, "grand_total")), hint: "Purchase order total", tone: "orange" },
      { label: "Receipts", value: receipts.length, hint: "Goods received", tone: "green" },
      { label: "Invoices", value: invoices.length, hint: "Purchase invoices", tone: "purple" },
    ]}
    flow={[
      { label: "Material Request", count: requests.length, tone: "blue" },
      { label: "Supplier Quotation", count: quotations.length, tone: "purple" },
      { label: "Purchase Order", count: orders.length, tone: "orange" },
      { label: "Purchase Receipt", count: receipts.length, tone: "green" },
      { label: "Purchase Invoice", count: invoices.length, tone: "pink" },
    ]}
    actions={[
      { label: "New Supplier", href: "/portal/suppliers", description: "Create and manage suppliers" },
      { label: "Purchase Order", href: "/portal/purchase-orders", description: "Create a purchase order" },
      { label: "Buying Reports", href: "/portal/insights", description: "Supplier spend and purchase analytics" },
    ]}
    insights={[
      { title: "Control supplier spend", detail: "Compare supplier quotations before purchase orders are approved.", tone: "ok" },
      { title: "Avoid missing receipts", detail: "Purchase orders without receipts should be followed up by operations.", tone: receipts.length < orders.length ? "warn" : "ok" },
      { title: "Protect cash flow", detail: "Purchase invoices must be visible in accounting before payment runs.", tone: "ok" },
    ]}
    primaryField="name"
    secondaryField="supplier"
    statusField="status"
    valueField="grand_total"
    aiTitle="Buying AI Analyst"
    ownerQuestion="Which suppliers, orders or unpaid purchases need action before cash is affected?"
  />;
}
