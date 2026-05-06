import SearchTable, { StatusBadge } from "@/components/SearchTable";
import KPI from "@/components/KPI";
import { erpList } from "@/lib/server/erpnext";

interface PurchaseOrder {
  name: string;
  supplier?: string;
  transaction_date?: string;
  schedule_date?: string;
  grand_total?: number;
  net_total?: number;
  status?: string;
  per_received?: number;
  per_billed?: number;
  currency?: string;
  modified?: string;
  [key: string]: unknown;
}

function money(v?: number) {
  return `R ${(v ?? 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function PurchaseOrdersPage() {
  const orders: PurchaseOrder[] = await erpList<PurchaseOrder>("Purchase Order", {
    fields: [
      "name", "supplier", "transaction_date", "schedule_date",
      "grand_total", "net_total", "status", "per_received",
      "per_billed", "currency", "modified",
    ],
    limit: 100,
    orderBy: "transaction_date desc",
  });

  const totalValue = orders.reduce((s, o) => s + (o.grand_total ?? 0), 0);
  const submitted = orders.filter((o) => o.status === "To Receive and Bill" || o.status === "To Receive" || o.status === "To Bill").length;
  const completed = orders.filter((o) => o.status === "Completed").length;
  const draft = orders.filter((o) => o.status === "Draft").length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <div className="page-sub">{orders.length} purchase orders from ERPNext</div>
        </div>
      </div>

      <div className="kpi-grid">
        <KPI label="Total Orders" value={orders.length} hint="All purchase orders" tone="teal" icon="🛒" />
        <KPI label="Open Orders" value={submitted} hint="Awaiting receipt or billing" icon="O" />
        <KPI label="Completed" value={completed} hint="Fully received and billed" tone="blue" icon="✓" />
        <KPI label="Total Value" value={money(totalValue)} hint={`${draft} in draft`} tone="warn" icon="R" />
      </div>

      <div className="card">
        <div className="card-head">
          <h3>All Purchase Orders</h3>
        </div>
        <div className="card-body">
          <SearchTable
            data={orders}
            pageSize={25}
            searchPlaceholder="Search by supplier, PO number…"
            columns={[
              {
                key: "name",
                label: "PO Number",
                render: (row) => (
                  <span style={{ fontWeight: 700, color: "var(--navy-ink)", fontFamily: "monospace", fontSize: 12 }}>
                    {row.name}
                  </span>
                ),
              },
              {
                key: "supplier",
                label: "Supplier",
                render: (row) => (
                  <span style={{ fontWeight: 600 }}>{(row as PurchaseOrder).supplier || "—"}</span>
                ),
              },
              {
                key: "transaction_date",
                label: "Order Date",
                render: (row) => (
                  <span style={{ fontSize: 12 }}>
                    {String((row as PurchaseOrder).transaction_date || "").split(" ")[0] || "—"}
                  </span>
                ),
              },
              {
                key: "schedule_date",
                label: "Required By",
                render: (row) => (
                  <span style={{ fontSize: 12 }}>
                    {String((row as PurchaseOrder).schedule_date || "").split(" ")[0] || "—"}
                  </span>
                ),
              },
              {
                key: "grand_total",
                label: "Total",
                render: (row) => (
                  <span style={{ fontWeight: 700 }}>{money((row as PurchaseOrder).grand_total)}</span>
                ),
              },
              {
                key: "per_received",
                label: "Received",
                render: (row) => {
                  const pct = (row as PurchaseOrder).per_received ?? 0;
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 60, height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: "var(--teal)", borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>{pct}%</span>
                    </div>
                  );
                },
              },
              {
                key: "status",
                label: "Status",
                render: (row) => <StatusBadge status={(row as PurchaseOrder).status} />,
              },
            ]}
            empty="No purchase orders found in ERPNext"
          />
        </div>
      </div>
    </div>
  );
}
