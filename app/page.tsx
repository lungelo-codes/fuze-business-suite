import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import { ALL_MODULES, PLANS } from "@/lib/modules";

const FEATURES = [
  { icon: "⚖️", title: "Built for South Africa", body: "Native VAT201, EMP201, UIF, SDL, and CIPC compliance calendars — SARS deadlines built in." },
  { icon: "🔗", title: "Powered by ERPNext", body: "Your own ERPNext instance provisioned on signup. Real data, real accounting, no vendor lock-in." },
  { icon: "📊", title: "Live Dashboards", body: "KPI dashboards refresh in real time from your ERPNext data so you always see the full picture." },
  { icon: "🔒", title: "Isolated Instances", body: "Every customer gets their own isolated ERPNext site — your data is never shared." },
  { icon: "💼", title: "Pick Your Modules", body: "Only pay for what you need. Enable modules as you grow — invoicing, HR, payroll and more." },
  { icon: "🚀", title: "Up in Minutes", body: "Submit your details and your demo environment is provisioned automatically. No IT required." },
];

const GROUPS = [
  { label: "Finance", ids: ["invoices", "quotes", "payments", "customers", "compliance"] },
  { label: "Operations", ids: ["suppliers", "items", "projects", "tasks"] },
  { label: "People", ids: ["employees", "payroll", "leave"] },
  { label: "Service", ids: ["support", "appointments", "chat"] },
];

export default function HomePage() {
  return (
    <div className="public-root">
      <PublicHeader />

      <section className="hero-section">
        <div className="hero-glow" />
        <div className="container">
          <div className="hero-badge">🇿🇦 Built for South African Business</div>
          <h1 className="hero-title">
            Run your entire business<br />
            <span className="hero-accent">on one platform</span>
          </h1>
          <p className="hero-body">
            Fuze Business Suite gives growing SA companies invoicing, compliance, HR, payroll and more — powered by your own private ERPNext instance. Live in minutes.
          </p>
          <div className="hero-cta">
            <Link className="btn-hero-primary" href="/signup">Start Free Trial</Link>
            <Link className="btn-hero-ghost" href="/#pricing">See plans →</Link>
          </div>
          <p className="hero-note">14-day free trial · No credit card required · Your own ERPNext site</p>
        </div>
        <div className="pills-row">
          {ALL_MODULES.map((m) => (
            <span key={m.id} className="pill">{m.icon} {m.label}</span>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-label">How it works</div>
          <h2 className="section-title">From signup to running in 3 steps</h2>
          <div className="steps-grid">
            {[
              { n: "01", title: "Choose your plan & modules", body: "Pick the plan that fits your business. Select only the modules you need — Finance, HR, Compliance, and more." },
              { n: "02", title: "Your ERPNext instance is provisioned", body: "We spin up a private ERPNext site for your company automatically. You get your own URL and login credentials." },
              { n: "03", title: "Start managing your business", body: "Log in to your Fuze portal, see live data from ERPNext, and run your business from one dashboard." },
            ].map((step) => (
              <div className="step-card" key={step.n}>
                <div className="step-num">{step.n}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-body">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-label">Why Fuze</div>
          <h2 className="section-title">Everything your business needs</h2>
          <div className="features-grid">
            {FEATURES.map((f) => (
              <div className="feature-card" key={f.title}>
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-body">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-label">Modules</div>
          <h2 className="section-title">Pick what you need</h2>
          <p className="section-sub">Every plan lets you choose which modules to activate. Only what you need — nothing you do not.</p>
          <div className="modules-groups">
            {GROUPS.map((g) => {
              const mods = ALL_MODULES.filter((m) => g.ids.includes(m.id));
              return (
                <div className="module-group" key={g.label}>
                  <div className="module-group-label">{g.label}</div>
                  <div className="module-cards">
                    {mods.map((m) => (
                      <div className="module-card" key={m.id}>
                        <span className="module-icon">{m.icon}</span>
                        <div>
                          <span className="module-name">{m.label}</span>
                          <span className="module-desc">{m.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section section-alt" id="pricing">
        <div className="container">
          <div className="section-label">Pricing</div>
          <h2 className="section-title">Simple, transparent plans</h2>
          <p className="section-sub">All prices in ZAR. Start free, upgrade as you grow.</p>
          <div className="pricing-grid">
            {PLANS.map((plan) => (
              <div className={`pricing-card ${plan.highlight ? "pricing-highlight" : ""}`} key={plan.id}>
                {plan.badge && <div className="pricing-badge">{plan.badge}</div>}
                <div className="pricing-name">{plan.label}</div>
                <div className="pricing-price">
                  {plan.price > 0
                    ? <><span className="pricing-currency">R</span>{plan.price.toLocaleString()}</>
                    : plan.id === "Starter" ? "Free" : "Custom"}
                </div>
                <div className="pricing-period">{plan.period}</div>
                <p className="pricing-desc">{plan.description}</p>
                <div className="pricing-divider" />
                <ul className="pricing-modules">
                  {plan.modules.slice(0, 8).map((mid) => {
                    const mod = ALL_MODULES.find((m) => m.id === mid);
                    return mod ? <li key={mid}><span className="check">✓</span> {mod.label}</li> : null;
                  })}
                  {plan.modules.length > 8 && <li><span className="check">✓</span> +{plan.modules.length - 8} more</li>}
                </ul>
                <Link
                  className={`btn-plan ${plan.highlight ? "btn-plan-primary" : ""}`}
                  href={`/signup?plan=${encodeURIComponent(plan.id)}`}
                >
                  {plan.id === "Enterprise" ? "Contact Sales" : "Start Free Trial"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section cta-section">
        <div className="container cta-inner">
          <h2 className="cta-title">Ready to grow your business?</h2>
          <p className="cta-body">Join South African businesses running on Fuze. Your ERPNext instance is waiting.</p>
          <Link className="btn-hero-primary" href="/signup">Get started free →</Link>
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
            <Link href="/#pricing">Pricing</Link>
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
