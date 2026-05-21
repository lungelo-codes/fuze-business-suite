"use client";
import { useEffect, useState, type ReactNode } from "react";

type Template = { name?: string; subject?: string; response?: string; reference_doctype?: string; document_type?: string; use_html?: number };
const doctypes = ["Sales Invoice", "Quotation", "Salary Slip"];
const defaultBody = `<p>Good day {{ doc.customer_name or doc.employee_name or doc.name }},</p>\n<p>Please find attached your {{ doc.doctype }} {{ doc.name }}.</p>\n<p>Kind regards,<br>{{ doc.company }}</p>`;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

export default function EmailTemplateSettings() {
  const [doctype, setDoctype] = useState("Sales Invoice");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [current, setCurrent] = useState<Template>({ reference_doctype: "Sales Invoice", subject: "{{ doc.doctype }} {{ doc.name }}", response: defaultBody, use_html: 1 });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function load(dt = doctype) {
    setLoading(true); setMsg("");
    try {
      const res = await fetch(`/api/email/templates?doctype=${encodeURIComponent(dt)}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load email templates");
      setTemplates(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not load email templates");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(doctype); }, [doctype]);

  function selectTemplate(name: string) {
    const found = templates.find((t) => t.name === name);
    if (found) setCurrent({ ...found, reference_doctype: found.reference_doctype || found.document_type || doctype });
  }

  async function save() {
    setLoading(true); setMsg("");
    try {
      const body = { ...current, reference_doctype: doctype, document_type: doctype, use_html: 1 };
      const res = await fetch("/api/email/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save email template");
      setMsg("Email template saved. It is now available when sending documents from the SaaS.");
      await load(doctype);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not save email template");
    } finally { setLoading(false); }
  }

  return <div className="card card-pad" style={{ marginTop: 18 }}>
    <div className="page-head" style={{ padding: 0, marginBottom: 18 }}>
      <div><h3 style={{ margin: 0 }}>Email Templates</h3><div className="page-sub">Create ERPNext-style templates for quotes, invoices and payslips.</div></div>
      <button type="button" className="btn btn-primary" disabled={loading} onClick={save}>{loading ? "Saving..." : "Save template"}</button>
    </div>
    <div className="two-col" style={{ alignItems: "start" }}>
      <div>
        <Field label="Document Type"><select className="inp" value={doctype} onChange={(e) => { setDoctype(e.currentTarget.value); setCurrent({ reference_doctype: e.currentTarget.value, subject: "{{ doc.doctype }} {{ doc.name }}", response: defaultBody, use_html: 1 }); }}>{doctypes.map((dt) => <option key={dt} value={dt}>{dt}</option>)}</select></Field>
        <Field label="Existing Template"><select className="inp" value={current.name || ""} onChange={(e) => selectTemplate(e.currentTarget.value)}><option value="">Create new template</option>{templates.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}</select></Field>
        <Field label="Template Name"><input className="inp" value={current.name || ""} onChange={(e) => setCurrent({ ...current, name: e.currentTarget.value })} placeholder={`${doctype} Customer Email`} /></Field>
        <Field label="Subject"><input className="inp" value={current.subject || ""} onChange={(e) => setCurrent({ ...current, subject: e.currentTarget.value })} placeholder="{{ doc.doctype }} {{ doc.name }}" /></Field>
      </div>
      <div>
        <Field label="Message HTML / Jinja"><textarea className="inp" style={{ minHeight: 220 }} value={current.response || ""} onChange={(e) => setCurrent({ ...current, response: e.currentTarget.value })} /></Field>
        <div className="banner info">Available variables follow ERPNext style, for example: <code>{"{{ doc.name }}"}</code>, <code>{"{{ doc.company }}"}</code>, <code>{"{{ doc.customer_name }}"}</code>, <code>{"{{ doc.grand_total }}"}</code>.</div>
      </div>
    </div>
    {msg ? <div className={msg.toLowerCase().includes("could") || msg.toLowerCase().includes("failed") ? "banner" : "banner info"} style={{ marginTop: 18 }}>{msg}</div> : null}
  </div>;
}
