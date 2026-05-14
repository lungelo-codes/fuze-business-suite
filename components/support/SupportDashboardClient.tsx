"use client"
import { useEffect, useMemo, useState } from "react"
import StatusChip from "@/components/StatusChip"

type Row = Record<string, unknown>

function text(v: unknown): string { return v ? String(v) : "—" }
function dateOnly(v: unknown): string { return v ? String(v).slice(0, 10) : "—" }

async function getJson(url: string) {
  try {
    const r = await fetch(url, { cache: "no-store" })
    const j = await r.json().catch(() => null)
    return r.ok && j && !j.error ? j : null
  } catch { return null }
}

type Tab = "overview" | "tickets" | "create" | "communications"

export default function SupportDashboardClient() {
  const [tab, setTab] = useState<Tab>("overview")
  const [data, setData] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [form, setForm] = useState({
    subject: "", customer: "", priority: "Medium", issue_type: "Bug",
    raised_by: "", description: "",
  })
  const [formMsg, setFormMsg] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const d = await getJson("/api/portal/support")
      if (alive) { setData(d); setLoading(false) }
    })()
    return () => { alive = false }
  }, [])

  const issues: Row[] = useMemo(() => Array.isArray(data?.issues) ? data!.issues as Row[] : [], [data])
  const comms: Row[] = useMemo(() => Array.isArray(data?.communications) ? data!.communications as Row[] : [], [data])
  const totals = (data?.totals || {}) as Row
  const byStatus: Row[] = useMemo(() => Array.isArray(data?.byStatus) ? data!.byStatus as Row[] : [], [data])
  const byPriority: Row[] = useMemo(() => Array.isArray(data?.byPriority) ? data!.byPriority as Row[] : [], [data])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return issues
    return issues.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }, [issues, query])

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setFormMsg("")
    try {
      const res = await fetch("/api/support/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Could not create ticket")
      setFormMsg(`Ticket created: ${json.data?.name || "OK"}`)
      setForm({ subject: "", customer: "", priority: "Medium", issue_type: "Bug", raised_by: "", description: "" })
      const d = await getJson("/api/portal/support")
      if (d) setData(d)
    } catch (err) {
      setFormMsg(err instanceof Error ? err.message : "Could not create ticket")
    } finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="demo-workspace animate-fade-up">
        <div className="demo-module-titlebar">
          <div><h1>Support Desk</h1><p>Loading support data…</p></div>
        </div>
      </div>
    )
  }

  return (
    <div className="demo-workspace animate-fade-up">
      <div className="demo-module-titlebar">
        <div>
          <div className="demo-eyebrow">Service Workspace</div>
          <h1>Support Desk</h1>
          <p>Manage customer issues, SLA tracking, and team communication.</p>
        </div>
        <button className="btn btn-teal" onClick={() => setTab("create")}>+ New Ticket</button>
      </div>

      {/* KPI Stats */}
      <div className="demo-stat-grid">
        <div className="demo-stat-card">
          <div className="demo-stat-top">
            <div>
              <div className="demo-stat-label">Total Tickets</div>
              <div className="demo-stat-value">{Number(totals.total || 0)}</div>
              <div className="demo-stat-hint">All time</div>
            </div>
            <div className="demo-stat-icon">🎧</div>
          </div>
        </div>
        <div className="demo-stat-card">
          <div className="demo-stat-top">
            <div>
              <div className="demo-stat-label">Open</div>
              <div className="demo-stat-value">{Number(totals.open || 0)}</div>
              <div className="demo-stat-hint">Needs attention</div>
            </div>
            <div className="demo-stat-icon" style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}>⚡</div>
          </div>
        </div>
        <div className="demo-stat-card">
          <div className="demo-stat-top">
            <div>
              <div className="demo-stat-label">Urgent</div>
              <div className="demo-stat-value">{Number(totals.urgent || 0)}</div>
              <div className="demo-stat-hint">High priority</div>
            </div>
            <div className="demo-stat-icon" style={{ background: "linear-gradient(135deg,#EF4444,#DC2626)" }}>🔴</div>
          </div>
        </div>
        <div className="demo-stat-card">
          <div className="demo-stat-top">
            <div>
              <div className="demo-stat-label">Resolved</div>
              <div className="demo-stat-value">{Number(totals.resolved || 0)}</div>
              <div className="demo-stat-hint">Completed</div>
            </div>
            <div className="demo-stat-icon" style={{ background: "linear-gradient(135deg,#10B981,#059669)" }}>✓</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="demo-panel" style={{ marginBottom: 0 }}>
        <div className="demo-panel-head">
          <div className="seg">
            {(["overview", "tickets", "create", "communications"] as Tab[]).map((t) => (
              <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
                {t === "create" ? "+ New Ticket" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          {tab !== "create" && (
            <div className="search">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tickets…" />
            </div>
          )}
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <div style={{ padding: "20px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <h4 style={{ margin: "0 0 12px", fontWeight: 900, color: "var(--demo-text)" }}>By Status</h4>
                {byStatus.map((s) => (
                  <div key={String(s.status)} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--demo-line)" }}>
                    <StatusChip status={String(s.status)} />
                    <strong style={{ color: "var(--demo-text)" }}>{Number(s.count)}</strong>
                  </div>
                ))}
                {byStatus.length === 0 && <div style={{ color: "var(--demo-muted)", fontSize: 13 }}>No tickets yet.</div>}
              </div>
              <div>
                <h4 style={{ margin: "0 0 12px", fontWeight: 900, color: "var(--demo-text)" }}>By Priority</h4>
                {byPriority.map((p) => (
                  <div key={String(p.priority)} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--demo-line)" }}>
                    <span style={{ fontSize: 13, color: "var(--demo-text)" }}>{text(p.priority)}</span>
                    <strong style={{ color: "var(--demo-text)" }}>{Number(p.count)}</strong>
                  </div>
                ))}
                {byPriority.length === 0 && <div style={{ color: "var(--demo-muted)", fontSize: 13 }}>No priority data.</div>}
              </div>
            </div>
            <h4 style={{ margin: "20px 0 12px", fontWeight: 900, color: "var(--demo-text)" }}>Recent Tickets</h4>
            <table className="demo-table">
              <thead><tr><th>Subject</th><th>Customer</th><th>Priority</th><th>Status</th><th>Raised</th></tr></thead>
              <tbody>
                {issues.slice(0, 8).map((i) => (
                  <tr key={String(i.name)}>
                    <td><strong>{text(i.subject)}</strong></td>
                    <td>{text(i.customer)}</td>
                    <td>{text(i.priority)}</td>
                    <td><StatusChip status={String(i.status || "Open")} /></td>
                    <td>{dateOnly(i.modified)}</td>
                  </tr>
                ))}
                {issues.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--demo-muted)" }}>No tickets yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Tickets */}
        {tab === "tickets" && (
          <div style={{ padding: "0 0 8px" }}>
            <div className="overflow-auto">
              <table className="demo-table">
                <thead><tr><th>Subject</th><th>Customer</th><th>Type</th><th>Priority</th><th>Status</th><th>Updated</th></tr></thead>
                <tbody>
                  {filtered.map((i) => (
                    <tr key={String(i.name)}>
                      <td><strong>{text(i.subject)}</strong><br /><small style={{ color: "var(--demo-muted)" }}>{text(i.raised_by)}</small></td>
                      <td>{text(i.customer)}</td>
                      <td>{text(i.issue_type)}</td>
                      <td>{text(i.priority)}</td>
                      <td><StatusChip status={String(i.status || "Open")} /></td>
                      <td>{dateOnly(i.modified)}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--demo-muted)" }}>No tickets found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Ticket */}
        {tab === "create" && (
          <div style={{ padding: "24px", maxWidth: 600 }}>
            <h4 style={{ margin: "0 0 16px", fontWeight: 900, color: "var(--demo-text)" }}>Create Support Ticket</h4>
            <form onSubmit={submitTicket} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label>Subject *</label>
                <input className="inp" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required placeholder="Describe the issue" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field">
                  <label>Customer</label>
                  <input className="inp" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} placeholder="Customer name" />
                </div>
                <div className="field">
                  <label>Raised By</label>
                  <input className="inp" value={form.raised_by} onChange={(e) => setForm({ ...form, raised_by: e.target.value })} placeholder="Email or name" />
                </div>
                <div className="field">
                  <label>Priority</label>
                  <select className="inp" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    {["Low", "Medium", "High", "Urgent"].map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Issue Type</label>
                  <select className="inp" value={form.issue_type} onChange={(e) => setForm({ ...form, issue_type: e.target.value })}>
                    {["Bug", "Feature Request", "Question", "Other"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Description</label>
                <textarea className="inp" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Detailed description of the issue" />
              </div>
              {formMsg && <div className="banner info">{formMsg}</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-teal" disabled={saving}>{saving ? "Creating…" : "Create Ticket"}</button>
                <button type="button" className="btn" onClick={() => setTab("tickets")}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Communications */}
        {tab === "communications" && (
          <div style={{ padding: "0 0 8px" }}>
            <div className="overflow-auto">
              <table className="demo-table">
                <thead><tr><th>Subject</th><th>Sender</th><th>Type</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {comms.map((c) => (
                    <tr key={String(c.name)}>
                      <td>{text(c.subject)}</td>
                      <td>{text(c.sender_full_name || c.sender)}</td>
                      <td>{text(c.communication_type)}</td>
                      <td><StatusChip status={String(c.status || "Open")} /></td>
                      <td>{dateOnly(c.modified)}</td>
                    </tr>
                  ))}
                  {comms.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--demo-muted)" }}>No communications yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
