"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const reason = search?.get("reason") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Login failed. Check your email and password.");
      }

      router.push(json.redirect || "/portal");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)" }}>
      <div className="form-card" style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div className="brand-mark" style={{ margin: "0 auto 12px", width: 44, height: 44, fontSize: 16 }}>FS</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "var(--navy-ink)" }}>Business Suite</h1>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>Sign in to your workspace</p>
        </div>

        {reason === "admin_required" && (
          <div style={{
            background: "#fff8e6",
            border: "1px solid #f0b429",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
            color: "#856404",
            marginBottom: 16,
          }}>
            Admin access required. Please log in with a System Manager account.
          </div>
        )}

        <form onSubmit={handleLogin}>
          <label className="label">Email address</label>
          <input
            className="inp"
            type="email"
            placeholder="you@company.co.za"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={loading}
          />
          <label className="label">Password</label>
          <input
            className="inp"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={loading}
          />

          {error && (
            <div style={{
              background: "#fff0f0",
              border: "1px solid #e74c3c",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: "#e74c3c",
              marginBottom: 12,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-teal"
            style={{ width: "100%", justifyContent: "center", padding: "10px", marginTop: 8, fontSize: 14 }}
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "var(--muted)" }}>
          <Link href="/forgot-password" style={{ color: "var(--teal)" }}>Forgot password?</Link>
          {" · "}
          <Link href="/signup" style={{ color: "var(--teal)" }}>Create account</Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
