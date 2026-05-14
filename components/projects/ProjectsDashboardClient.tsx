"use client"
import { useEffect, useMemo, useState } from "react"
import StatusChip from "@/components/StatusChip"

type Row = Record<string, unknown>

function text(v: unknown): string { return v ? String(v) : "—" }
function dateOnly(v: unknown): string { return v ? String(v).slice(0, 10) : "—" }
function n(v: unknown): number { return typeof v === "number" ? v : Number(v || 0) }

async function getJson(url: string) {
  try {
    const r = await fetch(url, { cache: "no-store" })
    const j = await r.json().catch(() => null)
    return r.ok && j && !j.error ? j : null
  } catch { return null }
}

type Tab = "overview" | "projects" | "tasks" | "appointments" | "create-project" | "create-task"

export default function ProjectsDashboardClient() {
  const [tab, setTab] = useState<Tab>("overview")
  const [data, setData] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [projForm, setProjForm] = useState({ project_name: "", customer: "", expected_end_date: "", priority: "Medium", status: "Open" })
  const [taskForm, setTaskForm] = useState({ subject: "", project: "", assigned_to: "", exp_end_date: "", priority: "Medium", status: "Open" })
  const [apptForm, setApptForm] = useState({ subject: "", starts_on: "", ends_on: "", event_type: "Private", description: "" })
  const [formMsg, setFormMsg] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const d = await getJson("/api/portal/projects")
      if (alive) { setData(d); setLoading(false) }
    })()
    return () => { alive = false }
  }, [])

  const projects: Row[] = useMemo(() => Array.isArray(data?.projects) ? data!.projects as Row[] : [], [data])
  const tasks: Row[] = useMemo(() => Array.isArray(data?.tasks) ? data!.tasks as Row[] : [], [data])
  const events: Row[] = useMemo(() => Array.isArray(data?.events) ? data!.events as Row[] : [], [data])
  const totals = (data?.totals || {}) as Row
  const tasksByStatus: Row[] = useMemo(() => Array.isArray(data?.tasksByStatus) ? data!.tasksByStatus as Row[] : [], [data])

  const filteredProjects = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return projects
    return projects.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }, [projects, query])

  const filteredTasks = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return tasks
    return tasks.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }, [tasks, query])

  async function createProject(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setFormMsg("")
    try {
      const res = await fetch("/api/crud/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projForm),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Could not create project")
      setFormMsg(`Project created: ${json.data?.name || "OK"}`)
      setProjForm({ project_name: "", customer: "", expected_end_date: "", priority: "Medium", status: "Open" })
      const d = await getJson("/api/portal/projects")
      if (d) setData(d)
    } catch (err) {
      setFormMsg(err instanceof Error ? err.message : "Could not create project")
    } finally { setSaving(false) }
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setFormMsg("")
    try {
      const res = await fetch("/api/crud/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskForm),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Could not create task")
      setFormMsg(`Task created: ${json.data?.name || "OK"}`)
      setTaskForm({ subject: "", project: "", assigned_to: "", exp_end_date: "", priority: "Medium", status: "Open" })
      const d = await getJson("/api/portal/projects")
      if (d) setData(d)
    } catch (err) {
      setFormMsg(err instanceof Error ? err.message : "Could not create task")
    } finally { setSaving(false) }
  }

  async function createAppointment(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setFormMsg("")
    try {
      const res = await fetch("/api/portal/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apptForm),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Could not create appointment")
      setFormMsg(`Appointment booked: ${json.data?.name || "OK"}`)
      setApptForm({ subject: "", starts_on: "", ends_on: "", event_type: "Private", description: "" })
      const d = await getJson("/api/portal/projects")
      if (d) setData(d)
    } catch (err) {
      setFormMsg(err instanceof Error ? err.message : "Could not book appointment")
    } finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="demo-workspace animate-fade-up">
        <div className="demo-module-titlebar">
          <div><h1>Projects &amp; Tasks</h1><p>Loading…</p></div>
        </div>
      </div>
    )
  }

  return (
    <div className="demo-workspace animate-fade-up">
      <div className="demo-module-titlebar">
        <div>
          <div className="demo-eyebrow">Operations Workspace</div>
          <h1>Projects &amp; Tasks</h1>
          <p>Track projects, tasks, appointments and delivery work.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" onClick={() => setTab("create-task")}>+ Task</button>
          <button className="btn btn-teal" onClick={() => setTab("create-project")}>+ Project</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="demo-stat-grid">
        <div className="demo-stat-card">
          <div className="demo-stat-top">
            <div>
              <div className="demo-stat-label">Projects</div>
              <div className="demo-stat-value">{n(totals.projects)}</div>
              <div className="demo-stat-hint">{n(totals.openProjects)} open</div>
            </div>
            <div className="demo-stat-icon">📊</div>
          </div>
        </div>
        <div className="demo-stat-card">
          <div className="demo-stat-top">
            <div>
              <div className="demo-stat-label">Tasks</div>
              <div className="demo-stat-value">{n(totals.tasks)}</div>
              <div className="demo-stat-hint">{n(totals.openTasks)} open</div>
            </div>
            <div className="demo-stat-icon" style={{ background: "linear-gradient(135deg,#10B981,#059669)" }}>✅</div>
          </div>
        </div>
        <div className="demo-stat-card">
          <div className="demo-stat-top">
            <div>
              <div className="demo-stat-label">Overdue</div>
              <div className="demo-stat-value">{n(totals.overdueTasks)}</div>
              <div className="demo-stat-hint">Past due date</div>
            </div>
            <div className="demo-stat-icon" style={{ background: "linear-gradient(135deg,#EF4444,#DC2626)" }}>⚠</div>
          </div>
        </div>
        <div className="demo-stat-card">
          <div className="demo-stat-top">
            <div>
              <div className="demo-stat-label">Completed</div>
              <div className="demo-stat-value">{n(totals.completedProjects)}</div>
              <div className="demo-stat-hint">Projects done</div>
            </div>
            <div className="demo-stat-icon" style={{ background: "linear-gradient(135deg,#8B5CF6,#7C3AED)" }}>🏆</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="demo-panel" style={{ marginBottom: 0 }}>
        <div className="demo-panel-head">
          <div className="seg">
            {(["overview", "projects", "tasks", "appointments", "create-project", "create-task"] as Tab[]).map((t) => (
              <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
                {t === "create-project" ? "+ Project" : t === "create-task" ? "+ Task" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          {!["create-project", "create-task"].includes(tab) && (
            <div className="search">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" />
            </div>
          )}
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <div style={{ padding: "20px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <h4 style={{ margin: "0 0 12px", fontWeight: 900, color: "var(--demo-text)" }}>Tasks by Status</h4>
                {tasksByStatus.map((s) => (
                  <div key={String(s.status)} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--demo-line)" }}>
                    <StatusChip status={String(s.status)} />
                    <strong style={{ color: "var(--demo-text)" }}>{n(s.count)}</strong>
                  </div>
                ))}
                {tasksByStatus.length === 0 && <div style={{ color: "var(--demo-muted)", fontSize: 13 }}>No tasks yet.</div>}
              </div>
              <div>
                <h4 style={{ margin: "0 0 12px", fontWeight: 900, color: "var(--demo-text)" }}>Upcoming Appointments</h4>
                {events.slice(0, 5).map((ev) => (
                  <div key={String(ev.name)} style={{ padding: "8px 0", borderBottom: "1px solid var(--demo-line)" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--demo-text)" }}>{text(ev.subject)}</div>
                    <div style={{ fontSize: 11, color: "var(--demo-muted)" }}>{dateOnly(ev.starts_on)} · {text(ev.event_type)}</div>
                  </div>
                ))}
                {events.length === 0 && <div style={{ color: "var(--demo-muted)", fontSize: 13 }}>No appointments yet.</div>}
              </div>
            </div>
            <h4 style={{ margin: "20px 0 12px", fontWeight: 900, color: "var(--demo-text)" }}>Active Projects</h4>
            <table className="demo-table">
              <thead><tr><th>Project</th><th>Customer</th><th>Progress</th><th>Due</th><th>Status</th></tr></thead>
              <tbody>
                {projects.slice(0, 6).map((p) => (
                  <tr key={String(p.name)}>
                    <td><strong>{text(p.project_name)}</strong></td>
                    <td>{text(p.customer)}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, background: "var(--demo-soft)", borderRadius: 4, height: 6 }}>
                          <div style={{ width: `${n(p.percent_complete)}%`, background: "var(--teal)", borderRadius: 4, height: 6 }} />
                        </div>
                        <span style={{ fontSize: 11, color: "var(--demo-muted)" }}>{n(p.percent_complete)}%</span>
                      </div>
                    </td>
                    <td>{dateOnly(p.expected_end_date)}</td>
                    <td><StatusChip status={String(p.status || "Open")} /></td>
                  </tr>
                ))}
                {projects.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--demo-muted)" }}>No projects yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Projects */}
        {tab === "projects" && (
          <div className="overflow-auto">
            <table className="demo-table">
              <thead><tr><th>Project</th><th>Customer</th><th>Progress</th><th>Start</th><th>End</th><th>Status</th></tr></thead>
              <tbody>
                {filteredProjects.map((p) => (
                  <tr key={String(p.name)}>
                    <td><strong>{text(p.project_name)}</strong></td>
                    <td>{text(p.customer)}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 80, background: "var(--demo-soft)", borderRadius: 4, height: 6 }}>
                          <div style={{ width: `${n(p.percent_complete)}%`, background: "var(--teal)", borderRadius: 4, height: 6 }} />
                        </div>
                        <span style={{ fontSize: 11 }}>{n(p.percent_complete)}%</span>
                      </div>
                    </td>
                    <td>{dateOnly(p.expected_start_date)}</td>
                    <td>{dateOnly(p.expected_end_date)}</td>
                    <td><StatusChip status={String(p.status || "Open")} /></td>
                  </tr>
                ))}
                {filteredProjects.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--demo-muted)" }}>No projects found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Tasks */}
        {tab === "tasks" && (
          <div className="overflow-auto">
            <table className="demo-table">
              <thead><tr><th>Task</th><th>Project</th><th>Assigned To</th><th>Due</th><th>Priority</th><th>Status</th></tr></thead>
              <tbody>
                {filteredTasks.map((t) => (
                  <tr key={String(t.name)}>
                    <td><strong>{text(t.subject)}</strong></td>
                    <td>{text(t.project)}</td>
                    <td>{text(t.assigned_to)}</td>
                    <td>{dateOnly(t.exp_end_date)}</td>
                    <td>{text(t.priority)}</td>
                    <td><StatusChip status={String(t.status || "Open")} /></td>
                  </tr>
                ))}
                {filteredTasks.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--demo-muted)" }}>No tasks found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Appointments */}
        {tab === "appointments" && (
          <div style={{ padding: "20px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <h4 style={{ margin: "0 0 12px", fontWeight: 900, color: "var(--demo-text)" }}>Book Appointment</h4>
                <form onSubmit={createAppointment} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="field">
                    <label>Subject *</label>
                    <input className="inp" value={apptForm.subject} onChange={(e) => setApptForm({ ...apptForm, subject: e.target.value })} required placeholder="Meeting title" />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div className="field">
                      <label>Start</label>
                      <input className="inp" type="datetime-local" value={apptForm.starts_on} onChange={(e) => setApptForm({ ...apptForm, starts_on: e.target.value })} required />
                    </div>
                    <div className="field">
                      <label>End</label>
                      <input className="inp" type="datetime-local" value={apptForm.ends_on} onChange={(e) => setApptForm({ ...apptForm, ends_on: e.target.value })} />
                    </div>
                  </div>
                  <div className="field">
                    <label>Type</label>
                    <select className="inp" value={apptForm.event_type} onChange={(e) => setApptForm({ ...apptForm, event_type: e.target.value })}>
                      {["Private", "Public", "Confidential"].map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Description</label>
                    <textarea className="inp" value={apptForm.description} onChange={(e) => setApptForm({ ...apptForm, description: e.target.value })} rows={3} />
                  </div>
                  <button className="btn btn-teal" disabled={saving}>{saving ? "Booking…" : "Book Appointment"}</button>
                </form>
              </div>
              <div>
                <h4 style={{ margin: "0 0 12px", fontWeight: 900, color: "var(--demo-text)" }}>Upcoming Events</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {events.slice(0, 10).map((ev) => (
                    <div key={String(ev.name)} style={{ padding: "10px 12px", background: "var(--demo-soft)", borderRadius: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--demo-text)" }}>{text(ev.subject)}</div>
                      <div style={{ fontSize: 11, color: "var(--demo-muted)", marginTop: 2 }}>{dateOnly(ev.starts_on)} · {text(ev.event_type)}</div>
                    </div>
                  ))}
                  {events.length === 0 && <div style={{ color: "var(--demo-muted)", fontSize: 13 }}>No appointments yet.</div>}
                </div>
              </div>
            </div>
            {formMsg && <div className="banner info" style={{ marginTop: 16 }}>{formMsg}</div>}
          </div>
        )}

        {/* Create Project */}
        {tab === "create-project" && (
          <div style={{ padding: "24px", maxWidth: 560 }}>
            <h4 style={{ margin: "0 0 16px", fontWeight: 900, color: "var(--demo-text)" }}>Create Project</h4>
            <form onSubmit={createProject} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label>Project Name *</label>
                <input className="inp" value={projForm.project_name} onChange={(e) => setProjForm({ ...projForm, project_name: e.target.value })} required />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field">
                  <label>Customer</label>
                  <input className="inp" value={projForm.customer} onChange={(e) => setProjForm({ ...projForm, customer: e.target.value })} />
                </div>
                <div className="field">
                  <label>Expected End Date</label>
                  <input className="inp" type="date" value={projForm.expected_end_date} onChange={(e) => setProjForm({ ...projForm, expected_end_date: e.target.value })} />
                </div>
                <div className="field">
                  <label>Priority</label>
                  <select className="inp" value={projForm.priority} onChange={(e) => setProjForm({ ...projForm, priority: e.target.value })}>
                    {["Low", "Medium", "High"].map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Status</label>
                  <select className="inp" value={projForm.status} onChange={(e) => setProjForm({ ...projForm, status: e.target.value })}>
                    {["Open", "Working", "Completed", "Cancelled"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {formMsg && <div className="banner info">{formMsg}</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-teal" disabled={saving}>{saving ? "Creating…" : "Create Project"}</button>
                <button type="button" className="btn" onClick={() => setTab("projects")}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Create Task */}
        {tab === "create-task" && (
          <div style={{ padding: "24px", maxWidth: 560 }}>
            <h4 style={{ margin: "0 0 16px", fontWeight: 900, color: "var(--demo-text)" }}>Create Task</h4>
            <form onSubmit={createTask} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label>Task Subject *</label>
                <input className="inp" value={taskForm.subject} onChange={(e) => setTaskForm({ ...taskForm, subject: e.target.value })} required />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field">
                  <label>Project</label>
                  <input className="inp" value={taskForm.project} onChange={(e) => setTaskForm({ ...taskForm, project: e.target.value })} placeholder="Project name" />
                </div>
                <div className="field">
                  <label>Assigned To</label>
                  <input className="inp" value={taskForm.assigned_to} onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })} placeholder="Email" />
                </div>
                <div className="field">
                  <label>Due Date</label>
                  <input className="inp" type="date" value={taskForm.exp_end_date} onChange={(e) => setTaskForm({ ...taskForm, exp_end_date: e.target.value })} />
                </div>
                <div className="field">
                  <label>Priority</label>
                  <select className="inp" value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                    {["Low", "Medium", "High", "Urgent"].map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              {formMsg && <div className="banner info">{formMsg}</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-teal" disabled={saving}>{saving ? "Creating…" : "Create Task"}</button>
                <button type="button" className="btn" onClick={() => setTab("tasks")}>Cancel</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
