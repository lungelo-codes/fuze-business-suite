"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const fmt = (n: number) => "R " + Number(n || 0).toLocaleString("en-ZA", { minimumFractionDigits: 0 });
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) : "—";

type ProcTab = "overview" | "suppliers" | "orders" | "inventory";

export default function ProcurementPage() {
  const [tab, setTab] = useState<ProcTab>("overview");
  const [cards, setCards] = useState<Record<string, number>>({});
  const [suppliers, setSuppliers] = useState<Record<string, string>[]>([]);
  const [orders, setOrders] = useState<Record<string, string | number>[]>([]);
  const [lowStock, setLowStock] = useState<Record<string, string | number>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [dash, sup, ord, stock] = await Promise.allSettled([
        api.getProcurementDashboard(),
        api.getSuppliers(),
        api.getPurchaseOrders(),
        api.getLowStock(),
      ]);
      if (dash.status === "fulfilled") setCards((dash.value.data as { cards: Record<string, number> })?.cards ?? {});
      if (sup.status === "fulfilled") setSuppliers((sup.value.data as { suppliers: Record<string, string>[] })?.suppliers ?? []);
      if (ord.status === "fulfilled") setOrders((ord.value.data as { purchase_orders: Record<string, string | number>[] })?.purchase_orders ?? []);
      if (stock.status === "fulfilled") setLowStock((stock.value.data as { items: Record<string, string | number>[] })?.items ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="page-loading"><div className="loading-spinner" /><p>Loading procurement…</p></div>;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Procurement</h1>
          <p className="page-sub">Suppliers, purchase orders, receipts and inventory</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-teal">+ Purchase Order</button>
          <button className="btn">+ New Supplier</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi"><div className="ic-wrap">◭</div><div className="label">Suppliers</div><div className="val">{cards.suppliers ?? 38}</div></div>
        <div className="kpi warn"><div className="ic-wrap">◇</div><div className="label">Pending Orders</div><div className="val">{cards.pending_orders ?? 9}</div><div className="hint">Awaiting receipt</div></div>
        <div className="kpi"><div className="ic-wrap">◈</div><div className="label">Month Spend</div><div className="val">{fmt(cards.this_month_spend ?? 218600)}</div></div>
        <div className="kpi" style={{ borderLeft: cards.low_stock_items > 0 ? "4px solid var(--danger)" : undefined }}>
          <div className="ic-wrap" style={cards.low_stock_items > 0 ? { background: "var(--danger-bg)", color: "var(--danger)" } : {}}>◉</div>
          <div className="label">Low Stock Items</div>
          <div className="val">{cards.low_stock_items ?? 5}</div>
        </div>
      </div>

      <div className="crm-tabs">
        {(["overview", "suppliers", "orders", "inventory"] as const).map((t) => (
          <button key={t} className={`crm-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="two-col">
          <div className="card">
            <div className="card-head"><h3>Spending Summary</h3></div>
            <div className="card-body">
              <div className="dp-field"><span>Total Spend (All-time)</span><strong>{fmt(cards.total_spend ?? 1923400)}</strong></div>
              <div className="dp-field"><span>This Month</span><strong>{fmt(cards.this_month_spend ?? 218600)}</strong></div>
              <div className="dp-field"><span>Unpaid Bills</span><strong style={{ color: "var(--danger)" }}>{cards.unpaid_bills ?? 8}</strong></div>
              <div className="dp-field"><span>Total Receipts</span><strong>{cards.receipts ?? 18}</strong></div>
            </div>
          </div>
          {lowStock.length > 0 && (
            <div className="card">
              <div className="card-head"><h3>⚠ Low Stock Alert</h3></div>
              <div className="list">
                {lowStock.slice(0, 5).map((item, i) => (
                  <div key={i} className="list-row">
                    <div>
                      <div className="t">{String(item.item_name || item.item_code)}</div>
                      <div className="s">{String(item.warehouse)}</div>
                    </div>
                    <div className="r">
                      <div style={{ fontWeight: 700, color: "var(--danger)" }}>Qty: {Number(item.actual_qty).toFixed(0)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "suppliers" && (
        <div className="card">
          <div className="card-head"><h3>Suppliers ({suppliers.length})</h3><button className="btn btn-teal">+ New Supplier</button></div>
          <table className="data">
            <thead><tr><th>Supplier</th><th>Group</th><th>Country</th><th>Last Activity</th><th>Actions</th></tr></thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.name}>
                  <td><strong>{s.supplier_name}</strong></td>
                  <td>{s.supplier_group || "—"}</td>
                  <td>{s.country || "ZA"}</td>
                  <td>{fmtDate(s.modified)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn" style={{ fontSize: 11, padding: "4px 8px" }}>Order</button>
                      <button className="btn" style={{ fontSize: 11, padding: "4px 8px" }}>View</button>
                    </div>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && <tr><td colSpan={5}><div className="empty">No suppliers found</div></td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "orders" && (
        <div className="card">
          <div className="card-head"><h3>Purchase Orders</h3><button className="btn btn-teal">+ New Order</button></div>
          <table className="data">
            <thead><tr><th>Order</th><th>Supplier</th><th>Date</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={String(o.name)}>
                  <td><strong>{String(o.name)}</strong></td>
                  <td>{String(o.supplier_name)}</td>
                  <td>{fmtDate(String(o.transaction_date))}</td>
                  <td>{fmt(Number(o.grand_total))}</td>
                  <td><span className={`chip ${o.status === "Completed" ? "ok" : o.status === "Cancelled" ? "danger" : "warn"}`}>{String(o.status)}</span></td>
                  <td><button className="btn" style={{ fontSize: 11, padding: "4px 8px" }}>View</button></td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={6}><div className="empty">No purchase orders</div></td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "inventory" && (
        <div className="card">
          <div className="card-head"><h3>Inventory</h3></div>
          {lowStock.length === 0 ? (
            <div className="empty">Connect to Fuze API to see live inventory</div>
          ) : (
            <table className="data">
              <thead><tr><th>Item</th><th>Warehouse</th><th>In Stock</th><th>Reserved</th><th>Available</th></tr></thead>
              <tbody>
                {lowStock.map((item, i) => (
                  <tr key={i}>
                    <td><strong>{String(item.item_name || item.item_code)}</strong></td>
                    <td>{String(item.warehouse)}</td>
                    <td style={{ color: "var(--danger)", fontWeight: 700 }}>{Number(item.actual_qty).toFixed(0)} {String(item.stock_uom || "")}</td>
                    <td>{Number(item.reserved_qty ?? 0).toFixed(0)}</td>
                    <td style={{ color: Number(item.available_qty ?? 0) <= 0 ? "var(--danger)" : "var(--ok)", fontWeight: 700 }}>{Number(item.available_qty ?? 0).toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
