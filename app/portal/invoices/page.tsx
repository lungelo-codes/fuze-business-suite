import SearchTable, { StatusBadge } from "@/components/SearchTable";
import { getModuleData } from "@/lib/server/data";
import { InvoiceRecord } from "@/lib/types";
import { money } from "@/lib/mappers";

export default async function InvoicesPage() {
  const data = (await getModuleData("invoices")) as InvoiceRecord[];

  const totalRevenue = data.reduce((sum, inv) => sum + (inv.grand_total ?? 0), 0);
  const totalOutstanding = data.reduce((sum, inv) => sum + (inv.outstanding_amount ?? 0), 0);
  const paid = data.filter((inv) => inv.status === "Paid").length;
  const overdue = data.filter((inv) => inv.status === "Overdue").length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Invoices</h1>
          <div className="page-sub">{data.length} sales invoices from ERPNext</div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="ic-wrap">R</div>
          <div className="label">Total Revenue</div>
          <div className="val">{money(totalRevenue)}</div>
          <div className="hint">All invoices</div>
        </div>
        <div className="kpi warn">
          <div className="ic-wrap">O</div>
          <div className="label">Outstanding</div>
          <div className="val">{money(totalOutstanding)}</div>
          <div className="hint">Unpaid balance</div>
        </div>
        <div className="kpi teal">
          <div className="ic-wrap">✓</div>
          <div className="label">Paid</div>
          <div className="val">{paid}</div>
          <div className="hint">Settled invoices</div>
        </div>
        <div className="kpi" style={{ "--ic": "var(--danger-bg)", "--ic-c": "var(--danger)" } as React.CSSProperties}>
          <div className="ic-wrap" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>!</div>
          <div className="label">Overdue</div>
          <div className="val">{overdue}</div>
          <div className="hint">Past due date</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>All Invoices</h3>
        </div>
        <div className="card-body">
          <SearchTable
            data={data}
            pageSize={25}
            searchPlaceholder="Search by invoice ID, customer, status…"
            columns={[
              {
                key: "name",
                label: "Invoice",
                render: (row) => (
                  <span style={{ fontWeight: 700, color: "var(--navy-ink)", fontFamily: "monospace", fontSize: 12 }}>
                    {row.name}
                  </span>
                ),
              },
              {
                key: "customer",
                label: "Customer",
                render: (row) => (
                  <span style={{ fontWeight: 600 }}>{(row as InvoiceRecord).customer || "—"}</span>
                ),
              },
              {
                key: "posting_date",
                label: "Date",
                render: (row) => (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {(row as InvoiceRecord).posting_date || "—"}
                  </span>
                ),
              },
              {
                key: "due_date",
                label: "Due",
                render: (row) => (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {(row as InvoiceRecord).due_date || "—"}
                  </span>
                ),
              },
              {
                key: "grand_total",
                label: "Total",
                render: (row) => (
                  <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    {money((row as InvoiceRecord).grand_total)}
                  </span>
                ),
              },
              {
                key: "outstanding_amount",
                label: "Outstanding",
                render: (row) => {
                  const amt = (row as InvoiceRecord).outstanding_amount ?? 0;
                  return (
                    <span style={{ color: amt > 0 ? "var(--warn)" : "var(--ok)", fontWeight: 600 }}>
                      {money(amt)}
                    </span>
                  );
                },
              },
              {
                key: "status",
                label: "Status",
                render: (row) => <StatusBadge status={(row as InvoiceRecord).status} />,
              },
            ]}
            empty="No invoices found in ERPNext"
          />
        </div>
      </div>
    </div>
  );
}
