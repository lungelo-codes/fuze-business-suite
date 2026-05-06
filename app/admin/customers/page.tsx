import SearchTable, { StatusBadge } from "@/components/SearchTable";
import KPI from "@/components/KPI";
import { erpList } from "@/lib/server/erpnext";

interface Tenant {
  name: string;
  customer?: string;
  subscription?: string;
  site_name?: string;
  domain?: string;
  admin_email?: string;
  status?: string;
  trial_start?: string;
  trial_end?: string;
  is_demo?: 0 | 1;
  creation?: string;
  modified?: string;
  [key: string]: unknown;
}

async function getTenants(): Promise<Tenant[]> {
  return erpList<Tenant>("Fuze SaaS Tenant", {
    fields: ["name", "customer", "subscription", "site_name", "domain", "admin_email", "status", "trial_start", "trial_end", "is_demo", "creation", "modified"],
    limit: 200,
    orderBy: "creation desc",
    admin: true,
  });
}

export default async function AdminCustomersPage() {
  const tenants = await getTenants();
  const active = tenants.filter((t) => t.status === "Active").length;
  const demos = tenants.filter((t) => Number(t.is_demo) === 1).length;
  const suspended = tenants.filter((t) => t.status === "Suspended").length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Tenants & Customers</h1>
          <div className="page-sub">{tenants.length} SaaS tenant records</div>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <KPI label="Total Tenants" value={tenants.length} hint="All provisioned tenants" tone="teal" icon="T" />
        <KPI label="Active" value={active} hint="Live SaaS sites" icon="A" />
        <KPI label="Demos" value={demos} hint="Trial tenants" tone="warn" icon="D" />
        <KPI label="Suspended" value={suspended} hint="Inactive tenants" icon="S" />
      </div>

      <div className="card">
        <div className="card-head">
          <h3>All Tenants</h3>
        </div>
        <div className="card-body">
          <SearchTable
            data={tenants}
            pageSize={30}
            searchPlaceholder="Search by customer, email, site…"
            empty="No tenants yet — signups will appear here"
            columns={[
              {
                key: "customer",
                label: "Customer",
                render: (row) => (
                  <span style={{ fontWeight: 600, color: "var(--navy-ink)" }}>
                    {(row as Tenant).customer || "—"}
                  </span>
                ),
              },
              {
                key: "admin_email",
                label: "Admin Email",
                render: (row) => (
                  <span style={{ fontSize: 12 }}>{(row as Tenant).admin_email || "—"}</span>
                ),
              },
              {
                key: "site_name",
                label: "Site",
                render: (row) => {
                  const t = row as Tenant;
                  return t.site_name ? (
                    <a
                      href={`https://${t.site_name}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "var(--teal)", fontSize: 12 }}
                    >
                      {t.site_name} ↗
                    </a>
                  ) : (
                    <span style={{ color: "var(--muted-2)", fontSize: 12 }}>Provisioning…</span>
                  );
                },
              },
              {
                key: "is_demo",
                label: "Type",
                render: (row) => (
                  <span className="chip info">
                    {Number((row as Tenant).is_demo) === 1 ? "Demo" : "Paid"}
                  </span>
                ),
              },
              {
                key: "trial_end",
                label: "Trial Ends",
                render: (row) => (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {(row as Tenant).trial_end || "—"}
                  </span>
                ),
              },
              {
                key: "status",
                label: "Status",
                render: (row) => <StatusBadge status={(row as Tenant).status} />,
              },
              {
                key: "creation",
                label: "Created",
                render: (row) => (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {String((row as Tenant).creation || "").split(" ")[0]}
                  </span>
                ),
              },
              {
                key: "name",
                label: "Actions",
                render: (row) => (
                  <a
                    className="btn"
                    href={`/admin/customers/${(row as Tenant).name}`}
                    style={{ fontSize: 12, padding: "5px 10px" }}
                  >
                    Manage
                  </a>
                ),
                searchable: false,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
