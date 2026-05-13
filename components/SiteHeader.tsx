"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ALL_MODULES } from "@/lib/appModules";

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

function MegaDropdown({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div className="mega-trigger" ref={ref}>
      <button
        type="button"
        className="mega-nav-button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        {label} {open ? "▴" : "▾"}
      </button>
      {open && (
        <div className="mega-menu" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function PublicHeader() {
  return (
    <header className="pub-header public-glass-header">
      <Link href="/" className="pub-brand" style={{ textDecoration: "none" }}>
        <div className="brand-mark public-brand-mark">BS</div>
        <span>Business Suite</span>
      </Link>

      <nav className="pub-nav public-mega-nav">
        <MegaDropdown label="Platform">
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
        </MegaDropdown>

        <Link href="/features">Features</Link>
        <Link href="/pricing">Pricing</Link>

        <MegaDropdown label="Company">
          <div style={{ padding: "8px", minWidth: "160px" }}>
            {companyLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{ display: "block", padding: "10px 14px", borderRadius: "12px", fontWeight: 700, color: "#15132e" }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </MegaDropdown>

        <Link href="/login">Login</Link>
        <Link href="/signup" className="nav-cta">Start Free Trial</Link>
      </nav>
    </header>
  );
}
