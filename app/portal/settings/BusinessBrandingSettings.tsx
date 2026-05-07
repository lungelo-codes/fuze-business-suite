"use client";
import { useEffect, useMemo, useState } from "react";

type Any = Record<string, any>;
type Option = { name: string; is_default?: number; disabled?: number; doc_type?: string; standard?: string };

type Props = { fallbackCompany: string };
const emptyCompany = { name: "", company_name: "", company_logo: "", default_letter_head: "", phone_no: "", email: "", website: "", tax_id: "", registration_details: "", default_bank_account: "" };
const emptyProfile = { trading_name: "", registration_number: "", industry: "", financial_year_end: "", vat_registered: 0, vat_registration_date: "", phone: "", email: "", website: "", street_address: "", suburb: "", city: "", province: "", postal_code: "", bank_name: "", account_number: "", branch_code: "" };

function Input({ label, value, onChange, placeholder, type = "text" }: { label: string; value: any; onChange: (v: any) => void; placeholder?: string; type?: string }) {
  return <label className="field"><span>{label}</span><input className="inp" type={type} value={value || ""} placeholder={placeholder || label} onChange={(e) => onChange(type === "checkbox" ? e.currentTarget.checked : e.currentTarget.value)} /></label>;
}
function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span><select className="inp" value={value || ""} onChange={(e) => onChange(e.target.value)}>{children}</select></label>;
}

