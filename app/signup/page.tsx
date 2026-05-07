"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PublicHeader from "@/components/PublicHeader";
import {
  ALL_MODULES,
  PLANS,
  getModulesForPlan,
  calculateSubscriptionTotal,
  MODULE_COOKIE,
  PLAN_COOKIE,
  COMPANY_COOKIE,
} from "@/lib/modules";

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

const WAIT_SECONDS = 300; // 5 minutes shown to the customer

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const PROGRESS_STEPS = [
  { label: "Creating your database", doneAfter: 270 },
  { label: "Installing ERPNext modules", doneAfter: 180 },
  { label: "Configuring your business suite", doneAfter: 60 },
  { label: "Sending your login details by email", doneAfter: 0 },
];

function SignupForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [tenantId, setTenantId] = useState("");

  // ── Provisioning wait state ──────────────────────────────────────────────
  const [siteReady, setSiteReady] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WAIT_SECONDS);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // ─────────────────────────────────────────────────────────────────────────

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

  // ── Start countdown + polling once we reach step 5 ──────────────────────
  useEffect(() => {
    if (step !== 5 || siteReady) return;

    // Countdown
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);

    // Poll tenant status every 15 seconds
    pollRef.current = setInterval(async () => {
      if (!tenantId) return;
      try {
        const res = await fetch(`/api/saas/status?tenant=${encodeURIComponent(tenantId)}`);
        if (res.ok) {
          const json = (await res.json()) as { ready?: boolean };
          if (json.ready) {
            setSiteReady(true);
            clearInterval(pollRef.current!);
            clearInterval(timerRef.current!);
          }
        }
      } catch {
        // Still provisioning — ignore
      }
    }, 15000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, tenantId, siteReady]);
  // ─────────────────────────────────────────────────────────────────────────

  function update(key: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "plan") {
      setForm((f) => ({ ...f, plan: value, modules: getModulesForPlan(value) }));
    }
    if (key === "company_name") {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      setForm((f) => ({ ...f, preferred_site_name: slug }));
    }
  }

  function toggleModule(id: string) {
    setForm((f) => ({
      ...f,
      modules: f.modules.includes(id)
        ? f.modules.filter((m) => m !== id)
        : [...f.modules, id],
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
      if (!form.password || form.password.length < 8)
        return "Password must be at least 8 characters";
      if (form.password !== form.confirm_password) return "Passwords do not match";
    }
    return "";
  }

  function next() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep((s) => (s + 1) as Step);
  }

  function back() {
    setError("");
    setStep((s) => (s - 1) as Step);
  }

  async function submit() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
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

      setCookie(MODULE_COOKIE, JSON.stringify(form.modules));
      setCookie(PLAN_COOKIE, form.plan);
      setCookie(COMPANY_COOKIE, form.company_name);

      if (json.site_url) setSiteUrl(json.site_url);
      if (json.tenant) setTenantId(String(json.tenant));
      setStep(5);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  const planDef = PLANS.find((p) => p.id === form.plan);
  const allowedMods = getModulesForPlan(form.plan);
  const monthlyTotal = calculateSubscriptionTotal(form.plan, form.modules);

  async function startPayment() {
    setLoading(true);
    setError("");
    try {
      const nameParts = form.full_name.trim().split(/\s+/);
      const firstName = nameParts.shift() || form.full_name;
      const lastName = nameParts.join(" ");
      const res = await fetch("/api/payfast/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: form.plan,
          email: form.email,
          firstName,
          lastName,
          tenantId,
          amount: monthlyTotal,
          modules: form.modules,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Payment checkout failed");
      const formEl = document.createElement("form");
      formEl.method = "POST";
      formEl.action = json.url;
      Object.entries(json.payload || {}).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(value);
        formEl.appendChild(input);
      });
      document.body.appendChild(formEl);
      formEl.submit();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment checkout failed");
    } finally {
      setLoading(false);
    }
  }

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
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20,18,46,.85)",
            zIndex: 999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              border: "4px solid rgba(255,255,255,.2)",
              borderTop: "4px solid #28a486",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <div style={{ color: "#fff", fontSize: 20, fontWeight: 800, letterSpacing: "-.3px" }}>
            Creating your business system…
          </div>
          <div style={{ color: "rgba(255,255,255,.6)", fontSize: 14 }}>
            Setting up your business workspace. This may take a moment.
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <div className="signup-wrap">
        {step < 5 && (
          <div className="signup-steps">
            {(["Company Info", "Choose Plan", "Select Modules", "Set Password"] as const).map(
              (label, i) => (
                <div
                  key={label}
                  className={`signup-step ${step === i + 1 ? "active" : step > i + 1 ? "done" : ""}`}
                >
                  <div className="step-circle">{step > i + 1 ? "✓" : i + 1}</div>
                  <span>{label}</span>
                </div>
              )
            )}
          </div>
        )}

        <div className="signup-card">
          {/* ── Step 1 — Company Info ───────────────────────────────────── */}
          {step === 1 && (
            <>
              <h2 className="signup-heading">Tell us about your business</h2>
              <p className="signup-sub">
                We will use this to set up your Fuze account and business workspace.
              </p>
              <div className="field-row">
                <div className="field">
                  <label className="label">Full Name *</label>
                  <input
                    className="inp"
                    placeholder="Jane Smith"
                    value={form.full_name}
                    onChange={(e) => update("full_name", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="label">Company Name *</label>
                  <input
                    className="inp"
                    placeholder="Acme (Pty) Ltd"
                    value={form.company_name}
                    onChange={(e) => update("company_name", e.target.value)}
                  />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label className="label">Email Address *</label>
                  <input
                    className="inp"
                    type="email"
                    placeholder="jane@acme.co.za"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="label">Phone Number *</label>
                  <input
                    className="inp"
                    placeholder="+27 82 000 0000"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                  />
                </div>
              </div>
              <div className="field">
                <label className="label">Preferred Site Name</label>
                <div className="site-name-wrap">
                  <input
                    className="inp"
                    placeholder="acme"
                    value={form.preferred_site_name}
                    onChange={(e) =>
                      update(
                        "preferred_site_name",
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                      )
                    }
                  />
                  <span className="site-suffix">.fuzedigital.co.za</span>
                </div>
                <div className="field-hint">
                  This will be used to generate your SaaS tenant URL
                </div>
              </div>
            </>
          )}

          {/* ── Step 2 — Plan ───────────────────────────────────────────── */}
          {step === 2 && (
            <>
              <h2 className="signup-heading">Choose your plan</h2>
              <p className="signup-sub">You can upgrade or change plans at any time.</p>
              <div className="plan-select-grid">
                {PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    className={`plan-option ${form.plan === plan.id ? "plan-selected" : ""} ${
                      plan.highlight ? "plan-featured" : ""
                    }`}
                    onClick={() => update("plan", plan.id)}
                  >
                    {plan.badge && <div className="plan-badge">{plan.badge}</div>}
                    <div className="plan-name">{plan.label}</div>
                    <div className="plan-price-sm">
                      {plan.price > 0
                        ? `R${plan.price.toLocaleString()}/mo`
                        : plan.id === "Starter"
                        ? "Free trial"
                        : "Custom"}
                    </div>
                    <div className="plan-mod-count">{plan.modules.length} modules included</div>
                    <div className="plan-radio">{form.plan === plan.id ? "●" : "○"}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Step 3 — Modules ────────────────────────────────────────── */}
          {step === 3 && (
            <>
              <h2 className="signup-heading">Select your modules</h2>
              <p className="signup-sub">
                Your <strong>{form.plan}</strong> plan includes {allowedMods.length} modules. You
                can also add extra modules as paid add-ons.
              </p>
              <div className="module-select-groups">
                {GROUPS.map((g) => {
                  const mods = ALL_MODULES.filter((m) => g.ids.includes(m.id));
                  return (
                    <div key={g.label}>
                      <div className="module-select-label">{g.label}</div>
                      <div className="module-select-grid">
                        {mods.map((m) => {
                          const included = allowedMods.includes(m.id);
                          const selected = form.modules.includes(m.id);
                          return (
                            <div
                              key={m.id}
                              className={`module-toggle ${selected ? "mod-on" : ""}`}
                              onClick={() => toggleModule(m.id)}
                            >
                              <span className="mod-icon">{m.icon}</span>
                              <div className="mod-info">
                                <span className="mod-label">{m.label}</span>
                                <span className="mod-upgrade">
                                  {included ? "Included" : `Add-on R${m.addonPrice}/mo`}
                                </span>
                              </div>
                              <span className="mod-check">{selected ? "✓" : "+"}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="modules-selected-count">
                {form.modules.length} module{form.modules.length !== 1 ? "s" : ""} selected ·
                Estimated total: R{monthlyTotal}/month
              </div>
            </>
          )}

          {/* ── Step 4 — Password ───────────────────────────────────────── */}
          {step === 4 && (
            <>
              <h2 className="signup-heading">Create your password</h2>
              <p className="signup-sub">
                This will be your Fuze portal login. Minimum 8 characters.
              </p>
              <div className="field">
                <label className="label">Password *</label>
                <input
                  className="inp"
                  type="password"
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                />
              </div>
              <div className="field">
                <label className="label">Confirm Password *</label>
                <input
                  className="inp"
                  type="password"
                  placeholder="Repeat password"
                  value={form.confirm_password}
                  onChange={(e) => update("confirm_password", e.target.value)}
                />
              </div>
              <div className="review-box">
                <div className="review-title">Review your setup</div>
                <div className="review-row">
                  <span>Company</span>
                  <strong>{form.company_name}</strong>
                </div>
                <div className="review-row">
                  <span>Email</span>
                  <strong>{form.email}</strong>
                </div>
                <div className="review-row">
                  <span>Plan</span>
                  <strong>{form.plan}</strong>
                </div>
                <div className="review-row">
                  <span>Modules</span>
                  <strong>{form.modules.length} selected</strong>
                </div>
                <div className="review-row">
                  <span>Monthly Estimate</span>
                  <strong>R{monthlyTotal}</strong>
                </div>
                <div className="review-row">
                  <span>Site</span>
                  <strong>{form.preferred_site_name}.fuzedigital.co.za</strong>
                </div>
              </div>
            </>
          )}

          {/* ── Step 5 — Provisioning / Success ─────────────────────────── */}
          {step === 5 && (
            <div className="success-wrap" style={{ textAlign: "center", padding: "8px 0 24px" }}>

              {/* Icon */}
              {!siteReady ? (
                <div
                  style={{
                    position: "relative",
                    width: 80,
                    height: 80,
                    margin: "0 auto 24px",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      border: "4px solid rgba(40,164,134,0.2)",
                      borderTop: "4px solid #28a486",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 28,
                    }}
                  >
                    🚀
                  </div>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : (
                <div style={{ fontSize: 64, marginBottom: 24 }}>✅</div>
              )}

              {/* Heading */}
              <h2 className="signup-heading" style={{ marginBottom: 8 }}>
                {siteReady ? "Your workspace is ready!" : "Setting up your workspace…"}
              </h2>

              {/* Sub text */}
              {!siteReady ? (
                <p className="signup-sub" style={{ marginBottom: 20 }}>
                  We are installing your business suite for{" "}
                  <strong>{form.company_name}</strong>. This usually takes about{" "}
                  <strong>5 minutes</strong>. Grab a coffee ☕ — we will email{" "}
                  <strong>{form.email}</strong> the moment it is live.
                </p>
              ) : (
                <p className="signup-sub" style={{ marginBottom: 20 }}>
                  Your business suite for <strong>{form.company_name}</strong> is live! Check{" "}
                  <strong>{form.email}</strong> for your login details.
                </p>
              )}

              {/* Countdown / ready badge */}
              {!siteReady ? (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    background: "rgba(40,164,134,0.08)",
                    border: "1px solid rgba(40,164,134,0.25)",
                    borderRadius: 12,
                    padding: "14px 28px",
                    marginBottom: 24,
                  }}
                >
                  <span style={{ fontSize: 22 }}>⏱</span>
                  <div style={{ textAlign: "left" }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,.5)",
                        textTransform: "uppercase",
                        letterSpacing: 1,
                      }}
                    >
                      Estimated time remaining
                    </div>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 800,
                        color: "#28a486",
                        letterSpacing: "-1px",
                        lineHeight: 1,
                      }}
                    >
                      {secondsLeft > 0 ? formatTime(secondsLeft) : "Any moment now…"}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: "rgba(40,164,134,0.12)",
                    border: "1px solid #28a486",
                    borderRadius: 12,
                    padding: "10px 22px",
                    marginBottom: 24,
                    color: "#28a486",
                    fontWeight: 700,
                    fontSize: 15,
                  }}
                >
                  ✓ Provisioning complete
                </div>
              )}

              {/* Progress steps */}
              {!siteReady && (
                <div
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    padding: "16px 20px",
                    marginBottom: 24,
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,.4)",
                      marginBottom: 12,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    What is happening right now
                  </div>
                  {PROGRESS_STEPS.map((ps) => {
                    const done = secondsLeft < ps.doneAfter || siteReady;
                    return (
                      <div
                        key={ps.label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "6px 0",
                          color: done ? "#28a486" : "rgba(255,255,255,.5)",
                          fontSize: 14,
                          transition: "color .4s",
                        }}
                      >
                        <span style={{ fontSize: 16 }}>{done ? "✓" : "○"}</span>
                        {ps.label}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Modules activated */}
              <div className="success-modules" style={{ marginBottom: 20 }}>
                <div className="sm-title">Modules activated</div>
                <div className="sm-pills">
                  {form.modules.map((id) => {
                    const m = ALL_MODULES.find((mod) => mod.id === id);
                    return m ? (
                      <span key={id} className="sm-pill">
                        {m.icon} {m.label}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>

              {/* Site URL */}
              {siteUrl && (
                <div className="site-url-box" style={{ marginBottom: 20 }}>
                  <div className="site-url-label">Your workspace URL</div>
                  <a
                    href={siteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="site-url-link"
                  >
                    {siteUrl}
                  </a>
                </div>
              )}

              {/* Action buttons */}
              {siteReady ? (
                <>
                  {monthlyTotal > 0 && (
                    <button
                      className="btn btn-primary"
                      style={{ width: "100%", marginBottom: 10 }}
                      onClick={startPayment}
                      disabled={loading}
                    >
                      {loading
                        ? "Opening payment…"
                        : `Continue to Payment · R${monthlyTotal}/month`}
                    </button>
                  )}
                  <button
                    className="btn"
                    style={{ width: "100%" }}
                    onClick={() => router.push(siteUrl || "/login")}
                  >
                    Go to Login →
                  </button>
                </>
              ) : (
                <button
                  className="btn"
                  style={{ width: "100%", opacity: 0.5, cursor: "not-allowed" }}
                  disabled
                >
                  Waiting for your workspace…
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="error" style={{ marginTop: 12 }}>
              {error}
            </div>
          )}

          {step < 5 && (
            <div className="signup-nav">
              {step > 1 && (
                <button className="btn" onClick={back}>
                  ← Back
                </button>
              )}
              <div style={{ flex: 1 }} />
              {step < 4 ? (
                <button className="btn btn-primary" onClick={next}>
                  Continue →
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={submit}
                  disabled={loading}
                >
                  {loading ? "Creating your business system…" : "Create Account →"}
                </button>
              )}
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