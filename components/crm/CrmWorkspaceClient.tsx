"use client";

import { useEffect, useMemo, useState } from "react";

type CrmMode = "erpnext" | "frappe_crm";
type Tab = "Command Center" | "Leads" | "Opportunities" | "Accounts" | "Contacts" | "Activities" | "Automation";
type Status = { name: string; color?: string; position?: number };
type Lead = { id: string; name: string; first_name?: string; last_name?: string; company?: string; email?: string; phone?: string; source?: string; status: string; lead_owner?: string; city?: string; country?: string; website?: string; created?: string; last_updated?: string };
type Deal = { id: string; title: string; organization?: string; stage: string; value?: string | number; raw_value?: number; currency?: string; probability?: number; expected_close?: string; owner?: string; source?: string; last_updated?: string };
type Contact = { id: string; name: string; email?: string; phone?: string; company?: string; designation?: string; last_updated?: string };
type Account = { name: string; organization_name?: string; website?: string; territory?: string; industry?: string; annual_revenue?: number; no_of_employees?: string; city?: string; country?: string; modified?: string };
type Activity = { name?: string; subject?: string; sender?: string; reference_doctype?: string; reference_name?: string; creation?: string; communication_type?: string; content?: string };
type Task = { name: string; title?: string; description?: string; status?: string; priority?: string; due_date?: string; assigned_to?: string; creation?: string };
type Note = { name: string; title?: string; content?: string; owner?: string; creation?: string };
type Comment = { name: string; content?: string; comment_by?: string; creation?: string };
type DashboardCards = { leads: number; deals: number; contacts: number; organizations: number; pipeline_value: string | number; won_this_month: string | number; overdue_tasks: number };

type DetailState = {
  lead?: Record<string, unknown>;
  deal?: Record<string, unknown>;
  notes: Note[];
  tasks: Task[];
  comments: Comment[];
  communications: Activity[];
};

const TABS: Tab[] = ["Command Center", "Leads", "Opportunities", "Accounts", "Contacts", "Activities", "Automation"];
const DEFAULT_LEAD_STATUSES: Status[] = [
  { name: "New", color: "blue", position: 1 },
  { name: "Open", color: "yellow", position: 2 },
  { name: "Contacted", color: "orange", position: 3 },
  { name: "Replied", color: "purple", position: 4 },
  { name: "Qualified", color: "green", position: 5 },
  { name: "Converted", color: "teal", position: 6 },
  { name: "Do Not Contact", color: "gray", position: 7 },
];
const DEFAULT_DEAL_STATUSES: Status[] = [
  { name: "Qualification", color: "blue", position: 1 },
  { name: "Demo/Presentation", color: "yellow", position: 2 },
  { name: "Proposal/Quotation", color: "orange", position: 3 },
  { name: "Negotiation", color: "purple", position: 4 },
  { name: "Ready to Close", color: "teal", position: 5 },
  { name: "Won", color: "green", position: 6 },
  { name: "Lost", color: "red", position: 7 },
];
const STATUS_COLOR: Record<string, string> = {
  new: "#2E6BE5", lead: "#2E6BE5", open: "#F59E0B", contacted: "#F97316", replied: "#8B5CF6",
  interested: "#28A486", qualified: "#28A486", opportunity: "#28A486", converted: "#14B8A6",
  "do not contact": "#64748B", qualification: "#2E6BE5", prospecting: "#2E6BE5",
  "demo/presentation": "#F59E0B", "proposal/quotation": "#F97316", quotation: "#F97316",
  negotiation: "#8B5CF6", "ready to close": "#14B8A6", won: "#16A34A", lost: "#DC2626", "lost quotation": "#DC2626",
};

function normalizeTab(value?: string): Tab {
  const v = String(value || "").trim().toLowerCase();
  if (["lead", "leads"].includes(v)) return "Leads";
  if (["deal", "deals", "opportunity", "opportunities", "pipeline"].includes(v)) return "Opportunities";
  if (["account", "accounts", "organization", "organizations", "organisation", "organisations"].includes(v)) return "Accounts";
  if (["contact", "contacts"].includes(v)) return "Contacts";
  if (["activity", "activities", "task", "tasks", "notes", "email", "calls"].includes(v)) return "Activities";
  if (["automation", "assignment", "sla", "custom-fields", "custom_fields"].includes(v)) return "Automation";
  return "Command Center";
}
function fmt(value: unknown) { return value === undefined || value === null || value === "" ? "—" : String(value); }
function dateText(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}
function money(value: unknown, currency = "ZAR") {
  if (typeof value === "string" && value.match(/[A-Z]{3}|R|\d/)) return value;
  const n = Number(value || 0);
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}
function getStatusColor(status?: string) { return STATUS_COLOR[String(status || "").toLowerCase()] || "#64748B"; }
function uniqueStatuses(statuses: Status[], fallback: Status[]) {
  const merged = [...statuses, ...fallback].filter(Boolean);
  const seen = new Set<string>();
  return merged.filter((s) => {
    const key = s.name;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function unwrap<T>(json: unknown, key?: string): T {
  const root = json as Record<string, unknown>;
  const data = (root?.data ?? root?.message ?? root) as Record<string, unknown>;
  if (key && data && key in data) return data[key] as T;
  return data as T;
}
function arrayFrom<T>(json: unknown, keys: string[]): T[] {
  const root = json as Record<string, unknown>;
  const data = (root?.data ?? root?.message ?? root) as Record<string, unknown>;
  for (const key of keys) {
    const value = data?.[key];
    if (Array.isArray(value)) return value as T[];
  }
  return [];
}
async function apiFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as any).error || (json as any).message || `Request failed (${res.status})`);
  return json;
}
function StatusBadge({ status }: { status?: string }) {
  const color = getStatusColor(status);
  return <span className="crm-status-badge" style={{ ["--s" as string]: color }}>{fmt(status)}</span>;
}
function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return <div className="crm-empty"><b>{title}</b><span>{body}</span>{action}</div>;
}
function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="crm-banner warn">{message}</div>;
}
function LoadingBlock() { return <div className="crm-loading"><span /> Loading CRM workspace…</div>; }

