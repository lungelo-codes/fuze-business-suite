import Link from "next/link";
import { ALL_MODULES } from "@/lib/modules";

const grouped = [
  { label: "Finance", href: "/features#finance", ids: ["invoices", "quotes", "payments", "compliance", "customers"] },
  { label: "CRM & Sales", href: "/features#crm", ids: ["crm", "leads", "opportunities", "sales-orders", "campaigns"] },
  { label: "Operations", href: "/features#operations", ids: ["projects", "tasks", "items", "suppliers", "documents"] },
  { label: "People & Service", href: "/features#people", ids: ["employees", "payroll", "leave", "attendance", "support", "chat"] },
];

const companyLinks = [
  { label: "About", href: "/about" },
  { label: "Resources", href: "/resources" },
  { label: "Support", href: "/support" },
  { label: "Legal", href: "/legal" },
];

export default function PublicHeader() {
  return (
    <header className="pub-header public-glass-header">
      <Link href="/" className="pub-brand" style={{ textDecoration: "none" }}>
        <div className="brand-mark public-brand-mark">BS</div>
        <span>Business Suite</span>
      </Link>

      <nav className="pub-nav public-mega-nav">
        <div className="mega-trigger">
          <button type="button" className="mega-nav-button">Platform ▾</button>
          <div className="mega-menu">
            <div className="mega-panel-main">
              <p className="mega-kicker">Business Suite Platform</p>
              <h3>Understand every module before you sign up.</h3>
              <p>Explore CRM, finance, compliance, HR, documents, projects and support from one modern SaaS workspace.</p>
              <Link href="/features" className="mega-primary">View all features →</Link>
            </div>
            <div className="mega-panel-grid">
              {grouped.map((group) => (
                <div className="mega-group" key={group.label}>
                  <Link href={group.href} className="mega-group-title">{group.label}</Link>
                  {ALL_MODULES.filter((m) => group.ids.includes(m.id)).slice(0, 5).map((m) => (
                    <Link href={`/features/${m.id}`} className="mega-item" key={m.id}>
                      <span>{m.icon}</span>
                      <div>
                        <b>{m.label}</b>
                        <small>{m.description}</small>
                      </div>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <Link href="/features">Features</Link>
        <Link href="/pricing">Pricing</Link>
        <div className="mega-trigger compact-mega">
          <button type="button" className="mega-nav-button">Company ▾</button>
          <div className="mega-menu compact-menu">
            {companyLinks.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          </div>
        </div>
        <Link href="/login">Login</Link>
        <Link href="/signup" className="nav-cta">Start Free Trial</Link>
      </nav>
    </header>
  );
}
