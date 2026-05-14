"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Lead = {
  id: string; name: string; first_name?: string; last_name?: string;
  company?: string; email?: string; phone?: string; source?: string;
  status: string; lead_owner?: string; city?: string; country?: string;
  website?: string; created?: string; last_updated?: string;
};

type Deal = {
  id: string; title: string; organization?: string; stage: string;
  value: string; raw_value: number; currency?: string; probability: number;
  expected_close?: string; owner?: string; source?: string; last_updated?: string;
};

type Contact = {
  id: string; name: string; email?: string; phone?: string;
  company?: string; designation?: string; last_updated?: string;
};

type Org = {
  name: string; organization_name?: string; website?: string;
  territory?: string; annual_revenue?: number; industry?: string;
  no_of_employees?: string; city?: string; country?: string;
};

type Activity = {
  name: string; subject?: string; sender?: string;
  reference_doctype?: string; reference_name?: string;
  creation: string; communication_type?: string;
};

type DashboardCards = {
  leads: number; deals: number; contacts: number; organizations: number;
  pipeline_value: string; won_this_month: string; overdue_tasks: number;
};

type Status = { name: string; color: string; position: number };

type Note   = { name: string; title: string; content: string; owner: string; creation: string };
type Task   = { name: string; title: string; status: string; priority?: string; due_date?: string; assigned_to?: string };
type Comment = { name: string; content: string; comment_by: string; creation: string };

type RecordDetail = {
  lead?: Record<string, unknown>;
  deal?: Record<string, unknown>;
  notes: Note[];
  tasks: Task[];
  comments: Comment[];
  communications: Activity[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: unknown) { return v == null || v === "" ? "—" : String(v); }
function fmtDate(v?: string) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_COLORS: Record<string, string> = {
  new: "#3b82f6", open: "#f59e0b", contacted: "#f97316", replied: "#8b5cf6",
  qualified: "#10b981", unqualified: "#ef4444", converted: "#14b8a6",
  "do not contact": "#6b7280", qualification: "#3b82f6", "demo/presentation": "#f59e0b",
  "proposal/quotation": "#f97316", negotiation: "#8b5cf6", "ready to close": "#14b8a6",
  won: "#10b981", lost: "#ef4444",
};
function statusColor(s: string) { return STATUS_COLORS[s.toLowerCase()] ?? "#6b7280"; }
function StatusBadge({ status }: { status: string }) {
  const c = statusColor(status);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: c + "1a", color: c,
      border: `1px solid ${c}33`,
      borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600,
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c, display: "inline-block" }} />
      {status}
    </span>
  );
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SearchInput({ value, onChange, placeholder = "Search…" }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div style={{ position: "relative" }}>
      <svg style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }}
           width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="search"
        style={{ paddingLeft: 28 }}
      />
    </div>
  );
}

function InlineError({ msg }: { msg: string }) {
  return msg ? <div className="banner" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#b91c1c", marginBottom: 12 }}>{msg}</div> : null;
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, opacity: 0.5 }}>
      <div style={{
        width: 24, height: 24, border: "2px solid currentColor", borderTopColor: "transparent",
        borderRadius: "50%", animation: "spin 0.7s linear infinite",
      }} />
    </div>
  );
}

// ─── Detail Side Panel ────────────────────────────────────────────────────────

