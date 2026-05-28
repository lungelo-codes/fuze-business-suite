"use client";
import { useEffect, useState } from "react";

type Any = Record<string, any>;
const defaults = {
  platform_name: "Business Suite", owner_company: "Fuze Digital", platform_logo: "", website_logo: "", support_email: "",
  default_country: "South Africa", default_currency: "ZAR", default_trial_days: 14, billing_reminder_days: 7,
  payfast_merchant_id: "", payfast_merchant_key: "", payfast_passphrase: "", payfast_sandbox: 1,
  payfast_return_url: "", payfast_cancel_url: "", payfast_notify_url: "",
  zai_api_key: "", zai_api_base_url: "https://api.z.ai/api/paas/v4", zai_model: "glm-4.5",
};
function Input({ label, value, onChange, type = "text", placeholder }: { label: string; value: any; onChange: (v: any) => void; type?: string; placeholder?: string }) {
  return <label className="field"><span>{label}</span><input className="inp" type={type} value={value ?? ""} placeholder={placeholder || label} onChange={(e) => onChange(type === "number" ? Number(e.currentTarget.value) : e.currentTarget.value)} /></label>;
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="field"><span>{label}</span><select className="inp" value={checked ? "1" : "0"} onChange={(e) => onChange(e.currentTarget.value === "1")}><option value="1">Enabled</option><option value="0">Disabled</option></select></label>;
}
export default function PlatformControlSettings() {
  const [settings, setSettings] = useState<Any>(defaults);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/platform-control", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not load SaaS admin settings");
      setSettings({ ...defaults, ...(json.data || {}) });
    } catch (e) { setMsg(e instanceof Error ? e.message : "Could not load SaaS admin settings"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  async function save() {
    setLoading(true); setMsg("");
    try {
      const res = await fetch("/api/settings/platform-control", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not save SaaS admin settings");
      setSettings({ ...defaults, ...(json.data || settings) });
      setMsg("SaaS admin settings saved. These platform controls apply to all tenants.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Could not save SaaS admin settings"); }
    finally { setLoading(false); }
  }
  async function uploadLogo(file?: File | null, target: "platform" | "website" = "platform") {
    if (!file) return;
    setLoading(true); setMsg("");
    try {
      const fd = new FormData(); fd.set("file", file); fd.set("target", target);
      const res = await fetch("/api/settings/upload-logo", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Logo upload failed");
      const url = json.data?.file_url || json.data?.logo || "";
      setSettings((p) => ({ ...p, [target === "platform" ? "platform_logo" : "website_logo"]: url }));
      setMsg("Logo uploaded. Save platform settings to keep it active.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Logo upload failed"); }
    finally { setLoading(false); }
  }
  return <div className="card card-pad" style={{ marginTop: 18 }}>
    <div className="page-head" style={{ padding: 0, marginBottom: 18 }}><div><h3 style={{ margin: 0 }}>SaaS Admin Control Centre</h3><div className="page-sub">Platform branding, SaaS billing defaults, PayFast subscription billing, and z.ai provider settings.</div></div><button type="button" className="btn btn-primary" disabled={loading} onClick={save}>{loading ? "Saving..." : "Save platform settings"}</button></div>
    <div className="two-col" style={{ alignItems: "start" }}>
      <div><h4>Platform branding</h4><div className="field-row"><Input label="Platform Name" value={settings.platform_name} onChange={(v) => setSettings({ ...settings, platform_name: v })} /><Input label="Owner Company" value={settings.owner_company} onChange={(v) => setSettings({ ...settings, owner_company: v })} /></div><Input label="Support Email" value={settings.support_email} onChange={(v) => setSettings({ ...settings, support_email: v })} /><div className="field-row"><label className="field"><span>Sidebar / Platform Logo</span><input className="inp" type="file" accept="image/*" onChange={(e) => uploadLogo(e.target.files?.[0], "platform")} /></label><label className="field"><span>Website Logo</span><input className="inp" type="file" accept="image/*" onChange={(e) => uploadLogo(e.target.files?.[0], "website")} /></label></div>{settings.platform_logo ? <div className="banner info"><strong>Platform logo:</strong><br/><img src={settings.platform_logo} alt="Platform logo" style={{ maxHeight: 64, maxWidth: 220, marginTop: 8, objectFit: "contain" }} /></div> : null}</div>
      <div><h4>Default tenant controls</h4><div className="field-row"><Input label="Default Country" value={settings.default_country} onChange={(v) => setSettings({ ...settings, default_country: v || "South Africa" })} /><Input label="Default Currency" value={settings.default_currency} onChange={(v) => setSettings({ ...settings, default_currency: v || "ZAR" })} /></div><div className="field-row"><Input label="Default Trial Days" type="number" value={settings.default_trial_days} onChange={(v) => setSettings({ ...settings, default_trial_days: v })} /><Input label="Billing Reminder Days" type="number" value={settings.billing_reminder_days} onChange={(v) => setSettings({ ...settings, billing_reminder_days: v })} /></div></div>
    </div>
    <div className="two-col" style={{ alignItems: "start", marginTop: 18 }}>
      <div><h4>PayFast SaaS billing</h4><div className="field-row"><Input label="Merchant ID" value={settings.payfast_merchant_id} onChange={(v) => setSettings({ ...settings, payfast_merchant_id: v })} /><Input label="Merchant Key" type="password" value={settings.payfast_merchant_key} onChange={(v) => setSettings({ ...settings, payfast_merchant_key: v })} /></div><Input label="Passphrase" type="password" value={settings.payfast_passphrase} onChange={(v) => setSettings({ ...settings, payfast_passphrase: v })} /><Check label="PayFast Sandbox" checked={Number(settings.payfast_sandbox) === 1} onChange={(v) => setSettings({ ...settings, payfast_sandbox: v ? 1 : 0 })} /><Input label="Return URL" value={settings.payfast_return_url} onChange={(v) => setSettings({ ...settings, payfast_return_url: v })} /><Input label="Cancel URL" value={settings.payfast_cancel_url} onChange={(v) => setSettings({ ...settings, payfast_cancel_url: v })} /><Input label="Notify URL" value={settings.payfast_notify_url} onChange={(v) => setSettings({ ...settings, payfast_notify_url: v })} /></div>
      <div><h4>z.ai provider</h4><Input label="z.ai API Base URL" value={settings.zai_api_base_url} onChange={(v) => setSettings({ ...settings, zai_api_base_url: v })} /><Input label="z.ai Model" value={settings.zai_model} onChange={(v) => setSettings({ ...settings, zai_model: v })} /><Input label="z.ai API Key" type="password" value={settings.zai_api_key} onChange={(v) => setSettings({ ...settings, zai_api_key: v })} /><div className="banner info">The API key is saved in ERPNext Platform Settings and is masked after save. Tenant users never see this value.</div></div>
    </div>
    {msg ? <div className={msg.toLowerCase().includes("could") || msg.toLowerCase().includes("failed") ? "banner" : "banner info"} style={{ marginTop: 18 }}>{msg}</div> : null}
  </div>;
}
