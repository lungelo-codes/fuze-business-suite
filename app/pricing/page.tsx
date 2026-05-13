import Link from "next/link";
import PublicHeader from "@/components/SiteHeader";
import { PLANS, ALL_MODULES } from "@/lib/modules";

const FAQ = [
  {
    q: "Can I change my plan later?",
    a: "Yes. You can upgrade or downgrade your plan at any time from the Billing page inside your portal. Changes take effect immediately.",
  },
  {
    q: "Is there a free trial?",
    a: "The Starter plan includes a 14-day free trial with no credit card required. You get full access to the Finance module group during the trial.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit and debit cards, as well as EFT payments via PayFast. All prices are in South African Rand (ZAR).",
  },
  {
    q: "Can I cancel at any time?",
    a: "Absolutely. There are no long-term contracts. You can cancel your subscription at any time and your data will remain accessible for 30 days.",
  },
  {
    q: "What is Business Suite?",
    a: "Business Suite is an open-source Enterprise Resource Planning system. Fuze Business Suite is a polished SaaS front-end that connects to your dedicated business workspace, giving you a clean interface without the complexity.",
  },
  {
    q: "Do I get my own business workspace?",
    a: "Yes. Every Fuze account comes with a dedicated, isolated business workspace hosted on our infrastructure. Your data is never shared with other tenants.",
  },
];

export default function PricingPage() {
  return (
    <div className="public-root">
      <PublicHeader />

      {/* Hero */}
      <section className="section" style={{ paddingTop: 72, paddingBottom: 48 }}>
        <div className="container" style={{ textAlign: "center" }}>
          <div className="section-label">Pricing</div>
          <h1 className="section-title" style={{ fontSize: "clamp(28px, 4vw, 48px)", marginBottom: 16 }}>
            Simple, transparent pricing
          </h1>
          <p className="section-sub" style={{ margin: "0 auto 0", maxWidth: 520 }}>
            All prices in ZAR. Start free, upgrade as you grow. No hidden fees, no long-term contracts.
          </p>
        </div>
      </section>

      {/* Plans grid */}
      <section className="section section-alt" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="pricing-grid">
            {PLANS.map((plan) => (
              <div
                className={`pricing-card ${plan.highlight ? "pricing-highlight" : ""}`}
                key={plan.id}
              >
                {plan.badge && <div className="pricing-badge">{plan.badge}</div>}
                <div className="pricing-name">{plan.label}</div>
                <div className="pricing-price">
                  {plan.price > 0 ? (
                    <>
                      <span className="pricing-currency">R</span>
                      {plan.price.toLocaleString()}
                    </>
                  ) : plan.id === "Starter" ? (
                    "Free"
                  ) : (
                    "Custom"
                  )}
                </div>
                <div className="pricing-period">{plan.period}</div>
                <p className="pricing-desc">{plan.description}</p>
                <div className="pricing-divider" />
                <ul className="pricing-modules">
                  {plan.modules.slice(0, 8).map((mid) => {
                    const mod = ALL_MODULES.find((m) => m.id === mid);
                    return mod ? (
                      <li key={mid}>
                        <span className="check">✓</span> {mod.label}
                      </li>
                    ) : null;
                  })}
                  {plan.modules.length > 8 && (
                    <li>
                      <span className="check">✓</span> +{plan.modules.length - 8} more modules
                    </li>
                  )}
                </ul>
                <Link
                  className={`btn-plan ${plan.highlight ? "btn-plan-primary" : ""}`}
                  href={
                    plan.id === "Enterprise"
                      ? "/contact"
                      : `/signup?plan=${encodeURIComponent(plan.id)}`
                  }
                >
                  {plan.id === "Enterprise"
                    ? "Contact Sales"
                    : plan.id === "Starter"
                    ? "Start Free Trial"
                    : `Get ${plan.label}`}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Module comparison */}
      <section className="section">
        <div className="container">
          <div className="section-label">What&apos;s included</div>
          <h2 className="section-title">Full module breakdown</h2>
          <p className="section-sub">
            Every module maps directly to an Business Suite DocType. Your data lives in your own dedicated instance.
          </p>

          {(["Finance", "Operations", "People", "Service"] as const).map((group) => {
            const mods = ALL_MODULES.filter((m) => m.group === group);
            return (
              <div key={group} style={{ marginBottom: 36 }}>
                <div className="module-group-label">{group}</div>
                <div style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--bg)" }}>
                        <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--muted)", borderBottom: "1px solid var(--line)" }}>
                          Module
                        </th>
                        {PLANS.map((p) => (
                          <th key={p.id} style={{ padding: "10px 16px", textAlign: "center", fontSize: 12, fontWeight: 700, color: p.highlight ? "var(--teal)" : "var(--muted)", borderBottom: "1px solid var(--line)" }}>
                            {p.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {mods.map((mod, idx) => (
                        <tr key={mod.id} style={{ borderBottom: idx < mods.length - 1 ? "1px solid var(--line-2)" : "none" }}>
                          <td style={{ padding: "10px 16px" }}>
                            <span style={{ marginRight: 8 }}>{mod.icon}</span>
                            <span style={{ fontWeight: 600, fontSize: 13, color: "var(--navy-ink)" }}>{mod.label}</span>
                            <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{mod.description}</span>
                          </td>
                          {PLANS.map((p) => (
                            <td key={p.id} style={{ padding: "10px 16px", textAlign: "center" }}>
                              {p.modules.includes(mod.id) ? (
                                <span style={{ color: "var(--teal)", fontWeight: 800, fontSize: 16 }}>✓</span>
                              ) : (
                                <span style={{ color: "var(--line)", fontSize: 16 }}>—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-label">FAQ</div>
          <h2 className="section-title">Frequently asked questions</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 20, marginTop: 40 }}>
            {FAQ.map((item) => (
              <div key={item.q} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: "22px 24px" }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--navy-ink)", marginBottom: 10 }}>{item.q}</div>
                <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.65, margin: 0 }}>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section cta-section">
        <div className="container cta-inner">
          <h2 className="cta-title">Ready to get started?</h2>
          <p className="cta-body">Start your 14-day free trial today. No credit card required.</p>
          <Link className="btn-hero-primary" href="/signup">Start free trial →</Link>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <span className="brand-mark-sm">FB</span>
            <span className="footer-name">Fuze Business Suite</span>
          </div>
          <div className="footer-links">
            <Link href="/features">Features</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/login">Login</Link>
          </div>
          <div className="footer-copy">© {new Date().getFullYear()} Fuze · support@fuze.co.za</div>
        </div>
      </footer>
    </div>
  );
}
