"use client";
import { useState } from "react";
import { ALL_MODULES, PLANS } from "@/lib/modules";

export default function SettingsPage() {
  const [tab, setTab] = useState<"workspace" | "modules" | "integrations" | "users">("workspace");
  const [fuzeUrl, setFuzeUrl] = useState(process.env.NEXT_PUBLIC_FUZE_API_URL || "");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Workspace configuration, modules, integrations and users</p>
        </div>
      </div>

      <div className="crm-tabs">
        {(["workspace", "modules", "integrations", "users"] as const).map((t) => (
          <button key={t} className={`crm-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "workspace" && (
        <div className="two-col" style={{ alignItems: "flex-start" }}>
          <div className="card">
            <div className="card-head"><h3>Workspace Details</h3></div>
            <div className="card-body">
              <label className="label">Company Name</label>
              <input className="inp" defaultValue="Fuze Demo Company" />
              <label className="label">Registration Number</label>
              <input className="inp" placeholder="e.g. 2020/123456/07" />
              <label className="label">VAT Number</label>
              <input className="inp" placeholder="e.g. 4120123456" />
              <label className="label">Default Currency</label>
              <select className="inp"><option>ZAR — South African Rand</option></select>
              <label className="label">Financial Year End</label>
              <select className="inp">
                <option>28 February</option><option>31 March</option><option>30 June</option><option>31 December</option>
              </select>
              <button className="btn btn-teal" onClick={save}>{saved ? "✓ Saved!" : "Save Changes"}</button>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h3>Current Plan</h3></div>
            <div className="card-body">
              <div style={{ background: "var(--blue-bg)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: "var(--navy-ink)" }}>Growth Plan</div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>R 499 / month</div>
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>Active modules:</div>
              {["dashboard", "crm", "accounting", "compliance", "projects", "settings"].map((id) => {
                const mod = ALL_MODULES.find((m) => m.id === id);
                return mod ? (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 16 }}>{mod.icon}</span>
                    <span style={{ fontWeight: 600 }}>{mod.label}</span>
                    <span className="chip ok" style={{ marginLeft: "auto", fontSize: 10 }}>Active</span>
                  </div>
                ) : null;
              })}
              <button className="btn btn-teal" style={{ width: "100%", justifyContent: "center", marginTop: 12 }}>Upgrade to Professional →</button>
            </div>
          </div>
        </div>
      )}

      {tab === "modules" && (
        <div>
          <div className="alert-banner" style={{ marginBottom: 18 }}>
            <span>◈</span>
            <div>Add or remove modules from your workspace. Locked modules require a plan upgrade.</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 14 }}>
            {ALL_MODULES.filter((m) => m.id !== "dashboard" && m.id !== "settings").map((mod) => {
              const active = ["crm", "accounting", "compliance", "projects"].includes(mod.id);
              return (
                <div key={mod.id} className="card" style={{ opacity: active ? 1 : 0.7 }}>
                  <div className="card-body" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ fontSize: 28, lineHeight: 1 }}>{mod.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800 }}>{mod.label}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{mod.description}</div>
                      <div style={{ marginTop: 10 }}>
                        {active ? (
                          <span className="chip ok">Active</span>
                        ) : (
                          <button className="btn btn-teal" style={{ fontSize: 11, padding: "4px 10px" }}>Unlock →</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "integrations" && (
        <div className="two-col" style={{ alignItems: "flex-start" }}>
          <div className="card">
            <div className="card-head"><h3>Fuze API Connection</h3></div>
            <div className="card-body">
              <div style={{ background: "var(--blue-bg)", borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12 }}>
                Connect to your Fuze backend to enable live data. Without this, the app uses demo data.
              </div>
              <label className="label">Fuze API URL</label>
              <input className="inp" placeholder="https://your-site.fuze.co.za" value={fuzeUrl} onChange={(e) => setFuzeUrl(e.target.value)} />
              <label className="label">API Key</label>
              <input className="inp" type="password" placeholder="Fuze API Key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
              <label className="label">API Secret</label>
              <input className="inp" type="password" placeholder="Fuze API Secret" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} />
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button className="btn btn-teal" onClick={save}>{saved ? "✓ Saved!" : "Save & Test"}</button>
                <button className="btn">Test Connection</button>
              </div>
              <div style={{ marginTop: 14, fontSize: 12, color: "var(--muted)" }}>
                Generate API credentials in your Fuze backend under Settings → API Access → Generate Keys
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h3>Other Integrations</h3></div>
            <div className="list">
              {[
                { name: "Google Drive", desc: "Attach Drive files to records", icon: "📁", status: "available" },
                { name: "Dropbox", desc: "Link Dropbox documents", icon: "📦", status: "available" },
                { name: "WhatsApp Business", desc: "Send invoices via WhatsApp", icon: "💬", status: "coming" },
                { name: "SARS eFiling", desc: "Submit VAT & PAYE directly", icon: "🏛", status: "coming" },
                { name: "PayFast", desc: "Accept online payments", icon: "💳", status: "coming" },
                { name: "Peach Payments", desc: "SA payment gateway", icon: "💳", status: "coming" },
              ].map((int) => (
                <div key={int.name} className="list-row">
                  <div style={{ fontSize: 24 }}>{int.icon}</div>
                  <div>
                    <div className="t">{int.name}</div>
                    <div className="s">{int.desc}</div>
                  </div>
                  <div>
                    {int.status === "available" ? (
                      <button className="btn btn-teal" style={{ fontSize: 11, padding: "4px 10px" }}>Connect</button>
                    ) : (
                      <span className="chip muted" style={{ fontSize: 10 }}>Coming Soon</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="card">
          <div className="card-head"><h3>Workspace Users</h3><button className="btn btn-teal">+ Invite User</button></div>
          <table className="data">
            <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {[
                { name: "Admin User", email: "admin@fuze.co.za", role: "Owner", status: "Active" },
                { name: "Sales Manager", email: "sales@fuze.co.za", role: "Manager", status: "Active" },
                { name: "Finance Clerk", email: "finance@fuze.co.za", role: "Accountant", status: "Active" },
              ].map((u) => (
                <tr key={u.email}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{u.name.split(" ").map(n => n[0]).join("").slice(0,2)}</div>
                      <strong>{u.name}</strong>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td><span className="chip info">{u.role}</span></td>
                  <td><span className="chip ok">{u.status}</span></td>
                  <td><button className="btn" style={{ fontSize: 11, padding: "4px 8px" }}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
