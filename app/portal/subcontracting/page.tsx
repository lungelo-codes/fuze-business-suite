import ERPModuleWorkspace from "@/components/modules/ERPModuleWorkspace";
import { safeList } from "@/lib/server/coreBusinessData";

export default async function SubcontractingPage() {
  const [orders, receipts, suppliers, items] = await Promise.all([
    safeList("Subcontracting Order", ["name", "supplier", "transaction_date", "status", "per_received", "modified"], 100),
    safeList("Subcontracting Receipt", ["name", "supplier", "posting_date", "status", "modified"], 100),
    safeList("Supplier", ["name", "supplier_name", "supplier_group", "modified"], 80),
    safeList("Item", ["name", "item_name", "item_group", "is_sub_contracted_item", "modified"], 80),
  ]);
  const rows = [...orders, ...receipts, ...items, ...suppliers];
  return <ERPModuleWorkspace
    moduleName="subcontracting"
    eyebrow="ERPNext Subcontracting"
    title="Subcontracting Workspace"
    description="Manage subcontracting orders, supplied items, raw material flow, subcontractor receipts and vendor performance."
    rows={rows}
    tabs={["Overview", "Orders", "Receipts", "Supplied Items", "Vendors", "Costs"]}
    metrics={[
      { label: "Orders", value: orders.length, hint: "Subcontracting orders", tone: "blue" },
      { label: "Receipts", value: receipts.length, hint: "Subcontracting receipts", tone: "green" },
      { label: "Vendors", value: suppliers.length, hint: "Available suppliers", tone: "orange" },
      { label: "Items", value: items.length, hint: "Subcontract items", tone: "purple" },
    ]}
    flow={[
      { label: "Create Order", count: orders.length, tone: "blue" },
      { label: "Send Materials", hint: "Supplied items", tone: "purple" },
      { label: "Receive Work", count: receipts.length, tone: "green" },
      { label: "Track Cost", hint: "Linked buying", tone: "orange" },
      { label: "Close Job", hint: "Project billing", tone: "pink" },
    ]}
    actions={[
      { label: "New Order", href: "/portal/subcontracting", description: "Create subcontracting order" },
      { label: "Supplier 360", href: "/portal/buying", description: "Review supplier and purchase history" },
      { label: "Project Link", href: "/portal/projects", description: "Connect subcontracting to project cost" },
    ]}
    insights={[
      { title: "Prevent cost leakage", detail: "Compare subcontracting receipts to project budgets before billing.", tone: "warn" },
      { title: "Vendor accountability", detail: "Track which vendors receive materials and when they return finished work.", tone: "ok" },
      { title: "Project profit", detail: "Subcontracting costs should feed into project profitability reports.", tone: "ok" },
    ]}
    primaryField="name"
    secondaryField="supplier"
    statusField="status"
    valueField="per_received"
    aiTitle="Subcontracting AI Analyst"
    ownerQuestion="Which subcontractors are delaying work or reducing project profit?"
  />;
}