function CreateLeadModal({ statuses, sources, onClose, onSaved }: { statuses: Status[]; sources: string[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ first_name: "", last_name: "", company: "", email: "", phone: "", source: sources[0] || "Website", status: statuses[0]?.name || "New", city: "", country: "South Africa", website: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));
  async function submit() {
    if (!form.first_name.trim() && !form.company.trim()) { setError("Add a contact name or company name."); return; }
    setSaving(true); setError("");
    try {
      await apiFetch("/api/crm/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create lead"); setSaving(false); }
  }
  return <Modal title="Create Lead" subtitle="Capture the prospect before qualification." onClose={onClose} width={720}>
    <ErrorBanner message={error} />
    <div className="crm-form-grid">
      <Field label="First name"><input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} /></Field>
      <Field label="Last name"><input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} /></Field>
      <Field label="Company / Account"><input value={form.company} onChange={(e) => set("company", e.target.value)} /></Field>
      <Field label="Email"><input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
      <Field label="Phone"><input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
      <Field label="Website"><input value={form.website} onChange={(e) => set("website", e.target.value)} /></Field>
      <Field label="Source"><select value={form.source} onChange={(e) => set("source", e.target.value)}>{sources.map((s) => <option key={s}>{s}</option>)}</select></Field>
      <Field label="Status"><select value={form.status} onChange={(e) => set("status", e.target.value)}>{statuses.map((s) => <option key={s.name}>{s.name}</option>)}</select></Field>
      <Field label="City"><input value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
      <Field label="Country"><input value={form.country} onChange={(e) => set("country", e.target.value)} /></Field>
    </div>
    <div className="crm-modal-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Creating…" : "Create Lead"}</button></div>
  </Modal>;
}

function CreateDealModal({ statuses, onClose, onSaved }: { statuses: Status[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ lead_name: "", organization: "", status: statuses[0]?.name || "Qualification", deal_value: "", probability: "25", expected_closing: "", source: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));
  async function submit() {
    if (!form.lead_name.trim()) { setError("Opportunity name is required."); return; }
    setSaving(true); setError("");
    try {
      await apiFetch("/api/crm/deals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, deal_value: Number(form.deal_value || 0), probability: Number(form.probability || 0) }) });
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create opportunity"); setSaving(false); }
  }
  return <Modal title="Create Opportunity" subtitle="Track value, stage and expected close date." onClose={onClose} width={680}>
    <ErrorBanner message={error} />
    <div className="crm-form-grid">
      <Field label="Opportunity name"><input value={form.lead_name} onChange={(e) => set("lead_name", e.target.value)} /></Field>
      <Field label="Account / Organization"><input value={form.organization} onChange={(e) => set("organization", e.target.value)} /></Field>
      <Field label="Stage"><select value={form.status} onChange={(e) => set("status", e.target.value)}>{statuses.map((s) => <option key={s.name}>{s.name}</option>)}</select></Field>
      <Field label="Value"><input type="number" value={form.deal_value} onChange={(e) => set("deal_value", e.target.value)} /></Field>
      <Field label="Probability %"><input type="number" min={0} max={100} value={form.probability} onChange={(e) => set("probability", e.target.value)} /></Field>
      <Field label="Expected close"><input type="date" value={form.expected_closing} onChange={(e) => set("expected_closing", e.target.value)} /></Field>
    </div>
    <div className="crm-modal-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Creating…" : "Create Opportunity"}</button></div>
  </Modal>;
}

function CreateContactModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", company: "", designation: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));
  async function submit() {
    if (!form.first_name.trim()) { setError("First name is required."); return; }
    setSaving(true); setError("");
    try { await apiFetch("/api/crm/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); onSaved(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not create contact"); setSaving(false); }
  }
  return <Modal title="Create Contact" subtitle="Add a decision maker or stakeholder." onClose={onClose} width={620}>
    <ErrorBanner message={error} />
    <div className="crm-form-grid">
      <Field label="First name"><input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} /></Field>
      <Field label="Last name"><input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} /></Field>
      <Field label="Email"><input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
      <Field label="Phone"><input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
      <Field label="Company"><input value={form.company} onChange={(e) => set("company", e.target.value)} /></Field>
      <Field label="Designation"><input value={form.designation} onChange={(e) => set("designation", e.target.value)} /></Field>
    </div>
    <div className="crm-modal-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Creating…" : "Create Contact"}</button></div>
  </Modal>;
}

