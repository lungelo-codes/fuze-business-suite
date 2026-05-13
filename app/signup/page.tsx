"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
// Import header from SiteHeader to ensure the correct file is resolved during build
import PublicHeader from "@/components/SiteHeader";
// Import from appModules for consistent resolution
import { ALL_MODULES, PLANS, getModulesForPlan, calculateSubscriptionTotal, MODULE_COOKIE, PLAN_COOKIE, COMPANY_COOKIE } from "@/lib/appModules";

type Step = 1 | 2 | 3 | 4 | 5;
interface FormData { full_name: string; company_name: string; email: string; phone: string; preferred_site_name: string; password: string; confirm_password: string; plan: string; modules: string[]; }
const WAIT_SECONDS = 90;
const progress = ["Create tenant", "Install modules", "Configure workspace", "Send login email"];
function setCookie(name: string, value: string, days = 365) { const expires = new Date(Date.now() + days * 864e5).toUTCString(); document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/`; }
function formatTime(s: number) { const m = Math.floor(s / 60); const sec = s % 60; return `${m}:${String(sec).padStart(2, "0")}`; }

function SignupForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [siteReady, setSiteReady] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WAIT_SECONDS);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState<FormData>({ full_name: "", company_name: "", email: "", phone: "", preferred_site_name: "", password: "", confirm_password: "", plan: params?.get("plan") || "Starter", modules: getModulesForPlan(params?.get("plan") || "Starter") });

  useEffect(() => { const planParam = params?.get("plan"); if (planParam) setForm((f) => ({ ...f, plan: planParam, modules: getModulesForPlan(planParam) })); }, [params]);
  useEffect(() => {
    if (step !== 5 || siteReady) return;
    timerRef.current = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    pollRef.current = setInterval(async () => { if (!tenantId) return; try { const res = await fetch(`/api/saas/status?tenant=${encodeURIComponent(tenantId)}`); if (res.ok) { const json = await res.json(); if (json.ready) { setSiteReady(true); clearInterval(pollRef.current!); clearInterval(timerRef.current!); } } } catch {} }, 15000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, tenantId, siteReady]);

  function update(key: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "plan") setForm((f) => ({ ...f, plan: value, modules: getModulesForPlan(value) }));
    if (key === "company_name") {
      const slug = value.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      setForm((f) => ({ ...f, preferred_site_name: slug }));
    }
  }
  function toggleModule(id: string) { setForm((f) => ({ ...f, modules: f.modules.includes(id) ? f.modules.filter((m) => m !== id) : [...f.modules, id] })); }
  function validateStep() { if (step === 1) { if (!form.full_name.trim()) return "Full name is required"; if (!form.company_name.trim()) return "Company name is required"; if (!form.email.includes("@")) return "Valid email is required"; if (!form.phone.trim()) return "Phone number is required"; } if (step === 3 && form.modules.length === 0) return "Select at least one module"; if (step === 4) { if (!form.password || form.password.length < 8) return "Password must be at least 8 characters"; if (form.password !== form.confirm_password) return "Passwords do not match"; } return ""; }
  function next() { const err = validateStep(); if (err) return setError(err); setError(""); setStep((s) => (s + 1) as Step); }
  function back() { setError(""); setStep((s) => (s - 1) as Step); }
  async function submit() { const err = validateStep(); if (err) return setError(err); setLoading(true); setError(""); try { const res = await fetch("/api/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const json = await res.json(); if (!res.ok) throw new Error(json.error || "Signup failed"); setCookie(MODULE_COOKIE, JSON.stringify(form.modules)); setCookie(PLAN_COOKIE, form.plan); setCookie(COMPANY_COOKIE, form.company_name); if (json.site_url) setSiteUrl(json.site_url); if (json.tenant) setTenantId(String(json.tenant)); setStep(5); } catch (e) { setError(e instanceof Error ? e.message : "Signup failed"); } finally { setLoading(false); } }
  async function startPayment() { setLoading(true); setError(""); try { const [firstName, ...rest] = form.full_name.trim().split(/\s+/); const res = await fetch("/api/payfast/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: form.plan, email: form.email, firstName: firstName || form.full_name, lastName: rest.join(" "), tenantId, amount: monthlyTotal, modules: form.modules }) }); const json = await res.json(); if (!res.ok) throw new Error(json.error || "Payment checkout failed"); const formEl = document.createElement("form"); formEl.method = "POST"; formEl.action = json.url; Object.entries(json.payload || {}).forEach(([key, value]) => { const input = document.createElement("input"); input.type = "hidden"; input.name = key; input.value = String(value); formEl.appendChild(input); }); document.body.appendChild(formEl); formEl.submit(); } catch (e) { setError(e instanceof Error ? e.message : "Payment checkout failed"); } finally { setLoading(false); } }

  const allowedMods = getModulesForPlan(form.plan);
  const monthlyTotal = calculateSubscriptionTotal(form.plan, form.modules);
  const groups = ["Finance", "CRM", "Operations", "People", "Service"] as const;

  return (
    <div className="public-root premium-website signup-page-v2">
      <PublicHeader />
      {loading && <div className="premium-loader"><div className="loader-orb"/><b>Creating your business system…</b><span>Setting up your secure tenant workspace.</span></div>}
      <main className="signup-modern-shell">
        <aside className="signup-story-panel">
          <div className="auth-badge">14-day guided trial</div>
          <h1>Build the exact business suite your company needs.</h1>
          <p>Select your plan, choose modules, create your tenant, then log in to a modern workspace with only the tools you selected.</p>
          <div className="signup-proof-grid"><span>✓ Tenant isolated</span><span>✓ ERPNext powered</span><span>✓ Module controlled</span><span>✓ SA compliance ready</span></div>
        </aside>
        <section className="signup-flow-card">
          {step < 5 && <div className="signup-progress-modern">{["Business", "Plan", "Modules", "Password"].map((label, i) => <button key={label} type="button" className={step === i + 1 ? "active" : step > i + 1 ? "done" : ""}><b>{step > i + 1 ? "✓" : i + 1}</b><span>{label}</span></button>)}</div>}

          {step === 1 && <div className="signup-panel"><span className="suite-kicker">Step 1</span><h2>Tell us about your business</h2><p>This information creates your company profile and tenant URL.</p><div className="auth-grid"><label>Full name<input value={form.full_name} onChange={(e)=>update("full_name",e.target.value)} placeholder="Jane Smith" /></label><label>Company name<input value={form.company_name} onChange={(e)=>update("company_name",e.target.value)} placeholder="Acme (Pty) Ltd" /></label><label>Email<input type="email" value={form.email} onChange={(e)=>update("email",e.target.value)} placeholder="jane@company.co.za" /></label><label>Phone<input value={form.phone} onChange={(e)=>update("phone",e.target.value)} placeholder="+27 82 000 0000" /></label></div><label className="full-label">Workspace URL<div className="tenant-input"><input value={form.preferred_site_name} onChange={(e)=>update("preferred_site_name",e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,""))} placeholder="acme"/><span>.fuzedigital.co.za</span></div></label></div>}
          {step === 2 && <div className="signup-panel"><span className="suite-kicker">Step 2</span><h2>Choose your starting plan</h2><p>You can upgrade later as the business grows.</p><div className="pricing-card-grid compact">{PLANS.map((plan)=><button key={plan.id} type="button" onClick={()=>update("plan",plan.id)} className={`premium-price-card selectable ${form.plan===plan.id?"selected":""}`}><span>{plan.badge || "Plan"}</span><h3>{plan.label}</h3><b>{plan.price>0?`R${plan.price}/mo`:plan.period}</b><p>{plan.description}</p><small>{plan.modules.length} modules included</small></button>)}</div></div>}
          {step === 3 && <div className="signup-panel"><span className="suite-kicker">Step 3</span><h2>Select modules</h2><p>Your dashboard and sidebar will only show selected modules.</p><div className="module-pick-stack">{groups.map((g)=>{ const mods=ALL_MODULES.filter((m)=>m.group===g); return <div key={g}><h4>{g}</h4><div className="module-pick-grid">{mods.map((m)=>{ const selected=form.modules.includes(m.id); const included=allowedMods.includes(m.id); return <button type="button" key={m.id} onClick={()=>toggleModule(m.id)} className={selected?"selected":""}><span>{m.icon}</span><b>{m.label}</b><small>{included?"Included":`Add-on R${m.addonPrice}/mo`}</small><em>{selected?"✓":"+"}</em></button>})}</div></div>})}</div><div className="estimate-bar"><b>{form.modules.length} modules selected</b><span>Estimated: R{monthlyTotal}/month</span></div></div>}
          {step === 4 && <div className="signup-panel"><span className="suite-kicker">Step 4</span><h2>Secure your account</h2><p>Create your login password and confirm the setup.</p><div className="auth-grid"><label>Password<input type="password" value={form.password} onChange={(e)=>update("password",e.target.value)} placeholder="At least 8 characters" /></label><label>Confirm password<input type="password" value={form.confirm_password} onChange={(e)=>update("confirm_password",e.target.value)} placeholder="Repeat password" /></label></div><div className="review-modern"><div><span>Company</span><b>{form.company_name || "Not set"}</b></div><div><span>Plan</span><b>{form.plan}</b></div><div><span>Modules</span><b>{form.modules.length} selected</b></div><div><span>Monthly estimate</span><b>R{monthlyTotal}</b></div></div></div>}
          {step === 5 && <div className="signup-panel success-panel"><div className="success-orb">{siteReady?"✓":"🚀"}</div><h2>{siteReady ? "Your workspace is ready!" : "Setting up your workspace…"}</h2><p>{siteReady ? `Your business suite for ${form.company_name} is live.` : `We are installing ${form.company_name}. Login details will be emailed to ${form.email}.`}</p>{!siteReady && <div className="provision-card"><b>{secondsLeft > 0 ? formatTime(secondsLeft) : "Any moment now…"}</b><span>Estimated time remaining</span>{progress.map((item,i)=><em key={item}>{secondsLeft < WAIT_SECONDS - (i*22) ? "✓" : "○"} {item}</em>)}</div>}<div className="sm-pills">{form.modules.map((id)=>{const m=ALL_MODULES.find((x)=>x.id===id);return m?<span key={id}>{m.icon} {m.label}</span>:null})}</div>{siteUrl && <a className="site-url-link" href={siteUrl} target="_blank" rel="noreferrer">{siteUrl}</a>}{siteReady ? <div className="signup-actions">{monthlyTotal>0 && <button className="modern-primary" onClick={startPayment}>{loading?"Opening payment…":`Continue to Payment · R${monthlyTotal}/month`}</button>}<button className="modern-secondary" onClick={()=>router.push(siteUrl || "/login")}>Go to login →</button></div> : <button className="modern-secondary" disabled>Waiting for your workspace…</button>}</div>}
          {error && <div className="auth-error">{error}</div>}
          {step < 5 && <div className="signup-bottom-nav">{step>1?<button className="modern-secondary" onClick={back}>← Back</button>:<span/>}<button className="modern-primary" onClick={step<4?next:submit} disabled={loading}>{step<4?"Continue →":loading?"Creating…":"Create Account →"}</button></div>}
        </section>
      </main>
    </div>
  );
}
export default function SignupPage() { return <Suspense><SignupForm /></Suspense>; }
