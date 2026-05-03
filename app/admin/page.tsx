import KPI from "@/components/KPI";
import SimpleTable, { StatusCell } from "@/components/SimpleTable";
import { erpList } from "@/lib/server/erpnext";

interface BusinessProfile {
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  plan?: string;
  status?: string;
  site_url?: string;
  modules?: string;
  creation?: string;
  modified?: string;
  [key: string]: unknown;
}

async function getCustomers(): Promise<BusinessProfile[]> {
  try {
    return await erpList<BusinessProfile>("Fuze Business Profile", {
      fields: ["name", "company_name", "email", "phone", "plan", "status", "site_url", "modules", "creation", "modified"],
      limit: 100,
      orderBy: "creation desc",
    });
  } catch {
    return [];
  }
}

export default async function AdminPage() {
  const customers = await getCustomers();

  const total = customers.length;
  const active = customers.filter((c) => (c.status || "").toLowerCase() === "active").length;
  const trial = customers.filter((c) => (c.status || "").toLowerCase().includes("trial")).length;
  const pending = customers.filter((c) => (c.status || "").toLowerCase() === "pending").length;

  const planCounts: Record<string, number> = {};
  customers.forEach((c) => {
    const plan = c.plan || "Unknown";
    planCounts[plan] = (planCounts[plan] || 0) + 1;
  });

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Admin Overview</h1>
          <div className="page-sub">Manage all Fuze Business Suite customers and tenants</div>
        </div>
        <a className="btn btn-primary" href="/admin/customers">View All Customers →</a>
      </div>

      <div className="kpi-grid">
        <KPI label="Total Customers" value={total} hint="All registered accounts" tone="teal" icon="C" />
        <KPI label="Active" value={active} hint="Live subscriptions" icon="A" />
        <KPI label="On Trial" value={trial} hint="Free trial accounts" tone="warn" icon="T" />
        <KPI label="Pending" value={pending} hint="Awaiting provisioning" tone="purple" icon="P" />
      </div>

      <div className="two-col" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="card-head">
            <h3>Recent Signups</h3>
            <a className="btn" href="/admin/customers">View All</a>
          </div>
          <div className="card-body">
            <SimpleTable
              data={customers.slice(0, 10)}
              columns={[
                { key: "company_name", label: "Company" },
                { key: "email", label: "Email" },
                { key: "plan", label: "Plan" },
                { key: "status", label: "Status", render: (row) => <StatusCell status={row.status} /> },
                { key: "creation", label: "Signed Up", render: (row) => <span style={{ fontSize: 12, color: "#6B7086" }}>{String(row.creation || "").split(" ")[0]}</span> },
              ]}
              empty="No customers yet"
            />
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Plans Distribution</h3></div>
          <div className="list">
            {Object.entries(planCounts).map(([plan, count]) => (
              <div className="list-row" key={plan}>
                <div>
                  <div className="t">{plan}</div>
                  <div className="s">{count} customer{count !== 1 ? "s" : ""}</div>
                </div>
                <div className="r">
                  <div style={{ background: "#EEF0F5", borderRadius: 4, overflow: "hidden", width: 100, height: 6 }}>
                    <div style={{ background: "var(--teal)", height: "100%", width: `${Math.round((count / total) * 100)}%` }} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{total ? Math.round((count / total) * 100) : 0}%</div>
                </div>
              </div>
            ))}
            {Object.keys(planCounts).length === 0 && <div className="empty">No data yet</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