function DetailPanel({
  recordId, recordDoctype, recordName, onClose,
}: {
  recordId: string; recordDoctype: "lead" | "deal"; recordName: string; onClose: () => void;
}) {
  const [detail, setDetail]   = useState<RecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<"notes" | "tasks" | "comments" | "comms">("notes");
  const [noteInput, setNoteInput]   = useState("");
  const [noteTitle, setNoteTitle]   = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [taskTitle, setTaskTitle]   = useState("");
  const [taskDue, setTaskDue]       = useState("");
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState("");

  const doctype = recordDoctype === "lead" ? "CRM Lead" : "CRM Deal";

  useEffect(() => {
    setLoading(true);
    const url = recordDoctype === "lead"
      ? `/api/crm/leads/${recordId}`
      : `/api/crm/deals/${recordId}`;
    apiFetch(url).then((d) => {
      const data = (d as any).data ?? d;
      setDetail({
        lead:           data.lead,
        deal:           data.deal,
        notes:          data.notes          || [],
        tasks:          data.tasks          || [],
        comments:       data.comments       || [],
        communications: data.communications || [],
      });
    }).catch(() => setDetail({ notes: [], tasks: [], comments: [], communications: [] }))
      .finally(() => setLoading(false));
  }, [recordId, recordDoctype]);

  async function addNote() {
    if (!noteInput.trim()) return;
    setSaving(true); setMsg("");
    try {
      await apiFetch("/api/crm/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference_doctype: doctype, reference_name: recordId, title: noteTitle || "Note", content: noteInput }),
      });
      const r = await apiFetch(`/api/crm/notes?reference_doctype=${doctype}&reference_name=${recordId}`);
      setDetail((d) => d ? { ...d, notes: (r as any)?.data?.notes || (r as any)?.notes || d.notes } : d);
      setNoteInput(""); setNoteTitle(""); setMsg("Note saved.");
    } catch (e: any) { setMsg(e.message); } finally { setSaving(false); }
  }

  async function addComment() {
    if (!commentInput.trim()) return;
    setSaving(true); setMsg("");
    try {
      await apiFetch("/api/crm/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference_doctype: doctype, reference_name: recordId, content: commentInput }),
      });
      const r = await apiFetch(`/api/crm/comments?reference_doctype=${doctype}&reference_name=${recordId}`);
      setDetail((d) => d ? { ...d, comments: (r as any)?.data?.comments || (r as any)?.comments || d.comments } : d);
      setCommentInput(""); setMsg("Comment posted.");
    } catch (e: any) { setMsg(e.message); } finally { setSaving(false); }
  }

  async function addTask() {
    if (!taskTitle.trim()) return;
    setSaving(true); setMsg("");
    try {
      await apiFetch("/api/crm/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference_doctype: doctype, reference_name: recordId, title: taskTitle, due_date: taskDue || undefined }),
      });
      const r = await apiFetch(`/api/crm/tasks?reference_doctype=${doctype}&reference_name=${recordId}`);
      setDetail((d) => d ? { ...d, tasks: (r as any)?.data?.tasks || (r as any)?.tasks || d.tasks } : d);
      setTaskTitle(""); setTaskDue(""); setMsg("Task created.");
    } catch (e: any) { setMsg(e.message); } finally { setSaving(false); }
  }

  async function toggleTask(task: Task) {
    const nextStatus = task.status === "Closed" ? "Open" : "Closed";
    try {
      await apiFetch(`/api/crm/tasks/${task.name}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      setDetail((d) => d ? { ...d, tasks: d.tasks.map((t) => t.name === task.name ? { ...t, status: nextStatus } : t) } : d);
    } catch {/* noop */}
  }

  async function deleteNote(noteName: string) {
    try {
      await apiFetch(`/api/crm/notes/${noteName}`, { method: "DELETE" });
      setDetail((d) => d ? { ...d, notes: d.notes.filter((n) => n.name !== noteName) } : d);
    } catch {/* noop */}
  }

  const panelStyle: React.CSSProperties = {
    position: "fixed", top: 0, right: 0, bottom: 0,
    width: "min(480px, 96vw)", background: "var(--surface)",
    borderLeft: "1px solid var(--border)", boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
    zIndex: 200, display: "flex", flexDirection: "column", overflow: "hidden",
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 199 }} onClick={onClose} />
      <div style={panelStyle}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {recordDoctype === "lead" ? "Lead" : "Deal"}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", marginTop: 2 }}>{recordName}</div>
          </div>
          <button onClick={onClose} className="btn" style={{ padding: "4px 10px" }}>✕</button>
        </div>

        {/* Tab bar */}
        <div className="seg" style={{ margin: "12px 20px 0", flexShrink: 0 }}>
          {(["notes", "tasks", "comments", "comms"] as const).map((t) => (
            <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
              {t === "comms" ? "Emails" : t.charAt(0).toUpperCase() + t.slice(1)}
              {detail && <span style={{ marginLeft: 4, opacity: 0.6, fontSize: 11 }}>
                {t === "notes" ? detail.notes.length : t === "tasks" ? detail.tasks.length : t === "comments" ? detail.comments.length : detail.communications.length}
              </span>}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {loading ? <Spinner /> : !detail ? <div className="banner">Could not load details.</div> : (
            <>
              {msg && <div className="banner info" style={{ marginBottom: 12 }}>{msg}</div>}

              {/* Notes tab */}
              {tab === "notes" && (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Note title (optional)" className="input" style={{ marginBottom: 6, width: "100%" }} />
                    <textarea value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Write a note…" rows={3} style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, resize: "vertical", background: "var(--surface)", color: "var(--fg)" }} />
                    <button onClick={addNote} disabled={saving || !noteInput.trim()} className="btn btn-primary" style={{ marginTop: 6 }}>
                      {saving ? "Saving…" : "Add Note"}
                    </button>
                  </div>
                  {detail.notes.length === 0 ? <div style={{ opacity: 0.5, fontSize: 13 }}>No notes yet.</div> : detail.notes.map((n) => (
                    <div key={n.name} className="card card-pad" style={{ marginBottom: 10, position: "relative" }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{n.title}</div>
                      <div style={{ fontSize: 13, opacity: 0.8, whiteSpace: "pre-wrap" }}>{n.content}</div>
                      <div style={{ fontSize: 11, opacity: 0.4, marginTop: 6 }}>{fmtDate(n.creation)} · {n.owner}</div>
                      <button onClick={() => deleteNote(n.name)} style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", opacity: 0.4, fontSize: 13, color: "inherit" }} title="Delete note">✕</button>
                    </div>
                  ))}
                </>
              )}

              {/* Tasks tab */}
              {tab === "tasks" && (
                <>
                  <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                    <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Task title…" className="input" style={{ flex: 1 }} />
                    <input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} className="input" style={{ width: 130 }} />
                    <button onClick={addTask} disabled={saving || !taskTitle.trim()} className="btn btn-primary">Add</button>
                  </div>
                  {detail.tasks.length === 0 ? <div style={{ opacity: 0.5, fontSize: 13 }}>No tasks yet.</div> : detail.tasks.map((t) => (
                    <div key={t.name} className="card card-pad" style={{ marginBottom: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <input type="checkbox" checked={t.status === "Closed"} onChange={() => toggleTask(t)} style={{ marginTop: 2, cursor: "pointer" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, textDecoration: t.status === "Closed" ? "line-through" : "none", opacity: t.status === "Closed" ? 0.5 : 1 }}>{t.title}</div>
                        <div style={{ fontSize: 11, opacity: 0.4, marginTop: 2 }}>
                          {t.due_date ? `Due ${fmtDate(t.due_date)}` : "No due date"}
                          {t.assigned_to ? ` · ${t.assigned_to}` : ""}
                        </div>
                      </div>
                      <StatusBadge status={t.status} />
                    </div>
                  ))}
                </>
              )}

              {/* Comments tab */}
              {tab === "comments" && (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <textarea value={commentInput} onChange={(e) => setCommentInput(e.target.value)} placeholder="Leave a comment…" rows={3} style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, resize: "vertical", background: "var(--surface)", color: "var(--fg)" }} />
                    <button onClick={addComment} disabled={saving || !commentInput.trim()} className="btn btn-primary" style={{ marginTop: 6 }}>
                      {saving ? "Posting…" : "Post Comment"}
                    </button>
                  </div>
                  {detail.comments.length === 0 ? <div style={{ opacity: 0.5, fontSize: 13 }}>No comments yet.</div> : detail.comments.map((c) => (
                    <div key={c.name} className="card card-pad" style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, opacity: 0.7 }}>{c.comment_by} · {fmtDate(c.creation)}</div>
                      <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }} dangerouslySetInnerHTML={{ __html: c.content }} />
                    </div>
                  ))}
                </>
              )}

              {/* Comms tab */}
              {tab === "comms" && (
                <>
                  {detail.communications.length === 0 ? <div style={{ opacity: 0.5, fontSize: 13 }}>No email communications.</div> : detail.communications.map((c) => (
                    <div key={c.name} className="card card-pad" style={{ marginBottom: 10 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{c.subject || "(No subject)"}</div>
                      <div style={{ fontSize: 12, opacity: 0.6 }}>From: {c.sender} · {fmtDate(c.creation)}</div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Create Lead Modal ────────────────────────────────────────────────────────

function CreateLeadModal({ statuses, sources, onClose, onCreated }: {
  statuses: Status[]; sources: string[];
  onClose: () => void; onCreated: () => void;
}) {
  const [form, setForm] = useState({
    first_name: "", last_name: "", company: "", email: "", phone: "",
    source: sources[0] || "Website", status: "New", city: "", country: "South Africa",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit() {
    if (!form.first_name.trim()) { setErr("First name is required."); return; }
    setSaving(true); setErr("");
    try {
      await apiFetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      onCreated();
    } catch (e: any) { setErr(e.message); setSaving(false); }
  }

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300 }} onClick={onClose} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "min(520px, 94vw)", background: "var(--surface)", borderRadius: 10,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)", zIndex: 301, padding: 24,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>New Lead</h3>
          <button onClick={onClose} className="btn" style={{ padding: "2px 8px" }}>✕</button>
        </div>
        <InlineError msg={err} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label className="label">First Name *</label>
            <input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} className="input" style={{ width: "100%" }} />
          </div>
          <div>
            <label className="label">Last Name</label>
            <input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} className="input" style={{ width: "100%" }} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label className="label">Company</label>
            <input value={form.company} onChange={(e) => set("company", e.target.value)} className="input" style={{ width: "100%" }} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="input" style={{ width: "100%" }} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="input" style={{ width: "100%" }} />
          </div>
          <div>
            <label className="label">Source</label>
            <select value={form.source} onChange={(e) => set("source", e.target.value)} className="input" style={{ width: "100%" }}>
              {sources.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className="input" style={{ width: "100%" }}>
              {statuses.map((s) => <option key={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">City</label>
            <input value={form.city} onChange={(e) => set("city", e.target.value)} className="input" style={{ width: "100%" }} />
          </div>
          <div>
            <label className="label">Country</label>
            <input value={form.country} onChange={(e) => set("country", e.target.value)} className="input" style={{ width: "100%" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <button onClick={onClose} className="btn">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn btn-primary">
            {saving ? "Creating…" : "Create Lead"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Create Deal Modal ────────────────────────────────────────────────────────

function CreateDealModal({ dealStatuses, onClose, onCreated }: {
  dealStatuses: Status[]; onClose: () => void; onCreated: () => void;
}) {
  const [form, setForm] = useState({
    lead_name: "", organization: "", status: "Qualification",
    deal_value: "", expected_closing: "", probability: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit() {
    if (!form.lead_name.trim()) { setErr("Title is required."); return; }
    setSaving(true); setErr("");
    try {
      await apiFetch("/api/crm/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          deal_value: Number(form.deal_value) || 0,
          probability: Number(form.probability) || 0,
        }),
      });
      onCreated();
    } catch (e: any) { setErr(e.message); setSaving(false); }
  }

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300 }} onClick={onClose} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "min(480px, 94vw)", background: "var(--surface)", borderRadius: 10,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)", zIndex: 301, padding: 24,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>New Deal</h3>
          <button onClick={onClose} className="btn" style={{ padding: "2px 8px" }}>✕</button>
        </div>
        <InlineError msg={err} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ gridColumn: "1/-1" }}>
            <label className="label">Deal Title *</label>
            <input value={form.lead_name} onChange={(e) => set("lead_name", e.target.value)} className="input" style={{ width: "100%" }} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label className="label">Organization</label>
            <input value={form.organization} onChange={(e) => set("organization", e.target.value)} className="input" style={{ width: "100%" }} />
          </div>
          <div>
            <label className="label">Stage</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className="input" style={{ width: "100%" }}>
              {dealStatuses.map((s) => <option key={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Deal Value (ZAR)</label>
            <input type="number" value={form.deal_value} onChange={(e) => set("deal_value", e.target.value)} className="input" style={{ width: "100%" }} placeholder="0" />
          </div>
          <div>
            <label className="label">Expected Close</label>
            <input type="date" value={form.expected_closing} onChange={(e) => set("expected_closing", e.target.value)} className="input" style={{ width: "100%" }} />
          </div>
          <div>
            <label className="label">Probability (%)</label>
            <input type="number" min={0} max={100} value={form.probability} onChange={(e) => set("probability", e.target.value)} className="input" style={{ width: "100%" }} placeholder="0" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <button onClick={onClose} className="btn">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn btn-primary">
            {saving ? "Creating…" : "Create Deal"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab({ cards, activity, currency }: {
  cards: DashboardCards; activity: Activity[]; currency: string;
}) {
  const metrics = [
    { label: "Open Leads",      value: cards.leads,         hint: "Total leads",          color: "" },
    { label: "Active Deals",    value: cards.deals,         hint: "Pipeline deals",       color: "teal" },
    { label: "Contacts",        value: cards.contacts,      hint: "CRM contacts",         color: "" },
    { label: "Organizations",   value: cards.organizations, hint: "Tracked orgs",         color: "" },
    { label: "Pipeline Value",  value: cards.pipeline_value,hint: "All deal values",      color: "warn" },
    { label: "Won This Month",  value: cards.won_this_month,hint: "Closed deals",         color: "teal" },
    { label: "Overdue Tasks",   value: cards.overdue_tasks, hint: "Tasks past due date",  color: cards.overdue_tasks > 0 ? "danger" : "" },
  ];

  return (
    <>
      <div className="kpi-grid">
        {metrics.map((m) => (
          <div key={m.label} className={`kpi ${m.color}`}>
            <div className="label">{m.label}</div>
            <div className="val">{typeof m.value === "number" ? m.value.toLocaleString("en-ZA") : m.value}</div>
            <div className="hint">{m.hint}</div>
          </div>
        ))}
      </div>

      <div className="card card-pad" style={{ marginTop: 16 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "var(--fg)" }}>Recent Activity</h3>
        {activity.length === 0 ? (
          <div style={{ opacity: 0.5, fontSize: 13 }}>No recent communications.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activity.slice(0, 10).map((a) => (
              <div key={a.name} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", background: "#3b82f61a", color: "#3b82f6",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {(a.sender || a.reference_doctype || "?")[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.subject || a.communication_type || "Communication"}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.55, marginTop: 2 }}>
                    {a.sender || a.reference_doctype} · {fmtDate(a.creation)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Leads Tab ────────────────────────────────────────────────────────────────

function LeadsTab({ statuses, sources }: { statuses: Status[]; sources: string[] }) {
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusF]  = useState("all");
  const [total, setTotal]           = useState(0);
  const [offset, setOffset]         = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail]         = useState<{ id: string; name: string } | null>(null);
  const [converting, setConverting] = useState<string | null>(null);
  const [convMsg, setConvMsg]       = useState("");
  const [movingId, setMovingId]     = useState<string | null>(null);
  const LIMIT = 20;

  const load = useCallback(async (q?: string, st?: string, off?: number) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(off ?? offset) });
    if (q ?? search) params.set("search", q ?? search);
    if ((st ?? statusFilter) !== "all") params.set("status", st ?? statusFilter);
    try {
      const r = await apiFetch(`/api/crm/leads?${params}`);
      const data = (r as any).data ?? r;
      setLeads(data.leads || []);
      setTotal((data as any).meta?.total ?? data.leads?.length ?? 0);
    } catch { setLeads([]); } finally { setLoading(false); }
  }, [search, statusFilter, offset]);

  // Debounced search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setOffset(0); load(search, statusFilter, 0); }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, statusFilter]);

  async function moveStage(lead: Lead, newStatus: string) {
    setMovingId(lead.id);
    try {
      await apiFetch(`/api/crm/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setLeads((ls) => ls.map((l) => l.id === lead.id ? { ...l, status: newStatus } : l));
    } catch {/* noop */} finally { setMovingId(null); }
  }

  async function convertLead(lead: Lead) {
    setConverting(lead.id); setConvMsg("");
    try {
      const r = await apiFetch(`/api/crm/leads/${lead.id}/convert`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = (r as any).data ?? r;
      setConvMsg(`✓ ${lead.name} converted → Deal ${(data as any)?.deal?.id ?? ""}`);
      load();
    } catch (e: any) { setConvMsg(`Error: ${e.message}`); } finally { setConverting(null); }
  }

  return (
    <>
      {showCreate && <CreateLeadModal statuses={statuses} sources={sources} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
      {detail && <DetailPanel recordId={detail.id} recordDoctype="lead" recordName={detail.name} onClose={() => setDetail(null)} />}

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search leads…" />
        <select value={statusFilter} onChange={(e) => { setStatusF(e.target.value); setOffset(0); }}
          className="input" style={{ minWidth: 140 }}>
          <option value="all">All Statuses</option>
          {statuses.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary" style={{ marginLeft: "auto" }}>+ New Lead</button>
      </div>

      {convMsg && <div className="banner info" style={{ marginBottom: 12 }}>{convMsg}</div>}

      {loading ? <Spinner /> : leads.length === 0 ? (
        <div className="card card-pad" style={{ textAlign: "center", opacity: 0.5, padding: 40 }}>
          No leads found.{" "}<button className="btn" onClick={() => setShowCreate(true)}>Create your first lead</button>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>Name</th><th>Company</th><th>Email</th>
                  <th>Phone</th><th>Status</th><th>Source</th><th>Updated</th><th style={{ width: 200 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <button onClick={() => setDetail({ id: l.id, name: l.name })}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontWeight: 600, padding: 0, fontSize: 13 }}>
                        {l.name}
                      </button>
                    </td>
                    <td>{fmt(l.company)}</td>
                    <td>{fmt(l.email)}</td>
                    <td>{fmt(l.phone)}</td>
                    <td><StatusBadge status={l.status} /></td>
                    <td>{fmt(l.source)}</td>
                    <td style={{ fontSize: 12, opacity: 0.6 }}>{fmtDate(l.last_updated)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        <select
                          value={l.status}
                          disabled={movingId === l.id}
                          onChange={(e) => moveStage(l, e.target.value)}
                          className="input"
                          style={{ fontSize: 11, padding: "2px 4px", height: 24 }}
                        >
                          {statuses.map((s) => <option key={s.name}>{s.name}</option>)}
                        </select>
                        {l.status !== "Converted" && (
                          <button onClick={() => convertLead(l)} disabled={converting === l.id} className="btn btn-sm" title="Convert to Deal">
                            {converting === l.id ? "…" : "→ Deal"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {total > LIMIT && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, fontSize: 13 }}>
          <span style={{ opacity: 0.6 }}>Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button disabled={offset === 0} onClick={() => { const o = Math.max(0, offset - LIMIT); setOffset(o); load(undefined, undefined, o); }} className="btn">← Prev</button>
            <button disabled={offset + LIMIT >= total} onClick={() => { const o = offset + LIMIT; setOffset(o); load(undefined, undefined, o); }} className="btn">Next →</button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Deals / Kanban Tab ───────────────────────────────────────────────────────

function DealsTab({ dealStatuses }: { dealStatuses: Status[] }) {
  const [deals, setDeals]           = useState<Deal[]>([]);
  const [loading, setLoading]       = useState(true);
  const [view, setView]             = useState<"kanban" | "table">("kanban");
  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail]         = useState<{ id: string; name: string } | null>(null);
  const [movingId, setMovingId]     = useState<string | null>(null);
  const [total, setTotal]           = useState(0);
  const [offset, setOffset]         = useState(0);
  const LIMIT = 50;

  const load = useCallback(async (off = 0) => {
    setLoading(true);
    try {
      const r = await apiFetch(`/api/crm/deals?limit=${LIMIT}&offset=${off}`);
      const data = (r as any).data ?? r;
      setDeals(data.deals || []);
      setTotal((data as any).meta?.total ?? data.deals?.length ?? 0);
    } catch { setDeals([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stageNames = dealStatuses.map((s) => s.name);
  const byStage = useMemo(() =>
    Object.fromEntries(stageNames.map((s) => [s, deals.filter((d) => d.stage === s)])),
    [deals, stageNames]
  );

  const totalPipeline = useMemo(() => deals.reduce((sum, d) => sum + (d.raw_value || 0), 0), [deals]);

  async function moveDeal(deal: Deal, newStage: string) {
    setMovingId(deal.id);
    try {
      await apiFetch(`/api/crm/deals/${deal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStage }),
      });
      setDeals((ds) => ds.map((d) => d.id === deal.id ? { ...d, stage: newStage } : d));
    } catch {/* noop */} finally { setMovingId(null); }
  }

  async function markLost(deal: Deal) {
    if (!confirm(`Mark "${deal.title}" as Lost?`)) return;
    await moveDeal(deal, "Lost");
  }

  const money = (v: number) => `R${v.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;

  return (
    <>
      {showCreate && <CreateDealModal dealStatuses={dealStatuses} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
      {detail && <DetailPanel recordId={detail.id} recordDoctype="deal" recordName={detail.name} onClose={() => setDetail(null)} />}

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
        <div className="kpi" style={{ flex: 1, minWidth: 0 }}>
          <div className="label">Pipeline</div>
          <div className="val">{money(totalPipeline)}</div>
          <div className="hint">{deals.length} deals total</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
          <div className="seg">
            <button className={view === "kanban" ? "on" : ""} onClick={() => setView("kanban")}>Kanban</button>
            <button className={view === "table"  ? "on" : ""} onClick={() => setView("table")}>Table</button>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary">+ New Deal</button>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <>
          {view === "kanban" ? (
            <div className="kanban" style={{ overflowX: "auto" }}>
              {stageNames.map((stage) => {
                const stageDeals = byStage[stage] || [];
                const stageValue = stageDeals.reduce((s, d) => s + (d.raw_value || 0), 0);
                return (
                  <div key={stage} className="kan-col">
                    <div style={{ marginBottom: 10 }}>
                      <h4 style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span><StatusBadge status={stage} /></span>
                        <span className="cnt">{stageDeals.length}</span>
                      </h4>
                      {stageValue > 0 && <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>{money(stageValue)}</div>}
                    </div>
                    {stageDeals.map((d) => (
                      <div key={d.id} className="kan-card">
                        <button onClick={() => setDetail({ id: d.id, name: d.title })}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left", width: "100%" }}>
                          <div className="ktitle">{d.title}</div>
                          <div className="kmeta">
                            <span>{d.organization || "—"}</span>
                            <strong>{d.value}</strong>
                          </div>
                          {d.probability > 0 && (
                            <div style={{ marginTop: 6 }}>
                              <div style={{ height: 3, background: "var(--border)", borderRadius: 2 }}>
                                <div style={{ height: "100%", width: `${d.probability}%`, background: statusColor(stage), borderRadius: 2 }} />
                              </div>
                              <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>{d.probability}% probability</div>
                            </div>
                          )}
                        </button>
                        <div style={{ display: "flex", gap: 4, marginTop: 10, flexWrap: "wrap" }}>
                          {stageNames.filter((s) => s !== stage && s !== "Lost" && s !== "Won").slice(0, 2).map((s) => (
                            <button key={s} className="btn btn-sm" disabled={movingId === d.id} onClick={() => moveDeal(d, s)}>{s}</button>
                          ))}
                          {stage !== "Won"  && <button className="btn btn-sm" disabled={movingId === d.id} onClick={() => moveDeal(d, "Won")} style={{ color: "#10b981" }}>Won</button>}
                          {stage !== "Lost" && <button className="btn btn-sm" disabled={movingId === d.id} onClick={() => markLost(d)} style={{ color: "#ef4444" }}>Lost</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card" style={{ overflow: "hidden" }}>
              <div className="overflow-x-auto">
                <table className="data">
                  <thead>
                    <tr><th>Title</th><th>Organization</th><th>Stage</th><th>Value</th><th>Probability</th><th>Expected Close</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {deals.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <button onClick={() => setDetail({ id: d.id, name: d.title })}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontWeight: 600, padding: 0, fontSize: 13 }}>
                            {d.title}
                          </button>
                        </td>
                        <td>{fmt(d.organization)}</td>
                        <td><StatusBadge status={d.stage} /></td>
                        <td style={{ fontWeight: 600 }}>{d.value}</td>
                        <td>{d.probability > 0 ? `${d.probability}%` : "—"}</td>
                        <td style={{ fontSize: 12, opacity: 0.6 }}>{fmtDate(d.expected_close)}</td>
                        <td>
                          <div style={{ display: "flex", gap: 4 }}>
                            <select value={d.stage} onChange={(e) => moveDeal(d, e.target.value)} className="input" style={{ fontSize: 11, padding: "2px 4px", height: 24 }} disabled={movingId === d.id}>
                              {stageNames.map((s) => <option key={s}>{s}</option>)}
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ─── Contacts Tab ─────────────────────────────────────────────────────────────

function ContactsTab() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [total, setTotal]       = useState(0);
  const [offset, setOffset]     = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", company: "", designation: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const LIMIT = 20;

  const load = useCallback(async (q?: string, off = 0) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(off) });
    if (q ?? search) params.set("search", q ?? search);
    try {
      const r = await apiFetch(`/api/crm/contacts?${params}`);
      const data = (r as any).data ?? r;
      setContacts(data.contacts || []);
      setTotal((data as any).meta?.total ?? data.contacts?.length ?? 0);
    } catch { setContacts([]); } finally { setLoading(false); }
  }, [search]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setOffset(0); load(search, 0); }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  async function createContact() {
    if (!form.first_name.trim()) { setErr("First name required."); return; }
    setSaving(true); setErr("");
    try {
      await apiFetch("/api/crm/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setShowCreate(false);
      setForm({ first_name: "", last_name: "", email: "", phone: "", company: "", designation: "" });
      load("", 0);
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  }

  function setF(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  return (
    <>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search contacts…" />
        <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary" style={{ marginLeft: "auto" }}>+ New Contact</button>
      </div>

      {showCreate && (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700 }}>New Contact</h4>
          <InlineError msg={err} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label className="label">First Name *</label><input value={form.first_name} onChange={(e) => setF("first_name", e.target.value)} className="input" style={{ width: "100%" }} /></div>
            <div><label className="label">Last Name</label><input value={form.last_name} onChange={(e) => setF("last_name", e.target.value)} className="input" style={{ width: "100%" }} /></div>
            <div><label className="label">Email</label><input type="email" value={form.email} onChange={(e) => setF("email", e.target.value)} className="input" style={{ width: "100%" }} /></div>
            <div><label className="label">Phone</label><input value={form.phone} onChange={(e) => setF("phone", e.target.value)} className="input" style={{ width: "100%" }} /></div>
            <div><label className="label">Company</label><input value={form.company} onChange={(e) => setF("company", e.target.value)} className="input" style={{ width: "100%" }} /></div>
            <div><label className="label">Designation</label><input value={form.designation} onChange={(e) => setF("designation", e.target.value)} className="input" style={{ width: "100%" }} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={createContact} disabled={saving} className="btn btn-primary">{saving ? "Saving…" : "Create"}</button>
            <button onClick={() => setShowCreate(false)} className="btn">Cancel</button>
          </div>
        </div>
      )}

      {loading ? <Spinner /> : contacts.length === 0 ? (
        <div className="card card-pad" style={{ textAlign: "center", opacity: 0.5, padding: 40 }}>No contacts found.</div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Phone</th><th>Company</th><th>Title</th><th>Updated</th></tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{fmt(c.email)}</td>
                    <td>{fmt(c.phone)}</td>
                    <td>{fmt(c.company)}</td>
                    <td style={{ opacity: 0.7 }}>{fmt(c.designation)}</td>
                    <td style={{ fontSize: 12, opacity: 0.6 }}>{fmtDate(c.last_updated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {total > LIMIT && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 13 }}>
          <span style={{ opacity: 0.6 }}>{offset + 1}–{Math.min(offset + LIMIT, total)} of {total}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button disabled={offset === 0} onClick={() => { const o = Math.max(0, offset - LIMIT); setOffset(o); load(undefined, o); }} className="btn">← Prev</button>
            <button disabled={offset + LIMIT >= total} onClick={() => { const o = offset + LIMIT; setOffset(o); load(undefined, o); }} className="btn">Next →</button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Organizations Tab ────────────────────────────────────────────────────────

function OrgsTab() {
  const [orgs, setOrgs]         = useState<Org[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (q ?? search) params.set("search", q ?? search);
    try {
      const r = await apiFetch(`/api/crm/organizations?${params}`);
      const data = (r as any).data ?? r;
      setOrgs(data.organizations || []);
    } catch { setOrgs([]); } finally { setLoading(false); }
  }, [search]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(search), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const money = (v?: number) => v ? `R${Number(v).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}` : "—";

  return (
    <>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search organizations…" />
      </div>
      {loading ? <Spinner /> : orgs.length === 0 ? (
        <div className="card card-pad" style={{ textAlign: "center", opacity: 0.5, padding: 40 }}>
          No organizations found.
          {orgs.length === 0 && <div style={{ fontSize: 12, marginTop: 8, opacity: 0.7 }}>Organizations are created automatically when converting leads to deals.</div>}
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr><th>Organization</th><th>Industry</th><th>Revenue</th><th>City</th><th>Country</th><th>Website</th></tr>
              </thead>
              <tbody>
                {orgs.map((o) => (
                  <tr key={o.name}>
                    <td style={{ fontWeight: 600 }}>{o.organization_name || o.name}</td>
                    <td>{fmt(o.industry)}</td>
                    <td>{money(o.annual_revenue)}</td>
                    <td>{fmt(o.city)}</td>
                    <td>{fmt(o.country)}</td>
                    <td>{o.website ? <a href={o.website} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>{o.website}</a> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main CRM Workspace ───────────────────────────────────────────────────────

type Tab = "Dashboard" | "Leads" | "Deals" | "Contacts" | "Organizations";

export default function CrmWorkspaceClient() {
  const [tab, setTab]                 = useState<Tab>("Dashboard");
  const [loading, setLoading]         = useState(true);
  const [cards, setCards]             = useState<DashboardCards | null>(null);
  const [activity, setActivity]       = useState<Activity[]>([]);
  const [currency, setCurrency]       = useState("ZAR");
  const [leadStatuses, setLeadStatuses] = useState<Status[]>([]);
  const [dealStatuses, setDealStatuses] = useState<Status[]>([]);
  const [sources, setSources]           = useState<string[]>([]);
  const [dashErr, setDashErr]           = useState("");

  useEffect(() => {
    // Load dashboard + statuses + sources in parallel
    Promise.allSettled([
      apiFetch("/api/crm/dashboard"),
      apiFetch("/api/crm/statuses?type=lead"),
      apiFetch("/api/crm/statuses?type=deal"),
      apiFetch("/api/crm/sources"),
    ]).then(([dashRes, leadStRes, dealStRes, srcRes]) => {
      if (dashRes.status === "fulfilled") {
        const d = (dashRes.value as any).data ?? dashRes.value;
        setCards(d.cards ?? null);
        setActivity(d.recent_activity ?? []);
        setCurrency(d.currency ?? "ZAR");
      } else {
        setDashErr("Could not load dashboard data from backend.");
      }

      if (leadStRes.status === "fulfilled") {
        const d = (leadStRes.value as any).data ?? leadStRes.value;
        setLeadStatuses(d.statuses || []);
      }
      if (dealStRes.status === "fulfilled") {
        const d = (dealStRes.value as any).data ?? dealStRes.value;
        setDealStatuses(d.statuses || []);
      }
      if (srcRes.status === "fulfilled") {
        const d = (srcRes.value as any).data ?? srcRes.value;
        setSources(d.sources || []);
      }
    }).finally(() => setLoading(false));
  }, []);

  const tabs: Tab[] = ["Dashboard", "Leads", "Deals", "Contacts", "Organizations"];

  return (
    <div>
      {/* Page head */}
      <div className="page-head">
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, opacity: 0.5, marginBottom: 4 }}>
            CRM &amp; Sales
          </div>
          <h1 className="page-title">CRM Workspace</h1>
          <div className="page-sub">
            Manage leads, deals, contacts and organizations. Live data from your ERPNext backend.
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {currency !== "ZAR" && (
            <span style={{ fontSize: 12, opacity: 0.5, padding: "0 8px" }}>Currency: {currency}</span>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid var(--border)" }}>
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 600,
              background: "none",
              border: "none",
              borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
              color: tab === t ? "var(--accent)" : "var(--muted)",
              cursor: "pointer",
              transition: "color 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {loading ? <Spinner /> : (
        <>
          {dashErr && tab === "Dashboard" && <div className="banner" style={{ marginBottom: 16, background: "#fff7ed", borderColor: "#fed7aa", color: "#c2410c" }}>{dashErr}</div>}

          {tab === "Dashboard" && (
            cards
              ? <DashboardTab cards={cards} activity={activity} currency={currency} />
              : <div className="card card-pad" style={{ opacity: 0.6 }}>Dashboard data unavailable. Make sure the <code>crm</code> Python module is installed on your ERPNext site.</div>
          )}

          {tab === "Leads" && (
            <LeadsTab statuses={leadStatuses} sources={sources} />
          )}

          {tab === "Deals" && (
            <DealsTab dealStatuses={dealStatuses} />
          )}

          {tab === "Contacts" && <ContactsTab />}

          {tab === "Organizations" && <OrgsTab />}
        </>
      )}
    </div>
  );
}
