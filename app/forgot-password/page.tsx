"use client";
import Link from "next/link";
import { useState } from "react";
import PublicHeader from "@/components/PublicHeader";

type Step = "request" | "verify" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep]         = useState<Step>("request");
  const [email, setEmail]       = useState("");
  const [code, setCode]         = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  // ── Step 1: request OTP ──────────────────────────────────────────────────
  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed.");
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: verify OTP + set new password ───────────────────────────────
  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword: password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Reset failed.");
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="public-root premium-website auth-page">
      <PublicHeader />
      <main className="auth-shell">

        {/* Left story panel */}
        <section className="auth-story-card">
          <div className="auth-badge">Account recovery</div>
          <h1>Reset your password securely.</h1>
          <p>We will send a one-time code to your email address so you can set a new password.</p>
          <div className="auth-preview-stack">
            <div><b>Step 1</b><span>Enter your email address</span></div>
            <div><b>Step 2</b><span>Enter the code we send you</span></div>
            <div><b>Step 3</b><span>Choose a new password</span></div>
          </div>
        </section>

        {/* Right form panel */}
        <section className="auth-card">

          {/* ── DONE ── */}
          {step === "done" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20, textAlign: "center" }}>
              <div style={{ fontSize: 52 }}>✅</div>
              <div className="auth-card-head">
                <h2>Password updated</h2>
                <p>You can now sign in with your new password.</p>
              </div>
              <Link href="/login" className="modern-primary auth-submit" style={{ textAlign: "center", textDecoration: "none", display: "block", padding: "14px 0" }}>
                Go to Login →
              </Link>
            </div>
          )}

          {/* ── REQUEST STEP ── */}
          {step === "request" && (
            <>
              <div className="auth-card-head">
                <span className="suite-kicker">Forgot password</span>
                <h2>Let&apos;s get you back in</h2>
                <p>Enter the email address on your account and we&apos;ll send a reset code.</p>
              </div>
              <form onSubmit={requestCode} className="auth-form">
                <label>Email address</label>
                <input
                  type="email"
                  placeholder="jane@company.co.za"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  disabled={loading}
                />
                {error && <div className="auth-error">{error}</div>}
                <button className="modern-primary auth-submit" type="submit" disabled={loading}>
                  {loading ? "Sending code…" : "Send reset code →"}
                </button>
              </form>
              <div className="auth-footnote">
                Remembered it? <Link href="/login">Back to login</Link>
              </div>
            </>
          )}

          {/* ── VERIFY + NEW PASSWORD STEP ── */}
          {step === "verify" && (
            <>
              <div className="auth-card-head">
                <span className="suite-kicker">Check your email</span>
                <h2>Enter your reset code</h2>
                <p>
                  We sent a 6-digit code to <strong>{email}</strong>.
                  It expires in 15 minutes.
                </p>
              </div>
              <form onSubmit={resetPassword} className="auth-form">
                <label>6-digit code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  autoComplete="one-time-code"
                  required
                  disabled={loading}
                  style={{ letterSpacing: "0.3em", fontSize: 22, fontWeight: 900, textAlign: "center" }}
                />
                <label>New password</label>
                <input
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={loading}
                  minLength={8}
                />
                <label>Confirm password</label>
                <input
                  type="password"
                  placeholder="Repeat new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={loading}
                />
                {error && <div className="auth-error">{error}</div>}
                <button className="modern-primary auth-submit" type="submit" disabled={loading}>
                  {loading ? "Resetting…" : "Set new password →"}
                </button>
              </form>
              <div className="auth-footnote">
                Didn&apos;t receive the email?{" "}
                <button
                  onClick={() => { setStep("request"); setCode(""); setError(""); }}
                  style={{ background: "none", border: "none", color: "var(--demo-link, #28A486)", cursor: "pointer", padding: 0, fontWeight: 700, fontSize: "inherit" }}
                >
                  Try again
                </button>
              </div>
            </>
          )}

        </section>
      </main>
    </div>
  );
}
