import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import { ALL_MODULES } from "@/lib/modules";

const HIGHLIGHTS = [
  {
    icon: "🏗️",
    title: "Dedicated ERPNext Instance",
    body: "Every Fuze customer gets their own isolated ERPNext instance. Your data is never co-mingled with other businesses.",
  },
  {
    icon: "🔐",
    title: "Enterprise-grade Security",
    body: "Session-based authentication, HMAC-signed verification tokens, and role-based access control keep your business data safe.",
  },
  {
    icon: "🇿🇦",
    title: "Built for South Africa",
    body: "VAT, PAYE, UIF, SDL, and CIPC compliance tracking built in. PayFast payment gateway integration for ZAR billing.",
  },
  {
    icon: "⚡",
    title: "Real-time ERPNext Data",
    body: "All portal pages pull live data directly from your ERPNext backend. No stale caches, no manual syncs.",
  },
  {
    icon: "🧩",
    title: "Modular by Design",
    body: "Activate only the modules your business needs. Finance, Operations, People, and Service groups — pick what fits.",
  },
  {
    icon: "📱",
    title: "Responsive Interface",
    body: "Clean, fast, mobile-friendly interface built with Next.js 14 and Tailwind CSS. Works on any device.",
  },
  {
    icon: "🔄",
    title: "Automated Provisioning",
    body: "New tenants are provisioned automatically via ERPNext background jobs. From signup to live instance in minutes.",
  },
  {
    icon: "📊",
    title: "Business Intelligence",
    body: "Dashboard KPIs, compliance watch lists, and cross-module reports give you a real-time view of your business health.",
  },
  {
    icon: "🎧",
    title: "Integrated Support",
    body: "Submit and track support tickets directly from the portal. All issues are logged as ERPNext Issues for your team to manage.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Sign up and choose your plan",
    body: "Create your account, select the modules your business needs, and choose a plan. The whole process takes under 3 minutes.",
  },
  {
    step: "02",
    title: "Your ERPNext instance is provisioned",
    body: "Our system automatically creates a dedicated ERPNext site for your business. Login credentials are emailed to you once ready.",
  },
  {
    step: "03",
    title: "Log in and start working",
    body: "Use the Fuze portal to manage invoices, customers, employees, compliance and more — all backed by your ERPNext instance.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="public-root">
      <PublicHeader />

      {/* Hero */}
      <section className="section" style={{ paddingTop: 72, paddingBottom: 56 }}>
        <div className="container" style={{ textAlign: "center" }}>
          <div className="section-label">Features</div>
          <h1 className="section-title" style={{ fontSize: "clamp(28px, 4vw, 52px)", marginBottom: 16 }}>
            Everything your business needs
          </h1>
          <p className="section-sub" style={{ margin: "0 auto 36px", maxWidth: 560 }}>
            Fuze Business Suite is a complete SaaS platform built on ERPNext — giving South African businesses
            enterprise-grade tools without the enterprise price tag.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link className="btn btn-primary" href="/signup" style={{ padding: "12px 28px", fontSize: 15 }}>
              Start free trial →
            </Link>
            <Link className="btn" href="/pricing" style={{ padding: "12px 28px", fontSize: 15 }}>
              View pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-label">Platform</div>
          <h2 className="section-title">Why Fuze?</h2>
          <div className="features-grid">
            {HIGHLIGHTS.map((f) => (
              <div className="feature-card" key={f.title}>
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-body">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section">
        <div className="container">
          <div className="section-label">Process</div>
          <h2 className="section-title">How it works</h2>
          <div className="steps-grid">
            {HOW_IT_WORKS.map((step) => (
              <div className="step-card" key={step.step}>
                <div className="step-num">{step.step}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-body">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* All modules */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-label">Modules</div>
          <h2 className="section-title">Every module, explained</h2>
          <p className="section-sub">
            Each module is a fully integrated view into your ERPNext data. Activate only what you need.
          </p>
          <div className="modules-groups">
            {(["Finance", "Operations", "People", "Service"] as const).map((group) => {
              const mods = ALL_MODULES.filter((m) => m.group === group);
              return (
                <div key={group}>
                  <div className="module-group-label">{group}</div>
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

      {/* CTA */}
      <section className="section cta-section">
        <div className="container cta-inner">
          <h2 className="cta-title">Ready to see it in action?</h2>
          <p className="cta-body">Start your free trial and have your ERPNext instance running in minutes.</p>
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
