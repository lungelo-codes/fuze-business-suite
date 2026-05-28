import AIAssistantPanel from "@/components/ai/AIAssistantPanel";
import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { erpList } from "@/lib/server/erpnext";

type Row = Record<string, unknown>;
async function safeList(doctype: string, fields: string[]): Promise<Row[]> { try { return await erpList<Row>(doctype, { fields, limit: 100, orderBy: "modified desc" }); } catch { return []; } }

export default async function SubcontractingPage() {
  const [orders, receipts] = await Promise.all([
    safeList("Subcontracting Order", ["name", "supplier", "transaction_date", "status", "per_received", "modified"]),
    safeList("Subcontracting Receipt", ["name", "supplier", "posting_date", "status", "modified"]),
  ]);
  const rows = [...orders, ...receipts];
  return <><AIAssistantPanel moduleName="subcontracting" title="Subcontracting AI Analyst" /><ModernModuleDashboard
    title="Subcontracting"
    eyebrow="ERPNext Subcontracting"
    description="Manage subcontracting orders, supplied items, receipts and supplier progress from the operations hub."
    rows={rows}
    tabs={["Orders", "Receipts", "Supplied Items", "Supplier Progress"]}
    metrics={[{ label: "Orders", value: orders.length, hint: "Subcontracting orders" }, { label: "Receipts", value: receipts.length, hint: "Receipt records" }, { label: "Open", value: orders.filter((r) => !String(r.status || '').toLowerCase().includes('completed')).length, hint: "Need follow-up" }, { label: "Completed", value: orders.filter((r) => String(r.status || '').toLowerCase().includes('completed')).length, hint: "Closed orders" }]}
    actions={[{ label: "New Order", href: "/portal/subcontracting", description: "Create subcontracting order" }, { label: "Supplier 360", href: "/portal/operations?tab=procurement", description: "Review supplier records" }, { label: "Projects", href: "/portal/operations?tab=projects", description: "Link to project work" }]}
    primaryField="name"
    secondaryField="supplier"
    statusField="status"
    mode="projects"
  /></>;
}
