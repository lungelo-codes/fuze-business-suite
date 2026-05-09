import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { erpList } from "@/lib/server/erpnext";

type Row = Record<string, unknown>;
async function safeList(doctype: string, fields: string[]): Promise<Row[]> {
  try { return await erpList<Row>(doctype, { fields, limit: 100, orderBy: "modified desc" }); } catch { return []; }
}

export default async function PurchaseOrdersPage() {
  const [purchaseOrders, suppliers, materialRequests, purchaseReceipts] = await Promise.all([
    safeList("Purchase Order", ["name", "supplier", "status", "grand_total", "transaction_date", "schedule_date", "per_received", "modified"]),
    safeList("Supplier", ["name", "supplier_name", "supplier_type", "modified"]),
    safeList("Material Request", ["name", "material_request_type", "status", "transaction_date", "modified"]),
    safeList("Purchase Receipt", ["name", "supplier", "status", "grand_total", "posting_date", "modified"]),
  ]);

  const totalValue = purchaseOrders.reduce((sum, po) => sum + Number(po.grand_total || 0), 0);
  const pendingDelivery = purchaseOrders.filter((po) =>
    ["To Receive and Bill", "To Receive"].includes(String(po.status || "")));

  return (
    <ModernModuleDashboard
      title="Procurement"
      eyebrow="Operations Workspace"
      description="Manage purchase orders, supplier relationships, material requests and goods receipts. Powered by ERPNext v16 open source procurement module."
      rows={purchaseOrders}
      tabs={["Procurement Dashboard", "Purchase Orders", "Suppliers", "Material Requests", "Receipts"]}
      metrics={[
        { label: "Purchase Orders", value: purchaseOrders.length, hint: `R${totalValue.toLocaleString("en-ZA", { maximumFractionDigits: 0 })} total` },
        { label: "Pending Delivery", value: pendingDelivery.length, hint: "Awaiting goods receipt" },
        { label: "Suppliers", value: suppliers.length, hint: "Active suppliers" },
        { label: "Receipts", value: purchaseReceipts.length, hint: "Goods received" },
      ]}
      actions={[
        { label: "New Purchase Order", href: "/portal/purchase-orders", description: "Raise a PO to a supplier" },
        { label: "Manage Suppliers", href: "/portal/suppliers", description: "View supplier records" },
        { label: "Material Request", href: "/portal/purchase-orders", description: "Request stock replenishment" },
        { label: "Inventory", href: "/portal/items", description: "View stock levels" },
      ]}
      primaryField="supplier"
      secondaryField="status"
      statusField="status"
      valueField="grand_total"
      mode="standard"
    />
  );
}
