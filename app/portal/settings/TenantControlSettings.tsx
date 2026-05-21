"use client";
import { useEffect, useState } from "react";

type Any = Record<string, any>;
const defaults = {
  tenant_name: "", company: "", company_name: "", plan: "Starter", active_modules: [], billing_status: "Trial",
  trial_end: "", next_billing_date: "", default_currency: "ZAR", country: "South Africa",
  email_from: "", ikhokha_merchant_id: "", ikhokha_public_key: "", ikhokha_secret_key: "",
  ikhokha_webhook_secret: "", yoco_public_key: "", yoco_secret_key: "", yoco_webhook_secret: "",
  payfast_payment_link: ""
};
function Input({ label, value, onChange, type = "text", placeholder }: { label: string; value: any; onChange: (v: any) => void; type?: string; placeholder?: string }) {
  return <label className="field"><span>{label}</span><input className="inp" type={type} value={value || ""} placeholder={placeholder || label} onChange={(e) => onChange(e.currentTarget.value)} /></label>;
}

export default function TenantControlSettings({ isAdmin = false }: { isAdmin?: boolean }) {
  const [settings, setSettings] = useState<Any>(defaults);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/tenant-control", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load tenant control settings");
      setSettings({ ...defaults, ...(json.data || {}) });
    } catch (e) { setMsg(e instanceof Error ? e.message : "Could not load tenant settings"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setLoading(true); setMsg("");
    try {
      const res = await fetch("/api/settings/tenant-control", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save tenant settings");
      setSettings({ ...defaults, ...(json.data || settings) });
      setMsg("Tenant settings saved and will now apply across the SaaS.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Could not save tenant settings"); }
    finally { setLoading(false); }
  }

  async function uploadLogo(file?: File | null) {
    if (!file) return;
    setLoading(true); setMsg("");
    try {
      const fd = new FormData(); fd.set("file", file); fd.set("company", settings.company || ""); fd.set("target", "company");
      const res = await fetch("/api/settings/upload-logo", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Logo upload failed");
      setSettings((p) => ({ ...p, company_logo: json.data?.file_url || p.company_logo }));
      setMsg("Company logo uploaded. Save settings to apply it everywhere.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Logo upload failed"); }
    finally { setLoading(false); }
  }

  async function makePaymentLink() {
    const amount = window.prompt("Enter subscription amount in ZAR", "499");
    if (!amount) return;
    setLoading(true); setMsg("");
    try {
      const res = await fetch("/api/settings/payfast-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Number(amount), item_name: `Business Suite ${settings.plan || "Subscription"}` }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not create payment link");
      const link = json.data?.payment_link || json.data?.data?.payment_link;
      setSettings((p) => ({ ...p, payfast_payment_link: link }));
      setMsg("PayFast payment link created and saved for billing reminder emails.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Could not create payment link"); }
    finally { setLoading(false); }
  }

  return <div className="card card-pad" style={{ marginTop: 18 }}>
    <div className="page-head" style={{ padding: 0, marginBottom: 18 }}><div><h3 style={{ margin: 0 }}>SaaS User Control Settings</h3><div className="page-sub">Tenant branding, South African defaults, document/email defaults and iKhokha/Yoco keys.</div></div><button type="button" className="btn btn-primary" disabled={loading} onClick={save}>{loading ? "Saving..." : "Save SaaS settings"}</button></div>
    <div className="two-col" style={{ alignItems: "start" }}>
      <div>
        <h4>Defaults & Branding</h4>
        <div className="field-row"><Input label="Default Currency" value={settings.default_currency} onChange={(v) => setSettings({ ...settings, default_currency: v || "ZAR" })} /><Input label="Country" value={settings.country} onChange={(v) => setSettings({ ...settings, country: v || "South Africa" })} /></div>
        <div className="field-row"><label className="field"><span>Company Logo</span><input className="inp" type="file" accept="image/*" onChange={(e) => uploadLogo(e.target.files?.[0])} /></label><div className="banner info">Your company logo is used on your profile and customer documents. The portal/dashboard logo is controlled by the SaaS admin.</div></div>
        <div className="field-row"><Input label="Default Invoice Print Format" value={settings.default_invoice_print_format} onChange={(v) => setSettings({ ...settings, default_invoice_print_format: v })} /><Input label="Default Quote Print Format" value={settings.default_quote_print_format} onChange={(v) => setSettings({ ...settings, default_quote_print_format: v })} /></div>
        <Input label="Default Payslip Print Format" value={settings.default_payslip_print_format} onChange={(v) => setSettings({ ...settings, default_payslip_print_format: v })} />
      </div>
      {isAdmin ? <div>
        <h4>Subscription State</h4>
        <div className="field-row"><Input label="Plan" value={settings.plan} onChange={(v) => setSettings({ ...settings, plan: v })} /><Input label="Billing Status" value={settings.billing_status} onChange={(v) => setSettings({ ...settings, billing_status: v })} /></div>
        <div className="field-row"><Input label="Trial Ends" type="date" value={settings.trial_end} onChange={(v) => setSettings({ ...settings, trial_end: v })} /><Input label="Next Billing Date" type="date" value={settings.next_billing_date} onChange={(v) => setSettings({ ...settings, next_billing_date: v })} /></div>
        <Input label="Payment Link" value={settings.payfast_payment_link} onChange={(v) => setSettings({ ...settings, payfast_payment_link: v })} />
        <button type="button" className="btn" onClick={makePaymentLink} disabled={loading}>Generate PayFast payment link</button>
        <div className="banner info" style={{ marginTop: 12 }}>Admin-only: plans, trials, billing status and payment links are stored in ERPNext settings.</div>
      </div> : <div>
        <h4>Document & Email Defaults</h4>
        <Input label="Default Email From" value={settings.email_from} onChange={(v) => setSettings({ ...settings, email_from: v })} placeholder={settings.user_email || "your signup email"} />
      </div>}
    </div>
    <div className="two-col" style={{ alignItems: "start", marginTop: 18 }}>
      <div><h4>iKhokha Settings</h4><Input label="Merchant ID" value={settings.ikhokha_merchant_id} onChange={(v) => setSettings({ ...settings, ikhokha_merchant_id: v })} /><Input label="Public/API Key" value={settings.ikhokha_public_key} onChange={(v) => setSettings({ ...settings, ikhokha_public_key: v })} /><Input label="Secret Key" type="password" value={settings.ikhokha_secret_key} onChange={(v) => setSettings({ ...settings, ikhokha_secret_key: v })} /><Input label="Webhook Secret" type="password" value={settings.ikhokha_webhook_secret} onChange={(v) => setSettings({ ...settings, ikhokha_webhook_secret: v })} /></div>
      <div><h4>Yoco Settings</h4><Input label="Public Key" value={settings.yoco_public_key} onChange={(v) => setSettings({ ...settings, yoco_public_key: v })} /><Input label="Secret Key" type="password" value={settings.yoco_secret_key} onChange={(v) => setSettings({ ...settings, yoco_secret_key: v })} /><Input label="Webhook Secret" type="password" value={settings.yoco_webhook_secret} onChange={(v) => setSettings({ ...settings, yoco_webhook_secret: v })} /></div>
    </div>
    {msg && <div className={msg.toLowerCase().includes("could") || msg.toLowerCase().includes("failed") ? "banner" : "banner info"} style={{ marginTop: 18 }}>{msg}</div>}
  </div>;
}