export default function BusinessBrandingSettings({ fallbackCompany }: Props) {
  const [company, setCompany] = useState<Any>(emptyCompany);
  const [profile, setProfile] = useState<Any>(emptyProfile);
  const [letterheads, setLetterheads] = useState<Option[]>([]);
  const [invoiceFormats, setInvoiceFormats] = useState<Option[]>([]);
  const [quoteFormats, setQuoteFormats] = useState<Option[]>([]);
  const [invoiceFormat, setInvoiceFormat] = useState("Sales Invoice Standard");
  const [quoteFormat, setQuoteFormat] = useState("Quotation");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const logoPreview = useMemo(() => company.company_logo || "", [company.company_logo]);

  useEffect(() => {
    try {
      setInvoiceFormat(localStorage.getItem("business-suite-invoice-format") || "Sales Invoice Standard");
      setQuoteFormat(localStorage.getItem("business-suite-quote-format") || "Quotation");
    } catch {}
    (async () => {
      setLoading(true);
      try {
        const [brandingRes, printRes] = await Promise.all([
          fetch(`/api/settings/business-branding?company=${encodeURIComponent(fallbackCompany || "")}`, { cache: "no-store" }),
          fetch("/api/settings/print-options", { cache: "no-store" })
        ]);
        const branding = await brandingRes.json();
        const print = await printRes.json();
        if (branding.data?.company) setCompany({ ...emptyCompany, ...branding.data.company });
        if (branding.data?.profile) setProfile({ ...emptyProfile, ...branding.data.profile });
        setLetterheads(print.data?.letterheads || []);
        setInvoiceFormats(print.data?.invoiceFormats || []);
        setQuoteFormats(print.data?.quoteFormats || []);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Could not load business settings.");
      } finally { setLoading(false); }
    })();
  }, [fallbackCompany]);

  async function save() {
    setLoading(true); setMsg("");
    try {
      try {
        localStorage.setItem("business-suite-invoice-format", invoiceFormat);
        localStorage.setItem("business-suite-quote-format", quoteFormat);
      } catch {}
      const res = await fetch("/api/settings/business-branding", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company: company.name || fallbackCompany, company_settings: company, profile }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save business settings");
      setMsg("Business branding, profile and document settings saved.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Could not save business settings"); }
    finally { setLoading(false); }
  }

  async function uploadLogo(file?: File | null) {
    if (!file || !(company.name || fallbackCompany)) return;
    setLoading(true); setMsg("");
    try {
      const fd = new FormData(); fd.set("file", file); fd.set("company", company.name || fallbackCompany);
      const res = await fetch("/api/settings/upload-logo", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Logo upload failed");
      const url = json.data?.file_url || "";
      setCompany((p) => ({ ...p, company_logo: url }));
      setMsg("Logo uploaded. Click Save business settings to keep it active on the profile.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Logo upload failed"); }
    finally { setLoading(false); }
  }

  return <div className="card card-pad" style={{ marginTop: 18 }}>
    <div className="page-head" style={{ padding: 0, marginBottom: 18 }}><div><h3 style={{ margin: 0 }}>Business Branding & Documents</h3><div className="page-sub">Company logo, letterhead, invoice/quote templates, VAT, banking and public document details.</div></div><button type="button" className="btn btn-primary" disabled={loading} onClick={save}>{loading ? "Saving..." : "Save business settings"}</button></div>
    <div className="two-col" style={{ alignItems: "start" }}>
      <div>
        <h4>Company branding</h4>
        <div className="field-row"><Input label="Company Name" value={company.company_name || company.name} onChange={(v) => setCompany({ ...company, company_name: v })} /><Input label="Tax/VAT ID" value={company.tax_id} onChange={(v) => setCompany({ ...company, tax_id: v })} /></div>
        <div className="field-row"><Input label="Phone" value={company.phone_no} onChange={(v) => setCompany({ ...company, phone_no: v })} /><Input label="Email" value={company.email} onChange={(v) => setCompany({ ...company, email: v })} /></div>
        <Input label="Website" value={company.website} onChange={(v) => setCompany({ ...company, website: v })} />
        <div className="field-row"><Input label="Company Logo Path" value={company.company_logo} onChange={(v) => setCompany({ ...company, company_logo: v })} placeholder="/files/logo.png" /><label className="field"><span>Upload Logo</span><input className="inp" type="file" accept="image/*" onChange={(e) => uploadLogo(e.target.files?.[0])} /></label></div>
        {logoPreview ? <div className="banner info"><strong>Logo preview:</strong><br /><img src={logoPreview} alt="Company logo" style={{ maxHeight: 72, maxWidth: 220, marginTop: 8, objectFit: "contain" }} /></div> : null}
        <Select label="Default Letter Head" value={company.default_letter_head || ""} onChange={(v) => setCompany({ ...company, default_letter_head: v })}><option value="">Select letterhead</option>{letterheads.map((lh) => <option key={lh.name} value={lh.name}>{lh.name}{lh.is_default ? " — default" : ""}</option>)}</Select>
      </div>
      <div>
        <h4>Document templates</h4>
        <Select label="Default Invoice Template" value={invoiceFormat} onChange={setInvoiceFormat}><option value="">Use system default</option>{invoiceFormats.map((pf) => <option key={pf.name} value={pf.name}>{pf.name}</option>)}</Select>
        <Select label="Default Quotation Template" value={quoteFormat} onChange={setQuoteFormat}><option value="">Use system default</option>{quoteFormats.map((pf) => <option key={pf.name} value={pf.name}>{pf.name}</option>)}</Select>
        <div className="banner info">Invoice and quotation print buttons will use these templates with the company letterhead/logo.</div>
        <Input label="Registration Details" value={company.registration_details} onChange={(v) => setCompany({ ...company, registration_details: v })} />
      </div>
    </div>
    <div className="two-col" style={{ alignItems: "start", marginTop: 18 }}>
      <div>
        <h4>Business profile</h4>
        <div className="field-row"><Input label="Trading Name" value={profile.trading_name} onChange={(v) => setProfile({ ...profile, trading_name: v })} /><Input label="CIPC Registration Number" value={profile.registration_number} onChange={(v) => setProfile({ ...profile, registration_number: v })} /></div>
        <div className="field-row"><Input label="Industry" value={profile.industry} onChange={(v) => setProfile({ ...profile, industry: v })} /><Input label="Base Currency" value={profile.base_currency} onChange={(v) => setProfile({ ...profile, base_currency: v })} /></div>
        <div className="field-row"><Input label="Profile Phone" value={profile.phone} onChange={(v) => setProfile({ ...profile, phone: v })} /><Input label="Profile Email" value={profile.email} onChange={(v) => setProfile({ ...profile, email: v })} /></div>
        <Input label="Profile Website" value={profile.website} onChange={(v) => setProfile({ ...profile, website: v })} />
      </div>
      <div>
        <h4>Address & banking</h4>
        <Input label="Street Address" value={profile.street_address} onChange={(v) => setProfile({ ...profile, street_address: v })} />
        <div className="field-row"><Input label="Suburb" value={profile.suburb} onChange={(v) => setProfile({ ...profile, suburb: v })} /><Input label="City" value={profile.city} onChange={(v) => setProfile({ ...profile, city: v })} /></div>
        <div className="field-row"><Input label="Bank Name" value={profile.bank_name} onChange={(v) => setProfile({ ...profile, bank_name: v })} /><Input label="Branch Code" value={profile.branch_code} onChange={(v) => setProfile({ ...profile, branch_code: v })} /></div>
        <Input label="Account Number" value={profile.account_number} onChange={(v) => setProfile({ ...profile, account_number: v })} />
      </div>
    </div>
    {msg ? <div className="banner info" style={{ marginTop: 18 }}>{msg}</div> : null}
  </div>;
}
