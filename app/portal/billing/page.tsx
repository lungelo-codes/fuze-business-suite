import { cookies } from "next/headers";
import { PLAN_COOKIE, COMPANY_COOKIE, PLANS } from "@/lib/modules";

function daysLeft(trialEnd?: string): number | null {
  if (!trialEnd) return null;
  const end = new Date(trialEnd);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

export default async function BillingPage() {
  const cookieStore = await cookies();
  const planId = cookieStore.get(PLAN_COOKIE)?.value ?? "Starter";
  const companyName = cookieStore.get(COMPANY_COOKIE)?.value
    ? decodeURIComponent(cookieStore.get(COMPANY_COOKIE)!.value)
    : "Your Company";

  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[0];
  const isFreeTrial = plan.price === 0 || plan.id === "Starter";

  // Simulate trial end from cookie if present (real implementation would fetch from ERPNext)
  const trialDays: number | null = isFreeTrial ? 14 : null;

  const UPGRADE_PLANS = PLANS.filter((p) => p.id !== planId);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Billing & Plan</h1>
          <div className="page-sub">Manage your Fuze Business Suite subscription</div>
        </div>
      </div>

      {/* Current plan card */}
      <div className="two-col" style={{ marginBottom: 24 }}>
        <div className="card card-pad">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", fontWeight: 800, color: "var(--muted)", marginBottom: 6 }}>
                Current Plan
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "var(--navy-ink)" }}>{plan.label}</div>
            </div>
            <span className={`chip ${isFreeTrial ? "warn" : "ok"}`} style={{ marginTop: 4 }}>
              {isFreeTrial ? "Trial" : "Active"}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <div style={{ background: "var(--bg)", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>Monthly Price</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--navy-ink)", marginTop: 6 }}>
                {plan.price > 0 ? `R${plan.price.toLocaleString()}` : isFreeTrial ? "Free" : "Custom"}
              </div>
            </div>
            {trialDays !== null && (
              <div style={{ background: trialDays <= 3 ? "var(--danger-bg)" : "var(--warn-bg)", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: trialDays <= 3 ? "var(--danger)" : "var(--warn)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>Trial Remaining</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: trialDays <= 3 ? "var(--danger)" : "var(--warn)", marginTop: 6 }}>
                  {trialDays} day{trialDays !== 1 ? "s" : ""}
                </div>
              </div>
            )}
          </div>

          <div style={{ borderTop: "1px solid var(--line-2)", paddingTop: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 10 }}>
              Included Modules ({plan.modules.length})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {plan.modules.map((m) => (
                <span key={m} className="chip info" style={{ textTransform: "capitalize" }}>{m}</span>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-teal" style={{ flex: 1 }}>
              Upgrade Plan →
            </button>
            <button className="btn" style={{ flex: 1 }}>
              Manage Billing
            </button>
          </div>

          {isFreeTrial && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: "var(--warn-bg)", borderRadius: 9, fontSize: 13, color: "var(--warn)" }}>
              ⚠ Your trial {trialDays === 0 ? "has expired" : `expires in ${trialDays} day${trialDays !== 1 ? "s" : ""}`}. Upgrade to keep full access.
            </div>
          )}
        </div>

        <div className="card card-pad">
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Billing Summary</h3>
          <div className="list">
            <div className="list-row">
              <div><div className="t">Account</div><div className="s">{companyName}</div></div>
            </div>
            <div className="list-row">
              <div><div className="t">Plan</div><div className="s">{plan.label}</div></div>
              <div className="r"><span className="chip ok">{isFreeTrial ? "Trial" : "Active"}</span></div>
            </div>
            <div className="list-row">
              <div>
                <div className="t">Next Invoice</div>
                <div className="s">{isFreeTrial ? "After trial ends" : "Monthly"}</div>
              </div>
              <div className="r" style={{ fontWeight: 700 }}>
                {plan.price > 0 ? `R${plan.price.toLocaleString()}` : "—"}
              </div>
            </div>
            <div className="list-row">
              <div><div className="t">Payment Method</div><div className="s">Not configured</div></div>
              <div className="r"><button className="btn" style={{ fontSize: 12, padding: "5px 10px" }}>Add Card</button></div>
            </div>
          </div>
          <div style={{ marginTop: 16, padding: "10px 14px", background: "var(--blue-bg)", borderRadius: 9, fontSize: 12.5, color: "var(--blue)" }}>
            💳 Payment integration via PayFast is available. Contact support to activate.
          </div>
        </div>
      </div>

      {/* Upgrade plans */}
      <div style={{ marginBottom: 8 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 18 }}>Available Plans</h3>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        {UPGRADE_PLANS.slice(0, 3).map((p) => (
          <div key={p.id} className={`card card-pad ${p.highlight ? "pricing-highlight" : ""}`} style={{ position: "relative" }}>
            {p.badge && (
              <div className="pricing-badge">{p.badge}</div>
            )}
            <div style={{ fontWeight: 800, fontSize: 17, color: "var(--navy-ink)", marginBottom: 8 }}>{p.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "var(--navy-ink)", letterSpacing: "-.03em", marginBottom: 4 }}>
              {p.price > 0 ? <>R{p.price.toLocaleString()}<span style={{ fontSize: 14, fontWeight: 600, color: "var(--muted)" }}>/mo</span></> : p.id === "Enterprise" ? "Custom" : "Free"}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>{p.modules.length} modules included</div>
            <button
              className={`btn ${planId === p.id ? "btn-teal" : "btn-primary"}`}
              style={{ width: "100%" }}
              disabled={planId === p.id}
            >
              {planId === p.id ? "Current Plan" : `Upgrade to ${p.label}`}
            </button>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 20px", fontSize: 13, color: "var(--muted)" }}>
        <strong style={{ color: "var(--navy-ink)" }}>Need help?</strong> Contact{" "}
        <a href="mailto:support@fuzedigital.co.za" style={{ color: "var(--teal)", fontWeight: 700 }}>
          support@fuzedigital.co.za
        </a>{" "}
        or use the support ticket system in your portal for billing questions.
      </div>
    </div>
  );
}
