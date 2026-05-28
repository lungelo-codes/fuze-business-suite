"use client";

import Link from "next/link";
import { useState } from "react";

const navItems = [
  { label: "Platform", href: "/features" },
  { label: "Solutions", href: "/features#solutions" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Resources", href: "/about" },
  { label: "Company", href: "/contact" },
];

export default function PublicHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fg-public-header">
      <Link href="/" className="fg-public-brand" aria-label="Fuze Business Suite home">
        <span className="fg-public-mark"><i /></span>
        <span><b>Fuze</b><small>Business Suite</small></span>
      </Link>
      <button className="fg-mobile-toggle" onClick={() => setOpen((v) => !v)} aria-label="Toggle navigation">☰</button>
      <nav className={open ? "open" : ""}>
        {navItems.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        <Link href="/login" className="fg-signin">Sign in</Link>
        <Link href="/contact" className="fg-demo">Book Demo</Link>
        <Link href="/signup" className="fg-start">Get Started Free</Link>
      </nav>
    </header>
  );
}
