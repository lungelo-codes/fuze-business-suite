import SimpleTable, { StatusCell } from "@/components/SimpleTable";
import { erpList } from "@/lib/server/erpnext";
import { ALL_MODULES } from "@/lib/modules";

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
      limit: 200,
      orderBy: "creation desc",
    });
  } catch {
    return [];
  }
}

export default async function AdminCustomersPage() {
  const customers = await getCustomers();

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Customers</h1>
          <div className="page-sub">{customers.length} registered accounts across all plans</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-head"><h3>All Accounts</h3></div>
        <div className="card-body">
          <SimpleTable
            data={customers}
            empty="No customers yet — signups will appear here"
            columns={[
              { key: "company_name", label: "Company" },
              { key: "email", label: "Email" },
              { key: "phone", label: "Phone" },
              { key: "plan", label: "Plan", render: (row) => (
                <span className="chip info">{String(row.plan || "—")}</span>
              )},
              { key: "modules", label: "Modules", render: (row) => {
                let mods: string[] = [];
                try { mods = JSON.parse(String(row.modules || "[]")); } catch { mods = []; }
                return <span style={{ fontSize: 12, color: "var(--muted)" }}>{mods.length} active</span>;
              }},
              { key: "site_url", label: "Site", render: (row) => row.site_url
                ? <a href={String(row.site_url)} target="_blank" rel="noreferrer" style={{ color: "var(--teal)", fontSize: 12 }}>Open ↗</a>
                : <span style={{ color: "var(--muted-2)", fontSize: 12 }}>Provisioning…</span>
              },
              { key: "status", label: "Status", render: (row) => <StatusCell status={row.status} /> },
              { key: "creation", label: "Created", render: (row) => (
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{String(row.creation || "").split(" ")[0]}</span>
              )},
            ]}
          />
        </div>
      </div>

      {/* Expanded detail cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {customers.map((c) => {
          let mods: string[] = [];
          try { mods = JSON.parse(String(c.modules || "[]")); } catch { mods = []; }
          return (
            <div className="card" key={c.name} style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--navy-ink)", fontSize: 14 }}>{c.company_name || c.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{c.email}</div>
                </div>
                <StatusCell status={c.status} />
              </div>
              <div style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  <span className="chip info">{c.plan || "—"}</span>
                  {c.phone && <span className="chip muted">{c.phone}</span>}
                </div>
                {mods.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {mods.map((id) => {
                      const mod = ALL_MODULES.find((m) => m.id === id);
                      return mod ? (
                        <span key={id} style={{ fontSize: 11, padding: "2px 8px", background: "#F0F1F7", borderRadius: 8, color: "var(--muted)" }}>
                          {mod.icon} {mod.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
                {c.site_url && (
                  <div style={{ marginTop: 10 }}>
                    <a href={String(c.site_url)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--teal)", fontWeight: 600 }}>
                      {String(c.site_url)} ↗
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
