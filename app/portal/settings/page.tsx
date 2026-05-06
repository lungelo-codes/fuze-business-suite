import { cookies } from "next/headers";
import { PLAN_COOKIE, COMPANY_COOKIE, MODULE_COOKIE, ROLE_COOKIE } from "@/lib/modules";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const plan = cookieStore.get(PLAN_COOKIE)?.value ?? "—";
  const company = cookieStore.get(COMPANY_COOKIE)?.value
    ? decodeURIComponent(cookieStore.get(COMPANY_COOKIE)!.value)
    : "—";
  const role = cookieStore.get(ROLE_COOKIE)?.value ?? "customer";

  let modules: string[] = [];
  try {
    const raw = cookieStore.get(MODULE_COOKIE)?.value;
    modules = raw ? JSON.parse(decodeURIComponent(raw)) : [];
  } catch {}

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <div className="page-sub">Portal and account configuration</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card card-pad">
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Account Information</h3>
          <div className="list">
            <div className="list-row">
              <div>
                <div className="t">Company</div>
                <div className="s">{company}</div>
              </div>
            </div>
            <div className="list-row">
              <div>
                <div className="t">Current Plan</div>
                <div className="s">{plan}</div>
              </div>
              <div className="r">
                <a className="btn" href="/portal/billing" style={{ fontSize: 12, padding: "5px 10px" }}>
                  Manage →
                </a>
              </div>
            </div>
            <div className="list-row">
              <div>
                <div className="t">Role</div>
                <div className="s" style={{ textTransform: "capitalize" }}>{role}</div>
              </div>
            </div>
            <div className="list-row">
              <div>
                <div className="t">Active Modules</div>
                <div className="s">{modules.length > 0 ? `${modules.length} modules` : "All modules"}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Quick Actions</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <a href="/portal/billing" className="btn" style={{ justifyContent: "center" }}>
              💳 Billing &amp; Plan
            </a>
            <a href="/portal/support" className="btn" style={{ justifyContent: "center" }}>
              🎧 Contact Support
            </a>
            <a
              href="/api/auth/logout"
              className="btn"
              style={{ justifyContent: "center", borderColor: "var(--danger)", color: "var(--danger)" }}
            >
              Sign Out
            </a>
          </div>
          <div style={{ marginTop: 16, fontSize: 12, color: "var(--muted)" }}>
            For backend configuration changes, use your ERPNext instance directly.
          </div>
        </div>
      </div>

      {modules.length > 0 && (
        <div className="card card-pad" style={{ marginTop: 18 }}>
          <h3 style={{ marginTop: 0, marginBottom: 14 }}>Active Modules</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {modules.map((m) => (
              <span key={m} className="chip info" style={{ textTransform: "capitalize", padding: "5px 12px", fontSize: 12 }}>
                {m}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
