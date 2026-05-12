"use client";
import Link from "next/link";
import { useState } from "react";

export default function PublicHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="pub-header">
      <Link href="/" className="pub-brand">
        <div className="brand-mark" style={{ width: 30, height: 30, borderRadius: 7, background: "linear-gradient(135deg,#242048,#28a486)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>F</div>
        <span>Fuze</span>
      </Link>

      <nav className="pub-nav" style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Link href="/features">Features</Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/resources">Resources</Link>
        <Link href="/about">About</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/login" style={{ marginLeft: 8, padding: "7px 14px", border: "1px solid #E6E8EF", borderRadius: 8, fontWeight: 600, fontSize: 13 }}>Sign in</Link>
        <Link href="/signup" className="nav-cta" style={{ marginLeft: 4 }}>Start free →</Link>
      </nav>
    </header>
  );
}
