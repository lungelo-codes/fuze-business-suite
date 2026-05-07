import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";

const TEAM = [
  {
    name: "Fuze Digital",
    role: "Product & Engineering",
    bio: "The team behind Fuze Business Suite — building modern SaaS tools for South African businesses since 2020.",
    initials: "FD",
  },
];

const VALUES = [
  {
    icon: "🇿🇦",
    title: "South African first",
    body: "We build for the South African business environment — VAT, PAYE, CIPC, PayFast, and ZAR. Not an afterthought, built in from day one.",
  },
  {
    icon: "🔓",
    title: "Open at the core",
    body: "Fuze is built on Business Suite, a world-class open-source ERP. You own your data. You can export it, migrate it, or run it yourself.",
  },
  {
    icon: "⚡",
    title: "Speed matters",
    body: "We obsess over performance. Every page is server-rendered, every API call is optimised, and every interaction is instant.",
  },
  {
    icon: "🤝",
    title: "Customer success",
    body: "We succeed when you succeed. Our support team is available via the portal ticket system and email, Monday to Friday.",
  },
];

const STATS = [
  { value: "Business Suite", label: "Powered by" },
  { value: "Next.js 14", label: "Frontend framework" },
  { value: "ZAR", label: "Native currency" },
  { value: "15+", label: "Business modules" },
];

export default function AboutPage() {
  return (
    <div className="public-root">
      <PublicHeader />

      {/* Hero */}
      <section className="section" style={{ paddingTop: 72, paddingBottom: 56 }}>
        <div className="container" style={{ textAlign: "center" }}>
          <div className="section-label">About Us</div>
          <h1 className="section-title" style={{ fontSize: "clamp(28px, 4vw, 52px)", marginBottom: 16 }}>
            Business software built for South Africa
          </h1>
          <p className="section-sub" style={{ margin: "0 auto", maxWidth: 560 }}>
            Fuze Business Suite is a modern SaaS platform that makes enterprise-grade ERP accessible to every
            South African business — from sole traders to established companies.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="section section-alt" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 1,
              background: "var(--line)",
              border: "1px solid var(--line)",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            {STATS.map((s) => (
              <div
                key={s.label}
                style={{ background: "#fff", padding: "28px 24px", textAlign: "center" }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 900,
                    color: "var(--navy-ink)",
                    letterSpacing: "-0.03em",
                    marginBottom: 6,
                  }}
                >
                  {s.value}
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="section">
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 48,
              alignItems: "center",
            }}
          >
            <div>
              <div className="section-label">Mission</div>
              <h2 className="section-title" style={{ marginBottom: 16 }}>
                Making ERP accessible
              </h2>
              <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.7, marginBottom: 16 }}>
                Enterprise Resource Planning software has historically been expensive, complex, and out of reach
                for small and medium businesses. Fuze changes that.
              </p>
              <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.7, marginBottom: 16 }}>
                By building a clean, modern SaaS layer on top of Business Suite — one of the world&apos;s best
                open-source ERP platforms — we give South African businesses the same tools used by large
                corporations, at a fraction of the cost.
              </p>
              <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.7 }}>
                Every Fuze customer gets a dedicated business workspace, a polished portal interface, and full
                access to their data at all times.
              </p>
            </div>
            <div
              style={{
                background: "linear-gradient(135deg, var(--navy) 0%, #2A3B8F 50%, var(--teal) 140%)",
                borderRadius: 20,
                padding: "48px 40px",
                color: "#fff",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 20 }}>🚀</div>
              <h3 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 12px", color: "#fff" }}>
                Your business, your data
              </h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.7, margin: 0 }}>
                Unlike traditional SaaS where your data lives in a shared database, every Fuze customer gets
                their own isolated business workspace. You own your data completely.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-label">Values</div>
          <h2 className="section-title">What we stand for</h2>
          <div className="features-grid">
            {VALUES.map((v) => (
              <div className="feature-card" key={v.title}>
                <div className="feature-icon">{v.icon}</div>
                <h3 className="feature-title">{v.title}</h3>
                <p className="feature-body">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology */}
      <section className="section">
        <div className="container">
          <div className="section-label">Technology</div>
          <h2 className="section-title">Built on world-class open source</h2>
          <p className="section-sub">
            We stand on the shoulders of giants. Fuze is built on proven, battle-tested open-source technology.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 20,
              marginTop: 40,
            }}
          >
            {[
              {
                name: "Business Suite",
                desc: "World-class open-source ERP. Powers the entire business logic layer — accounting, HR, inventory, CRM and more.",
                url: "https://erpnext.com",
              },
              {
                name: "Next.js 14",
                desc: "React framework with server-side rendering, App Router, and edge-ready API routes for a fast, modern frontend.",
                url: "https://nextjs.org",
              },
              {
                name: "PayFast",
                desc: "South Africa's leading payment gateway. Secure ZAR billing with subscription management built in.",
                url: "https://payfast.io",
              },
              {
                name: "Tailwind CSS",
                desc: "Utility-first CSS framework for a consistent, responsive design system across every page.",
                url: "https://tailwindcss.com",
              },
            ].map((tech) => (
              <div
                key={tech.name}
                style={{
                  background: "#fff",
                  border: "1px solid var(--line)",
                  borderRadius: 14,
                  padding: "22px 24px",
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 17,
                    color: "var(--navy-ink)",
                    marginBottom: 10,
                  }}
                >
                  {tech.name}
                </div>
                <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.65, margin: "0 0 14px" }}>
                  {tech.desc}
                </p>
                <a
                  href={tech.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 13, color: "var(--teal)", fontWeight: 700 }}
                >
                  Learn more ↗
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section cta-section">
        <div className="container cta-inner">
          <h2 className="cta-title">Join South African businesses on Fuze</h2>
          <p className="cta-body">
            Start your free 14-day trial today. No credit card required.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link className="btn-hero-primary" href="/signup">
              Start free trial →
            </Link>
            <Link
              href="/contact"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "12px 24px",
                borderRadius: 10,
                border: "2px solid rgba(255,255,255,0.4)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                textDecoration: "none",
              }}
            >
              Contact us
            </Link>
          </div>
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
