"use client";
import Link from "next/link";
import { useState } from "react";
import PublicHeader from "@/components/PublicHeader";

const contactOptions = [
  ["Sales", "Choose a plan, understand modules and book a walkthrough."],
  ["Support", "Get help with onboarding, documents, billing or portal access."],
  ["Partnerships", "Discuss white-label, reseller or vertical SaaS opportunities."],
];

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send.");
      setResult({ ok: true, msg: json.message || "Message sent! We will be in touch within one business day." });
      setName(""); setEmail(""); setMessage("");
    } catch (err) {
      setResult({ ok: false, msg: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="public-root premium-website">
      <PublicHeader />
      <section className="site-hero narrow">
        <span className="suite-kicker">Contact</span>
        <h1>Talk to Fuze Digital about your business suite.</h1>
        <p>Whether you need a demo, onboarding help or a custom SaaS module, this is where the conversation starts.</p>
      </section>
      <section className="site-section contact-grid">
        <div className="contact-card-main">
          <h2>Tell us what you want to build.</h2>
          <p>We will help you choose modules, understand setup, and connect the system to your business process.</p>
          <div className="contact-lines">
            <a href="mailto:updates@fuzedigital.co.za">updates@fuzedigital.co.za</a>
            <a href="tel:+27747894145">074 789 4145</a>
          </div>
        </div>
        <form className="contact-form-card" onSubmit={handleSubmit}>
          <label>
            Name
            <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required disabled={loading} />
          </label>
          <label>
            Email
            <input type="email" placeholder="you@company.co.za" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
          </label>
          <label>
            Business need
            <textarea placeholder="Tell us what modules you need" value={message} onChange={(e) => setMessage(e.target.value)} required disabled={loading} />
          </label>
          {result && (
            <div className={result.ok ? "auth-alert" : "auth-error"} style={{ marginBottom: 8 }}>
              {result.msg}
            </div>
          )}
          <button className="modern-primary" type="submit" disabled={loading || !!result?.ok}>
            {loading ? "Sending…" : result?.ok ? "Message sent ✓" : "Send message"}
          </button>
        </form>
      </section>
      <section className="site-section value-grid">
        {contactOptions.map(([title, body]) => (
          <div key={title}>
            <h3>{title}</h3>
            <p>{body}</p>
            <Link href="/signup">Start here →</Link>
          </div>
        ))}
      </section>
    </div>
  );
}
