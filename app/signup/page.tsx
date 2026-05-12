"use client";
import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    company: "",
    phone: "",
    password: "",
    confirm_password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          company: form.company,
          phone: form.phone,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Registration failed. Please try again.");
      }

      setSuccess(json.message || "Account created! Check your email to verify your account.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)" }}>
        <div className="form-card" style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--navy-ink)", margin: "0 0 8px" }}>
            Account Created
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>{success}</p>
          <Link href="/login" className="btn btn-teal" style={{ display: "inline-flex", justifyContent: "center" }}>
            Sign In →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)", padding: "24px 0" }}>
      <div className="form-card" style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div className="brand-mark" style={{ margin: "0 auto 12px", width: 44, height: 44, fontSize: 16 }}>FS</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "var(--navy-ink)" }}>Create your account</h1>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>Start your 14-day free trial — no credit card required</p>
        </div>

        <form onSubmit={handleSignup}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">First name</label>
              <input
                className="inp"
                type="text"
                placeholder="Sipho"
                value={form.first_name}
                onChange={(e) => set("first_name", e.target.value)}
                required
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className="label">Last name</label>
              <input
                className="inp"
                type="text"
                placeholder="Dlamini"
                value={form.last_name}
                onChange={(e) => set("last_name", e.target.value)}
                autoComplete="family-name"
              />
            </div>
          </div>

          <label className="label">Work email</label>
          <input
            className="inp"
            type="email"
            placeholder="sipho@company.co.za"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            required
            autoComplete="email"
          />

          <label className="label">Company name</label>
          <input
            className="inp"
            type="text"
            placeholder="Dlamini & Associates"
            value={form.company}
            onChange={(e) => set("company", e.target.value)}
            autoComplete="organization"
          />

          <label className="label">Phone number</label>
          <input
            className="inp"
            type="tel"
            placeholder="+27 82 000 0000"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            autoComplete="tel"
          />

          <label className="label">Password</label>
          <input
            className="inp"
            type="password"
            placeholder="Min. 8 characters"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            required
            autoComplete="new-password"
          />

          <label className="label">Confirm password</label>
          <input
            className="inp"
            type="password"
            placeholder="Repeat password"
            value={form.confirm_password}
            onChange={(e) => set("confirm_password", e.target.value)}
            required
            autoComplete="new-password"
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
            {loading ? "Creating account…" : "Create Account →"}
          </button>

          <p style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
            By creating an account you agree to our{" "}
            <Link href="/terms" style={{ color: "var(--teal)" }}>Terms of Service</Link>
            {" and "}
            <Link href="/privacy" style={{ color: "var(--teal)" }}>Privacy Policy</Link>.
          </p>
        </form>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "var(--muted)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--teal)" }}>Sign in →</Link>
        </div>
      </div>
    </div>
  );
}
