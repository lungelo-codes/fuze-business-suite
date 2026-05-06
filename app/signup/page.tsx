"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PublicHeader from "@/components/PublicHeader";
import { ALL_MODULES, PLANS, getModulesForPlan, MODULE_COOKIE, PLAN_COOKIE, COMPANY_COOKIE } from "@/lib/modules";

type Step = 1 | 2 | 3 | 4 | 5;

interface FormData {
  full_name: string;
  company_name: string;
  email: string;
  phone: string;
  verification_code: string;
  preferred_site_name: string;
  password: string;
  confirm_password: string;
  plan: string;
  modules: string[];
}

function setCookie(name: string, value: string, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/`;
}

function SignupForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const initialPlan = params?.get("plan") || "Starter";
  const [form, setForm] = useState<FormData>({
    full_name: "",
    company_name: "",
    email: "",
    phone: "",
    verification_code: "",
    preferred_site_name: "",
    password: "",
    confirm_password: "",
    plan: initialPlan,
    modules: getModulesForPlan(initialPlan),
  });

  useEffect(() => {
    const planParam = params?.get("plan");
    if (planParam) setForm((f) => ({ ...f, plan: planParam, modules: getModulesForPlan(planParam) }));
  }, [params]);

  function update(key: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "plan") setForm((f) => ({ ...f, plan: value, modules: getModulesForPlan(value) }));
    if (key === "company_name") {
      const slug = value.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      setForm((f) => ({ ...f, preferred_site_name: slug }));
    }
  }

  function toggleModule(id: string) {
    const planMods = getModulesForPlan(form.plan);
    if (!planMods.includes(id)) return;
    setForm((f) => ({ ...f, modules: f.modules.includes(id) ? f.modules.filter((m) => m !== id) : [...f.modules, id] }));
  }

  function validateStep(targetStep = step): string {
    if (targetStep === 1) {
      if (!form.full_name.trim()) return "Full name is required";
      if (!form.company_name.trim()) return "Company name is required";
      if (!form.email.includes("@")) return "Valid email is required";
      if (!form.phone.trim()) return "Phone number is required";
    }
    if (targetStep === 2) {
      if (!form.verification_code.trim() || form.verification_code.trim().length < 6) return "Enter the 6-digit verification code sent to your email";
    }
    if (targetStep === 3) {
      if (!form.plan) return "Choose a plan";
      if (form.modules.length === 0) return "Select at least one module";
    }
    if (targetStep === 4) {
      if (!form.password || form.password.length < 8) return "Password must be at least 8 characters";
      if (form.password !== form.confirm_password) return "Passwords do not match";
    }
    return "";
  }

  async function sendCode() {
    const err = validateStep(1);
    if (err) { setError(err); return; }
    setError("");
    setNotice("");
    setSendingCode(true);
    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, full_name: form.full_name, company_name: form.company_name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not send verification code");
      setNotice("Verification code sent. Check your inbox or spam folder.");
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send verification code");
    } finally {
      setSendingCode(false);
    }
  }

  function next() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError("");
    setNotice("");
    setStep((s) => (s + 1) as Step);
  }

  function back() {
    setError("");
    setNotice("");
    setStep((s) => (s - 1) as Step);
  }

  async function submit() {
    const err = validateStep(4);
    if (err) { setError(err); return; }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Signup failed");
      setCookie(MODULE_COOKIE, JSON.stringify(form.modules));
      setCookie(PLAN_COOKIE, form.plan);
      setCookie(COMPANY_COOKIE, form.company_name);
      if (json.site_url) {
        setCookie("fuze_erp_url", json.site_url);
        setSiteUrl(json.site_url);
      }
      setUserEmail(json.email || form.email);
      setStep(5);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  const planDef = PLANS.find((p) => p.id === form.plan);
  const allowedMods = getModulesForPlan(form.plan);
  const selectedModules = useMemo(() => ALL_MODULES.filter((m) => form.modules.includes(m.id)), [form.modules]);
  const GROUPS = [
    { label: "Finance", ids: ["invoices", "quotes", "payments", "customers", "compliance"] },
    { label: "Operations", ids: ["suppliers", "items", "projects", "tasks", "purchase-orders"] },
    { label: "People", ids: ["employees", "payroll", "leave", "attendance"] },
    { label: "Service", ids: ["support", "appointments", "chat"] },
  ];

  return (
    <div className="public-root">
      <PublicHeader />

      {loading && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,18,46,.88)", zIndex: 999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
          <div style={{ width: 64, height: 64, border: "4px solid rgba(255,255,255,.2)", borderTop: "4px solid #28a486", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <div style={{ color: "#fff", fontSize: 20, fontWeight: 800 }}>Creating your SaaS workspace…</div>
          <div style={{ color: "rgba(255,255,255,.7)", fontSize: 14 }}>Provisioning ERPNext, users, modules, and tenant settings.</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <div className="signup-wrap">
        {step < 5 && (
          <div className="signup-steps">
            {["Company", "Verify Email", "Plan & Modules", "Password"].map((label, i) => (
              <div key={label} className={`signup-step ${step === i + 1 ? "active" : step > i + 1 ? "done" : ""}`}>
                <div className="step-circle">{step > i + 1 ? "✓" : i + 1}</div><span>{label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="signup-card">
          {step === 1 && (
            <>
              <h2 className="signup-heading">Create your SaaS workspace</h2>
              <p className="signup-sub">We verify your email before provisioning your ERPNext tenant.</p>
              <div className="field-row">
                <div className="field"><label className="label">Full Name *</label><input className="inp" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} placeholder="Jane Smith" /></div>
                <div className="field"><label className="label">Company Name *</label><input className="inp" value={form.company_name} onChange={(e) => update("company_name", e.target.value)} placeholder="Acme (Pty) Ltd" /></div>
              </div>
              <div className="field-row">
                <div className="field"><label className="label">Email Address *</label><input className="inp" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="jane@acme.co.za" /></div>
                <div className="field"><label className="label">Phone Number *</label><input className="inp" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="074 789 4145" /></div>
              </div>
              <div className="field"><label className="label">Workspace URL Preview</label><div className="site-name-wrap"><input className="inp" value={form.preferred_site_name} onChange={(e) => update("preferred_site_name", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} /><span className="site-suffix">.fuzedigital.co.za</span></div></div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="signup-heading">Verify your email</h2>
              <p className="signup-sub">Enter the 6-digit code sent to <strong>{form.email}</strong>.</p>
              <div className="field"><label className="label">Verification Code *</label><input className="inp" inputMode="numeric" maxLength={6} value={form.verification_code} onChange={(e) => update("verification_code", e.target.value.replace(/\D/g, ""))} placeholder="123456" style={{ fontSize: 24, letterSpacing: 8, textAlign: "center", fontWeight: 800 }} /></div>
              <button className="btn" onClick={sendCode} disabled={sendingCode}>{sendingCode ? "Sending…" : "Resend code"}</button>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="signup-heading">Choose plan and modules</h2>
              <p className="signup-sub">Only modules included in the selected plan can be activated.</p>
              <div className="plan-select-grid">
                {PLANS.map((plan) => (
                  <div key={plan.id} className={`plan-option ${form.plan === plan.id ? "plan-selected" : ""} ${plan.highlight ? "plan-featured" : ""}`} onClick={() => update("plan", plan.id)}>
                    {plan.badge && <div className="plan-badge">{plan.badge}</div>}
                    <div className="plan-name">{plan.label}</div>
                    <div className="plan-price-sm">{plan.price > 0 ? `R${plan.price.toLocaleString()}/mo` : plan.id === "Starter" ? "Free trial" : "Custom"}</div>
                    <div className="plan-mod-count">{plan.modules.length} modules included</div>
                    <div className="plan-radio">{form.plan === plan.id ? "●" : "○"}</div>
                  </div>
                ))}
              </div>
              <div className="module-groups">
                {GROUPS.map((group) => (
                  <div key={group.label} className="module-group">
                    <h4>{group.label}</h4>
                    <div className="module-select-grid">
                      {ALL_MODULES.filter((m) => group.ids.includes(m.id)).map((m) => {
                        const available = allowedMods.includes(m.id);
                        const selected = form.modules.includes(m.id);
                        return <button key={m.id} type="button" className={`module-option ${selected ? "selected" : ""} ${!available ? "disabled" : ""}`} onClick={() => toggleModule(m.id)} disabled={!available}><span>{selected ? "✓" : available ? "+" : "🔒"}</span><div><strong>{m.label}</strong><small>{available ? "Included" : "Upgrade required"}</small></div></button>;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="signup-heading">Set your login password</h2>
              <p className="signup-sub">Use this with your verified email to log into your tenant portal.</p>
              <div className="field-row">
                <div className="field"><label className="label">Password *</label><input className="inp" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Minimum 8 characters" /></div>
                <div className="field"><label className="label">Confirm Password *</label><input className="inp" type="password" value={form.confirm_password} onChange={(e) => update("confirm_password", e.target.value)} placeholder="Repeat password" /></div>
              </div>
              <div className="card" style={{ padding: 16, background: "var(--bg)", marginTop: 14 }}>
                <strong>Summary</strong>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>{form.company_name} · {planDef?.label} · {selectedModules.length} modules</div>
              </div>
            </>
          )}

          {step === 5 && (
            <div style={{ textAlign: "center" }}>
              <div className="brand-mark" style={{ margin: "0 auto 16px", width: 58, height: 58, borderRadius: 18 }}>✓</div>
              <h2 className="signup-heading">Your SaaS workspace is ready</h2>
              <p className="signup-sub">We created your ERPNext tenant and user account for <strong>{userEmail}</strong>.</p>
              <div className="card" style={{ padding: 18, textAlign: "left", marginTop: 18 }}>
                <div className="label">Workspace URL</div>
                <a href={siteUrl} target="_blank" rel="noreferrer" style={{ color: "var(--teal)", fontWeight: 800 }}>{siteUrl}</a>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
                <button className="btn btn-primary" onClick={() => router.push(`/login?site_url=${encodeURIComponent(siteUrl)}&email=${encodeURIComponent(userEmail)}`)}>Login to Portal</button>
                <a className="btn" href={siteUrl} target="_blank" rel="noreferrer">Open Tenant ↗</a>
              </div>
            </div>
          )}

          {error && <div className="error" style={{ marginTop: 14 }}>{error}</div>}
          {notice && <div className="alert alert-info" style={{ marginTop: 14 }}>{notice}</div>}

          {step < 5 && (
            <div className="signup-actions">
              {step > 1 ? <button className="btn" onClick={back} disabled={loading || sendingCode}>← Back</button> : <span />}
              {step === 1 && <button className="btn btn-primary" onClick={sendCode} disabled={sendingCode}>{sendingCode ? "Sending code…" : "Send verification code"}</button>}
              {step === 2 && <button className="btn btn-primary" onClick={next}>Verify & Continue</button>}
              {step === 3 && <button className="btn btn-primary" onClick={next}>Continue</button>}
              {step === 4 && <button className="btn btn-primary" onClick={submit} disabled={loading}>{loading ? "Creating…" : "Create SaaS Workspace"}</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return <Suspense><SignupForm /></Suspense>;
}
