"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type CrmMode = "erpnext" | "frappe_crm";
type Tab = "Command Center" | "Reports" | "Leads" | "Opportunities" | "Customers" | "Contacts" | "Quotes" | "Sales Orders" | "Contracts" | "Activities" | "Automation" | "Production Readiness";
type Status = { name: string; label?: string; color?: string; position?: number; probability?: number };
type Lead = { id: string; name?: string; first_name?: string; last_name?: string; company?: string; email?: string; phone?: string; source?: string; status?: string; lead_owner?: string; last_updated?: string };
type Deal = { id: string; title?: string; organization?: string; stage?: string; value?: string | number; raw_value?: number; currency?: string; probability?: number; expected_close?: string; owner?: string; source?: string; last_updated?: string };
type Contact = { id: string; name?: string; email?: string; phone?: string; company?: string; designation?: string; last_updated?: string };
type Cards = { leads?: number; deals?: number; contacts?: number; organizations?: number; pipeline_value?: string | number; won_this_month?: string | number; overdue_tasks?: number };
type Activity = { name?: string; subject?: string; sender?: string; reference_doctype?: string; reference_name?: string; creation?: string; communication_type?: string; content?: string };
type DrawerRecord = { id: string; type: "lead" | "deal"; title: string };
type Customer360 = { customer?: Record<string, any> | null; quotations?: Record<string, any>[]; invoices?: Record<string, any>[]; payments?: Record<string, any>[]; sales_orders?: Record<string, any>[]; contracts?: Record<string, any>[]; opportunities?: Record<string, any>[] };

const TABS: Tab[] = ["Command Center", "Reports", "Leads", "Opportunities", "Customers", "Contacts", "Quotes", "Sales Orders", "Contracts", "Activities", "Automation", "Production Readiness"];
const DEFAULT_LEAD_STATUSES: Status[] = [
  { name: "New" }, { name: "Open" }, { name: "Contacted" }, { name: "Replied" },
  { name: "Qualified" }, { name: "Converted" }, { name: "Do Not Contact" },
];
const DEFAULT_DEAL_STATUSES: Status[] = [
  { name: "Qualification", label: "Qualify" },
  { name: "Proposal/Quotation", label: "Quote" },
  { name: "Negotiation", label: "Negotiate" },
  { name: "Won", label: "Won" },
  { name: "Lost", label: "Lost" },
];
const SIMPLE_DEAL_STAGE_ORDER = ["Qualification", "Proposal/Quotation", "Negotiation", "Won", "Lost"];
const STATUS_COLOR: Record<string, string> = {
  new: "#2E6BE5", lead: "#2E6BE5", open: "#F59E0B", contacted: "#F97316", replied: "#8B5CF6",
  interested: "#28A486", qualified: "#28A486", opportunity: "#28A486", converted: "#14B8A6",
  qualification: "#2E6BE5", prospecting: "#2E6BE5", "demo/presentation": "#F59E0B",
  "proposal/quotation": "#F97316", quotation: "#F97316", negotiation: "#8B5CF6", won: "#16A34A", lost: "#DC2626",
};


function tabSlug(tab: Tab) {
  return tab.toLowerCase().replace(/&/g, "and").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function normalizeTab(value?: string): Tab {
  const v = String(value || "").toLowerCase();
  if (v.includes("report") || v.includes("insight") || v.includes("graph")) return "Reports";
  if (v.includes("lead")) return "Leads";
  if (v.includes("opportun") || v.includes("deal") || v.includes("pipeline")) return "Opportunities";
  if (v === "customers" || v.includes("account")) return "Customers";
  if (v.includes("quote")) return "Quotes";
  if (v.includes("sales-order") || v.includes("sales order")) return "Sales Orders";
  if (v.includes("contract")) return "Contracts";
  if (v.includes("contact")) return "Contacts";
  if (v.includes("activ") || v.includes("task") || v.includes("note")) return "Activities";
  if (v.includes("production") || v.includes("readiness") || v.includes("qa") || v.includes("permission") || v.includes("storage")) return "Production Readiness";
  if (v.includes("automation") || v.includes("sla") || v.includes("assignment")) return "Automation";
  return "Command Center";
}
function fmt(value: unknown) { return value === undefined || value === null || value === "" ? "—" : String(value); }
function cleanText(value: unknown) {
  return String(value ?? "")
    .replace(/<!--fuze_crm_note-->/g, "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}
function dateText(value?: string) { if (!value) return "—"; const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }); }
function money(value: unknown, currency = "ZAR") { if (typeof value === "string" && value.match(/[A-Z]{3}|R|\d/)) return value; return new Intl.NumberFormat("en-ZA", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value || 0)); }

function downloadBlob(filename: string, content: string, type = "text/csv") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function csvEscape(value: unknown) {
  const raw = String(value ?? "");
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}
function exportCsv(filename: string, rows: Record<string, any>[]) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const keys = Array.from(safeRows.reduce<Set<string>>((set, row) => {
    Object.keys(row || {}).forEach((k) => set.add(k));
    return set;
  }, new Set<string>()));
  const csv = [keys.join(","), ...safeRows.map((row) => keys.map((k) => csvEscape(row?.[k])).join(","))].join("\n");
  downloadBlob(filename, csv || "No data");
}
const CHART_COLORS = ["#2563eb", "#14b8a6", "#f97316", "#8b5cf6", "#22c55e", "#ef4444", "#0f172a", "#06b6d4"];
function chartLabel(row: Record<string, any>) { return String(row.label || row.stage || row.status || row.month || row.name || "Not Set"); }
function chartValue(row: Record<string, any>) { return Number(row.value ?? row.total_value ?? row.total ?? row.count ?? 0); }
function ChartTooltip({ active, payload, label, currency, moneyValues }: any) {
  if (!active || !payload?.length) return null;
  return <div className="crm-chart-tooltip"><b>{label}</b>{payload.map((p: any, i: number) => <span key={i}>{p.name}: {moneyValues ? money(p.value, currency || "ZAR") : fmt(p.value)}</span>)}</div>;
}

function statusColor(status?: string) { return STATUS_COLOR[String(status || "").toLowerCase()] || "#64748B"; }
function statusLabel(s: Status) { return s.label || s.name; }
function uniqueStatuses(rows: Status[], fallback: Status[]) { const seen = new Set<string>(); return [...rows, ...fallback].filter((s) => s?.name && !seen.has(s.name) && seen.add(s.name)); }
function simplePipelineStatuses(rows: Status[]) {
  const lookup = new Map(rows.map((s) => [s.name, s]));
  return SIMPLE_DEAL_STAGE_ORDER.map((name) => lookup.get(name) || DEFAULT_DEAL_STATUSES.find((s) => s.name === name) || { name });
}
function dealStageName(value?: string) {
  const stage = String(value || "").trim();
  if (["Prospecting", "Needs Analysis", "Open"].includes(stage)) return "Qualification";
  if (["Quotation", "Proposal", "Quote Sent"].includes(stage)) return "Proposal/Quotation";
  return stage || "Qualification";
}
function unwrap<T = any>(json: any, key?: string): T { const data = json?.data ?? json?.message ?? json ?? {}; return (key ? data?.[key] : data) as T; }
function arrayFrom<T = any>(json: any, keys: string[]): T[] {
  if (Array.isArray(json)) return json as T[];
  if (Array.isArray(json?.data)) return json.data as T[];
  if (Array.isArray(json?.message)) return json.message as T[];
  if (Array.isArray(json?.records)) return json.records as T[];
  const data = json?.data ?? json?.message ?? json ?? {};
  if (Array.isArray(data)) return data as T[];
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key] as T[];
    if (Array.isArray(json?.[key])) return json[key] as T[];
  }
  return [];
}
async function apiFetch(url: string, init?: RequestInit) { const res = await fetch(url, init); const json = await res.json().catch(() => ({})); if (!res.ok) throw new Error(json?.error || json?.message || `Request failed (${res.status})`); return json; }
function fileToBase64(file: File): Promise<{ file_name: string; content: string }> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ file_name: file.name, content: String(reader.result || "") }); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }); }
function StatusBadge({ status }: { status?: string }) { return <span className="crm-status-badge" style={{ ["--s" as string]: statusColor(status) }}>{fmt(status)}</span>; }
function LoadingBlock() { return <div className="crm-loading"><span /> Loading CRM…</div>; }
function ErrorBanner({ message }: { message?: string }) { return message ? <div className="crm-banner warn">{message}</div> : null; }
function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) { return <div className="crm-empty"><b>{title}</b><span>{body}</span>{action}</div>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="crm-field"><span>{label}</span>{children}</label>; }
function Modal({ title, subtitle, width, children, onClose }: { title: string; subtitle?: string; width?: number; children: ReactNode; onClose: () => void }) { return <><div className="crm-modal-backdrop" onClick={onClose} /><section className="crm-modal" style={{ width: `min(94vw, ${width || 720}px)` }}><div className="crm-modal-head"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div><button className="crm-icon-btn" onClick={onClose}>×</button></div>{children}</section></>; }

