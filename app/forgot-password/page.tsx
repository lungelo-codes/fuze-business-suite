"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Could not send reset email. Please try again.");
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)" }}>
        <div className="form-card" style={{ width: "100%", maxWidth: 400, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📧</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--navy-ink)", margin: "0 0 8px" }}>Check your email</h2>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>
            We sent a password reset link to <strong>{email}</strong>.
            Check your inbox and follow the instructions.
          </p>
          <Link href="/login" className="btn btn-teal" style={{ display: "inline-flex", justifyContent: "center" }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)" }}>
      <div className="form-card" style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div className="brand-mark" style={{ margin: "0 auto 12px", width: 44, height: 44, fontSize: 16 }}>FS</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "var(--navy-ink)" }}>Reset password</h1>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleReset}>
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
            {loading ? "Sending…" : "Send Reset Link →"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "var(--muted)" }}>
          <Link href="/login" style={{ color: "var(--teal)" }}>← Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}
