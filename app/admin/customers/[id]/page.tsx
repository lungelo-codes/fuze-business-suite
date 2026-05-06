import { notFound } from "next/navigation";
import SimpleTable, { StatusCell } from "@/components/SimpleTable";
import { erpGet, erpList } from "@/lib/server/erpnext";
import TenantActions from "./TenantActions";

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

interface Job {
  name: string;
  tenant?: string;
  job_type?: string;
  status?: string;
  error?: string;
  creation?: string;
  modified?: string;
  [key: string]: unknown;
}

async function getTenant(id: string): Promise<Tenant | null> {
  try {
    const res = await erpGet<{ data?: Tenant; message?: Tenant }>(
      `/api/resource/Fuze%20SaaS%20Tenant/${encodeURIComponent(id)}`
    );
    return res.data ?? res.message ?? null;
  } catch {
    return null;
  }
}

async function getJobs(id: string): Promise<Job[]> {
  return erpList<Job>("Fuze SaaS Provisioning Job", {
    fields: ["name", "tenant", "job_type", "status", "error", "creation", "modified"],
    filters: [["tenant", "=", id]],
    limit: 20,
    orderBy: "creation desc",
  });
}

export default async function TenantDetailPage({ params }: { params: { id: string } }) {
  const tenant = await getTenant(params.id);
  if (!tenant) notFound();
  const jobs = await getJobs(params.id);

  const statusColor =
    tenant.status === "Active"
      ? "var(--ok)"
      : tenant.status === "Suspended"
      ? "var(--danger)"
      : "var(--warn)";

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">{tenant.customer || `Tenant ${tenant.name}`}</h1>
          <div className="page-sub">Tenant ID: {tenant.name}</div>
        </div>
        <a className="btn" href="/admin/customers">
          ← Back to Tenants
        </a>
      </div>

      <div className="two-col" style={{ marginBottom: 18 }}>
        {/* Profile card */}
        <div className="card card-pad">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h3 style={{ margin: 0 }}>Tenant Profile</h3>
            <span
              className="chip"
              style={{
                background: tenant.status === "Active" ? "var(--ok-bg)" : tenant.status === "Suspended" ? "var(--danger-bg)" : "var(--warn-bg)",
                color: statusColor,
              }}
            >
              {tenant.status || "Unknown"}
            </span>
          </div>

          <div className="list">
            <div className="list-row">
              <div>
                <div className="t">Customer</div>
                <div className="s">{tenant.customer || "—"}</div>
              </div>
            </div>
            <div className="list-row">
              <div>
                <div className="t">Admin Email</div>
                <div className="s">
                  {tenant.admin_email ? (
                    <a href={`mailto:${tenant.admin_email}`} style={{ color: "var(--teal)" }}>
                      {tenant.admin_email}
                    </a>
                  ) : "—"}
                </div>
              </div>
            </div>
            <div className="list-row">
              <div>
                <div className="t">Site URL</div>
                <div className="s">
                  {tenant.site_name ? (
                    <a
                      href={`https://${tenant.site_name}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "var(--teal)" }}
                    >
                      https://{tenant.site_name} ↗
                    </a>
                  ) : "Provisioning…"}
                </div>
              </div>
            </div>
            <div className="list-row">
              <div>
                <div className="t">Subscription</div>
                <div className="s">{tenant.subscription || "—"}</div>
              </div>
              <div className="r">
                <span className="chip info">{Number(tenant.is_demo) === 1 ? "Demo" : "Paid"}</span>
              </div>
            </div>
            <div className="list-row">
              <div>
                <div className="t">Trial Period</div>
                <div className="s">
                  {tenant.trial_start || "—"} → {tenant.trial_end || "—"}
                </div>
              </div>
            </div>
            <div className="list-row">
              <div>
                <div className="t">Created</div>
                <div className="s">{String(tenant.creation || "—").split(" ")[0]}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions card */}
        <div className="card card-pad">
          <h3 style={{ margin: "0 0 16px" }}>Admin Actions</h3>
          <TenantActions tenantId={tenant.name} currentStatus={tenant.status} />
        </div>
      </div>

      {/* Provisioning jobs */}
      <div className="card">
        <div className="card-head">
          <h3>Provisioning Jobs ({jobs.length})</h3>
        </div>
        <div className="card-body table-wrap">
          <SimpleTable
            data={jobs}
            empty="No provisioning jobs for this tenant"
            columns={[
              { key: "name", label: "Job ID" },
              { key: "job_type", label: "Type" },
              { key: "status", label: "Status", render: (row) => <StatusCell status={row.status} /> },
              {
                key: "error",
                label: "Error",
                render: (row) => (
                  <span style={{ fontSize: 12, color: "var(--danger)" }}>
                    {row.error ? "Has error — check ERPNext" : "—"}
                  </span>
                ),
              },
              {
                key: "creation",
                label: "Created",
                render: (row) => (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {String(row.creation || "").split(" ")[0]}
                  </span>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
