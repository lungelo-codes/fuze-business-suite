"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PublicHeader from "@/components/PublicHeader";
import { ALL_MODULES, PLANS, getModulesForPlan, MODULE_COOKIE, PLAN_COOKIE, COMPANY_COOKIE } from "@/lib/modules";

type Step = 1 | 2 | 3 | 4 | 5;

interface FormData {
  full_name: string;
  company_name: string;
  email: string;
  phone: string;
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
  const [error, setError] = useState("");
  const [siteUrl, setSiteUrl] = useState("");

  const [form, setForm] = useState<FormData>({
    full_name: "",
    company_name: "",
    email: "",
    phone: "",
    preferred_site_name: "",
    password: "",
    confirm_password: "",
    plan: params?.get("plan") || "Starter",
    modules: getModulesForPlan(params?.get("plan") || "Starter"),
  });

  useEffect(() => {
    const planParam = params?.get("plan");
    if (planParam) {
      setForm((f) => ({ ...f, plan: planParam, modules: getModulesForPlan(planParam) }));
    }
  }, [params]);

  function update(key: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "plan") {
      setForm((f) => ({ ...f, plan: value, modules: getModulesForPlan(value) }));
    }
    if (key === "company_name") {
      const slug = value.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      setForm((f) => ({ ...f, preferred_site_name: slug }));
    }
  }

  function toggleModule(id: string) {
    const planMods = getModulesForPlan(form.plan);
    if (!planMods.includes(id)) return;
    setForm((f) => ({
      ...f,
      modules: f.modules.includes(id) ? f.modules.filter((m) => m !== id) : [...f.modules, id],
    }));
  }

  function validateStep(): string {
    if (step === 1) {
      if (!form.full_name.trim()) return "Full name is required";
      if (!form.company_name.trim()) return "Company name is required";
      if (!form.email.includes("@")) return "Valid email is required";
      if (!form.phone.trim()) return "Phone number is required";
    }
    if (step === 3) {
      if (form.modules.length === 0) return "Select at least one module";
    }
    if (step === 4) {
      if (!form.password || form.password.length < 8) return "Password must be at least 8 characters";
      if (form.password !== form.confirm_password) return "Passwords do not match";
    }
    return "";
  }

  function next() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError("");
    setStep((s) => (s + 1) as Step);
  }

  function back() {
    setError("");
    setStep((s) => (s - 1) as Step);
  }

  async function submit() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name,
          company_name: form.company_name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          preferred_site_name: form.preferred_site_name,
          plan: form.plan,
          modules: form.modules,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Signup failed");

      // Persist selections in cookies so the portal can read them
      setCookie(MODULE_COOKIE, JSON.stringify(form.modules));
      setCookie(PLAN_COOKIE, form.plan);
      setCookie(COMPANY_COOKIE, form.company_name);

      if (json.site_url) setSiteUrl(json.site_url);
      setStep(5);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  const planDef = PLANS.find((p) => p.id === form.plan);
  const allowedMods = getModulesForPlan(form.plan);

  const GROUPS = [
    { label: "Finance", ids: ["invoices", "quotes", "payments", "customers", "compliance"] },
    { label: "Operations", ids: ["suppliers", "items", "projects", "tasks"] },
    { label: "People", ids: ["employees", "payroll", "leave"] },
    { label: "Service", ids: ["support", "appointments", "chat"] },
  ];

  return (
    <div className="public-root">
      <PublicHeader />

      {loading && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(20,18,46,.85)", zIndex: 999,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20
        }}>
          <div style={{
            width: 64, height: 64, border: "4px solid rgba(255,255,255,.2)",
            borderTop: "4px solid #28a486", borderRadius: "50%",
            animation: "spin 1s linear infinite"
          }} />
          <div style={{ color: "#fff", fontSize: 20, fontWeight: 800, letterSpacing: "-.3px" }}>
            Creating your business system…
          </div>
          <div style={{ color: "rgba(255,255,255,.6)", fontSize: 14 }}>
            Setting up your ERPNext instance. This may take a moment.
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <div className="signup-wrap">
        {step < 5 && (
          <div className="signup-steps">
            {(["Company Info", "Choose Plan", "Select Modules", "Set Password"] as const).map((label, i) => (
              <div key={label} className={`signup-step ${step === i + 1 ? "active" : step > i + 1 ? "done" : ""}`}>
                <div className="step-circle">{step > i + 1 ? "✓" : i + 1}</div>
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="signup-card">
          {/* Step 1 — Company Info */}
          {step === 1 && (
            <>
              <h2 className="signup-heading">Tell us about your business</h2>
              <p className="signup-sub">We will use this to set up your Fuze account and ERPNext instance.</p>
              <div className="field-row">
                <div className="field">
                  <label className="label">Full Name *</label>
                  <input className="inp" placeholder="Jane Smith" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} />
                </div>
                <div className="field">
                  <label className="label">Company Name *</label>
                  <input className="inp" placeholder="Acme (Pty) Ltd" value={form.company_name} onChange={(e) => update("company_name", e.target.value)} />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label className="label">Email Address *</label>
                  <input className="inp" type="email" placeholder="jane@acme.co.za" value={form.email} onChange={(e) => update("email", e.target.value)} />
                </div>
                <div className="field">
                  <label className="label">Phone Number *</label>
                  <input className="inp" placeholder="+27 82 000 0000" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label className="label">Preferred Site Name</label>
                <div className="site-name-wrap">
                  <input className="inp" placeholder="acme" value={form.preferred_site_name} onChange={(e) => update("preferred_site_name", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
                  <span className="site-suffix">.fuzedigital.co.za</span>
                </div>
                <div className="field-hint">This will be used to generate your SaaS tenant URL</div>
              </div>
            </>
          )}

          {/* Step 2 — Plan */}
          {step === 2 && (
            <>
              <h2 className="signup-heading">Choose your plan</h2>
              <p className="signup-sub">You can upgrade or change plans at any time.</p>
              <div className="plan-select-grid">
                {PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    className={`plan-option ${form.plan === plan.id ? "plan-selected" : ""} ${plan.highlight ? "plan-featured" : ""}`}
                    onClick={() => update("plan", plan.id)}
                  >
                    {plan.badge && <div className="plan-badge">{plan.badge}</div>}
                    <div className="plan-name">{plan.label}</div>
                    <div className="plan-price-sm">
                      {plan.price > 0 ? `R${plan.price.toLocaleString()}/mo` : plan.id === "Starter" ? "Free trial" : "Custom"}
                    </div>
                    <div className="plan-mod-count">{plan.modules.length} modules included</div>
                    <div className="plan-radio">{form.plan === plan.id ? "●" : "○"}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Step 3 — Modules */}
          {step === 3 && (
            <>
              <h2 className="signup-heading">Select your modules</h2>
              <p className="signup-sub">
                Your <strong>{form.plan}</strong> plan includes {allowedMods.length} modules. Select the ones you want to activate.
              </p>
              <div className="module-select-groups">
                {GROUPS.map((g) => {
                  const mods = ALL_MODULES.filter((m) => g.ids.includes(m.id));
                  return (
                    <div key={g.label}>
                      <div className="module-select-label">{g.label}</div>
                      <div className="module-select-grid">
                        {mods.map((m) => {
                          const available = allowedMods.includes(m.id);
                          const selected = form.modules.includes(m.id);
                          return (
                            <div
                              key={m.id}
                              className={`module-toggle ${selected ? "mod-on" : ""} ${!available ? "mod-locked" : ""}`}
                              onClick={() => available && toggleModule(m.id)}
                            >
                              <span className="mod-icon">{m.icon}</span>
                              <div className="mod-info">
                                <span className="mod-label">{m.label}</span>
                                {!available && <span className="mod-upgrade">Upgrade to unlock</span>}
                              </div>
                              <span className="mod-check">{selected ? "✓" : !available ? "🔒" : "+"}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="modules-selected-count">
                {form.modules.length} module{form.modules.length !== 1 ? "s" : ""} selected
              </div>
            </>
          )}

          {/* Step 4 — Password */}
          {step === 4 && (
            <>
              <h2 className="signup-heading">Create your password</h2>
              <p className="signup-sub">This will be your Fuze portal login. Minimum 8 characters.</p>
              <div className="field">
                <label className="label">Password *</label>
                <input className="inp" type="password" placeholder="At least 8 characters" value={form.password} onChange={(e) => update("password", e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Confirm Password *</label>
                <input className="inp" type="password" placeholder="Repeat password" value={form.confirm_password} onChange={(e) => update("confirm_password", e.target.value)} />
              </div>
              <div className="review-box">
                <div className="review-title">Review your setup</div>
                <div className="review-row"><span>Company</span><strong>{form.company_name}</strong></div>
                <div className="review-row"><span>Email</span><strong>{form.email}</strong></div>
                <div className="review-row"><span>Plan</span><strong>{form.plan}</strong></div>
                <div className="review-row"><span>Modules</span><strong>{form.modules.length} selected</strong></div>
                <div className="review-row"><span>Site</span><strong>{form.preferred_site_name}.fuze.co.za</strong></div>
              </div>
            </>
          )}

          {/* Step 5 — Success */}
          {step === 5 && (
            <div className="success-wrap">
              <div className="success-icon">🚀</div>
              <h2 className="signup-heading">Your account is being prepared!</h2>
              <p className="signup-sub">
                Welcome to Fuze, <strong>{form.full_name}</strong>. Your ERPNext instance for <strong>{form.company_name}</strong> is being provisioned.
              </p>
              {siteUrl && (
                <div className="site-url-box">
                  <div className="site-url-label">Your ERPNext site</div>
                  <a href={siteUrl} target="_blank" rel="noreferrer" className="site-url-link">{siteUrl}</a>
                </div>
              )}
              <div className="success-modules">
                <div className="sm-title">Modules activated</div>
                <div className="sm-pills">
                  {form.modules.map((id) => {
                    const m = ALL_MODULES.find((mod) => mod.id === id);
                    return m ? <span key={id} className="sm-pill">{m.icon} {m.label}</span> : null;
                  })}
                </div>
              </div>
              <div className="success-note">
                Login details will be emailed to <strong>{form.email}</strong> once your instance is ready.
              </div>
              <button className="btn btn-primary" style={{ width: "100%", marginTop: 16 }} onClick={() => router.push("/login")}>
                Go to Login
              </button>
            </div>
          )}

          {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}

          {step < 5 && (
            <div className="signup-nav">
              {step > 1 && <button className="btn" onClick={back}>← Back</button>}
              <div style={{ flex: 1 }} />
              {step < 4
                ? <button className="btn btn-primary" onClick={next}>Continue →</button>
                : <button className="btn btn-primary" onClick={submit} disabled={loading}>{loading ? "Creating your business system…" : "Create Account →"}</button>
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
