export default function AdminSettingsPage() {
  const erpnextUrl = process.env.NEXT_PUBLIC_ERPNEXT_URL || "https://business-suite.fuzedigital.co.za";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Admin Settings</h1>
          <div className="page-sub">System configuration and environment overview</div>
        </div>
      </div>

      <div className="two-col">
        {/* Environment */}
        <div className="card card-pad">
          <h3 style={{ margin: "0 0 16px" }}>Environment Configuration</h3>
          <div className="list">
            <div className="list-row">
              <div>
                <div className="t">ERPNext URL</div>
                <div className="s">
                  <a href={erpnextUrl} target="_blank" rel="noreferrer" style={{ color: "var(--teal)", wordBreak: "break-all" }}>
                    {erpnextUrl}
                  </a>
                </div>
              </div>
            </div>
            <div className="list-row">
              <div>
                <div className="t">Frontend Base URL</div>
                <div className="s" style={{ wordBreak: "break-all" }}>{baseUrl}</div>
              </div>
            </div>
            <div className="list-row">
              <div>
                <div className="t">API Authentication</div>
                <div className="s">
                  {process.env.ERPNEXT_API_KEY ? (
                    <span className="chip ok" style={{ fontSize: 11 }}>Token auth configured</span>
                  ) : (
                    <span className="chip warn" style={{ fontSize: 11 }}>No API key — using session auth</span>
                  )}
                </div>
              </div>
            </div>
            <div className="list-row">
              <div>
                <div className="t">Verification Secret</div>
                <div className="s">
                  {process.env.VERIFICATION_SECRET ? (
                    <span className="chip ok" style={{ fontSize: 11 }}>Configured</span>
                  ) : (
                    <span className="chip warn" style={{ fontSize: 11 }}>Using default (set VERIFICATION_SECRET)</span>
                  )}
                </div>
              </div>
            </div>
            <div className="list-row">
              <div>
                <div className="t">PayFast Integration</div>
                <div className="s">
                  {process.env.PAYFAST_MERCHANT_ID ? (
                    <span className="chip ok" style={{ fontSize: 11 }}>Configured</span>
                  ) : (
                    <span className="chip muted" style={{ fontSize: 11 }}>Not configured</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="card card-pad">
          <h3 style={{ margin: "0 0 16px" }}>Admin Quick Links</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <a href="/admin" className="btn" style={{ justifyContent: "center" }}>
              📊 Admin Dashboard
            </a>
            <a href="/admin/customers" className="btn" style={{ justifyContent: "center" }}>
              👥 Manage Tenants
            </a>
            <a href="/admin/plans" className="btn" style={{ justifyContent: "center" }}>
              💳 Plan Overview
            </a>
            <a
              href={`${erpnextUrl}/app`}
              target="_blank"
              rel="noreferrer"
              className="btn"
              style={{ justifyContent: "center" }}
            >
              🔗 Open ERPNext ↗
            </a>
            <a
              href="/api/auth/logout"
              className="btn"
              style={{ justifyContent: "center", borderColor: "var(--danger)", color: "var(--danger)" }}
            >
              Sign Out
            </a>
          </div>
        </div>
      </div>

      {/* Environment variables guide */}
      <div className="card card-pad" style={{ marginTop: 18 }}>
        <h3 style={{ margin: "0 0 16px" }}>Required Environment Variables</h3>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Variable</th>
                <th>Required</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "ERPNEXT_URL", required: true, desc: "Server-side ERPNext base URL (e.g. https://erp.yourdomain.com)" },
                { name: "NEXT_PUBLIC_ERPNEXT_URL", required: true, desc: "Client-visible ERPNext URL" },
                { name: "NEXT_PUBLIC_BASE_URL", required: true, desc: "This app's public URL (used in redirects)" },
                { name: "ERPNEXT_API_KEY", required: false, desc: "ERPNext API key for token authentication" },
                { name: "ERPNEXT_API_SECRET", required: false, desc: "ERPNext API secret for token authentication" },
                { name: "VERIFICATION_SECRET", required: true, desc: "Secret for signing email verification tokens" },
                { name: "NEXTAUTH_SECRET", required: true, desc: "NextAuth session secret" },
                { name: "ADMIN_EMAILS", required: false, desc: "Comma-separated list of admin email addresses" },
                { name: "PAYFAST_MERCHANT_ID", required: false, desc: "PayFast merchant ID for payment processing" },
                { name: "PAYFAST_MERCHANT_KEY", required: false, desc: "PayFast merchant key" },
                { name: "PAYFAST_PASSPHRASE", required: false, desc: "PayFast passphrase for signature verification" },
              ].map((v) => (
                <tr key={v.name}>
                  <td>
                    <code style={{ fontSize: 12, fontFamily: "monospace", color: "var(--navy-ink)" }}>{v.name}</code>
                  </td>
                  <td>
                    <span className={`chip ${v.required ? "warn" : "muted"}`} style={{ fontSize: 11 }}>
                      {v.required ? "Required" : "Optional"}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: "var(--muted)" }}>{v.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
