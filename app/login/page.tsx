"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PublicHeader from "@/components/PublicHeader";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const tenantSite = search?.get("site") || "";
  const reason = search?.get("reason") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, site: tenantSite || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Login failed. Check your email and password.");
      router.push(json.redirect || "/portal");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Login failed. Check your email and password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="public-root premium-website auth-page">
      <PublicHeader />
      <main className="auth-shell">
        <section className="auth-story-card">
          <div className="auth-badge">Secure business workspace</div>
          <h1>Welcome back to your operating system.</h1>
          <p>Sign in to manage your customers, sales, invoices, documents, projects, HR and support from one modern portal.</p>
          <div className="auth-preview-stack">
            <div><b>Today</b><span>6 alerts, 11 tickets, 4 quotes waiting</span></div>
            <div><b>Finance</b><span>Invoices, VAT, payments and compliance</span></div>
            <div><b>CRM</b><span>Pipeline, leads, contacts and follow-ups</span></div>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-head">
            <span className="suite-kicker">Login</span>
            <h2>Access your portal</h2>
            <p>{tenantSite ? `Signing into ${tenantSite}` : "Use your Business Suite credentials."}</p>
          </div>

          {reason === "admin_required" && <div className="auth-alert">Admin access required. Please log in with a System Manager account.</div>}

          <form onSubmit={login} className="auth-form">
            <label>Email address</label>
            <input type="email" placeholder="jane@company.co.za" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" disabled={loading} required />
            <label>Password</label>
            <input type="password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" disabled={loading} required />
            <button className="modern-primary auth-submit" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in →"}</button>
          </form>

          {message && <div className="auth-error">{message}</div>}

          <div className="auth-footnote">
            New to Business Suite? <Link href="/signup">Start a free trial</Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
