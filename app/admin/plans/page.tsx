// Import from appModules to avoid path resolution issues
import { PLANS, ALL_MODULES } from "@/lib/appModules";

export default function AdminPlansPage() {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Plan Management</h1>
          <div className="page-sub">Overview of all SaaS plans and their included modules</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18, marginBottom: 32 }}>
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            style={{
              background: "#fff",
              border: `2px solid ${plan.highlight ? "var(--teal)" : "var(--line)"}`,
              borderRadius: 16,
              padding: "24px",
              position: "relative",
            }}
          >
            {plan.badge && (
              <span
                style={{
                  position: "absolute",
                  top: -10,
                  left: 20,
                  background: "var(--teal)",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "3px 10px",
                  borderRadius: 10,
                }}
              >
                {plan.badge}
              </span>
            )}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: "var(--navy-ink)" }}>{plan.label}</div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{plan.description}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 900, fontSize: 22, color: "var(--navy-ink)" }}>
                  {plan.price > 0 ? `R${plan.price.toLocaleString()}` : plan.id === "Starter" ? "Free" : "Custom"}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{plan.period}</div>
              </div>
            </div>

            <div
              style={{
                background: "var(--bg)",
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--muted)", marginBottom: 8 }}>
                {plan.modules.length} modules included
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {plan.modules.map((mid) => {
                  const mod = ALL_MODULES.find((m) => m.id === mid);
                  return mod ? (
                    <span
                      key={mid}
                      style={{
                        background: "#fff",
                        border: "1px solid var(--line)",
                        borderRadius: 6,
                        padding: "3px 8px",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--navy-ink)",
                      }}
                    >
                      {mod.icon} {mod.label}
                    </span>
                  ) : null;
                })}
              </div>
            </div>

            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Plan ID: <code style={{ background: "var(--bg)", padding: "1px 6px", borderRadius: 4 }}>{plan.id}</code>
            </div>
          </div>
        ))}
      </div>

      {/* Module reference table */}
      <div className="card">
        <div className="card-head">
          <h3>All Modules Reference</h3>
        </div>
        <div className="card-body table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Module</th>
                <th>Group</th>
                <th>Path</th>
                <th>Starter</th>
                <th>Growth</th>
                <th>Business Pro</th>
                <th>Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {ALL_MODULES.map((mod) => (
                <tr key={mod.id}>
                  <td>
                    <span style={{ marginRight: 6 }}>{mod.icon}</span>
                    <span style={{ fontWeight: 600 }}>{mod.label}</span>
                  </td>
                  <td>
                    <span className="chip info" style={{ fontSize: 11 }}>{mod.group}</span>
                  </td>
                  <td>
                    <code style={{ fontSize: 11, color: "var(--muted)" }}>{mod.path}</code>
                  </td>
                  {PLANS.map((p) => (
                    <td key={p.id} style={{ textAlign: "center" }}>
                      {p.modules.includes(mod.id) ? (
                        <span style={{ color: "var(--teal)", fontWeight: 800 }}>✓</span>
                      ) : (
                        <span style={{ color: "var(--line)" }}>—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
