import KPI from "@/components/KPI";
import SimpleTable, { StatusCell } from "@/components/SimpleTable";
import { getDashboardData } from "@/lib/server/data";
import { money } from "@/lib/mappers";

export default async function DashboardPage() {
  const data = await getDashboardData();

  const totalRevenue = data.invoices.reduce((sum, invoice) => sum + (invoice.grand_total ?? 0), 0);
  const outstanding = data.invoices.reduce((sum, invoice) => sum + (invoice.outstanding_amount ?? 0), 0);
  const openSupport = data.support.filter((ticket) => (ticket.status || "").toLowerCase().includes("open")).length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Customer Dashboard</h1>
          <div className="page-sub">Live overview from ERPNext resources.</div>
        </div>
        <a className="btn btn-primary" href="/portal/support">Create Support Ticket</a>
      </div>

      <div className="kpi-grid">
        <KPI label="Customers" value={data.customers.length} hint="Customer records" tone="teal" icon="C" />
        <KPI label="Revenue" value={money(totalRevenue)} hint="Sales invoices" icon="R" />
        <KPI label="Outstanding" value={money(outstanding)} hint="Unpaid balance" tone="warn" icon="O" />
        <KPI label="Open Support" value={openSupport} hint="ERPNext Issue" tone="purple" icon="S" />
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-head"><h3>Recent Invoices</h3><a className="btn" href="/portal/invoices">View All</a></div>
          <div className="card-body">
            <SimpleTable
              data={data.invoices.slice(0, 8)}
              columns={[
                { key: "name", label: "Invoice" },
                { key: "customer", label: "Customer" },
                { key: "grand_total", label: "Total", render: (row) => money(row.grand_total) },
                { key: "status", label: "Status", render: (row) => <StatusCell status={row.status} /> }
              ]}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Compliance Watch</h3><a className="btn" href="/portal/compliance">Open</a></div>
          <div className="card-body">
            <SimpleTable
              data={data.compliance.slice(0, 8)}
              columns={[
                { key: "name", label: "Record" },
                { key: "kind", label: "Type" },
                { key: "due_date", label: "Due" },
                { key: "status", label: "Status", render: (row) => <StatusCell status={row.status} /> }
              ]}
            />
          </div>
        </div>
      </div>

      <div className="three-col">
        <div className="card">
          <div className="card-head"><h3>Support</h3></div>
          <div className="list">
            {data.support.slice(0, 5).map((item) => (
              <div className="list-row" key={item.name}>
                <div>
                  <div className="t">{item.subject || item.name}</div>
                  <div className="s">{item.customer || item.raised_by || "No customer"}</div>
                </div>
                <div className="r"><StatusCell status={item.status} /></div>
              </div>
            ))}
            {data.support.length === 0 ? <div className="empty">No support tickets.</div> : null}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Appointments</h3></div>
          <div className="list">
            {data.appointments.slice(0, 5).map((item) => (
              <div className="list-row" key={item.name}>
                <div>
                  <div className="t">{item.subject || item.name}</div>
                  <div className="s">{item.starts_on || "-"}</div>
                </div>
                <div className="r"><StatusCell status={item.status} /></div>
              </div>
            ))}
            {data.appointments.length === 0 ? <div className="empty">No appointments.</div> : null}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Chat / Communications</h3></div>
          <div className="list">
            {data.chat.slice(0, 5).map((item) => (
              <div className="list-row" key={item.name}>
                <div>
                  <div className="t">{item.subject || item.communication_type || item.name}</div>
                  <div className="s">{item.sender || item.creation || "Communication"}</div>
                </div>
              </div>
            ))}
            {data.chat.length === 0 ? <div className="empty">No messages.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
