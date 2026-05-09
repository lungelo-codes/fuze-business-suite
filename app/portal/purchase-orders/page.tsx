import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { fuzeData, money, rowsFrom } from "@/lib/server/fuzeApi";

type Row = Record<string, unknown>;

export default async function PurchaseOrdersPage() {
  const [dashboard, ordersData, suppliersData, lowStockData] = await Promise.all([
    fuzeData<Row>("fuze_suite.api.procurement.get_dashboard", {}, {}),
    fuzeData<Row>("fuze_suite.api.procurement.get_purchase_orders", {}, {}),
    fuzeData<Row>("fuze_suite.api.procurement.get_suppliers", {}, {}),
    fuzeData<Row>("fuze_suite.api.procurement.get_low_stock", {}, {}),
  ]);
  const cards = (dashboard.cards || {}) as Row;
  const purchaseOrders = rowsFrom(ordersData, ["purchase_orders", "orders", "rows", "data"]);
  const suppliers = rowsFrom(suppliersData, ["suppliers", "rows", "data"]);
  const lowStock = rowsFrom(lowStockData, ["low_stock", "items", "rows", "data"]);
  return (
    <ModernModuleDashboard
      title="Procurement"
      eyebrow="Operations Workspace"
      description="Purchase orders, suppliers and low-stock alerts are now loaded through the Fuze Procurement API."
      rows={[...purchaseOrders, ...suppliers, ...lowStock]}
      tabs={["Procurement Dashboard", "Purchase Orders", "Suppliers", "Low Stock", "Receipts"]}
      metrics={[
        { label: "Suppliers", value: Number(cards.suppliers || suppliers.length), hint: "Vendor base" },
        { label: "Purchase Orders", value: Number(cards.purchase_orders || purchaseOrders.length), hint: "Open procurement" },
        { label: "Bills", value: Number(cards.bills || 0), hint: "Supplier invoices" },
        { label: "Spend", value: money(cards.total_spend), hint: "Purchase value" },
      ]}
      actions={[{ label: "New Purchase Order", href: "/portal/purchase-orders", description: "Raise a PO" }, { label: "Manage Suppliers", href: "/portal/suppliers", description: "View supplier records" }, { label: "Inventory", href: "/portal/items", description: "View stock levels" }]}
      primaryField="supplier"
      secondaryField="status"
      statusField="status"
      valueField="grand_total"
      mode="standard"
    />
  );
}
