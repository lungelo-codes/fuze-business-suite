"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const fmt = (n: number) => "R " + Number(n || 0).toLocaleString("en-ZA", { minimumFractionDigits: 0 });
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "—";

type HRTab = "overview" | "employees" | "leave" | "payroll" | "recruitment";

export default function HRPage() {
  const [tab, setTab] = useState<HRTab>("overview");
  const [cards, setCards] = useState<Record<string, number | { department: string; count: number }[]>>({});
  const [employees, setEmployees] = useState<Record<string, string>[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<Record<string, string | number>[]>([]);
  const [payroll, setPayroll] = useState<{ slips: Record<string, string | number>[]; totals: Record<string, number | string> }>({ slips: [], totals: {} });
  const [jobOpenings, setJobOpenings] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [dash, emp, leave, pay, jobs] = await Promise.allSettled([
        api.getHRDashboard(),
        api.getEmployees(),
        api.getLeaveRequests(),
        api.getPayrollSummary(),
        api.getJobOpenings(),
      ]);

      if (dash.status === "fulfilled") {
        const d = dash.value.data as { cards: Record<string, number>; departments: { department: string; count: number }[] };
        setCards({ ...d.cards, departments_list: d.departments } as Record<string, number | { department: string; count: number }[]>);
      }
      if (emp.status === "fulfilled") setEmployees((emp.value.data as { employees: Record<string, string>[] })?.employees ?? []);
      if (leave.status === "fulfilled") setLeaveRequests((leave.value.data as { leave_requests: Record<string, string | number>[] })?.leave_requests ?? []);
      if (pay.status === "fulfilled") {
        const d = pay.value.data as { slips: Record<string, string | number>[]; totals: Record<string, number | string> };
        setPayroll({ slips: d?.slips ?? [], totals: d?.totals ?? {} });
      }
      if (jobs.status === "fulfilled") setJobOpenings((jobs.value.data as { openings: Record<string, string>[] })?.openings ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="page-loading"><div className="loading-spinner" /><p>Loading HR…</p></div>;

  const depts = (cards.departments_list as { department: string; count: number }[] | undefined) ?? [];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">People & HR</h1>
          <p className="page-sub">Employees, leave, payroll, attendance and recruitment</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-teal">+ New Employee</button>
          <button className="btn">+ Leave Request</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi teal">
          <div className="ic-wrap">◎</div>
          <div className="label">Active Employees</div>
          <div className="val">{Number(cards.active_employees ?? 24)}</div>
          <div className="hint">Across {Number(cards.departments ?? 5)} departments</div>
        </div>
        <div className="kpi">
          <div className="ic-wrap">◈</div>
          <div className="label">Present Today</div>
          <div className="val">{Number(cards.present_today ?? 21)}</div>
          <div className="hint">{Number(cards.active_employees ?? 24) > 0 ? Math.round((Number(cards.present_today ?? 21) / Number(cards.active_employees ?? 24)) * 100) : 0}% attendance</div>
        </div>
        <div className="kpi warn">
          <div className="ic-wrap">◇</div>
          <div className="label">Pending Leave</div>
          <div className="val">{Number(cards.pending_leave ?? 4)}</div>
          <div className="hint">Awaiting approval</div>
        </div>
        <div className="kpi">
          <div className="ic-wrap">◯</div>
          <div className="label">Monthly Payroll</div>
          <div className="val">{fmt(Number(cards.monthly_payroll ?? 486200))}</div>
          <div className="hint">Net pay this month</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="crm-tabs">
        {(["overview", "employees", "leave", "payroll", "recruitment"] as const).map((t) => (
          <button key={t} className={`crm-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === "leave" && Number(cards.pending_leave ?? 0) > 0 && (
              <span className="badge-dot">{Number(cards.pending_leave)}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="two-col">
          <div className="card">
            <div className="card-head"><h3>Departments</h3></div>
            <div className="list">
              {depts.map((d) => (
                <div key={d.department} className="list-row">
                  <div className="ic-wrap" style={{ width: 32, height: 32, borderRadius: 8, background: "var(--blue-bg)", color: "var(--blue)", fontSize: 12, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    {d.count}
                  </div>
                  <div>
                    <div className="t">{d.department}</div>
                    <div className="s">{d.count} {d.count === 1 ? "employee" : "employees"}</div>
                  </div>
                  <div className="r">
                    <div style={{ height: 6, width: 80, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(d.count / Number(cards.active_employees ?? 24)) * 100}%`, background: "var(--teal)", borderRadius: 3 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h3>Quick Actions</h3></div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button className="btn btn-teal">+ Add Employee</button>
              <button className="btn">+ Process Payroll</button>
              <button className="btn">+ Approve Leave</button>
              <button className="btn">◎ View Attendance</button>
              <button className="btn">◯ Open Recruitment</button>
              {Number(cards.open_positions ?? 0) > 0 && (
                <div className="alert-banner" style={{ marginTop: 8, fontSize: 12 }}>
                  <span>◈</span>
                  <span>{Number(cards.open_positions)} open positions need filling</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "employees" && (
        <div className="card">
          <div className="card-head">
            <h3>Employees ({employees.length})</h3>
            <button className="btn btn-teal">+ New Employee</button>
          </div>
          <table className="data">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.name}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="avatar" style={{ width: 28, height: 28, fontSize: 11, flexShrink: 0 }}>
                        {(emp.employee_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700 }}>{emp.employee_name}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>{emp.name}</div>
                      </div>
                    </div>
                  </td>
                  <td>{emp.department || "—"}</td>
                  <td>{emp.designation || "—"}</td>
                  <td>{fmtDate(emp.date_of_joining)}</td>
                  <td><span className={`chip ${emp.status === "Active" ? "ok" : "danger"}`}>{emp.status}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn" style={{ fontSize: 11, padding: "4px 8px" }}>View</button>
                      <button className="btn" style={{ fontSize: 11, padding: "4px 8px" }}>Payslip</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "leave" && (
        <div className="card">
          <div className="card-head">
            <h3>Leave Requests</h3>
            <button className="btn btn-teal">+ New Request</button>
          </div>
          {leaveRequests.length === 0 ? (
            <div className="empty">No leave requests found</div>
          ) : (
            <table className="data">
              <thead>
                <tr><th>Employee</th><th>Leave Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {leaveRequests.map((lr) => (
                  <tr key={String(lr.name)}>
                    <td><strong>{String(lr.employee_name)}</strong></td>
                    <td>{String(lr.leave_type)}</td>
                    <td>{fmtDate(String(lr.from_date))}</td>
                    <td>{fmtDate(String(lr.to_date))}</td>
                    <td>{String(lr.total_leave_days)}</td>
                    <td><span className={`chip ${lr.status === "Approved" ? "ok" : lr.status === "Rejected" ? "danger" : "warn"}`}>{String(lr.status)}</span></td>
                    <td>
                      {lr.status === "Open" && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="btn btn-teal" style={{ fontSize: 11, padding: "4px 8px" }}>✓ Approve</button>
                          <button className="btn" style={{ fontSize: 11, padding: "4px 8px", color: "var(--danger)" }}>✕</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "payroll" && (
        <div>
          <div className="kpi-grid" style={{ marginBottom: 18 }}>
            <div className="kpi teal">
              <div className="ic-wrap">◎</div>
              <div className="label">Employees on Payroll</div>
              <div className="val">{String(payroll.totals.count ?? employees.length)}</div>
            </div>
            <div className="kpi">
              <div className="ic-wrap">◇</div>
              <div className="label">Gross Pay</div>
              <div className="val">{fmt(Number(payroll.totals.gross_pay ?? 0))}</div>
            </div>
            <div className="kpi warn">
              <div className="ic-wrap">◈</div>
              <div className="label">Deductions</div>
              <div className="val">{fmt(Number(payroll.totals.total_deductions ?? 0))}</div>
            </div>
            <div className="kpi">
              <div className="ic-wrap">◯</div>
              <div className="label">Net Pay</div>
              <div className="val">{fmt(Number(payroll.totals.net_pay ?? Number(cards.monthly_payroll ?? 486200)))}</div>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h3>Salary Slips</h3><button className="btn btn-teal">+ Process Payroll</button></div>
            {payroll.slips.length === 0 ? (
              <div className="empty">Connect to Fuze API to see salary slips</div>
            ) : (
              <table className="data">
                <thead><tr><th>Employee</th><th>Department</th><th>Gross</th><th>Deductions</th><th>Net</th><th>Status</th></tr></thead>
                <tbody>
                  {payroll.slips.map((slip) => (
                    <tr key={String(slip.name)}>
                      <td><strong>{String(slip.employee_name)}</strong></td>
                      <td>{String(slip.department)}</td>
                      <td>{fmt(Number(slip.gross_pay))}</td>
                      <td>{fmt(Number(slip.total_deduction))}</td>
                      <td style={{ fontWeight: 700 }}>{fmt(Number(slip.net_pay))}</td>
                      <td><span className="chip ok">Processed</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === "recruitment" && (
        <div className="card">
          <div className="card-head"><h3>Job Openings ({jobOpenings.length})</h3><button className="btn btn-teal">+ Post Position</button></div>
          {jobOpenings.length === 0 ? (
            <div className="empty">No open positions at this time</div>
          ) : (
            <table className="data">
              <thead><tr><th>Position</th><th>Department</th><th>Status</th><th>Closes</th><th>Actions</th></tr></thead>
              <tbody>
                {jobOpenings.map((job) => (
                  <tr key={job.name}>
                    <td><strong>{job.job_title}</strong></td>
                    <td>{job.department || "—"}</td>
                    <td><span className={`chip ${job.status === "Open" ? "ok" : "muted"}`}>{job.status}</span></td>
                    <td>{fmtDate(job.closes_on)}</td>
                    <td>
                      <button className="btn" style={{ fontSize: 11, padding: "4px 8px" }}>View Applicants</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
