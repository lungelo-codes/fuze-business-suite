import KPI from "@/components/KPI";
import SimpleTable, { StatusCell } from "@/components/SimpleTable";
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

interface ProvisioningJob {
  name: string;
  tenant?: string;
  job_type?: string;
  status?: string;
  error?: string;
  creation?: string;
  modified?: string;
  [key: string]: unknown;
}

async function getTenants(): Promise<Tenant[]> {
  return erpList<Tenant>("Fuze SaaS Tenant", {
    fields: ["name", "customer", "subscription", "site_name", "domain", "admin_email", "status", "trial_start", "trial_end", "is_demo", "creation", "modified"],
    limit: 100,
    orderBy: "creation desc",
  });
}

async function getJobs(): Promise<ProvisioningJob[]> {
  return erpList<ProvisioningJob>("Fuze SaaS Provisioning Job", {
    fields: ["name", "tenant", "job_type", "status", "error", "creation", "modified"],
    limit: 25,
    orderBy: "creation desc",
  });
}

export default async function AdminPage() {
  const [tenants, jobs] = await Promise.all([getTenants(), getJobs()]);
  const active = tenants.filter((t) => t.status === "Active").length;
  const demos = tenants.filter((t) => Number(t.is_demo) === 1).length;
  const failed = tenants.filter((t) => t.status === "Failed").length;
  const queuedJobs = jobs.filter((j) => j.status === "Queued" || j.status === "Running").length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">SaaS Admin Overview</h1>
          <div className="page-sub">Manage Fuze Business Suite tenants, demos, and provisioning jobs</div>
        </div>
        <a className="btn btn-primary" href="/admin/customers">Manage Tenants →</a>
      </div>

      <div className="kpi-grid">
        <KPI label="Total Tenants" value={tenants.length} hint="All provisioned and pending tenants" tone="teal" icon="T" />
        <KPI label="Active" value={active} hint="Live SaaS sites" icon="A" />
        <KPI label="Demos" value={demos} hint="Trial/demo tenants" tone="warn" icon="D" />
        <KPI label="Failed" value={failed} hint={`${queuedJobs} queued/running jobs`} tone="warn" icon="!" />
      </div>

      <div className="two-col" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="card-head"><h3>Recent Tenants</h3><a className="btn" href="/admin/customers">View All</a></div>
          <div className="card-body table-wrap">
            <SimpleTable
              data={tenants.slice(0, 10)}
              columns={[
                { key: "customer", label: "Customer" },
                { key: "admin_email", label: "Admin Email" },
                { key: "site_name", label: "Site", render: (row) => row.site_name ? <a href={`https://${row.site_name}`} target="_blank" rel="noreferrer" style={{ color: "var(--teal)", fontSize: 12 }}>Open ↗</a> : "—" },
                { key: "status", label: "Status", render: (row) => <StatusCell status={row.status} /> },
                { key: "creation", label: "Created", render: (row) => <span style={{ fontSize: 12, color: "var(--muted)" }}>{String(row.creation || "").split(" ")[0]}</span> },
              ]}
              empty="No tenants yet"
            />
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Recent Provisioning Jobs</h3></div>
          <div className="card-body table-wrap">
            <SimpleTable
              data={jobs.slice(0, 10)}
              columns={[
                { key: "name", label: "Job" },
                { key: "tenant", label: "Tenant" },
                { key: "job_type", label: "Type" },
                { key: "status", label: "Status", render: (row) => <StatusCell status={row.status} /> },
                { key: "error", label: "Error", render: (row) => <span style={{ fontSize: 12, color: "var(--danger)" }}>{row.error ? "View in Business Suite" : "—"}</span> },
              ]}
              empty="No provisioning jobs yet"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
