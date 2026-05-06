"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";

const CONTACT_METHODS = [
  {
    icon: "📧",
    title: "Email Support",
    value: "support@fuzedigital.co.za",
    href: "mailto:support@fuzedigital.co.za",
    desc: "For billing, technical, and general enquiries.",
  },
  {
    icon: "🌐",
    title: "Website",
    value: "fuzedigital.co.za",
    href: "https://fuzedigital.co.za",
    desc: "Visit our main website for more information.",
  },
  {
    icon: "🎧",
    title: "Portal Support",
    value: "Submit a ticket",
    href: "/login",
    desc: "Already a customer? Log in and open a support ticket.",
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", company: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState("");

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setError("Please fill in your name, email, and message.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/support/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: form.subject || `Contact form: ${form.name}`,
          description: `Name: ${form.name}\nEmail: ${form.email}\nCompany: ${form.company}\n\n${form.message}`,
          raised_by: form.email,
          priority: "Medium",
          issue_type: "General",
        }),
      });
      if (res.ok) {
        setStatus("success");
        setForm({ name: "", email: "", company: "", subject: "", message: "" });
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not send your message. Please try again.");
        setStatus("error");
      }
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="public-root">
      <PublicHeader />

      {/* Hero */}
      <section className="section" style={{ paddingTop: 72, paddingBottom: 48 }}>
        <div className="container" style={{ textAlign: "center" }}>
          <div className="section-label">Contact</div>
          <h1 className="section-title" style={{ fontSize: "clamp(28px, 4vw, 48px)", marginBottom: 16 }}>
            Get in touch
          </h1>
          <p className="section-sub" style={{ margin: "0 auto", maxWidth: 480 }}>
            Have a question, need help, or want to discuss enterprise pricing? We&apos;re here to help.
          </p>
        </div>
      </section>

      {/* Contact methods */}
      <section className="section section-alt" style={{ paddingTop: 0 }}>
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 18,
              marginBottom: 48,
            }}
          >
            {CONTACT_METHODS.map((m) => (
              <div
                key={m.title}
                style={{
                  background: "#fff",
                  border: "1px solid var(--line)",
                  borderRadius: 14,
                  padding: "22px 24px",
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 12 }}>{m.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--navy-ink)", marginBottom: 4 }}>
                  {m.title}
                </div>
                <a
                  href={m.href}
                  style={{ color: "var(--teal)", fontWeight: 700, fontSize: 14, display: "block", marginBottom: 6 }}
                >
                  {m.value}
                </a>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>{m.desc}</p>
              </div>
            ))}
          </div>

          {/* Contact form */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 40,
              alignItems: "start",
            }}
          >
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--navy-ink)", marginBottom: 8 }}>
                Send us a message
              </h2>
              <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 28, lineHeight: 1.6 }}>
                Fill in the form and we&apos;ll get back to you within one business day. For urgent issues, please
                email us directly.
              </p>

              {status === "success" ? (
                <div
                  style={{
                    background: "var(--ok-bg)",
                    border: "1px solid var(--ok)",
                    borderRadius: 12,
                    padding: "20px 24px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
                  <div style={{ fontWeight: 700, color: "var(--ok)", fontSize: 16, marginBottom: 8 }}>
                    Message sent!
                  </div>
                  <p style={{ fontSize: 14, color: "var(--muted)", margin: "0 0 16px" }}>
                    Thank you for reaching out. We&apos;ll be in touch shortly.
                  </p>
                  <button
                    className="btn"
                    onClick={() => setStatus("idle")}
                    style={{ fontSize: 13 }}
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={submit}>
                  <div className="field-row">
                    <div className="field">
                      <label className="label">Full Name *</label>
                      <input
                        className="inp"
                        type="text"
                        placeholder="Jane Smith"
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="field">
                      <label className="label">Email Address *</label>
                      <input
                        className="inp"
                        type="email"
                        placeholder="jane@company.co.za"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label className="label">Company Name</label>
                    <input
                      className="inp"
                      type="text"
                      placeholder="Acme (Pty) Ltd"
                      value={form.company}
                      onChange={(e) => update("company", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="field">
                    <label className="label">Subject</label>
                    <input
                      className="inp"
                      type="text"
                      placeholder="How can we help?"
                      value={form.subject}
                      onChange={(e) => update("subject", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="field">
                    <label className="label">Message *</label>
                    <textarea
                      className="inp"
                      placeholder="Tell us more about your enquiry…"
                      rows={5}
                      value={form.message}
                      onChange={(e) => update("message", e.target.value)}
                      disabled={loading}
                      style={{ resize: "vertical" }}
                    />
                  </div>
                  {error && (
                    <div className="error" style={{ marginBottom: 12 }}>{error}</div>
                  )}
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={loading}
                    style={{ width: "100%", padding: "12px 0" }}
                  >
                    {loading ? "Sending…" : "Send Message →"}
                  </button>
                </form>
              )}
            </div>

            {/* Side info */}
            <div>
              <div
                style={{
                  background: "linear-gradient(135deg, var(--navy) 0%, #2A3B8F 60%, var(--teal) 140%)",
                  borderRadius: 18,
                  padding: "36px 32px",
                  color: "#fff",
                  marginBottom: 20,
                }}
              >
                <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 12px", color: "#fff" }}>
                  Enterprise enquiries
                </h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.7, margin: "0 0 20px" }}>
                  Need a custom solution for a large organisation? We offer tailored ERPNext deployments,
                  custom module development, and dedicated support contracts.
                </p>
                <a
                  href="mailto:enterprise@fuzedigital.co.za"
                  style={{
                    display: "inline-block",
                    background: "rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    color: "#fff",
                    padding: "10px 18px",
                    borderRadius: 9,
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  enterprise@fuzedigital.co.za
                </a>
              </div>

              <div
                style={{
                  background: "#fff",
                  border: "1px solid var(--line)",
                  borderRadius: 14,
                  padding: "24px",
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--navy-ink)", margin: "0 0 12px" }}>
                  Already a customer?
                </h3>
                <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 16px" }}>
                  Log in to your portal and submit a support ticket for faster response times and ticket tracking.
                </p>
                <Link
                  href="/login"
                  className="btn btn-primary"
                  style={{ display: "block", textAlign: "center", fontSize: 13 }}
                >
                  Log in to portal →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <span className="brand-mark-sm">FB</span>
            <span className="footer-name">Fuze Business Suite</span>
          </div>
          <div className="footer-links">
            <Link href="/features">Features</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/login">Login</Link>
          </div>
          <div className="footer-copy">© {new Date().getFullYear()} Fuze · support@fuze.co.za</div>
        </div>
      </footer>
    </div>
  );
}
