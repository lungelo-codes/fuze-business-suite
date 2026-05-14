"use client"
import { useEffect, useMemo, useState } from "react"
import StatusChip from "@/components/StatusChip"

type Row = Record<string, unknown>

function n(v: unknown): number { return typeof v === "number" ? v : Number(v || 0) }
function money(v: unknown): string { const x = n(v); return x ? `R${x.toLocaleString("en-ZA")}` : "—" }
function dateOnly(v: unknown): string { return v ? String(v).slice(0, 10) : "—" }
function text(v: unknown): string { return v ? String(v) : "—" }

async function getJson(url: string) {
  try {
    const r = await fetch(url, { cache: "no-store" })
    const j = await r.json().catch(() => null)
    return r.ok && j && !j.error ? j : null
  } catch { return null }
}

type Tab = "overview" | "employees" | "attendance" | "leave" | "payroll"

export default function HRDashboardClient() {
  const [tab, setTab] = useState<Tab>("overview")
  const [data, setData] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [leaveForm, setLeaveForm] = useState({ employee: "", leave_type: "Annual Leave", from_date: "", to_date: "", description: "" })
  const [attForm, setAttForm] = useState({ employee: "", attendance_date: new Date().toISOString().slice(0, 10), status: "Present", working_hours: "" })
  const [formMsg, setFormMsg] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const d = await getJson("/api/hr/dashboard")
      if (alive) {
        setData(d)
        setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const employees: Row[] = useMemo(() => Array.isArray(data?.employees) ? data!.employees as Row[] : [], [data])
  const attendance: Row[] = useMemo(() => Array.isArray(data?.attendance) ? data!.attendance as Row[] : [], [data])
  const leaveApps: Row[] = useMemo(() => Array.isArray(data?.leaveApplications) ? data!.leaveApplications as Row[] : [], [data])
  const salarySlips: Row[] = useMemo(() => Array.isArray(data?.salarySlips) ? data!.salarySlips as Row[] : [], [data])
  const totals = (data?.totals || {}) as Row
  const byDept: Row[] = useMemo(() => Array.isArray(data?.byDepartment) ? data!.byDepartment as Row[] : [], [data])

  const filteredEmployees = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return employees
    return employees.filter((e) => JSON.stringify(e).toLowerCase().includes(q))
  }, [employees, query])

  const filteredLeave = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return leaveApps
    return leaveApps.filter((l) => JSON.stringify(l).toLowerCase().includes(q))
  }, [leaveApps, query])

  async function submitLeave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setFormMsg("")
    try {
      const res = await fetch("/api/crud/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leaveForm),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Could not submit leave")
      setFormMsg("Leave application submitted successfully.")
      setLeaveForm({ employee: "", leave_type: "Annual Leave", from_date: "", to_date: "", description: "" })
      // Refresh
      const d = await getJson("/api/hr/dashboard")
      if (d) setData(d)
    } catch (err) {
      setFormMsg(err instanceof Error ? err.message : "Could not submit leave")
    } finally { setSaving(false) }
  }

  async function submitAttendance(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setFormMsg("")
    try {
      const res = await fetch("/api/crud/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...attForm, working_hours: attForm.working_hours ? Number(attForm.working_hours) : undefined }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Could not log attendance")
      setFormMsg("Attendance logged successfully.")
      const d = await getJson("/api/hr/dashboard")
      if (d) setData(d)
    } catch (err) {
      setFormMsg(err instanceof Error ? err.message : "Could not log attendance")
    } finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="demo-workspace animate-fade-up">
        <div className="demo-module-titlebar">
          <div><h1>HR & Payroll</h1><p>Loading HR data…</p></div>
        </div>
        <div className="demo-stat-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="demo-stat-card">
              <div style={{ height: 12, background: "var(--demo-soft)", borderRadius: 6, width: "60%", marginBottom: 10 }} />
              <div style={{ height: 28, background: "var(--demo-soft)", borderRadius: 6, width: "80%", marginBottom: 6 }} />
              <div style={{ height: 10, background: "var(--demo-soft)", borderRadius: 6, width: "50%" }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="demo-workspace animate-fade-up">
      <div className="demo-module-titlebar">
        <div>
          <div className="demo-eyebrow">People Workspace</div>
          <h1>HR &amp; Payroll</h1>
          <p>Manage employees, attendance, leave, and payroll records.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a className="btn" href="/portal/employees">Employees</a>
          <a className="btn btn-teal" href="/portal/payroll">Payroll</a>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="demo-stat-grid">
        <div className="demo-stat-card">
          <div className="demo-stat-top">
            <div>
              <div className="demo-stat-label">Total Employees</div>
              <div className="demo-stat-value">{n(totals.employees)}</div>
              <div className="demo-stat-hint">{n(totals.active)} active</div>
            </div>
            <div className="demo-stat-icon">👤</div>
          </div>
        </div>
        <div className="demo-stat-card">
          <div className="demo-stat-top">
            <div>
              <div className="demo-stat-label">Present Today</div>
              <div className="demo-stat-value">{n(totals.presentToday)}</div>
              <div className="demo-stat-hint">{n(totals.onLeave)} on leave</div>
            </div>
            <div className="demo-stat-icon" style={{ background: "linear-gradient(135deg,#10B981,#059669)" }}>✓</div>
          </div>
        </div>
        <div className="demo-stat-card">
          <div className="demo-stat-top">
            <div>
              <div className="demo-stat-label">Leave Requests</div>
              <div className="demo-stat-value">{n(totals.pendingLeave)}</div>
              <div className="demo-stat-hint">{n(totals.approvedLeave)} approved</div>
            </div>
            <div className="demo-stat-icon" style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}>🏖</div>
          </div>
        </div>
        <div className="demo-stat-card">
          <div className="demo-stat-top">
            <div>
              <div className="demo-stat-label">Net Payroll</div>
              <div className="demo-stat-value">{money(totals.totalNet)}</div>
              <div className="demo-stat-hint">Gross {money(totals.totalGross)}</div>
            </div>
            <div className="demo-stat-icon" style={{ background: "linear-gradient(135deg,#8B5CF6,#7C3AED)" }}>💰</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="demo-panel" style={{ marginBottom: 0 }}>
        <div className="demo-panel-head">
          <div className="seg">
            {(["overview", "employees", "attendance", "leave", "payroll"] as Tab[]).map((t) => (
              <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div className="search">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search HR records…" />
          </div>
        </div>

        {/* Overview Tab */}
        {tab === "overview" && (
          <div style={{ padding: "20px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              {/* Department Breakdown */}
              <div>
                <h4 style={{ margin: "0 0 12px", color: "var(--demo-text)", fontWeight: 900 }}>Employees by Department</h4>
                {byDept.length === 0 ? (
                  <div style={{ color: "var(--demo-muted)", fontSize: 13 }}>No department data yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {byDept.slice(0, 8).map((d) => (
                      <div key={String(d.department)} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 12, color: "var(--demo-muted)", width: 120, flexShrink: 0 }}>{text(d.department)}</span>
                        <div style={{ flex: 1, background: "var(--demo-soft)", borderRadius: 4, height: 8 }}>
                          <div style={{ width: `${Math.min(100, (n(d.count) / Math.max(1, n(totals.employees))) * 100)}%`, background: "var(--teal)", borderRadius: 4, height: 8 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--demo-text)", width: 24, textAlign: "right" }}>{n(d.count)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Leave Applications */}
              <div>
                <h4 style={{ margin: "0 0 12px", color: "var(--demo-text)", fontWeight: 900 }}>Recent Leave Applications</h4>
                {leaveApps.length === 0 ? (
                  <div style={{ color: "var(--demo-muted)", fontSize: 13 }}>No leave applications yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {leaveApps.slice(0, 5).map((l) => (
                      <div key={String(l.name)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--demo-line)" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--demo-text)" }}>{text(l.employee_name)}</div>
                          <div style={{ fontSize: 11, color: "var(--demo-muted)" }}>{text(l.leave_type)} · {dateOnly(l.from_date)} → {dateOnly(l.to_date)}</div>
                        </div>
                        <StatusChip status={String(l.status || "Open")} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Employees Tab */}
        {tab === "employees" && (
          <div style={{ padding: "0 0 8px" }}>
            <div className="overflow-auto">
              <table className="demo-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--demo-muted)" }}>No employees found.</td></tr>
                  ) : filteredEmployees.map((e) => (
                    <tr key={String(e.name)}>
                      <td><strong>{text(e.employee_name)}</strong><br /><small style={{ color: "var(--demo-muted)" }}>{text(e.company_email || e.name)}</small></td>
                      <td>{text(e.department)}</td>
                      <td>{text(e.designation)}</td>
                      <td><StatusChip status={String(e.status || "Active")} /></td>
                      <td>{dateOnly(e.date_of_joining)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Attendance Tab */}
        {tab === "attendance" && (
          <div style={{ padding: "20px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <h4 style={{ margin: "0 0 12px", fontWeight: 900, color: "var(--demo-text)" }}>Log Attendance</h4>
                <form onSubmit={submitAttendance} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="field">
                    <label>Employee ID</label>
                    <input className="inp" value={attForm.employee} onChange={(e) => setAttForm({ ...attForm, employee: e.target.value })} placeholder="EMP-0001" required />
                  </div>
                  <div className="field">
                    <label>Date</label>
                    <input className="inp" type="date" value={attForm.attendance_date} onChange={(e) => setAttForm({ ...attForm, attendance_date: e.target.value })} required />
                  </div>
                  <div className="field">
                    <label>Status</label>
                    <select className="inp" value={attForm.status} onChange={(e) => setAttForm({ ...attForm, status: e.target.value })}>
                      {["Present", "Absent", "On Leave", "Half Day", "Work From Home"].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Working Hours</label>
                    <input className="inp" type="number" step="0.5" value={attForm.working_hours} onChange={(e) => setAttForm({ ...attForm, working_hours: e.target.value })} placeholder="8" />
                  </div>
                  <button className="btn btn-teal" disabled={saving}>{saving ? "Saving…" : "Log Attendance"}</button>
                </form>
              </div>
              <div>
                <h4 style={{ margin: "0 0 12px", fontWeight: 900, color: "var(--demo-text)" }}>Recent Attendance</h4>
                <div className="overflow-auto" style={{ maxHeight: 320 }}>
                  <table className="demo-table">
                    <thead><tr><th>Employee</th><th>Date</th><th>Status</th><th>Hours</th></tr></thead>
                    <tbody>
                      {attendance.slice(0, 20).map((a) => (
                        <tr key={String(a.name)}>
                          <td>{text(a.employee_name)}</td>
                          <td>{dateOnly(a.attendance_date)}</td>
                          <td><StatusChip status={String(a.status || "Present")} /></td>
                          <td>{n(a.working_hours) || "—"}</td>
                        </tr>
                      ))}
                      {attendance.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", padding: 24, color: "var(--demo-muted)" }}>No attendance records.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            {formMsg && <div className="banner info" style={{ marginTop: 16 }}>{formMsg}</div>}
          </div>
        )}

        {/* Leave Tab */}
        {tab === "leave" && (
          <div style={{ padding: "20px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <h4 style={{ margin: "0 0 12px", fontWeight: 900, color: "var(--demo-text)" }}>Apply for Leave</h4>
                <form onSubmit={submitLeave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="field">
                    <label>Employee ID</label>
                    <input className="inp" value={leaveForm.employee} onChange={(e) => setLeaveForm({ ...leaveForm, employee: e.target.value })} placeholder="EMP-0001" required />
                  </div>
                  <div className="field">
                    <label>Leave Type</label>
                    <select className="inp" value={leaveForm.leave_type} onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}>
                      {["Annual Leave", "Sick Leave", "Maternity Leave", "Paternity Leave", "Unpaid Leave", "Study Leave"].map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div className="field">
                      <label>From</label>
                      <input className="inp" type="date" value={leaveForm.from_date} onChange={(e) => setLeaveForm({ ...leaveForm, from_date: e.target.value })} required />
                    </div>
                    <div className="field">
                      <label>To</label>
                      <input className="inp" type="date" value={leaveForm.to_date} onChange={(e) => setLeaveForm({ ...leaveForm, to_date: e.target.value })} required />
                    </div>
                  </div>
                  <div className="field">
                    <label>Reason</label>
                    <textarea className="inp" value={leaveForm.description} onChange={(e) => setLeaveForm({ ...leaveForm, description: e.target.value })} rows={3} />
                  </div>
                  <button className="btn btn-teal" disabled={saving}>{saving ? "Submitting…" : "Submit Leave Application"}</button>
                </form>
              </div>
              <div>
                <h4 style={{ margin: "0 0 12px", fontWeight: 900, color: "var(--demo-text)" }}>Leave Applications</h4>
                <div className="overflow-auto" style={{ maxHeight: 380 }}>
                  <table className="demo-table">
                    <thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th></tr></thead>
                    <tbody>
                      {filteredLeave.slice(0, 30).map((l) => (
                        <tr key={String(l.name)}>
                          <td>{text(l.employee_name)}</td>
                          <td>{text(l.leave_type)}</td>
                          <td>{dateOnly(l.from_date)}</td>
                          <td>{dateOnly(l.to_date)}</td>
                          <td>{n(l.total_leave_days)}</td>
                          <td><StatusChip status={String(l.status || "Open")} /></td>
                        </tr>
                      ))}
                      {filteredLeave.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--demo-muted)" }}>No leave applications.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            {formMsg && <div className="banner info" style={{ marginTop: 16 }}>{formMsg}</div>}
          </div>
        )}

        {/* Payroll Tab */}
        {tab === "payroll" && (
          <div style={{ padding: "20px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 20 }}>
              <div className="rec-stat">
                <div className="k">Total Gross Pay</div>
                <div className="v money">{money(totals.totalGross)}</div>
              </div>
              <div className="rec-stat">
                <div className="k">Total Deductions</div>
                <div className="v money">{money(totals.totalDeductions)}</div>
              </div>
              <div className="rec-stat">
                <div className="k">Total Net Pay</div>
                <div className="v money">{money(totals.totalNet)}</div>
              </div>
            </div>
            <h4 style={{ margin: "0 0 12px", fontWeight: 900, color: "var(--demo-text)" }}>Salary Slips</h4>
            <div className="overflow-auto">
              <table className="demo-table">
                <thead><tr><th>Employee</th><th>Period</th><th>Gross</th><th>Deductions</th><th>Net Pay</th><th>Status</th></tr></thead>
                <tbody>
                  {salarySlips.slice(0, 30).map((s) => (
                    <tr key={String(s.name)}>
                      <td>{text(s.employee_name)}</td>
                      <td>{dateOnly(s.start_date)} → {dateOnly(s.end_date)}</td>
                      <td>{money(s.gross_pay)}</td>
                      <td>{money(s.total_deduction)}</td>
                      <td><strong>{money(s.net_pay)}</strong></td>
                      <td><StatusChip status={String(s.status || "Draft")} /></td>
                    </tr>
                  ))}
                  {salarySlips.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--demo-muted)" }}>No salary slips. Set up payroll in ERPNext first.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