function CreateLeadModal({ statuses, sources, onClose, onSaved }: { statuses: Status[]; sources: string[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ first_name: "", last_name: "", company: "", email: "", phone: "", source: sources[0] || "Website", status: statuses[0]?.name || "New", city: "", country: "South Africa", website: "" });
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  async function submit() { if (!form.first_name && !form.company) { setError("Add a name or company."); return; } setSaving(true); setError(""); try { await apiFetch("/api/crm/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); onSaved(); } catch (e) { setError(e instanceof Error ? e.message : "Could not create lead"); setSaving(false); } }
  return <Modal title="New Lead" subtitle="Capture a prospect, then qualify and convert it." onClose={onClose}><ErrorBanner message={error} /><div className="crm-form-grid"><Field label="First name"><input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} /></Field><Field label="Last name"><input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} /></Field><Field label="Company"><input value={form.company} onChange={(e) => set("company", e.target.value)} /></Field><Field label="Email"><input value={form.email} onChange={(e) => set("email", e.target.value)} /></Field><Field label="Phone"><input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field><Field label="Website"><input value={form.website} onChange={(e) => set("website", e.target.value)} /></Field><Field label="Source"><select value={form.source} onChange={(e) => set("source", e.target.value)}>{sources.map((s) => <option key={s}>{s}</option>)}</select></Field><Field label="Status"><select value={form.status} onChange={(e) => set("status", e.target.value)}>{statuses.map((s) => <option key={s.name} value={s.name}>{statusLabel(s)}</option>)}</select></Field></div><div className="crm-modal-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={saving} onClick={submit}>{saving ? "Creating…" : "Create Lead"}</button></div></Modal>;
}

function CreateDealModal({ statuses, onClose, onSaved }: { statuses: Status[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ lead_name: "", organization: "", status: statuses[0]?.name || "Qualification", deal_value: "0", probability: "25", expected_closing: "" });
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  async function submit() { setSaving(true); setError(""); try { await apiFetch("/api/crm/deals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, company: form.organization, company_name: form.organization, stage: form.status, sales_stage: form.status, deal_value: Number(form.deal_value), probability: Number(form.probability) }) }); onSaved(); } catch (e) { setError(e instanceof Error ? e.message : "Could not create opportunity"); setSaving(false); } }
  return <Modal title="New Opportunity" subtitle="Create a sales opportunity manually." onClose={onClose}><ErrorBanner message={error} /><div className="crm-form-grid"><Field label="Opportunity title"><input value={form.lead_name} onChange={(e) => set("lead_name", e.target.value)} /></Field><Field label="Account / Company"><input value={form.organization} onChange={(e) => set("organization", e.target.value)} /></Field><Field label="Stage"><select value={form.status} onChange={(e) => set("status", e.target.value)}>{statuses.map((s) => <option key={s.name} value={s.name}>{statusLabel(s)}</option>)}</select></Field><Field label="Value"><input type="number" value={form.deal_value} onChange={(e) => set("deal_value", e.target.value)} /></Field><Field label="Probability %"><input type="number" value={form.probability} onChange={(e) => set("probability", e.target.value)} /></Field><Field label="Expected close"><input type="date" value={form.expected_closing} onChange={(e) => set("expected_closing", e.target.value)} /></Field></div><div className="crm-modal-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={saving} onClick={submit}>{saving ? "Creating…" : "Create Opportunity"}</button></div></Modal>;
}

function SalesDocModal({ record, kind, onClose, onSaved }: { record: DrawerRecord; kind: "quote" | "invoice" | "sales-order" | "contract"; onClose: () => void; onSaved: (message: string) => void }) {
  const blankLine = { item_code: "", item_name: "", item_group: "", uom: "", qty: "1", rate: "0", description: "", save_as_item: true, update_item_master: false };
  const [lines, setLines] = useState([blankLine]);
  const [templates, setTemplates] = useState<any>({});
  const [items, setItems] = useState<Record<string, any>[]>([]);
  const [options, setOptions] = useState<any>({ item_groups: [], uoms: [], warehouses: [], defaults: {} });
  const [termsTemplate, setTermsTemplate] = useState("");
  const [taxTemplate, setTaxTemplate] = useState("");
  const [printFormat, setPrintFormat] = useState("");
  const [emailTemplate, setEmailTemplate] = useState("");
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendEmail, setSendEmail] = useState(kind === "quote" || kind === "invoice");
  const [includePaymentLink, setIncludePaymentLink] = useState(kind === "invoice");
  const [paymentProvider, setPaymentProvider] = useState("payfast");
  const [contractName, setContractName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const docType = kind === "invoice" ? "Sales Invoice" : kind === "sales-order" ? "Sales Order" : kind === "contract" ? "Contract" : "Quotation";
  const docLabel = kind === "quote" ? "Quote" : kind === "invoice" ? "Invoice" : kind === "sales-order" ? "Sales Order" : "Contract";
  useEffect(() => {
    let active = true;
    apiFetch(`/api/crm/sales-options?doctype=${encodeURIComponent(docType)}&limit=150`).then((json) => {
      const data = unwrap<any>(json);
      if (!active) return;
      setItems(data.items || []);
      setTemplates(data.templates || {});
      setOptions(data || {});
      setLines((rows) => rows.map((row) => ({ ...row, item_group: row.item_group || data.item_groups?.[0]?.name || "", uom: row.uom || data.uoms?.[0]?.name || "" })));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [docType]);
  useEffect(() => {
    if (!emailSubject) setEmailSubject(`${docLabel} for ${record.title}`);
    if (!emailBody) setEmailBody(`Good day,\n\nPlease find attached your ${docLabel.toLowerCase()} for review.\n\nKind regards`);
  }, [docLabel, record.title, emailSubject, emailBody]);
  function updateLine(i: number, key: string, value: any) { setLines((rows) => rows.map((row, idx) => idx === i ? { ...row, [key]: value } : row)); }
  function pickItem(i: number, code: string) {
    const item = items.find((x) => String(x.item_code || x.name) === code);
    setLines((rows) => rows.map((row, idx) => idx === i ? {
      ...row,
      item_code: code,
      item_name: item?.item_name || item?.name || row.item_name,
      item_group: item?.item_group || row.item_group,
      uom: item?.stock_uom || row.uom,
      description: item?.description || row.description,
      rate: String(item?.standard_rate ?? row.rate ?? 0),
      save_as_item: false,
      update_item_master: false,
    } : row));
  }
  function addLine() { setLines((rows) => [...rows, { ...blankLine, item_group: options.item_groups?.[0]?.name || "", uom: options.uoms?.[0]?.name || "" }]); }
  function removeLine(i: number) { setLines((rows) => rows.length === 1 ? rows : rows.filter((_, idx) => idx !== i)); }
  function applyEmailTemplate(name: string) {
    setEmailTemplate(name);
    const tpl = (templates.email_templates || []).find((t: any) => t.name === name);
    if (!tpl) return;
    if (tpl.subject) setEmailSubject(tpl.subject);
    const body = cleanText(tpl.response || tpl.message || tpl.content || "");
    if (body) setEmailBody(body);
  }
  const total = lines.reduce((sum, row) => sum + Number(row.qty || 0) * Number(row.rate || 0), 0);
  async function submit() {
    setSaving(true); setError("");
    try {
      const path = `/api/crm/${record.type === "lead" ? "leads" : "deals"}/${record.id}/${kind}`;
      const itemsPayload = lines.map((row) => ({
        item_code: row.item_code || undefined,
        item_name: row.item_name || "Service",
        item_group: row.item_group || undefined,
        uom: row.uom || undefined,
        description: row.description,
        qty: Number(row.qty || 1),
        rate: Number(row.rate || 0),
        save_as_item: Boolean(row.save_as_item),
        update_item_master: Boolean(row.update_item_master),
      }));
      const emailPayload = {
        send_email: sendEmail,
        email_to: emailTo || undefined,
        email_subject: emailSubject || undefined,
        email_body: emailBody || undefined,
        email_template: emailTemplate || undefined,
        print_format: printFormat || undefined,
        include_payment_link: includePaymentLink,
        payment_provider: paymentProvider,
      };
      const payload = kind === "contract"
        ? { contract_name: contractName || `Contract - ${record.title}`, terms_template: termsTemplate, ...emailPayload }
        : { items: itemsPayload, taxes_and_charges: taxTemplate || undefined, tax_template: taxTemplate || undefined, tc_name: termsTemplate || undefined, terms_template: termsTemplate || undefined, ...emailPayload };
      const json = await apiFetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = unwrap<any>(json);
      const id = data?.quotation?.id || data?.invoice?.id || data?.sales_order?.id || data?.contract?.id || "document";
      const emailStatus = data?.email?.sent ? " and emailed with PDF" : sendEmail ? " created. Email still needs review." : " created";
      onSaved(`${docLabel} ${id}${emailStatus}`);
    } catch (e) { setError(e instanceof Error ? e.message : `Could not create ${kind}`); setSaving(false); }
  }
  const title = kind === "quote" ? "Create & Send Quote" : kind === "invoice" ? "Create & Send Invoice" : kind === "sales-order" ? "Create Sales Order" : "Create Contract";
  return <Modal title={title} subtitle="Build the document, apply templates, and email the PDF from the system." onClose={onClose} width={1040}><ErrorBanner message={error} />
    <div className="crm-sales-builder">
      <section className="crm-sales-main">
        {kind === "contract" ? <div className="crm-form-grid"><Field label="Contract name"><input value={contractName} onChange={(e) => setContractName(e.target.value)} placeholder={`Contract - ${record.title}`} /></Field></div> : <div className="crm-line-items polished"><div className="crm-line-head"><div><b>Items and services</b><span>Add existing products or create reusable service items while preparing the document.</span></div><button className="btn btn-small" onClick={addLine}>Add line</button></div>{lines.map((line, i) => <div className="crm-line-card" key={i}><div className="crm-line-row top"><Field label="Catalogue item"><select value={line.item_code} onChange={(e) => pickItem(i, e.target.value)}><option value="">Manual / new item</option>{items.map((item) => <option key={item.item_code || item.name} value={item.item_code || item.name}>{item.item_name || item.name}</option>)}</select></Field><Field label="Item / service name"><input placeholder="e.g. Website Package" value={line.item_name} onChange={(e) => updateLine(i, "item_name", e.target.value)} /></Field><Field label="Qty"><input type="number" value={line.qty} onChange={(e) => updateLine(i, "qty", e.target.value)} /></Field><Field label="Rate"><input type="number" value={line.rate} onChange={(e) => updateLine(i, "rate", e.target.value)} /></Field></div><div className="crm-line-row"><Field label="Group"><select value={line.item_group} onChange={(e) => updateLine(i, "item_group", e.target.value)}><option value="">Default</option>{(options.item_groups || []).map((g: any) => <option key={g.name} value={g.name}>{g.item_group_name || g.name}</option>)}</select></Field><Field label="UOM"><select value={line.uom} onChange={(e) => updateLine(i, "uom", e.target.value)}><option value="">Default</option>{(options.uoms || []).map((u: any) => <option key={u.name} value={u.name}>{u.uom_name || u.name}</option>)}</select></Field><Field label="Description"><input value={line.description} onChange={(e) => updateLine(i, "description", e.target.value)} placeholder="Line description" /></Field><button className="btn btn-small danger" onClick={() => removeLine(i)}>Remove</button></div><div className="crm-inline-options"><label><input type="checkbox" checked={Boolean(line.save_as_item)} onChange={(e) => updateLine(i, "save_as_item", e.target.checked)} disabled={Boolean(line.item_code)} /> Save as reusable item</label><label><input type="checkbox" checked={Boolean(line.update_item_master)} onChange={(e) => updateLine(i, "update_item_master", e.target.checked)} disabled={!line.item_code} /> Update selected item details</label><b>{money(Number(line.qty || 0) * Number(line.rate || 0))}</b></div></div>)}<div className="crm-doc-total">Document total {money(total)}</div></div>}
      </section>
      <aside className="crm-sales-side">
        <Field label="Terms template"><select value={termsTemplate} onChange={(e) => setTermsTemplate(e.target.value)}><option value="">Default terms</option>{(templates.terms || []).map((t: any) => <option key={t.name} value={t.name}>{t.title || t.name}</option>)}</select></Field>
        {kind !== "contract" && <Field label="Tax template"><select value={taxTemplate} onChange={(e) => setTaxTemplate(e.target.value)}><option value="">No tax template</option>{(templates.taxes || []).map((t: any) => <option key={t.name} value={t.name}>{t.title || t.name}</option>)}</select></Field>}
        <Field label="Print template"><select value={printFormat} onChange={(e) => setPrintFormat(e.target.value)}><option value="">Default print format</option>{(templates.print_formats || []).map((t: any) => <option key={t.name} value={t.name}>{t.name}</option>)}</select></Field>
        {(kind === "quote" || kind === "invoice") && <div className="crm-email-box"><label className="crm-check"><input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} /> Email PDF to customer</label>{kind === "invoice" && <><label className="crm-check"><input type="checkbox" checked={includePaymentLink} onChange={(e) => setIncludePaymentLink(e.target.checked)} /> Add online payment link</label>{includePaymentLink && <Field label="Payment provider"><select value={paymentProvider} onChange={(e) => setPaymentProvider(e.target.value)}><option value="payfast">PayFast</option><option value="yoco">Yoco</option><option value="ikhokha">iKhokha</option></select></Field>}</>}<Field label="Email template"><select value={emailTemplate} onChange={(e) => applyEmailTemplate(e.target.value)}><option value="">Write custom email</option>{(templates.email_templates || []).map((t: any) => <option key={t.name} value={t.name}>{t.subject || t.name}</option>)}</select></Field><Field label="Recipient"><input value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="customer@email.com" /></Field><Field label="Subject"><input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} /></Field><Field label="Message"><textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={6} /></Field></div>}
      </aside>
    </div>
    <div className="crm-modal-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={saving} onClick={submit}>{saving ? "Processing…" : title}</button></div></Modal>;
}

function DetailDrawer({ record, crmMode, onClose, onRefresh }: { record: DrawerRecord; crmMode: CrmMode; onClose: () => void; onRefresh: () => void }) {
  const [active, setActive] = useState<"timeline" | "emails" | "calls" | "notes" | "tasks" | "comments" | "attachments">("timeline");
  const [detail, setDetail] = useState<any>(null); const [life, setLife] = useState<Customer360 | null>(null); const [loading, setLoading] = useState(true); const [message, setMessage] = useState(""); const [modal, setModal] = useState<"quote" | "invoice" | "sales-order" | "contract" | null>(null); const [showCustomer360, setShowCustomer360] = useState(false); const [showLifecycle, setShowLifecycle] = useState(false);
  const [note, setNote] = useState(""); const [task, setTask] = useState(""); const [comment, setComment] = useState(""); const [callNote, setCallNote] = useState(""); const [emailTo, setEmailTo] = useState(""); const [emailSubject, setEmailSubject] = useState(""); const [emailBody, setEmailBody] = useState(""); const [fileUrl, setFileUrl] = useState(""); const [fileProvider, setFileProvider] = useState("system"); const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const doctype = record.type === "lead" ? (crmMode === "frappe_crm" ? "CRM Lead" : "Lead") : (crmMode === "frappe_crm" ? "CRM Deal" : "Opportunity");
  async function load() { setLoading(true); try { const [detailJson, lifeJson] = await Promise.all([apiFetch(record.type === "lead" ? `/api/crm/leads/${record.id}` : `/api/crm/deals/${record.id}`), apiFetch(`/api/crm/customer360?${record.type}=${encodeURIComponent(record.id)}`)]); setDetail(unwrap(detailJson)); setLife(unwrap<Customer360>(lifeJson)); } catch { setDetail(null); setLife(null); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, [record.id]);
  async function convertOpportunity() { if (record.type !== "lead") return; try {
    const leadData = detail?.lead || detail || {};
    const companyName = leadData.company_name || leadData.company || record.title || leadData.lead_name || leadData.first_name || "Customer Opportunity";
    const json = await apiFetch(`/api/crm/leads/${record.id}/convert`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company_name: companyName, stage: "Qualification", status: "Open" }) });
    const id = unwrap<any>(json)?.deal?.id || "opportunity"; setMessage(`Lead converted to opportunity: ${id}`); onRefresh(); await load();
  } catch (e) { setMessage(e instanceof Error ? e.message : "Could not convert lead"); } }
  async function convertCustomer() { try { const path = record.type === "lead" ? `/api/crm/leads/${record.id}/customer` : `/api/crm/deals/${record.id}/customer`; const json = await apiFetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); const id = unwrap<any>(json)?.customer?.id || "customer"; setMessage(`Customer linked: ${id}`); onRefresh(); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : "Could not create customer"); } }
  async function addNote() { if (!note.trim()) return; try { await apiFetch("/api/crm/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference_doctype: doctype, reference_name: record.id, title: "Sales note", content: note }) }); setNote(""); setMessage("Note saved"); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : "Could not save note"); } }
  async function addTask() { if (!task.trim()) return; try { await apiFetch("/api/crm/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference_doctype: doctype, reference_name: record.id, title: task, status: "Open", priority: "Medium" }) }); setTask(""); setMessage("Task created"); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : "Could not create task"); } }
  async function addComment() { if (!comment.trim()) return; try { await apiFetch("/api/crm/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference_doctype: doctype, reference_name: record.id, content: comment }) }); setComment(""); setMessage("Comment added"); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : "Could not add comment"); } }
  async function addCall() { if (!callNote.trim()) return; try { await apiFetch("/api/crm/call-logs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference_doctype: doctype, reference_name: record.id, type: "Outgoing", status: "Completed", note: callNote }) }); setCallNote(""); setMessage("Call logged"); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : "Could not log call"); } }
  async function sendEmail() { if (!emailTo.trim() || !emailSubject.trim()) return; try { await apiFetch("/api/crm/emails", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference_doctype: doctype, reference_name: record.id, to: emailTo, subject: emailSubject, content: emailBody || emailSubject }) }); setEmailSubject(""); setEmailBody(""); setMessage("Email sent and logged"); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : "Could not send email"); } }
  async function attachFile() { try { const payload: Record<string, any> = { reference_doctype: doctype, reference_name: record.id, provider: fileProvider }; if (selectedFile && fileProvider === "system") Object.assign(payload, await fileToBase64(selectedFile)); else if (fileUrl.trim()) { payload.file_url = fileUrl.trim(); payload.file_name = fileUrl.trim().split("/").pop() || "Cloud file"; } else { setMessage("Choose a file or paste a cloud file link"); return; } await apiFetch("/api/crm/attachments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); setFileUrl(""); setSelectedFile(null); setMessage(fileProvider === "system" ? "Attachment uploaded" : "Cloud file linked"); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : "Could not attach file"); } }
  const comms = (detail?.communications || []) as Activity[]; const notes = (detail?.notes || []) as any[]; const tasks = (detail?.tasks || []) as any[]; const comments = (detail?.comments || []) as any[]; const calls = (detail?.call_logs || []) as any[]; const attachments = (detail?.attachments || []) as any[]; const activity = (detail?.activity || comms || []) as any[];
  return <><div className="crm-drawer-backdrop" onClick={onClose} /><aside className="crm-drawer"><div className="crm-drawer-head"><div><span className="demo-eyebrow">{record.type === "lead" ? "Lead details" : "Opportunity details"}</span><h2>{record.title}</h2><p>{record.type === "lead" ? "Lead" : "Opportunity"} · {record.id}</p></div><button className="crm-icon-btn" onClick={onClose}>×</button></div><div className="crm-drawer-actions">{record.type === "lead" && <button className="btn btn-primary" onClick={convertOpportunity}>Convert to Opportunity</button>}<button className="btn" onClick={convertCustomer}>Create / Link Customer</button><button className="btn" onClick={() => setShowLifecycle(true)}>{record.type === "lead" ? "Lead Lifecycle" : "Opportunity Lifecycle"}</button><button className="btn" onClick={() => setShowCustomer360(true)}>Customer 360</button><button className="btn" onClick={() => setModal("quote")}>Send Quote</button><button className="btn" onClick={() => setModal("sales-order")}>Create Sales Order</button><button className="btn" onClick={() => setModal("invoice")}>Send Invoice</button><button className="btn" onClick={() => setModal("contract")}>Create Contract</button></div>{message && <div className="crm-banner">{message}</div>}<div className="crm-detail-tabs">{(["timeline", "emails", "calls", "notes", "tasks", "comments", "attachments"] as const).map((t) => <button key={t} className={active === t ? "active" : ""} onClick={() => setActive(t)}>{t}</button>)}</div>{loading ? <LoadingBlock /> : <div className="crm-drawer-body">{active === "timeline" && (activity.length ? activity.map((a, i) => <div className="crm-timeline-row" key={a.name || a.title || i}><b>{a.title || a.subject || a.type || a.communication_type || "CRM activity"}</b><span>{fmt(a.owner || a.sender || a.status)} · {dateText(a.creation)}</span>{a.content && <p>{cleanText(a.content)}</p>}</div>) : <EmptyState title="No timeline yet" body="Emails, calls, notes, comments and tasks will appear here." />)}{active === "emails" && <><div className="crm-composer"><input placeholder="Customer email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} /><input placeholder="Subject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} /><textarea placeholder="Email message…" value={emailBody} onChange={(e) => setEmailBody(e.target.value)} /><button className="btn btn-primary" onClick={sendEmail}>Send Email</button></div>{comms.length ? comms.map((a, i) => <div className="crm-mini-card" key={a.name || i}><b>{a.subject || "Email"}</b><p>{cleanText(a.content)}</p><span>{fmt(a.sender)} · {dateText(a.creation)}</span></div>) : <EmptyState title="No emails" body="Sent and received emails will appear here." />}</>}{active === "calls" && <><div className="crm-composer"><textarea placeholder="Call summary…" value={callNote} onChange={(e) => setCallNote(e.target.value)} /><button className="btn btn-primary" onClick={addCall}>Log Call</button></div>{calls.length ? calls.map((c, i) => <div className="crm-mini-card" key={c.name || i}><b>{fmt(c.type || "Call")} · {fmt(c.status)}</b><p>{cleanText(c.note)}</p><span>{fmt(c.caller || c.receiver)} · {dateText(c.creation)}</span></div>) : <EmptyState title="No calls" body="Customer calls and summaries will appear here." />}</>}{active === "notes" && <><div className="crm-composer"><textarea placeholder="Internal sales note…" value={note} onChange={(e) => setNote(e.target.value)} /><button className="btn btn-primary" onClick={addNote}>Save Note</button></div>{notes.length ? notes.map((n) => <div className="crm-mini-card" key={n.name}><b>{n.title || "Note"}</b><p>{cleanText(n.content)}</p><span>{fmt(n.owner)} · {dateText(n.creation)}</span></div>) : <EmptyState title="No notes" body="Keep selling context here." />}</>}{active === "tasks" && <><div className="crm-composer compact"><input placeholder="Follow-up task…" value={task} onChange={(e) => setTask(e.target.value)} /><button className="btn btn-primary" onClick={addTask}>Add Task</button></div>{tasks.length ? tasks.map((t) => <div className="crm-mini-card" key={t.name}><b>{t.title || t.description || "Task"}</b><span>{fmt(t.status)} · Due {dateText(t.due_date || t.date)}</span></div>) : <EmptyState title="No tasks" body="Add the next sales action." />}</>}{active === "comments" && <><div className="crm-composer"><textarea placeholder="Team comment…" value={comment} onChange={(e) => setComment(e.target.value)} /><button className="btn btn-primary" onClick={addComment}>Post</button></div>{comments.length ? comments.map((c) => <div className="crm-mini-card" key={c.name}><p>{cleanText(c.content)}</p><span>{fmt(c.comment_by)} · {dateText(c.creation)}</span></div>) : <EmptyState title="No comments" body="Team comments will appear here." />}</>}{active === "attachments" && <><div className="crm-storage-panel"><div><b>Attachments</b><p>Upload to your account storage, or link files from Google Drive and Dropbox.</p></div><select value={fileProvider} onChange={(e) => setFileProvider(e.target.value)}><option value="system">System storage</option><option value="google_drive">Google Drive link</option><option value="dropbox">Dropbox link</option></select></div><div className="crm-composer compact">{fileProvider === "system" ? <input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} /> : <input placeholder={fileProvider === "google_drive" ? "Paste Google Drive file link" : "Paste Dropbox file link"} value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />}<button className="btn btn-primary" onClick={attachFile}>{fileProvider === "system" ? "Upload" : "Link file"}</button></div><p className="crm-help-text">Need more storage? The account owner can upgrade storage, or connect Google Drive/Dropbox and keep files in their existing cloud folders.</p>{attachments.length ? attachments.map((f) => <div className="crm-mini-card" key={f.name}><b>{f.file_name || f.name}</b><span>{fmt(f.file_url)} · {dateText(f.creation)}</span>{f.file_url && <a className="btn btn-small" href={f.file_url} target="_blank" rel="noreferrer">Open file</a>}</div>) : <EmptyState title="No attachments" body="Quotes, briefs and documents linked to this record will appear here." />}</>}</div>}</aside>{showLifecycle && <Modal title={record.type === "lead" ? "Lead Lifecycle" : "Opportunity Lifecycle"} subtitle="Follow the full sales journey without crowding the activity tabs." onClose={() => setShowLifecycle(false)} width={980}><LeadLifecyclePanel record={record} detail={detail} life={life} activity={activity} /></Modal>}{showCustomer360 && <Modal title="Customer 360" subtitle="Complete customer lifecycle, documents and payment history." onClose={() => setShowCustomer360(false)} width={980}><Customer360Panel life={life} /></Modal>}{modal && <SalesDocModal record={record} kind={modal} onClose={() => setModal(null)} onSaved={(msg) => { setModal(null); setMessage(msg); void load(); onRefresh(); }} />}</>;
}


function LeadLifecyclePanel({ record, detail, life, activity }: { record: DrawerRecord; detail: any; life: Customer360 | null; activity: Record<string, any>[] }) {
  const lead = detail?.lead || detail?.deal || detail || {};
  const status = record.type === "lead" ? (lead.status || "Lead") : (lead.stage || lead.sales_stage || lead.status || "Opportunity");
  const customer = life?.customer;
  const steps = [
    { key: "lead", title: "Lead Captured", body: "Prospect details, source and contact information are stored.", done: true },
    { key: "qualified", title: "Qualified", body: "Sales team confirms interest and prepares the opportunity.", done: record.type === "deal" || ["Open", "Interested", "Opportunity", "Converted", "Qualified"].includes(String(status)) },
    { key: "opportunity", title: "Opportunity", body: "The lead becomes an active deal in the pipeline.", done: record.type === "deal" || Boolean((life?.opportunities || []).length) },
    { key: "customer", title: "Customer Linked", body: "Customer record is created or linked for sales documents.", done: Boolean(customer) },
    { key: "quote", title: "Quote Sent", body: "A quotation is prepared and sent to the customer.", done: Boolean((life?.quotations || []).length) },
    { key: "order", title: "Sales Order", body: "Accepted quote can become a confirmed sales order.", done: Boolean((life?.sales_orders || []).length) },
    { key: "invoice", title: "Invoice & Payment", body: "Invoice is sent with payment link and tracked to payment.", done: Boolean((life?.invoices || []).length || (life?.payments || []).length) },
  ];
  return <div className="crm-lifecycle-modal"><section className="crm-life-summary"><div><span className="demo-eyebrow">Current stage</span><h3>{fmt(status)}</h3><p>{record.title} · {record.id}</p></div><StatusBadge status={status} /></section><div className="crm-life-steps">{steps.map((s, i) => <div key={s.key} className={s.done ? "crm-life-step done" : "crm-life-step"}><div className="crm-life-dot">{s.done ? "✓" : i + 1}</div><div><b>{s.title}</b><p>{s.body}</p></div></div>)}</div><div className="crm-split-grid"><div className="crm-mini-card"><b>Customer</b><span>{customer?.customer_name || customer?.name || "No customer linked yet"}</span></div><div className="crm-mini-card"><b>Recent activity</b><span>{activity.length ? `${activity.length} activity item(s) recorded` : "No activity recorded yet"}</span></div></div></div>;
}

function Customer360Panel({ life }: { life: Customer360 | null }) {
  const customer = life?.customer;
  return <div className="crm-360-modal-grid"><div className="crm-mini-card crm-360-summary"><b>{customer?.customer_name || customer?.name || "No customer linked yet"}</b><span>{customer ? `Customer ID: ${customer.name}` : "Create/link the customer to unlock quotations, sales orders, invoices, contracts and payments."}</span></div><MiniList title="Quotations" rows={life?.quotations || []} valueKey="grand_total" dateKey="transaction_date" /><MiniList title="Sales Orders" rows={life?.sales_orders || []} valueKey="grand_total" dateKey="transaction_date" /><MiniList title="Invoices" rows={life?.invoices || []} valueKey="grand_total" dateKey="posting_date" /><MiniList title="Contracts" rows={life?.contracts || []} valueKey="grand_total" dateKey="start_date" /><MiniList title="Payments" rows={life?.payments || []} valueKey="paid_amount" dateKey="posting_date" /></div>;
}
function MiniList({ title, rows, valueKey, dateKey }: { title: string; rows: Record<string, any>[]; valueKey: string; dateKey: string }) { return <div className="crm-mini-card"><b>{title}</b>{rows.length ? rows.slice(0, 5).map((r) => <span key={r.name}>{r.name} · {fmt(r.status)} · {dateText(r[dateKey])} · {money(r[valueKey] || 0, r.currency || "ZAR")}</span>) : <span>No {title.toLowerCase()} yet.</span>}</div>; }

function CommandCenter({ cards, leads, deals, currency, setTab, onOpen }: { cards: Cards | null; leads: Lead[]; deals: Deal[]; currency: string; setTab: (tab: Tab) => void; onOpen: (r: DrawerRecord) => void }) {
  const weighted = deals.reduce((sum, d) => sum + (Number(d.raw_value || 0) * Number(d.probability || 0)) / 100, 0);
  const stats = [
    { label: "Leads", value: cards?.leads ?? leads.length, hint: "Capture and qualify", tab: "Leads" as Tab },
    { label: "Opportunities", value: cards?.deals ?? deals.length, hint: "Active sales pipeline", tab: "Opportunities" as Tab },
    { label: "Contacts", value: cards?.contacts ?? 0, hint: "People linked to customers", tab: "Contacts" as Tab },
    { label: "Pipeline", value: money(cards?.pipeline_value ?? 0, currency), hint: "Open value", tab: "Opportunities" as Tab },
    { label: "Forecast", value: money(weighted, currency), hint: "Probability weighted", tab: "Opportunities" as Tab },
    { label: "Overdue Tasks", value: cards?.overdue_tasks ?? 0, hint: "Needs follow-up", tab: "Activities" as Tab },
  ];
  return <div className="crm-command"><div className="crm-stat-grid">{stats.map((s) => <button key={s.label} className="crm-stat-card" onClick={() => setTab(s.tab)}><span>{s.label}</span><b>{s.value}</b><small>{s.hint}</small></button>)}</div><div className="crm-split-grid"><section className="demo-panel"><div className="demo-panel-head"><div><h3>Lead Queue</h3><p>New prospects to qualify.</p></div><button className="btn" onClick={() => setTab("Leads")}>View all</button></div><div className="crm-list-panel">{leads.slice(0, 6).map((l) => <button key={l.id} className="crm-row-card" onClick={() => onOpen({ id: l.id, type: "lead", title: l.name || l.company || l.id })}><div><b>{l.name || l.company || l.id}</b><span>{fmt(l.company)} · {fmt(l.email || l.phone)}</span></div><StatusBadge status={l.status} /></button>)}{!leads.length && <EmptyState title="No leads yet" body="Create your first lead." />}</div></section><section className="demo-panel"><div className="demo-panel-head"><div><h3>Opportunity Focus</h3><p>Work deals towards quote and invoice.</p></div><button className="btn" onClick={() => setTab("Opportunities")}>Pipeline</button></div><div className="crm-list-panel">{deals.slice(0, 6).map((d) => <button key={d.id} className="crm-row-card" onClick={() => onOpen({ id: d.id, type: "deal", title: d.title || d.id })}><div><b>{d.title || d.id}</b><span>{fmt(d.organization)} · {fmt(d.value || money(d.raw_value, currency))}</span></div><StatusBadge status={d.stage} /></button>)}{!deals.length && <EmptyState title="No opportunities yet" body="Convert a qualified lead to start the pipeline." />}</div></section></div></div>;
}

function LeadsView({ statuses, sources, onOpen, refreshSignal, onRefresh }: { statuses: Status[]; sources: string[]; onOpen: (r: DrawerRecord) => void; refreshSignal: number; onRefresh: () => void }) {
  const [rows, setRows] = useState<Lead[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [search, setSearch] = useState(""); const [status, setStatus] = useState("all"); const [showCreate, setShowCreate] = useState(false);
  async function load() { setLoading(true); setError(""); try { const q = new URLSearchParams({ limit: "100", offset: "0" }); if (search) q.set("search", search); if (status !== "all") q.set("status", status); const json = await apiFetch(`/api/crm/leads?${q}`); setRows(arrayFrom<Lead>(json, ["leads"])); } catch (e) { setError(e instanceof Error ? e.message : "Could not load leads"); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, [refreshSignal]);
  async function updateStatus(lead: Lead, value: string) { try { await apiFetch(`/api/crm/leads/${lead.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: value }) }); await load(); onRefresh(); } catch (e) { setError(e instanceof Error ? e.message : "Could not update lead"); } }
  async function convert(lead: Lead) { try { await apiFetch(`/api/crm/leads/${lead.id}/convert`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company_name: lead.company || lead.name || lead.id, stage: "Qualification", status: "Open" }) }); await load(); onRefresh(); } catch (e) { setError(e instanceof Error ? e.message : "Could not convert lead"); } }
  return <section className="demo-panel"><div className="demo-panel-head crm-toolbar"><div><h3>Leads</h3><p>Capture prospects and convert qualified leads into opportunities.</p></div><div className="crm-toolbar-actions"><input placeholder="Search leads…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} /><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option>{statuses.map((s) => <option key={s.name} value={s.name}>{statusLabel(s)}</option>)}</select><button className="btn" onClick={load}>Search</button><button className="btn btn-primary" onClick={() => setShowCreate(true)}>New Lead</button></div></div><ErrorBanner message={error} />{loading ? <LoadingBlock /> : <div className="crm-table-wrap"><table className="demo-table crm-table"><thead><tr><th>Lead</th><th>Company</th><th>Contact</th><th>Source</th><th>Status</th><th>Next step</th></tr></thead><tbody>{rows.map((l) => <tr key={l.id} onClick={() => onOpen({ id: l.id, type: "lead", title: l.name || l.company || l.id })}><td><b>{l.name || l.id}</b><small>{l.id}</small></td><td>{fmt(l.company)}</td><td>{fmt(l.email || l.phone)}</td><td>{fmt(l.source)}</td><td><select value={l.status || ""} onClick={(e) => e.stopPropagation()} onChange={(e) => updateStatus(l, e.target.value)}>{statuses.map((s) => <option key={s.name} value={s.name}>{statusLabel(s)}</option>)}</select></td><td><button className="btn btn-small" onClick={(e) => { e.stopPropagation(); convert(l); }}>Convert</button></td></tr>)}</tbody></table>{!rows.length && <EmptyState title="No leads found" body="Create or search for a lead." />}</div>}{showCreate && <CreateLeadModal statuses={statuses} sources={sources} onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); void load(); onRefresh(); }} />}</section>;
}

function OpportunitiesView({ statuses, onOpen, refreshSignal, onRefresh, currency }: { statuses: Status[]; onOpen: (r: DrawerRecord) => void; refreshSignal: number; onRefresh: () => void; currency: string }) {
  const [rows, setRows] = useState<Deal[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [view, setView] = useState<"board" | "list">("board"); const [showCreate, setShowCreate] = useState(false);
  async function load() { setLoading(true); setError(""); try { const json = await apiFetch("/api/crm/deals?limit=120&offset=0"); setRows(arrayFrom<Deal>(json, ["deals", "opportunities"])); } catch (e) { setError(e instanceof Error ? e.message : "Could not load opportunities"); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, [refreshSignal]);
  async function move(deal: Deal, stage: string) { try { await apiFetch(`/api/crm/deals/${deal.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: stage === "Won" ? "Converted" : stage === "Lost" ? "Lost" : "Open", sales_stage: stage, stage }) }); await load(); onRefresh(); } catch (e) { setError(e instanceof Error ? e.message : "Could not update opportunity"); } }
  const columns = uniqueStatuses(statuses, DEFAULT_DEAL_STATUSES);
  return <section className="demo-panel"><div className="demo-panel-head crm-toolbar"><div><h3>Opportunities</h3><p>Move opportunities through a simple CRM pipeline: Qualify → Quote → Negotiate → Won/Lost.</p></div><div className="crm-toolbar-actions"><button className="btn" onClick={() => setView(view === "board" ? "list" : "board")}>{view === "board" ? "List" : "Board"} view</button><button className="btn" onClick={load}>Refresh</button><button className="btn btn-primary" onClick={() => setShowCreate(true)}>New Opportunity</button></div></div><ErrorBanner message={error} />{loading ? <LoadingBlock /> : view === "board" ? <div className="crm-kanban">{columns.map((s) => { const col = rows.filter((d) => dealStageName(d.stage).toLowerCase() === s.name.toLowerCase()); return <div className="crm-kanban-col" key={s.name}><div className="crm-kanban-head"><b>{statusLabel(s)}</b><span>{col.length}</span></div>{col.map((d) => <button key={d.id} className="crm-deal-card" onClick={() => onOpen({ id: d.id, type: "deal", title: d.title || d.id })}><b>{d.title || d.id}</b><p>{fmt(d.organization)} · {fmt(d.owner)}</p><strong>{fmt(d.value || money(d.raw_value, currency))}</strong><small>{Number(d.probability || 0)}% · Close {dateText(d.expected_close)}</small><div className="crm-card-actions" onClick={(e) => e.stopPropagation()}>{columns.map((next) => <button title={statusLabel(next)} key={next.name} onClick={() => move(d, next.name)} />)}</div></button>)}</div>; })}</div> : <div className="crm-table-wrap"><table className="demo-table crm-table"><thead><tr><th>Opportunity</th><th>Account</th><th>Stage</th><th>Value</th><th>Probability</th><th>Close</th></tr></thead><tbody>{rows.map((d) => <tr key={d.id} onClick={() => onOpen({ id: d.id, type: "deal", title: d.title || d.id })}><td><b>{d.title || d.id}</b><small>{d.id}</small></td><td>{fmt(d.organization)}</td><td><StatusBadge status={d.stage} /></td><td>{fmt(d.value || money(d.raw_value, currency))}</td><td>{Number(d.probability || 0)}%</td><td>{dateText(d.expected_close)}</td></tr>)}</tbody></table></div>}{!rows.length && !loading && <EmptyState title="No opportunities yet" body="Convert a qualified lead, then create a quote or invoice from the drawer." />}{showCreate && <CreateDealModal statuses={statuses} onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); void load(); onRefresh(); }} />}</section>;
}

function RevenueDocsView({ module, title, subtitle, refreshSignal }: { module: string; title: string; subtitle: string; refreshSignal: number }) {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    setLoading(true); setError("");
    apiFetch(module === "customers" ? "/api/crm/customers?limit=80" : module === "contacts" ? "/api/crm/contacts?limit=80" : `/api/crm/${module}?limit=80`).then((json) => {
      const MODULE_KEYS: Record<string, string[]> = { customers: ["data", "customers", "records"], contacts: ["data", "contacts", "records"], quotes: ["data", "quotes", "quotations", "records"], "sales-orders": ["data", "sales_orders", "orders", "records"], contracts: ["data", "contracts", "records"] };
      const data = arrayFrom<Record<string, any>>(json, MODULE_KEYS[module] || ["data", "records"]);
      setRows(data);
    }).catch((e) => setError(e instanceof Error ? e.message : `Could not load ${title.toLowerCase()}.`)).finally(() => setLoading(false));
  }, [module, title, refreshSignal]);
  return <section className="demo-panel">
    <div className="demo-panel-head"><div><h3>{title}</h3><p>{subtitle}</p></div></div>
    <ErrorBanner message={error} />
    {loading ? <LoadingBlock /> : <div className="crm-table-wrap"><table className="demo-table crm-table"><thead><tr><th>Record</th><th>Customer / Party</th><th>Status</th><th>Date</th><th>Amount</th></tr></thead><tbody>{rows.map((r, index) => <tr key={String(r.name || r.id || index)}><td><b>{fmt(r.name || r.id)}</b><small>{fmt(r.title || r.subject || r.contract_name)}</small></td><td>{fmt(r.customer_name || r.customer || r.party_name)}</td><td><StatusBadge status={String(r.status || r.workflow_state || "Draft")} /></td><td>{dateText(String(r.transaction_date || r.posting_date || r.start_date || r.modified || ""))}</td><td>{r.grand_total !== undefined || r.total !== undefined ? money(r.grand_total ?? r.total, r.currency || "ZAR") : "—"}</td></tr>)}</tbody></table>{!rows.length && <EmptyState title={`No ${title.toLowerCase()} yet`} body="Create records from a lead or opportunity using the CRM drawer." />}</div>}
  </section>;
}
function ContactsView({ refreshSignal }: { refreshSignal: number }) { const [rows, setRows] = useState<Contact[]>([]); const [loading, setLoading] = useState(true); useEffect(() => { apiFetch("/api/crm/contacts?limit=80").then((j) => setRows(arrayFrom<Contact>(j, ["contacts", "data", "records"]))).finally(() => setLoading(false)); }, [refreshSignal]); return <section className="demo-panel"><div className="demo-panel-head"><div><h3>Contacts</h3><p>People linked to leads, opportunities and customers.</p></div></div>{loading ? <LoadingBlock /> : <div className="crm-card-grid">{rows.map((c) => <div className="crm-person-card" key={c.id}><div className="crm-avatar">{(c.name || "?").slice(0, 1)}</div><div><b>{c.name || c.id}</b><span>{fmt(c.company)} · {fmt(c.designation)}</span><small>{fmt(c.email || c.phone)}</small></div></div>)}{!rows.length && <EmptyState title="No contacts" body="Contacts are created directly or during conversion." />}</div>}</section>; }

function maxValue(rows: Record<string, any>[]) { return Math.max(1, ...rows.map((r) => Number(r.value || r.total_value || r.weighted_value || 0))); }

function MetricCard({ label, value, hint }: { label: string; value: ReactNode; hint: string }) {
  return <div className="crm-report-metric"><span>{label}</span><b>{value}</b><small>{hint}</small></div>;
}
function ModernChartCard({ title, subtitle, rows, type = "bar", currency = "ZAR", moneyValues = false, exportName }: { title: string; subtitle: string; rows: Record<string, any>[]; type?: "bar" | "area" | "pie" | "combo"; currency?: string; moneyValues?: boolean; exportName: string }) {
  const data = (rows || []).map((row) => ({ ...row, label: chartLabel(row), value: chartValue(row), weighted_value: Number(row.weighted_value || 0), count: Number(row.count || row.value || 0) }));
  const total = data.reduce((sum, r) => sum + Number(r.value || 0), 0);
  return <section className="crm-chart-card">
    <div className="crm-chart-head"><div><h3>{title}</h3><p>{subtitle}</p></div><button className="btn btn-small" onClick={() => exportCsv(`${exportName}.csv`, data)}>Export</button></div>
    <div className="crm-chart-body">
      {!data.length ? <EmptyState title="No report data yet" body="Create CRM records and this chart will update automatically." /> : <ResponsiveContainer width="100%" height={300}>
        {type === "pie" ? <PieChart><Tooltip content={<ChartTooltip currency={currency} moneyValues={moneyValues} />} /><Pie data={data} dataKey="value" nameKey="label" innerRadius={70} outerRadius={105} paddingAngle={3}>{data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Legend /></PieChart>
        : type === "area" ? <AreaChart data={data}><defs><linearGradient id={`${exportName}-fill`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.35}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip content={<ChartTooltip currency={currency} moneyValues={moneyValues} />} /><Area type="monotone" dataKey="value" name={moneyValues ? "Value" : "Count"} stroke="#2563eb" fill={`url(#${exportName}-fill)`} strokeWidth={3} /></AreaChart>
        : type === "combo" ? <ComposedChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip content={<ChartTooltip currency={currency} moneyValues />} /><Legend /><Bar dataKey="value" name="Pipeline value" radius={[8,8,0,0]} fill="#2563eb" /><Line type="monotone" dataKey="weighted_value" name="Weighted forecast" stroke="#14b8a6" strokeWidth={3} /></ComposedChart>
        : <BarChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip content={<ChartTooltip currency={currency} moneyValues={moneyValues} />} /><Bar dataKey="value" name={moneyValues ? "Value" : "Count"} radius={[8,8,0,0]}>{data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Bar></BarChart>}
      </ResponsiveContainer>}
    </div>
    <div className="crm-chart-total"><span>Total</span><b>{moneyValues ? money(total, currency) : total}</b></div>
  </section>;
}
function CrmReportsView() {
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { setLoading(true); apiFetch("/api/crm/reports").then((json) => setData(unwrap<Record<string, any>>(json))).catch((e) => setError(e instanceof Error ? e.message : "Could not load CRM reports")).finally(() => setLoading(false)); }, []);
  const cards = data?.cards || {};
  const pipeline = (data?.pipeline || []) as Record<string, any>[];
  const currency = data?.currency || "ZAR";
  const weighted = pipeline.reduce((sum, r) => sum + Number(r.weighted_value || 0), 0);
  const totalPipeline = pipeline.reduce((sum, r) => sum + Number(r.value || r.total_value || 0), 0);
  const exportAll = () => exportCsv("crm-report-summary.csv", [cards, ...pipeline.map((r) => ({ section: "pipeline", ...r })), ...((data?.lead_status || []) as Record<string, any>[]).map((r) => ({ section: "lead_status", ...r }))]);
  if (loading) return <LoadingBlock />;
  return <div className="crm-reports-modern"><ErrorBanner message={error} />
    <section className="crm-report-hero"><div><span className="demo-eyebrow">Sales intelligence</span><h2>CRM Reports & Forecasting</h2><p>Interactive sales reports for pipeline health, lead conversion, revenue forecast, contracts and customer growth.</p></div><button className="btn btn-primary" onClick={exportAll}>Export Full Report</button></section>
    <div className="crm-report-metrics"><MetricCard label="Leads" value={cards.leads || 0} hint="Total prospects" /><MetricCard label="Opportunities" value={cards.opportunities || 0} hint="Pipeline records" /><MetricCard label="Customers" value={cards.customers || 0} hint="Active accounts" /><MetricCard label="Contacts" value={cards.contacts || 0} hint="People in CRM" /><MetricCard label="Pipeline" value={money(totalPipeline, currency)} hint="Open value" /><MetricCard label="Forecast" value={money(weighted, currency)} hint="Weighted value" /></div>
    <div className="crm-chart-grid featured"><ModernChartCard title="Pipeline value by stage" subtitle="Compare total opportunity value against weighted forecast." rows={pipeline.map((r) => ({ ...r, value: r.value || r.total_value }))} type="combo" moneyValues currency={currency} exportName="crm-pipeline-value" /><ModernChartCard title="Lead funnel" subtitle="Where prospects sit before conversion." rows={(data?.lead_status || []) as Record<string, any>[]} type="pie" exportName="crm-lead-funnel" /></div>
    <div className="crm-chart-grid"><ModernChartCard title="Quote value trend" subtitle="Monthly quotation value created by the sales team." rows={(data?.monthly_quotes || []) as Record<string, any>[]} type="area" moneyValues currency={currency} exportName="crm-monthly-quotes" /><ModernChartCard title="Sales order trend" subtitle="Confirmed sales order value by month." rows={(data?.monthly_sales_orders || []) as Record<string, any>[]} type="area" moneyValues currency={currency} exportName="crm-monthly-sales-orders" /></div>
    <div className="crm-chart-grid three"><ModernChartCard title="Lead sources" subtitle="Which channels generate demand." rows={(data?.lead_source || []) as Record<string, any>[]} exportName="crm-lead-sources" /><ModernChartCard title="Quotes by status" subtitle="Draft, open and converted quotation status." rows={(data?.quotes_by_status || []) as Record<string, any>[]} exportName="crm-quotes-status" /><ModernChartCard title="Contracts by status" subtitle="Agreement status and renewals visibility." rows={(data?.contracts_by_status || []) as Record<string, any>[]} exportName="crm-contracts-status" /></div>
  </div>;
}

function ActivitiesView() {
  const [templates, setTemplates] = useState<Record<string, any>[]>([]);
  const [notifications, setNotifications] = useState<Record<string, any>[]>([]);
  const [calls, setCalls] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiFetch("/api/crm/email-templates?limit=8"),
      apiFetch("/api/crm/notifications?limit=8"),
      apiFetch("/api/crm/call-logs?limit=8"),
    ]).then(([tpl, notif, call]) => {
      if (!active) return;
      if (tpl.status === "fulfilled") setTemplates(arrayFrom<Record<string, any>>(tpl.value, ["templates"]));
      if (notif.status === "fulfilled") setNotifications(arrayFrom<Record<string, any>>(notif.value, ["notifications"]));
      if (call.status === "fulfilled") setCalls(arrayFrom<Record<string, any>>(call.value, ["call_logs"]));
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);
  return <div className="crm-split-grid three">
    <section className="demo-panel"><div className="demo-panel-head"><div><h3>Email templates</h3><p>Reusable messages for quote follow-ups, introductions and reminders.</p></div></div>{loading ? <LoadingBlock /> : <DataList rows={templates} empty="No email templates yet." render={(r) => <><b>{r.name || r.subject}</b><span>{fmt(r.subject)}</span></>} />}</section>
    <section className="demo-panel"><div className="demo-panel-head"><div><h3>Notifications</h3><p>Open reminders and alerts for your sales team.</p></div></div>{loading ? <LoadingBlock /> : <DataList rows={notifications} empty="No active notifications." render={(r) => <><b>{r.title || r.subject || r.name}</b><span>{fmt(r.message || r.type)} · {dateText(r.date || r.creation)}</span></>} />}</section>
    <section className="demo-panel"><div className="demo-panel-head"><div><h3>Call activity</h3><p>Recent customer calls and follow-up records.</p></div></div>{loading ? <LoadingBlock /> : <DataList rows={calls} empty="No call activity yet." render={(r) => <><b>{r.type || "Call"} · {fmt(r.status)}</b><span>{fmt(r.receiver || r.caller)} · {dateText(r.creation)}</span></>} />}</section>
  </div>;
}
function ProductionReadinessView() {
  const [qa, setQa] = useState<any>(null);
  const [permissions, setPermissions] = useState<any>(null);
  const [storage, setStorage] = useState<Record<string, any>[]>([]);
  const [mobile, setMobile] = useState<Record<string, any>[]>([]);
  const [gateways, setGateways] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiFetch("/api/crm/production-readiness"),
      apiFetch("/api/crm/permissions"),
      apiFetch("/api/crm/storage/oauth"),
      apiFetch("/api/crm/mobile-report"),
      apiFetch("/api/crm/payments/gateways"),
    ]).then(([qaRes, permRes, storageRes, mobileRes, gatewayRes]) => {
      if (!active) return;
      if (qaRes.status === "fulfilled") setQa(unwrap<any>(qaRes.value));
      if (permRes.status === "fulfilled") setPermissions(unwrap<any>(permRes.value));
      if (storageRes.status === "fulfilled") setStorage(arrayFrom<Record<string, any>>(storageRes.value, ["providers"]));
      if (mobileRes.status === "fulfilled") setMobile(arrayFrom<Record<string, any>>(mobileRes.value, ["checks"]));
      if (gatewayRes.status === "fulfilled") setGateways(arrayFrom<Record<string, any>>(gatewayRes.value, ["providers"]));
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);
  const score = Number(qa?.score || 0);
  return <div className="crm-split-grid three production-ready-grid">
    <section className="demo-panel"><div className="demo-panel-head"><div><h3>Fresh tenant QA</h3><p>Checks that a new business account can run CRM and sales without backend setup.</p></div><strong className="crm-score">{score || "—"}%</strong></div>{loading ? <LoadingBlock /> : <DataList rows={qa?.checks || []} empty="No QA checks returned." render={(r) => <><b>{r.ok ? "✓" : "Needs attention"} {r.label}</b><span>{r.action || "Ready"}</span></>} />}</section>
    <section className="demo-panel"><div className="demo-panel-head"><div><h3>Roles & permissions</h3><p>Validate that normal SaaS users can run the customer lifecycle inside the app.</p></div></div>{loading ? <LoadingBlock /> : <DataList rows={permissions?.permissions || []} empty="No permission checks returned." render={(r) => <><b>{r.doctype}</b><span>{r.available ? `Read ${r.read ? "✓" : "—"} · Create ${r.create ? "✓" : "—"} · Write ${r.write ? "✓" : "—"}` : "Not installed"}</span></>} />}</section>
    <section className="demo-panel"><div className="demo-panel-head"><div><h3>File storage integrations</h3><p>Connect business storage for attachments and customer documents.</p></div></div>{loading ? <LoadingBlock /> : <DataList rows={storage} empty="No storage providers returned." render={(r) => <><b>{r.name}</b><span>{r.configured ? "OAuth configured" : "Ready for OAuth credentials"} · {r.connected ? "Connected" : "Not connected"}</span>{r.authorize_url && <a className="btn btn-small" href={r.authorize_url}>Connect</a>}</>} />}</section>
    <section className="demo-panel wide"><div className="demo-panel-head"><div><h3>Mobile and edge-case readiness</h3><p>Track UX improvements needed for phones and real customer data.</p></div></div>{loading ? <LoadingBlock /> : <DataList rows={mobile} empty="No mobile checks returned." render={(r) => <><b>{r.area} · {r.status}</b><span>{r.detail}</span></>} />}</section>
    <section className="demo-panel wide"><div className="demo-panel-head"><div><h3>Payments and customer portal</h3><p>Business owners can enable PayFast, Yoco or iKhokha for invoice payment links and customer self-service payments.</p></div></div>{loading ? <LoadingBlock /> : <DataList rows={gateways} empty="No payment gateways returned." render={(g) => <><b>{g.name}</b><span>{g.configured ? "Configured" : "Needs credentials"} · {g.enabled ? "Enabled" : "Disabled"} · {g.sandbox ? "Sandbox" : "Live"}</span></>} />}<div className="crm-mini-card"><b>Payment link flow</b><span>Invoices can generate provider payment links and include them in emailed PDFs.</span></div><div className="crm-mini-card"><b>Customer handoff</b><span>Customer portal URLs are generated per tenant for viewing quotes, invoices and payments.</span></div></section>
  </div>;
}

function AutomationView() {
  const [rules, setRules] = useState<Record<string, any>[]>([]);
  const [sla, setSla] = useState<Record<string, any>[]>([]);
  const [customFields, setCustomFields] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    Promise.allSettled([apiFetch("/api/crm/automation"), apiFetch("/api/crm/custom-fields?doctype=Lead")]).then(([auto, custom]) => {
      if (!active) return;
      if (auto.status === "fulfilled") {
        const autoData = auto.value || {};
        setRules(arrayFrom<Record<string, any>>(autoData.assignment_rules, ["rules"]));
        setSla(arrayFrom<Record<string, any>>(autoData.sla, ["sla"]));
      }
      if (custom.status === "fulfilled") setCustomFields(arrayFrom<Record<string, any>>(custom.value, ["custom_fields"]));
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);
  return <div className="crm-split-grid three">
    <section className="demo-panel"><div className="demo-panel-head"><div><h3>Assignment rules</h3><p>Automatically route leads and opportunities to the right sales owner.</p></div></div>{loading ? <LoadingBlock /> : <DataList rows={rules} empty="No assignment rules configured." render={(r) => <><b>{r.name}</b><span>{fmt(r.document_type)} · Priority {fmt(r.priority)}</span></>} />}</section>
    <section className="demo-panel"><div className="demo-panel-head"><div><h3>Service levels</h3><p>Response and resolution targets for sales follow-ups.</p></div></div>{loading ? <LoadingBlock /> : <DataList rows={sla} empty="No service levels configured." render={(r) => <><b>{r.name}</b><span>{fmt(r.doctype_name)} · {fmt(r.response_time)} {fmt(r.response_time_period)}</span></>} />}</section>
    <section className="demo-panel"><div className="demo-panel-head"><div><h3>Custom fields</h3><p>Extra fields your team added to sales records.</p></div></div>{loading ? <LoadingBlock /> : <DataList rows={customFields} empty="No custom CRM fields yet." render={(r) => <><b>{r.label || r.fieldname}</b><span>{fmt(r.fieldtype)} · {fmt(r.fieldname)}</span></>} />}</section>
  </div>;
}
function DataList({ rows, empty, render }: { rows: Record<string, any>[]; empty: string; render: (row: Record<string, any>) => ReactNode }) { return <div className="crm-list-panel">{rows.length ? rows.slice(0, 8).map((row, index) => <div className="crm-mini-card" key={row.name || row.id || index}>{render(row)}</div>) : <EmptyState title={empty} body="You can manage this from the CRM workspace when your team needs it." />}</div>; }
function InfoPanel({ title, body }: { title: string; body: string }) { return <section className="demo-panel"><div className="demo-panel-head"><div><h3>{title}</h3><p>{body}</p></div></div><div className="crm-list-panel"><div className="crm-mini-card"><b>Available in this workspace</b><span>{body}</span></div></div></section>; }

export default function CrmWorkspaceClient({ initialTab }: { initialTab?: string } = {}) {
  const [tab, setTab] = useState<Tab>(() => normalizeTab(initialTab)); const [cards, setCards] = useState<Cards | null>(null); const [leads, setLeads] = useState<Lead[]>([]); const [deals, setDeals] = useState<Deal[]>([]); const [currency, setCurrency] = useState("ZAR"); const [crmMode, setCrmMode] = useState<CrmMode>("erpnext"); const [leadStatuses, setLeadStatuses] = useState<Status[]>(DEFAULT_LEAD_STATUSES); const [dealStatuses, setDealStatuses] = useState<Status[]>(DEFAULT_DEAL_STATUSES); const [sources, setSources] = useState<string[]>(["Website", "Email", "Phone", "Referral", "Social Media", "Campaign", "Walk In", "Other"]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [refreshSignal, setRefreshSignal] = useState(0); const [modal, setModal] = useState<"lead" | "deal" | null>(null); const [drawer, setDrawer] = useState<DrawerRecord | null>(null);
  function selectTab(next: Tab) { setTab(next); if (typeof window !== "undefined") { const slug = tabSlug(next); window.history.replaceState(null, "", next === "Command Center" ? "/portal/crm" : `/portal/crm?tab=${slug}`); } }
  const leadStatusList = useMemo(() => uniqueStatuses(leadStatuses, DEFAULT_LEAD_STATUSES), [leadStatuses]); const dealStatusList = useMemo(() => simplePipelineStatuses(uniqueStatuses(dealStatuses, DEFAULT_DEAL_STATUSES)), [dealStatuses]);
  async function refreshCore() { setError(""); const [dash, leadSt, dealSt, src, leadRows, dealRows] = await Promise.allSettled([apiFetch("/api/crm/dashboard"), apiFetch("/api/crm/statuses?type=lead"), apiFetch("/api/crm/statuses?type=deal"), apiFetch("/api/crm/sources"), apiFetch("/api/crm/leads?limit=10&offset=0"), apiFetch("/api/crm/deals?limit=10&offset=0")]); if (dash.status === "fulfilled") { const d = unwrap<any>(dash.value); setCards(d.cards || null); setCurrency(d.currency || "ZAR"); setCrmMode(d.crm_app === "frappe_crm" ? "frappe_crm" : "erpnext"); } else setError(dash.reason instanceof Error ? dash.reason.message : "Could not load dashboard data."); if (leadSt.status === "fulfilled") setLeadStatuses(arrayFrom<Status>(leadSt.value, ["statuses"])); if (dealSt.status === "fulfilled") setDealStatuses(arrayFrom<Status>(dealSt.value, ["statuses"])); if (src.status === "fulfilled") { const list = arrayFrom<string>(src.value, ["sources"]); if (list.length) setSources(list); } if (leadRows.status === "fulfilled") setLeads(arrayFrom<Lead>(leadRows.value, ["leads"])); if (dealRows.status === "fulfilled") setDeals(arrayFrom<Deal>(dealRows.value, ["deals", "opportunities"])); }
  useEffect(() => { setLoading(true); refreshCore().finally(() => setLoading(false)); }, [refreshSignal]); const bump = () => setRefreshSignal((x) => x + 1);
  return <div className="demo-workspace crm-console animate-fade-up"><section className="crm-hero-card"><div><div className="demo-eyebrow">CRM & Sales Command Center</div><h1>Customer Lifecycle CRM</h1><p>Run the full customer lifecycle in one workspace: Lead → Opportunity → Customer → Quote → Sales Order → Invoice.</p><div className="crm-hero-tags"><span>Live sales data</span><span>Sales pipeline</span><span>{currency}</span></div></div><div className="crm-hero-actions"><button className="btn btn-primary" onClick={() => setModal("lead")}>New Lead</button><button className="btn" onClick={() => setModal("deal")}>New Opportunity</button><button className="btn" onClick={() => selectTab("Customers")}>Customers</button></div></section><ErrorBanner message={error} /><nav className="demo-tabbar crm-tabbar">{TABS.map((t) => <button key={t} className={tab === t ? "active" : ""} onClick={() => selectTab(t)}>{t}</button>)}</nav>{loading ? <LoadingBlock /> : <>{tab === "Command Center" && <CommandCenter cards={cards} leads={leads} deals={deals} currency={currency} setTab={selectTab} onOpen={setDrawer} />}{tab === "Reports" && <CrmReportsView />}{tab === "Leads" && <LeadsView statuses={leadStatusList} sources={sources} onOpen={setDrawer} refreshSignal={refreshSignal} onRefresh={bump} />}{tab === "Opportunities" && <OpportunitiesView statuses={dealStatusList} onOpen={setDrawer} refreshSignal={refreshSignal} onRefresh={bump} currency={currency} />}{tab === "Customers" && <RevenueDocsView module="customers" title="Customers" subtitle="Customer records created from qualified leads and opportunities." refreshSignal={refreshSignal} />}
{tab === "Contacts" && <ContactsView refreshSignal={refreshSignal} />}{tab === "Quotes" && <RevenueDocsView module="quotes" title="Quotes" subtitle="Draft and sent quotations linked to your sales pipeline." refreshSignal={refreshSignal} />}{tab === "Sales Orders" && <RevenueDocsView module="sales-orders" title="Sales Orders" subtitle="Confirmed customer orders created from won opportunities." refreshSignal={refreshSignal} />}{tab === "Contracts" && <RevenueDocsView module="contracts" title="Contracts" subtitle="Customer agreements created during the sales lifecycle." refreshSignal={refreshSignal} />}{tab === "Activities" && <ActivitiesView />}{tab === "Automation" && <AutomationView />}{tab === "Production Readiness" && <ProductionReadinessView />}</>}{modal === "lead" && <CreateLeadModal statuses={leadStatusList} sources={sources} onClose={() => setModal(null)} onSaved={() => { setModal(null); bump(); selectTab("Leads"); }} />}{modal === "deal" && <CreateDealModal statuses={dealStatusList} onClose={() => setModal(null)} onSaved={() => { setModal(null); bump(); selectTab("Opportunities"); }} />}{drawer && <DetailDrawer record={drawer} crmMode={crmMode} onClose={() => setDrawer(null)} onRefresh={bump} />}</div>;
}