function Modal({ title, subtitle, children, onClose, width = 640 }: { title: string; subtitle?: string; children: React.ReactNode; onClose: () => void; width?: number }) {
  return <>
    <div className="crm-modal-backdrop" onClick={onClose} />
    <div className="crm-modal" style={{ maxWidth: width }}>
      <div className="crm-modal-head"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div><button className="crm-icon-btn" onClick={onClose}>×</button></div>
      {children}
    </div>
  </>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="crm-field"><span>{label}</span>{children}</label>; }

function DetailDrawer({ record, mode, crmMode, onClose, onRefresh }: { record: { id: string; type: "lead" | "deal"; title: string }; mode: CrmMode; crmMode: CrmMode; onClose: () => void; onRefresh: () => void }) {
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [active, setActive] = useState<"timeline" | "notes" | "tasks" | "comments">("timeline");
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [task, setTask] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const leadDoctype = crmMode === "frappe_crm" ? "CRM Lead" : "Lead";
  const dealDoctype = crmMode === "frappe_crm" ? "CRM Deal" : "Opportunity";
  const doctype = record.type === "lead" ? leadDoctype : dealDoctype;

  async function load() {
    setLoading(true);
    try {
      const url = record.type === "lead" ? `/api/crm/leads/${record.id}` : `/api/crm/deals/${record.id}`;
      const json = await apiFetch(url);
      const data = unwrap<Record<string, unknown>>(json);
      setDetail({
        lead: data.lead as Record<string, unknown> | undefined,
        deal: data.deal as Record<string, unknown> | undefined,
        notes: (data.notes as Note[]) || [],
        tasks: (data.tasks as Task[]) || [],
        comments: (data.comments as Comment[]) || [],
        communications: (data.communications as Activity[]) || [],
      });
    } catch { setDetail({ notes: [], tasks: [], comments: [], communications: [] }); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [record.id]);

  async function addNote() {
    if (!note.trim()) return;
    try { await apiFetch("/api/crm/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference_doctype: doctype, reference_name: record.id, title: "Sales note", content: note }) }); setNote(""); setMessage("Note saved"); await load(); }
    catch (err) { setMessage(err instanceof Error ? err.message : "Could not save note"); }
  }
  async function addTask() {
    if (!task.trim()) return;
    try { await apiFetch("/api/crm/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference_doctype: doctype, reference_name: record.id, title: task, status: "Open", priority: "Medium" }) }); setTask(""); setMessage("Task created"); await load(); }
    catch (err) { setMessage(err instanceof Error ? err.message : "Could not create task"); }
  }
  async function addComment() {
    if (!comment.trim()) return;
    try { await apiFetch("/api/crm/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference_doctype: doctype, reference_name: record.id, content: comment }) }); setComment(""); setMessage("Comment added"); await load(); }
    catch (err) { setMessage(err instanceof Error ? err.message : "Could not add comment"); }
  }
  async function convertLead() {
    if (record.type !== "lead") return;
    try { await apiFetch(`/api/crm/leads/${record.id}/convert`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); setMessage("Lead converted to opportunity"); onRefresh(); }
    catch (err) { setMessage(err instanceof Error ? err.message : "Could not convert lead"); }
  }

  return <>
    <div className="crm-drawer-backdrop" onClick={onClose} />
    <aside className="crm-drawer">
      <div className="crm-drawer-head"><div><span className="demo-eyebrow">{record.type === "lead" ? "Lead" : "Opportunity"}</span><h2>{record.title}</h2><p>{doctype} · {record.id}</p></div><button className="crm-icon-btn" onClick={onClose}>×</button></div>
      {record.type === "lead" && <div className="crm-drawer-actions"><button className="btn btn-primary" onClick={convertLead}>Convert to Opportunity</button><button className="btn" onClick={() => setActive("tasks")}>Create Follow-up</button></div>}
      {message && <div className="crm-banner">{message}</div>}
      <div className="crm-detail-tabs">{(["timeline", "notes", "tasks", "comments"] as const).map((t) => <button key={t} className={active === t ? "active" : ""} onClick={() => setActive(t)}>{t}</button>)}</div>
      {loading ? <LoadingBlock /> : <div className="crm-drawer-body">
        {active === "timeline" && (detail?.communications.length ? detail.communications.map((a, i) => <div className="crm-timeline-row" key={a.name || i}><b>{a.subject || a.communication_type || "CRM activity"}</b><span>{fmt(a.sender)} · {dateText(a.creation)}</span></div>) : <EmptyState title="No timeline yet" body="Emails, comments and logged interactions will appear here." />)}
        {active === "notes" && <><div className="crm-composer"><textarea placeholder="Add an internal sales note…" value={note} onChange={(e) => setNote(e.target.value)} /><button className="btn btn-primary" onClick={addNote}>Save Note</button></div>{detail?.notes.length ? detail.notes.map((n) => <div className="crm-mini-card" key={n.name}><b>{n.title || "Note"}</b><p>{n.content}</p><span>{fmt(n.owner)} · {dateText(n.creation)}</span></div>) : <EmptyState title="No notes" body="Keep important selling context here." />}</>}
        {active === "tasks" && <><div className="crm-composer compact"><input placeholder="Follow-up task…" value={task} onChange={(e) => setTask(e.target.value)} /><button className="btn btn-primary" onClick={addTask}>Add Task</button></div>{detail?.tasks.length ? detail.tasks.map((t) => <div className="crm-mini-card" key={t.name}><b>{t.title || t.description || "Task"}</b><span>{fmt(t.status)} · Due {dateText(t.due_date)}</span></div>) : <EmptyState title="No tasks" body="Create the next action for this record." />}</>}
        {active === "comments" && <><div className="crm-composer"><textarea placeholder="Add a comment for the team…" value={comment} onChange={(e) => setComment(e.target.value)} /><button className="btn btn-primary" onClick={addComment}>Post</button></div>{detail?.comments.length ? detail.comments.map((c) => <div className="crm-mini-card" key={c.name}><p>{c.content}</p><span>{fmt(c.comment_by)} · {dateText(c.creation)}</span></div>) : <EmptyState title="No comments" body="Team comments will appear here." />}</>}
      </div>}
    </aside>
  </>;
}

function CommandCenter({ cards, leads, deals, activity, currency, setTab, onOpen }: { cards: DashboardCards | null; leads: Lead[]; deals: Deal[]; activity: Activity[]; currency: string; setTab: (tab: Tab) => void; onOpen: (r: { id: string; type: "lead" | "deal"; title: string }) => void }) {
  const weighted = deals.reduce((sum, d) => sum + (Number(d.raw_value || 0) * Number(d.probability || 0)) / 100, 0);
  const stats = [
    { label: "Leads", value: cards?.leads ?? leads.length, hint: "Prospects captured", tab: "Leads" as Tab },
    { label: "Opportunities", value: cards?.deals ?? deals.length, hint: "Active pipeline", tab: "Opportunities" as Tab },
    { label: "Contacts", value: cards?.contacts ?? 0, hint: "People database", tab: "Contacts" as Tab },
    { label: "Pipeline", value: money(cards?.pipeline_value ?? 0, currency), hint: "Total open value", tab: "Opportunities" as Tab },
    { label: "Weighted Forecast", value: money(weighted, currency), hint: "Probability weighted", tab: "Opportunities" as Tab },
    { label: "Overdue Tasks", value: cards?.overdue_tasks ?? 0, hint: "Needs attention", tab: "Activities" as Tab },
  ];
  return <div className="crm-command">
    <div className="crm-stat-grid">{stats.map((s) => <button key={s.label} className="crm-stat-card" onClick={() => setTab(s.tab)}><span>{s.label}</span><b>{s.value}</b><small>{s.hint}</small></button>)}</div>
    <div className="crm-split-grid">
      <section className="demo-panel"><div className="demo-panel-head"><div><h3>Priority Leads</h3><p>New and open prospects your team should qualify.</p></div><button className="btn" onClick={() => setTab("Leads")}>View all</button></div><div className="crm-list-panel">{leads.slice(0, 6).map((l) => <button key={l.id} className="crm-row-card" onClick={() => onOpen({ id: l.id, type: "lead", title: l.name || l.company || l.id })}><div><b>{l.name || l.company || l.id}</b><span>{fmt(l.company)} · {fmt(l.email || l.phone)}</span></div><StatusBadge status={l.status} /></button>)}{!leads.length && <EmptyState title="No leads yet" body="Create your first lead to start the pipeline." />}</div></section>
      <section className="demo-panel"><div className="demo-panel-head"><div><h3>Opportunity Focus</h3><p>Deals that are moving through the sales process.</p></div><button className="btn" onClick={() => setTab("Opportunities")}>Pipeline</button></div><div className="crm-list-panel">{deals.slice(0, 6).map((d) => <button key={d.id} className="crm-row-card" onClick={() => onOpen({ id: d.id, type: "deal", title: d.title || d.id })}><div><b>{d.title || d.id}</b><span>{fmt(d.organization)} · {fmt(d.value || money(d.raw_value, currency))}</span></div><StatusBadge status={d.stage} /></button>)}{!deals.length && <EmptyState title="No opportunities yet" body="Convert a qualified lead or create an opportunity manually." />}</div></section>
    </div>
    <section className="demo-panel"><div className="demo-panel-head"><div><h3>Recent CRM Activity</h3><p>Latest communication linked to leads, opportunities and contacts.</p></div></div><div className="crm-timeline">{activity.length ? activity.slice(0, 10).map((a, i) => <div key={a.name || i} className="crm-timeline-row"><b>{a.subject || a.communication_type || "Activity"}</b><span>{fmt(a.reference_doctype)} {fmt(a.reference_name)} · {dateText(a.creation)}</span></div>) : <EmptyState title="No activity yet" body="Once emails, notes and tasks are logged they will appear here." />}</div></section>
  </div>;
}

function LeadsView({ statuses, sources, onOpen, refreshSignal, onRefresh }: { statuses: Status[]; sources: string[]; onOpen: (r: { id: string; type: "lead"; title: string }) => void; refreshSignal: number; onRefresh: () => void }) {
  const [rows, setRows] = useState<Lead[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [search, setSearch] = useState(""); const [status, setStatus] = useState("all"); const [showCreate, setShowCreate] = useState(false);
  async function load() { setLoading(true); setError(""); try { const q = new URLSearchParams({ limit: "80", offset: "0" }); if (search) q.set("search", search); if (status !== "all") q.set("status", status); const json = await apiFetch(`/api/crm/leads?${q}`); setRows(arrayFrom<Lead>(json, ["leads"])); } catch (err) { setError(err instanceof Error ? err.message : "Could not load leads"); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, [refreshSignal]);
  async function updateStatus(lead: Lead, next: string) { try { await apiFetch(`/api/crm/leads/${lead.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) }); setRows((r) => r.map((x) => x.id === lead.id ? { ...x, status: next } : x)); onRefresh(); } catch (err) { setError(err instanceof Error ? err.message : "Could not update lead"); } }
  async function convert(lead: Lead) { try { await apiFetch(`/api/crm/leads/${lead.id}/convert`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); await load(); onRefresh(); } catch (err) { setError(err instanceof Error ? err.message : "Could not convert lead"); } }
  return <section className="demo-panel"><div className="demo-panel-head crm-toolbar"><div><h3>Leads</h3><p>Capture, qualify and convert prospects into opportunities.</p></div><div className="crm-toolbar-actions"><input placeholder="Search leads…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} /><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option>{statuses.map((s) => <option key={s.name}>{s.name}</option>)}</select><button className="btn" onClick={load}>Search</button><button className="btn btn-primary" onClick={() => setShowCreate(true)}>New Lead</button></div></div><ErrorBanner message={error} />{loading ? <LoadingBlock /> : <div className="crm-table-wrap"><table className="demo-table crm-table"><thead><tr><th>Lead</th><th>Company</th><th>Contact</th><th>Source</th><th>Status</th><th>Owner</th><th>Next Step</th></tr></thead><tbody>{rows.map((l) => <tr key={l.id} onClick={() => onOpen({ id: l.id, type: "lead", title: l.name || l.company || l.id })}><td><b>{l.name || l.id}</b><small>{l.id}</small></td><td>{fmt(l.company)}</td><td>{fmt(l.email || l.phone)}</td><td>{fmt(l.source)}</td><td><select value={l.status} onClick={(e) => e.stopPropagation()} onChange={(e) => updateStatus(l, e.target.value)}>{statuses.map((s) => <option key={s.name}>{s.name}</option>)}</select></td><td>{fmt(l.lead_owner)}</td><td><button className="btn btn-small" onClick={(e) => { e.stopPropagation(); convert(l); }}>Convert</button></td></tr>)}</tbody></table>{!rows.length && <EmptyState title="No leads found" body="Adjust your filters or create a new lead." action={<button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Lead</button>} />}</div>}{showCreate && <CreateLeadModal statuses={statuses} sources={sources} onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); void load(); onRefresh(); }} />}</section>;
}

function OpportunitiesView({ statuses, onOpen, refreshSignal, onRefresh, currency }: { statuses: Status[]; onOpen: (r: { id: string; type: "deal"; title: string }) => void; refreshSignal: number; onRefresh: () => void; currency: string }) {
  const [rows, setRows] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [view, setView] = useState<"board" | "list">("board");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const json = await apiFetch("/api/crm/deals?limit=120&offset=0");
      setRows(arrayFrom<Deal>(json, ["deals", "opportunities"]));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load opportunities");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [refreshSignal]);

  async function move(deal: Deal, stage: string) {
    try {
      await apiFetch(`/api/crm/deals/${deal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: stage, sales_stage: stage }),
      });
      setRows((current) => current.map((item) => item.id === deal.id ? { ...item, stage } : item));
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update opportunity");
    }
  }

  const cols = statuses.map((s) => ({
    status: s.name,
    deals: rows.filter((d) => (d.stage || "").toLowerCase() === s.name.toLowerCase()),
  }));

  return (
    <section className="demo-panel">
      <div className="demo-panel-head crm-toolbar">
        <div>
          <h3>Opportunities</h3>
          <p>Pipeline board for qualified deals, values and close stages.</p>
        </div>
        <div className="crm-toolbar-actions">
          <button className="btn" onClick={() => setView(view === "board" ? "list" : "board")}>{view === "board" ? "List View" : "Board View"}</button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>New Opportunity</button>
        </div>
      </div>
      <ErrorBanner message={error} />
      {loading ? <LoadingBlock /> : (
        <>
          {view === "board" ? (
            <div className="crm-kanban">
              {cols.map((col) => (
                <div className="crm-kanban-col" key={col.status}>
                  <div className="crm-kanban-head"><b>{col.status}</b><span>{col.deals.length}</span></div>
                  {col.deals.map((d) => (
                    <button className="crm-deal-card" key={d.id} onClick={() => onOpen({ id: d.id, type: "deal", title: d.title || d.id })}>
                      <b>{d.title || d.id}</b>
                      <p>{fmt(d.organization)} · {fmt(d.owner)}</p>
                      <strong>{fmt(d.value || money(d.raw_value, currency))}</strong>
                      <small>{Number(d.probability || 0)}% · Close {dateText(d.expected_close)}</small>
                      <div className="crm-card-actions" onClick={(e) => e.stopPropagation()}>
                        {statuses.map((s) => s.name !== d.stage ? <button key={s.name} title={s.name} onClick={() => move(d, s.name)} /> : null)}
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="crm-table-wrap">
              <table className="demo-table crm-table">
                <thead><tr><th>Opportunity</th><th>Account</th><th>Stage</th><th>Value</th><th>Probability</th><th>Expected Close</th><th>Owner</th></tr></thead>
                <tbody>
                  {rows.map((d) => (
                    <tr key={d.id} onClick={() => onOpen({ id: d.id, type: "deal", title: d.title || d.id })}>
                      <td><b>{d.title || d.id}</b><small>{d.id}</small></td>
                      <td>{fmt(d.organization)}</td>
                      <td><StatusBadge status={d.stage} /></td>
                      <td>{fmt(d.value || money(d.raw_value, currency))}</td>
                      <td>{Number(d.probability || 0)}%</td>
                      <td>{dateText(d.expected_close)}</td>
                      <td>{fmt(d.owner)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!rows.length && <EmptyState title="No opportunities yet" body="Create a manual opportunity or convert a lead." action={<button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Opportunity</button>} />}
        </>
      )}
      {showCreate && <CreateDealModal statuses={statuses} onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); void load(); onRefresh(); }} />}
    </section>
  );
}

function ContactsView({ refreshSignal }: { refreshSignal: number }) {
  const [rows, setRows] = useState<Contact[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [search, setSearch] = useState(""); const [showCreate, setShowCreate] = useState(false);
  async function load() { setLoading(true); setError(""); try { const q = new URLSearchParams({ limit: "100", offset: "0" }); if (search) q.set("search", search); const json = await apiFetch(`/api/crm/contacts?${q}`); setRows(arrayFrom<Contact>(json, ["contacts"])); } catch (err) { setError(err instanceof Error ? err.message : "Could not load contacts"); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, [refreshSignal]);
  return <section className="demo-panel"><div className="demo-panel-head crm-toolbar"><div><h3>Contacts</h3><p>People your sales team works with across leads and opportunities.</p></div><div className="crm-toolbar-actions"><input placeholder="Search contacts…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} /><button className="btn" onClick={load}>Search</button><button className="btn btn-primary" onClick={() => setShowCreate(true)}>New Contact</button></div></div><ErrorBanner message={error} />{loading ? <LoadingBlock /> : <div className="crm-card-grid">{rows.map((c) => <div className="crm-person-card" key={c.id}><div className="crm-avatar">{(c.name || "?").slice(0, 1).toUpperCase()}</div><div><b>{c.name || c.id}</b><span>{fmt(c.designation)} · {fmt(c.company)}</span><small>{fmt(c.email || c.phone)}</small></div></div>)}{!rows.length && <EmptyState title="No contacts found" body="Add contacts or convert qualified leads." />}</div>}{showCreate && <CreateContactModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); void load(); }} />}</section>;
}

function AccountsView({ crmMode, refreshSignal }: { crmMode: CrmMode; refreshSignal: number }) {
  const [rows, setRows] = useState<Account[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  async function load() { setLoading(true); try { const json = await apiFetch("/api/crm/organizations?limit=80&offset=0"); setRows(arrayFrom<Account>(json, ["organizations"])); } catch (err) { setError(err instanceof Error ? err.message : "Could not load accounts"); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, [refreshSignal]);
  return <section className="demo-panel"><div className="demo-panel-head"><div><h3>Accounts</h3><p>Organizations behind contacts and opportunities.</p></div></div><ErrorBanner message={error} />{crmMode === "erpnext" && <div className="crm-banner info">Your tenant is running ERPNext CRM fallback. Accounts will fully unlock when the Frappe CRM app is installed and the tenant has CRM Organization DocTypes.</div>}{loading ? <LoadingBlock /> : <div className="crm-card-grid">{rows.map((a) => <div className="crm-account-card" key={a.name}><b>{a.organization_name || a.name}</b><span>{fmt(a.industry)} · {fmt(a.territory || a.city)}</span><small>{fmt(a.website)}</small></div>)}{!rows.length && <EmptyState title="No accounts yet" body="Accounts are created from Frappe CRM organizations or lead conversion." />}</div>}</section>;
}

function ActivitiesView({ crmMode }: { crmMode: CrmMode }) {
  const [templates, setTemplates] = useState<any[]>([]); const [calls, setCalls] = useState<any[]>([]); const [notices, setNotices] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { Promise.allSettled([apiFetch("/api/crm/email-templates?limit=20"), apiFetch("/api/crm/call-logs?limit=20"), apiFetch("/api/crm/notifications?limit=20")]).then(([t, c, n]) => { if (t.status === "fulfilled") setTemplates(arrayFrom<any>(t.value, ["templates"])); if (c.status === "fulfilled") setCalls(arrayFrom<any>(c.value, ["call_logs"])); if (n.status === "fulfilled") setNotices(arrayFrom<any>(n.value, ["notifications"])); }).finally(() => setLoading(false)); }, []);
  if (loading) return <LoadingBlock />;
  return <div className="crm-split-grid three"><section className="demo-panel"><div className="demo-panel-head"><div><h3>Email Templates</h3><p>Reusable messages for follow-ups, proposals and onboarding.</p></div></div><div className="crm-list-panel">{templates.map((t, i) => <div className="crm-mini-card" key={t.name || i}><b>{t.name || t.subject}</b><span>{fmt(t.subject)}</span></div>)}{!templates.length && <EmptyState title="No templates" body="Create templates on the tenant server or Frappe desk." />}</div></section><section className="demo-panel"><div className="demo-panel-head"><div><h3>Call Logs</h3><p>Logged calls for leads and opportunities.</p></div></div><div className="crm-list-panel">{calls.map((c, i) => <div className="crm-mini-card" key={c.name || i}><b>{c.type || "Call"}</b><span>{fmt(c.receiver || c.to || c.caller)} · {dateText(c.creation)}</span></div>)}{!calls.length && <EmptyState title="No call logs" body="Call logs require the CRM calls add-on or Frappe CRM Call Log DocType." />}</div></section><section className="demo-panel"><div className="demo-panel-head"><div><h3>Notifications</h3><p>Assigned tasks, reminders and alerts.</p></div></div><div className="crm-list-panel">{notices.map((n, i) => <div className="crm-mini-card" key={n.id || n.name || i}><b>{n.title || n.subject || "Notification"}</b><span>{fmt(n.document_name || n.message)} · {dateText(n.creation || n.date)}</span></div>)}{!notices.length && <EmptyState title="No notifications" body="Notifications will appear here once tasks and reminders are active." />}</div></section></div>;
}

function AutomationView({ crmMode }: { crmMode: CrmMode }) {
  const [rules, setRules] = useState<any[]>([]); const [fields, setFields] = useState<any[]>([]); const [sla, setSla] = useState<any>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { const dt = crmMode === "frappe_crm" ? "CRM Lead" : "Lead"; Promise.allSettled([apiFetch("/api/crm/automation"), apiFetch(`/api/crm/custom-fields?doctype=${encodeURIComponent(dt)}`)]).then(([a, f]) => { if (a.status === "fulfilled") { const raw = a.value as any; const ar = raw.assignment_rules?.data ?? raw.assignment_rules ?? {}; setRules(ar.rules || ar.assignment_rules || []); setSla(raw.sla?.data ?? raw.sla ?? null); } if (f.status === "fulfilled") setFields(arrayFrom<any>(f.value, ["custom_fields"])); }).finally(() => setLoading(false)); }, [crmMode]);
  if (loading) return <LoadingBlock />;
  return <div className="crm-split-grid three"><section className="demo-panel"><div className="demo-panel-head"><div><h3>SLA Rules</h3><p>Response and follow-up discipline for sales records.</p></div></div><div className="crm-list-panel"><div className="crm-mini-card"><b>{sla ? "Configured" : "Not configured"}</b><span>{crmMode === "frappe_crm" ? "Frappe CRM SLA rules can be surfaced here." : "Install Frappe CRM for CRM Service Level Agreement DocTypes."}</span></div></div></section><section className="demo-panel"><div className="demo-panel-head"><div><h3>Assignment Rules</h3><p>Route leads and opportunities by workload or conditions.</p></div></div><div className="crm-list-panel">{rules.map((r, i) => <div className="crm-mini-card" key={r.name || i}><b>{r.name || `Rule ${i + 1}`}</b><span>{fmt(r.document_type)} · {fmt(r.assign_condition)}</span></div>)}{!rules.length && <EmptyState title="No assignment rules" body="Create routing rules on the tenant server." />}</div></section><section className="demo-panel"><div className="demo-panel-head"><div><h3>Custom Fields</h3><p>Tenant-specific lead and opportunity fields.</p></div></div><div className="crm-list-panel">{fields.map((f, i) => <div className="crm-mini-card" key={f.name || i}><b>{f.label || f.fieldname}</b><span>{fmt(f.fieldtype)} · {fmt(f.options)}</span></div>)}{!fields.length && <EmptyState title="No custom fields" body="Add tenant-specific fields when needed." />}</div></section></div>;
}

export default function CrmWorkspaceClient({ initialTab }: { initialTab?: string } = {}) {
  const [tab, setTab] = useState<Tab>(() => normalizeTab(initialTab));
  const [cards, setCards] = useState<DashboardCards | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [currency, setCurrency] = useState("ZAR");
  const [crmMode, setCrmMode] = useState<CrmMode>("erpnext");
  const [leadStatuses, setLeadStatuses] = useState<Status[]>(DEFAULT_LEAD_STATUSES);
  const [dealStatuses, setDealStatuses] = useState<Status[]>(DEFAULT_DEAL_STATUSES);
  const [sources, setSources] = useState<string[]>(["Website", "Email", "Phone", "Referral", "Social Media", "Campaign", "Walk In", "Other"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [modal, setModal] = useState<"lead" | "deal" | "contact" | null>(null);
  const [drawer, setDrawer] = useState<{ id: string; type: "lead" | "deal"; title: string } | null>(null);
  const leadStatusList = useMemo(() => uniqueStatuses(leadStatuses, DEFAULT_LEAD_STATUSES), [leadStatuses]);
  const dealStatusList = useMemo(() => uniqueStatuses(dealStatuses, DEFAULT_DEAL_STATUSES), [dealStatuses]);

  async function refreshCore() {
    setError("");
    const [dash, leadSt, dealSt, src, leadRows, dealRows] = await Promise.allSettled([
      apiFetch("/api/crm/dashboard"), apiFetch("/api/crm/statuses?type=lead"), apiFetch("/api/crm/statuses?type=deal"), apiFetch("/api/crm/sources"), apiFetch("/api/crm/leads?limit=8&offset=0"), apiFetch("/api/crm/deals?limit=8&offset=0"),
    ]);
    if (dash.status === "fulfilled") { const d = unwrap<any>(dash.value); setCards(d.cards || null); setActivity(d.recent_activity || []); setCurrency(d.currency || "ZAR"); setCrmMode(d.crm_app === "frappe_crm" ? "frappe_crm" : "erpnext"); }
    else setError(dash.reason instanceof Error ? dash.reason.message : "Could not load dashboard data from backend.");
    if (leadSt.status === "fulfilled") setLeadStatuses(arrayFrom<Status>(leadSt.value, ["statuses"]));
    if (dealSt.status === "fulfilled") setDealStatuses(arrayFrom<Status>(dealSt.value, ["statuses"]));
    if (src.status === "fulfilled") { const list = arrayFrom<string>(src.value, ["sources"]); if (list.length) setSources(list); }
    if (leadRows.status === "fulfilled") setLeads(arrayFrom<Lead>(leadRows.value, ["leads"]));
    if (dealRows.status === "fulfilled") setDeals(arrayFrom<Deal>(dealRows.value, ["deals", "opportunities"]));
  }
  useEffect(() => { setLoading(true); refreshCore().finally(() => setLoading(false)); }, [refreshSignal]);
  const bump = () => setRefreshSignal((x) => x + 1);

  return <div className="demo-workspace crm-console animate-fade-up">
    <section className="crm-hero-card">
      <div><div className="demo-eyebrow">CRM & Sales Command Center</div><h1>Complete CRM Operation</h1><p>Run your lead-to-opportunity process from one tenant-aware workspace: capture, qualify, convert, follow up, and forecast. No AI included.</p><div className="crm-hero-tags"><span>{crmMode === "frappe_crm" ? "Frappe CRM mode" : "ERPNext CRM fallback"}</span><span>Tenant live data</span><span>{currency}</span></div></div>
      <div className="crm-hero-actions"><button className="btn btn-primary" onClick={() => setModal("lead")}>New Lead</button><button className="btn" onClick={() => setModal("deal")}>New Opportunity</button><button className="btn" onClick={() => setTab("Activities")}>Log Activity</button></div>
    </section>
    <ErrorBanner message={error} />
    <nav className="demo-tabbar crm-tabbar">{TABS.map((t) => <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>)}</nav>
    {loading ? <LoadingBlock /> : <>
      {tab === "Command Center" && <CommandCenter cards={cards} leads={leads} deals={deals} activity={activity} currency={currency} setTab={setTab} onOpen={setDrawer} />}
      {tab === "Leads" && <LeadsView statuses={leadStatusList} sources={sources} onOpen={setDrawer} refreshSignal={refreshSignal} onRefresh={bump} />}
      {tab === "Opportunities" && <OpportunitiesView statuses={dealStatusList} onOpen={setDrawer} refreshSignal={refreshSignal} onRefresh={bump} currency={currency} />}
      {tab === "Accounts" && <AccountsView crmMode={crmMode} refreshSignal={refreshSignal} />}
      {tab === "Contacts" && <ContactsView refreshSignal={refreshSignal} />}
      {tab === "Activities" && <ActivitiesView crmMode={crmMode} />}
      {tab === "Automation" && <AutomationView crmMode={crmMode} />}
    </>}
    {modal === "lead" && <CreateLeadModal statuses={leadStatusList} sources={sources} onClose={() => setModal(null)} onSaved={() => { setModal(null); bump(); setTab("Leads"); }} />}
    {modal === "deal" && <CreateDealModal statuses={dealStatusList} onClose={() => setModal(null)} onSaved={() => { setModal(null); bump(); setTab("Opportunities"); }} />}
    {modal === "contact" && <CreateContactModal onClose={() => setModal(null)} onSaved={() => { setModal(null); bump(); setTab("Contacts"); }} />}
    {drawer && <DetailDrawer record={drawer} mode={crmMode} crmMode={crmMode} onClose={() => setDrawer(null)} onRefresh={bump} />}
  </div>;
}
