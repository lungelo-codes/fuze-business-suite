"use client"
import { useEffect, useMemo, useState } from "react"
import StatusChip from "@/components/StatusChip"

type Row = Record<string, unknown>

function text(v: unknown): string { return v ? String(v) : "—" }
function money(v: unknown): string {
  const x = typeof v === "number" ? v : Number(v || 0)
  return x ? `R${x.toLocaleString("en-ZA")}` : "—"
}
function dateOnly(v: unknown): string { return v ? String(v).slice(0, 10) : "—" }

async function getJson(url: string) {
  try {
    const r = await fetch(url, { cache: "no-store" })
    const j = await r.json().catch(() => null)
    return r.ok && j && !j.error ? j : null
  } catch { return null }
}

type Tab = "pipeline" | "leads" | "opportunities" | "create-lead"

export default function CRMPipelineClient() {
  const [tab, setTab] = useState<Tab>("pipeline")
  const [pipeline, setPipeline] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [workflowMsg, setWorkflowMsg] = useState("")
  const [workflowLoading, setWorkflowLoading] = useState("")
  const [leadForm, setLeadForm] = useState({
    lead_name: "", company_name: "", email_id: "", mobile_no: "",
    source: "Website", status: "Lead", territory: "All Territories", notes: "",
  })
  const [formMsg, setFormMsg] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const d = await getJson("/api/crm/pipeline")
      if (alive) { setPipeline(d); setLoading(false) }
    })()
    return () => { alive = false }
  }, [])

  const leads: Row[] = useMemo(() => Array.isArray(pipeline?.leads) ? pipeline!.leads as Row[] : [], [pipeline])
  const opportunities: Row[] = useMemo(() => Array.isArray(pipeline?.opportunities) ? pipeline!.opportunities as Row[] : [], [pipeline])
  const stages: Row[] = useMemo(() => Array.isArray(pipeline?.stages) ? pipeline!.stages as Row[] : [], [pipeline])
  const kpis = (pipeline?.kpis || {}) as Row

  const filteredLeads = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return leads
    return leads.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }, [leads, query])

  const filteredOpps = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return opportunities
    return opportunities.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }, [opportunities, query])

  async function runWorkflow(action: string, name: string) {
    setWorkflowLoading(name); setWorkflowMsg("")
    try {
      const res = await fetch("/api/portal/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, name }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Workflow failed")
      const docName = json.data?.name || json.data?.message?.name || "created"
      setWorkflowMsg(`✓ ${action.replace(/_/g, " ")}: ${docName}`)
      const d = await getJson("/api/crm/pipeline")
      if (d) setPipeline(d)
    } catch (err) {
      setWorkflowMsg(err instanceof Error ? err.message : "Workflow failed")
    } finally { setWorkflowLoading("") }
  }

  async function createLead(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setFormMsg("")
    try {
      const res = await fetch("/api/crud/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadForm),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Could not create lead")
      setFormMsg(`Lead created: ${json.data?.name || "OK"}`)
      setLeadForm({ lead_name: "", company_name: "", email_id: "", mobile_no: "", source: "Website", status: "Lead", territory: "All Territories", notes: "" })
      const d = await getJson("/api/crm/pipeline")
      if (d) setPipeline(d)
    } catch (err) {
      setFormMsg(err instanceof Error ? err.message : "Could not create lead")
    } finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="demo-workspace animate-fade-up">
        <div className="demo-module-titlebar">
          <div><h1>CRM Pipeline</h1><p>Loading pipeline data…</p></div>
        </div>
      </div>
    )
  }

  return (
    <div className="demo-workspace animate-fade-up">
      <div className="demo-module-titlebar">
        <div>
          <div className="demo-eyebrow">Sales Workspace</div>
          <h1>CRM Pipeline</h1>
          <p>Track leads, opportunities, and convert them through the sales pipeline.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a className="btn" href="/portal/leads">All Leads</a>
          <button className="btn btn-teal" onClick={() => setTab("create-lead")}>+ New Lead</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="demo-stat-grid">
        <div className="demo-stat-card">
          <div className="demo-stat-top">
            <div>
              <div className="demo-stat-label">Total Leads</div>
              <div className="demo-stat-value">{Number(kpis.totalLeads || leads.length)}</div>
              <div className="demo-stat-hint">In pipeline</div>
            </div>
            <div className="demo-stat-icon">👥</div>
          </div>
        </div>
        <div className="demo-stat-card">
          <div className="demo-stat-top">
            <div>
              <div className="demo-stat-label">Opportunities</div>
              <div className="demo-stat-value">{Number(kpis.totalOpportunities || opportunities.length)}</div>
              <div className="demo-stat-hint">Active deals</div>
            </div>
            <div className="demo-stat-icon" style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}>💼</div>
          </div>
        </div>
        <div className="demo-stat-card">
          <div className="demo-stat-top">
            <div>
              <div className="demo-stat-label">Pipeline Value</div>
              <div className="demo-stat-value">{money(kpis.pipelineValue)}</div>
              <div className="demo-stat-hint">Opportunity total</div>
            </div>
            <div className="demo-stat-icon" style={{ background: "linear-gradient(135deg,#10B981,#059669)" }}>R</div>
          </div>
        </div>
        <div className="demo-stat-card">
          <div className="demo-stat-top">
            <div>
              <div className="demo-stat-label">Won</div>
              <div className="demo-stat-value">{Number(kpis.wonLeads || 0)}</div>
              <div className="demo-stat-hint">Converted leads</div>
            </div>
            <div className="demo-stat-icon" style={{ background: "linear-gradient(135deg,#8B5CF6,#7C3AED)" }}>🏆</div>
          </div>
        </div>
      </div>

      {workflowMsg && (
        <div className={`banner ${workflowMsg.startsWith("✓") ? "info" : "warn"}`} style={{ marginBottom: 16 }}>
          {workflowMsg}
          <button onClick={() => setWorkflowMsg("")} style={{ marginLeft: 12, background: "none", border: "none", cursor: "pointer", color: "inherit" }}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="demo-panel" style={{ marginBottom: 0 }}>
        <div className="demo-panel-head">
          <div className="seg">
            {(["pipeline", "leads", "opportunities", "create-lead"] as Tab[]).map((t) => (
              <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
                {t === "create-lead" ? "+ Lead" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          {!["create-lead"].includes(tab) && (
            <div className="search">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search CRM…" />
            </div>
          )}
        </div>

        {/* Pipeline Board */}
        {tab === "pipeline" && (
          <div style={{ padding: "20px 24px", overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(200px, 1fr))", gap: 16, minWidth: 700 }}>
              {stages.length > 0 ? stages.map((stage) => (
                <div key={String(stage.title)} style={{ background: "var(--demo-soft)", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontWeight: 900, fontSize: 13, color: "var(--demo-text)", marginBottom: 10 }}>
                    {text(stage.title)}
                    <span style={{ marginLeft: 8, background: "var(--demo-line)", borderRadius: 10, padding: "1px 8px", fontSize: 11 }}>
                      {Array.isArray(stage.rows) ? stage.rows.length : 0}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {Array.isArray(stage.rows) && stage.rows.slice(0, 5).map((row: Row, i: number) => (
                      <div key={String(row.name || i)} style={{ background: "var(--demo-card)", borderRadius: 8, padding: "10px 12px", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: "var(--demo-text)" }}>
                          {text(row.lead_name || row.party_name || row.name)}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--demo-muted)", marginTop: 2 }}>
                          {text(row.company_name || row.customer || "")}
                        </div>
                        {row.opportunity_amount ? (
                          <div style={{ fontSize: 11, color: "var(--teal)", marginTop: 4, fontWeight: 700 }}>
                            {money(row.opportunity_amount)}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )) : (
                // Fallback: show leads/opps in columns
                [
                  { title: "New Leads", items: leads.filter((l) => ["Lead", "Open", "New"].includes(String(l.status || ""))).slice(0, 5) },
                  { title: "Qualified", items: leads.filter((l) => ["Qualified", "Opportunity"].includes(String(l.status || ""))).slice(0, 5) },
                  { title: "Proposal", items: opportunities.slice(0, 5) },
                  { title: "Won", items: leads.filter((l) => ["Converted", "Won"].includes(String(l.status || ""))).slice(0, 5) },
                ].map((col) => (
                  <div key={col.title} style={{ background: "var(--demo-soft)", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontWeight: 900, fontSize: 13, color: "var(--demo-text)", marginBottom: 10 }}>
                      {col.title}
                      <span style={{ marginLeft: 8, background: "var(--demo-line)", borderRadius: 10, padding: "1px 8px", fontSize: 11 }}>{col.items.length}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {col.items.map((row) => (
                        <div key={String(row.name)} style={{ background: "var(--demo-card)", borderRadius: 8, padding: "10px 12px" }}>
                          <div style={{ fontWeight: 700, fontSize: 12, color: "var(--demo-text)" }}>{text(row.lead_name || row.party_name || row.name)}</div>
                          <div style={{ fontSize: 11, color: "var(--demo-muted)", marginTop: 2 }}>{text(row.company_name || row.customer || "")}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Leads */}
        {tab === "leads" && (
          <div className="overflow-auto">
            <table className="demo-table">
              <thead>
                <tr>
                  <th>Lead</th><th>Company</th><th>Status</th><th>Source</th><th>Email</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((l) => (
                  <tr key={String(l.name)}>
                    <td><strong>{text(l.lead_name)}</strong></td>
                    <td>{text(l.company_name)}</td>
                    <td><StatusChip status={String(l.status || "Lead")} /></td>
                    <td>{text(l.source)}</td>
                    <td>{text(l.email_id)}</td>
                    <td>
                      <button
                        className="btn"
                        style={{ fontSize: 11, padding: "4px 10px" }}
                        disabled={workflowLoading === String(l.name)}
                        onClick={() => runWorkflow("lead_to_opportunity", String(l.name))}
                      >
                        {workflowLoading === String(l.name) ? "…" : "→ Opportunity"}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--demo-muted)" }}>No leads found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Opportunities */}
        {tab === "opportunities" && (
          <div className="overflow-auto">
            <table className="demo-table">
              <thead>
                <tr>
                  <th>Opportunity</th><th>Customer</th><th>Amount</th><th>Closing</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOpps.map((o) => (
                  <tr key={String(o.name)}>
                    <td><strong>{text(o.name)}</strong></td>
                    <td>{text(o.party_name || o.customer_name)}</td>
                    <td>{money(o.opportunity_amount)}</td>
                    <td>{dateOnly(o.expected_closing)}</td>
                    <td><StatusChip status={String(o.status || "Open")} /></td>
                    <td>
                      <button
                        className="btn"
                        style={{ fontSize: 11, padding: "4px 10px" }}
                        disabled={workflowLoading === String(o.name)}
                        onClick={() => runWorkflow("opportunity_to_quote", String(o.name))}
                      >
                        {workflowLoading === String(o.name) ? "…" : "→ Quote"}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredOpps.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--demo-muted)" }}>No opportunities found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Lead */}
        {tab === "create-lead" && (
          <div style={{ padding: "24px", maxWidth: 560 }}>
            <h4 style={{ margin: "0 0 16px", fontWeight: 900, color: "var(--demo-text)" }}>Create Lead</h4>
            <form onSubmit={createLead} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field">
                  <label>Lead Name *</label>
                  <input className="inp" value={leadForm.lead_name} onChange={(e) => setLeadForm({ ...leadForm, lead_name: e.target.value })} required />
                </div>
                <div className="field">
                  <label>Company</label>
                  <input className="inp" value={leadForm.company_name} onChange={(e) => setLeadForm({ ...leadForm, company_name: e.target.value })} />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input className="inp" type="email" value={leadForm.email_id} onChange={(e) => setLeadForm({ ...leadForm, email_id: e.target.value })} />
                </div>
                <div className="field">
                  <label>Mobile</label>
                  <input className="inp" type="tel" value={leadForm.mobile_no} onChange={(e) => setLeadForm({ ...leadForm, mobile_no: e.target.value })} />
                </div>
                <div className="field">
                  <label>Source</label>
                  <select className="inp" value={leadForm.source} onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })}>
                    {["Website", "Referral", "Advertisement", "Cold Calling", "Email", "Campaign", "Other"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Status</label>
                  <select className="inp" value={leadForm.status} onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value })}>
                    {["Lead", "Open", "Replied", "Opportunity", "Interested"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Notes</label>
                <textarea className="inp" value={leadForm.notes} onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })} rows={3} />
              </div>
              {formMsg && <div className="banner info">{formMsg}</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-teal" disabled={saving}>{saving ? "Creating…" : "Create Lead"}</button>
                <button type="button" className="btn" onClick={() => setTab("leads")}>Cancel</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
