"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import PublicHeader from "@/components/PublicHeader";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [siteUrl, setSiteUrl] = useState(process.env.NEXT_PUBLIC_ERPNEXT_URL || "https://business-suite.fuzedigital.co.za");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const reason = params?.get("reason");

  useEffect(() => {
    const url = params?.get("site_url");
    const mail = params?.get("email");
    if (url) setSiteUrl(url);
    if (mail) setEmail(mail);
  }, [params]);

  async function login() {
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, site_url: siteUrl }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error || "Login failed");
        return;
      }
      router.push(json.role === "admin" ? "/admin" : "/portal");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="public-root">
      <PublicHeader />
      <div className="signup-wrap" style={{ maxWidth: 520 }}>
        <div className="signup-card">
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div className="brand-mark" style={{ margin: "0 auto 12px", width: 44, height: 44, borderRadius: 12, fontSize: 18 }}>FB</div>
            <h1 className="signup-heading" style={{ marginBottom: 6 }}>Welcome back</h1>
            <p className="signup-sub" style={{ margin: 0 }}>Sign in to your tenant portal or admin dashboard</p>
          </div>

          {reason === "admin_required" && (
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>Admin access required. Please log in with an admin account.</div>
          )}

          <label className="label">Tenant / Backend URL</label>
          <input className="inp" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://yourcompany.fuzedigital.co.za" />
          <div className="field-hint" style={{ marginBottom: 12 }}>For Fuze admin, use https://business-suite.fuzedigital.co.za. For customers, use their tenant URL.</div>

          <label className="label">Email Address</label>
          <input className="inp" type="email" placeholder="jane@acme.co.za" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} />

          <label className="label">Password</label>
          <input className="inp" type="password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} />

          <button className="btn btn-primary" style={{ width: "100%", padding: "11px 0", marginTop: 4 }} onClick={login} disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>

          {message && <div className="error" style={{ marginTop: 10 }}>{message}</div>}

          <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--muted)" }}>
            Don&apos;t have an account? <Link href="/signup" style={{ color: "var(--teal)", fontWeight: 700 }}>Start free trial →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
