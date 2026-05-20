"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";

type Row = Record<string, unknown>;

const COLORS = ["#28A486", "#242048", "#F59E0B", "#EF4444", "#6366F1", "#EC4899", "#14B8A6"];

function money(v: unknown) {
  const n = Number(v || 0);
  if (!n) return "—";
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function text(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}
function statusCls(v: unknown) {
  const s = String(v || "").toLowerCase();
  if (s.includes("absent") || s.includes("cancel") || s.includes("reject") || s.includes("inactive")) return "chip danger";
  if (s.includes("leave") || s.includes("open") || s.includes("pending") || s.includes("draft")) return "chip warn";
  if (s.includes("present") || s.includes("active") || s.includes("approved") || s.includes("paid") || s.includes("submit")) return "chip ok";
  return "chip info";
}

// ── Modal ─────────────────────────────────────────────────────────────────────
type ModalField = { name: string; label: string; type?: string; required?: boolean; options?: string[] };

function Modal({ title, fields, onClose, onSubmit, busy, error }: {
  title: string;
  fields: ModalField[];
  onClose: () => void;
  onSubmit: (values: Row) => Promise<void>;
  busy: boolean;
  error: string;
}) {
  const [values, setValues] = useState<Row>({});
  const set = (k: string, v: unknown) => setValues((p) => ({ ...p, [k]: v }));

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(20,20,40,.55)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(2px)" }}>
      <div style={{ background:"var(--card)",borderRadius:18,padding:28,width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(22,26,45,.22)" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
          <h2 style={{ margin:0,fontSize:18,fontWeight:800,color:"var(--navy-ink)" }}>{title}</h2>
          <button type="button" onClick={onClose} style={{ border:"none",background:"none",fontSize:20,cursor:"pointer",color:"var(--muted)",lineHeight:1 }}>✕</button>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          {fields.map((f) => (
            <div key={f.name}>
              <label style={{ fontSize:12,fontWeight:700,color:"var(--muted)",display:"block",marginBottom:4 }}>
                {f.label}{f.required && <span style={{ color:"var(--danger)" }}> *</span>}
              </label>
              {f.options ? (
                <select value={String(values[f.name] ?? "")} onChange={(e) => set(f.name, e.target.value)}
                  style={{ width:"100%",padding:"10px 12px",border:"1px solid var(--line)",borderRadius:9,fontSize:14,background:"#fff" }}>
                  <option value="">Select…</option>
                  {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === "textarea" ? (
                <textarea value={String(values[f.name] ?? "")} onChange={(e) => set(f.name, e.target.value)}
                  rows={3} style={{ width:"100%",padding:"10px 12px",border:"1px solid var(--line)",borderRadius:9,fontSize:14,resize:"vertical",boxSizing:"border-box" }} />
              ) : (
                <input type={f.type || "text"} value={String(values[f.name] ?? "")} onChange={(e) => set(f.name, e.target.value)}
                  style={{ width:"100%",padding:"10px 12px",border:"1px solid var(--line)",borderRadius:9,fontSize:14 }} />
              )}
            </div>
          ))}
        </div>
        {error && <div style={{ color:"var(--danger)",fontSize:13,marginTop:12,padding:"8px 12px",background:"var(--danger-bg)",borderRadius:8 }}>{error}</div>}
        <div style={{ display:"flex",gap:10,marginTop:20,justifyContent:"flex-end" }}>
          <button type="button" onClick={onClose} className="btn">Cancel</button>
          <button type="button" onClick={() => onSubmit(values)} disabled={busy} className="btn btn-teal">
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPI({ label, value, hint, color = "teal" }: { label: string; value: string | number; hint: string; color?: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    teal: { bg: "#E3F6F0", fg: "#28a486" },
    navy: { bg: "#EEEDF7", fg: "#242048" },
    warn: { bg: "#FFF6E0", fg: "#E89B0E" },
    danger: { bg: "#FDECEE", fg: "#DC3545" },
    blue: { bg: "#E8EFFD", fg: "#2E6BE5" },
  };
  const c = colors[color] || colors.teal;
  return (
    <div style={{ background:"#fff",border:"1px solid var(--line)",borderRadius:12,padding:"16px 18px",boxShadow:"var(--shadow)" }}>
      <div style={{ width:36,height:36,borderRadius:9,background:c.bg,color:c.fg,display:"grid",placeItems:"center",marginBottom:12,fontSize:18,fontWeight:800 }}>▸</div>
      <div style={{ fontSize:10.5,fontWeight:800,color:"var(--muted)",letterSpacing:".7px",textTransform:"uppercase" }}>{label}</div>
      <div style={{ fontSize:26,fontWeight:800,color:"var(--navy-ink)",letterSpacing:"-.5px",margin:"4px 0 2px" }}>{value}</div>
      <div style={{ fontSize:11.5,color:"var(--muted-2)" }}>{hint}</div>
    </div>
  );
}

// ── Tooltip style ─────────────────────────────────────────────────────────────
const tt = {
  contentStyle: { background:"var(--card)",border:"1px solid var(--line)",borderRadius:12,boxShadow:"0 8px 24px rgba(22,26,45,.12)",fontSize:12,color:"var(--text)" },
  cursor: { fill:"var(--demo-soft,#f5f6fa)" },
};

// ── TABS ──────────────────────────────────────────────────────────────────────
type HrTab = "overview" | "employees" | "attendance" | "leave" | "payroll";
const TABS: { id: HrTab; label: string; description: string }[] = [
  { id: "overview", label: "Overview", description: "People command centre" },
  { id: "employees", label: "Employees", description: "Employee profiles and departments" },
  { id: "attendance", label: "Attendance", description: "Daily attendance and working hours" },
  { id: "leave", label: "Leave", description: "Leave requests and approvals" },
  { id: "payroll", label: "Payroll", description: "Salary slips and payroll totals" },
];
function normalizeTab(value?: string | null): HrTab { const v = String(value || "").toLowerCase(); return ["employees","attendance","leave","payroll"].includes(v) ? v as HrTab : "overview"; }

interface Props {
  initialEmployees: Row[];
  initialAttendance: Row[];
  initialLeave: Row[];
  initialPayroll: Row[];
  initialTab?: string;
  dashMetrics: {
    active_employees?: number;
    present_today?: number;
    pending_leave?: number;
    payroll_total?: number | string;
    departments?: { department: string; count: number }[];
  };
}

export default function HRWorkspaceClient({ initialTab, initialEmployees, initialAttendance, initialLeave, initialPayroll, dashMetrics }: Props) {
  const params = useSearchParams();
  const [tab, setTab] = useState<HrTab>(() => normalizeTab(initialTab || params.get("tab")));
  const [employees, setEmployees] = useState<Row[]>(initialEmployees);
  const [attendance, setAttendance] = useState<Row[]>(initialAttendance);
  const [leave, setLeave] = useState<Row[]>(initialLeave);
  const [payroll, setPayroll] = useState<Row[]>(initialPayroll);

  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<null | "employee" | "attendance" | "leave" | "payroll">(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  // ── Derived metrics ────────────────────────────────────────────────────────
  const activeEmp = dashMetrics.active_employees ?? employees.filter((e) => String(e.status || "").toLowerCase() === "active").length;
  const presentToday = dashMetrics.present_today ?? attendance.filter((a) => String(a.status || "").toLowerCase() === "present").length;
  const pendingLeave = dashMetrics.pending_leave ?? leave.filter((l) => String(l.status || "").toLowerCase() === "open").length;
  const payrollTotal = dashMetrics.payroll_total ?? payroll.reduce((s, p) => s + Number(p.net_pay || 0), 0);

  // ── Charts: department breakdown ───────────────────────────────────────────
  const deptData = useMemo(() => {
    if (dashMetrics.departments?.length) return dashMetrics.departments.map((d) => ({ name: d.department, count: d.count }));
    const map: Record<string, number> = {};
    employees.forEach((e) => {
      const d = String(e.department || "No Department");
      map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [employees, dashMetrics.departments]);

  const leaveStatusData = useMemo(() => {
    const map: Record<string, number> = {};
    leave.forEach((l) => { const s = String(l.status || "Open"); map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [leave]);

  const attendanceStatusData = useMemo(() => {
    const map: Record<string, number> = {};
    attendance.forEach((a) => { const s = String(a.status || "Unknown"); map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).map(([status, count]) => ({ status, count }));
  }, [attendance]);

  const payrollTrend = useMemo(() => {
    return payroll.slice(0, 8).reverse().map((p, i) => ({
      label: String(p.employee_name || p.employee || `Slip ${i + 1}`).slice(0, 12),
      net: Number(p.net_pay || 0),
      gross: Number(p.gross_pay || 0),
    }));
  }, [payroll]);

  // ── Filtered rows per tab ─────────────────────────────────────────────────
  function filterRows(rows: Row[]) {
    const q = query.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }

  // ── Submit helper ─────────────────────────────────────────────────────────
  async function submitForm(module: string, values: Row, onSuccess: (row: Row) => void) {
    setBusy(true);
    setFormError("");
    try {
      const routeMap: Record<string,string> = {
        employees: "/api/hr/employees",
        attendance: "/api/hr/attendance",
        leave: "/api/hr/leave-requests",
        payroll: "/api/hr/payroll",
      };
      const route = routeMap[module];
      if (!route) throw new Error(`No SaaS API route configured for ${module}`);
      const res = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");
      onSuccess(json.data || json);
      setModal(null);
      setNotice("Record saved successfully.");
      setTimeout(() => setNotice(""), 3500);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setBusy(false);
    }
  }

  // ── Refresh helpers ───────────────────────────────────────────────────────
  const refresh = useCallback(async (module: string, setter: (r: Row[]) => void) => {
    try {
      const routeMap: Record<string,string> = {
        employees: "/api/hr/employees",
        attendance: "/api/hr/attendance",
        leave: "/api/hr/leave-requests",
        payroll: "/api/hr/payroll",
      };
      const route = routeMap[module];
      if (!route) throw new Error(`No SaaS API route configured for ${module}`);
      const res = await fetch(route);
      const json = await res.json();
      const rows = Array.isArray(json) ? json
        : Array.isArray(json?.data) ? json.data
        : Array.isArray(json?.employees) ? json.employees
        : Array.isArray(json?.results) ? json.results
        : Array.isArray(json?.message) ? json.message
        : [];
      setter(rows);
    } catch { /* silent */ }
  }, []);

  // ── Table renderer ────────────────────────────────────────────────────────
  function Table({ rows, cols }: { rows: Row[]; cols: { key: string; label: string; money?: boolean }[] }) {
    const r = filterRows(rows);
    return (
      <div style={{ overflowX:"auto" }}>
        <table className="demo-table" style={{ minWidth:640 }}>
          <thead><tr>{cols.map((c) => <th key={c.key}>{c.label}</th>)}<th>Status</th></tr></thead>
          <tbody>
            {r.length ? r.slice(0, 50).map((row, i) => (
              <tr key={String(row.name || i)}>
                {cols.map((c) => (
                  <td key={c.key}>{c.money ? money(row[c.key]) : text(row[c.key])}</td>
                ))}
                <td><span className={statusCls(row.status || row.docstatus)}>{text(row.status || (row.docstatus === 1 ? "Submitted" : "Draft"))}</span></td>
              </tr>
            )) : (
              <tr><td colSpan={cols.length + 1} style={{ textAlign:"center",color:"var(--muted)",padding:32 }}>No records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Overview tab ──────────────────────────────────────────────────────────
  function OverviewTab() {
    return (
      <>
        {/* KPI Row */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:14,marginBottom:18 }}>
          <KPI label="Active Employees" value={activeEmp} hint="Current headcount" color="teal" />
          <KPI label="Present Today" value={presentToday} hint="Attendance today" color="navy" />
          <KPI label="Pending Leave" value={pendingLeave} hint="Awaiting approval" color="warn" />
          <KPI label="Payroll (MTD)" value={typeof payrollTotal === "number" ? money(payrollTotal) : String(payrollTotal)} hint="Net pay this month" color="blue" />
        </div>

        {/* Charts Row */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16,marginBottom:16 }}>
          <div className="demo-panel">
            <div className="demo-panel-head"><div><h3>Employees by Department</h3><p>Headcount distribution across departments</p></div></div>
            <div style={{ height:240,padding:"8px 16px 16px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData} margin={{ top:4,right:8,left:0,bottom:40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize:10,fill:"var(--muted)" }} axisLine={false} tickLine={false} angle={-25} textAnchor="end" />
                  <YAxis tick={{ fontSize:11,fill:"var(--muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip {...tt} />
                  <Bar dataKey="count" fill="#28a486" radius={[6,6,0,0]} name="Employees" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="demo-panel">
            <div className="demo-panel-head"><div><h3>Leave by Status</h3><p>Breakdown of leave application statuses</p></div></div>
            <div style={{ height:240,padding:"8px 16px 16px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={leaveStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={40}>
                    {leaveStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tt} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12,color:"var(--muted)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Attendance today */}
        <div className="demo-panel" style={{ marginBottom:16 }}>
          <div className="demo-panel-head">
            <div><h3>Today's Attendance Snapshot</h3><p>Status breakdown for all attendance records</p></div>
          </div>
          <div style={{ height:200,padding:"8px 16px 16px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceStatusData} layout="vertical" margin={{ top:4,right:16,left:8,bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize:11,fill:"var(--muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="status" tick={{ fontSize:11,fill:"var(--muted)" }} axisLine={false} tickLine={false} width={90} />
                <Tooltip {...tt} />
                <Bar dataKey="count" fill="#242048" radius={[0,6,6,0]} name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick actions */}
        <div className="demo-grid">
          <div className="demo-panel">
            <div className="demo-panel-head"><div><h3>HR Quick Actions</h3><p>Common workflows at a glance</p></div></div>
            <div className="demo-alert-list">
              {[
                { label: "Add Employee", desc: "Create a new staff profile", action: () => setModal("employee") },
                { label: "Mark Attendance", desc: "Record employee attendance", action: () => setModal("attendance") },
                { label: "Submit Leave Request", desc: "Apply for leave on behalf", action: () => setModal("leave") },
                { label: "Process Payroll", desc: "Generate salary slips", action: () => setModal("payroll") },
                { label: "View All Employees", desc: "Browse headcount", action: () => { setTab("employees"); history.replaceState(null, "", "/portal/hr?tab=employees"); } },
                { label: "Approve Pending Leave", desc: "Review open leave requests", action: () => { setTab("leave"); history.replaceState(null, "", "/portal/hr?tab=leave"); } },
              ].map((a) => (
                <button key={a.label} type="button" className="demo-alert text-left" onClick={a.action}>
                  {a.label}<span>{a.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="demo-panel">
            <div className="demo-panel-head"><div><h3>Recent Activity</h3><p>Latest HR record updates</p></div></div>
            <div className="demo-alert-list">
              {[...employees.slice(0,3).map((e) => ({ title: String(e.employee_name || e.name), sub: `Employee · ${String(e.department || "—")}`, status: String(e.status || "Active") })),
                ...leave.slice(0,3).map((l) => ({ title: String(l.employee_name || l.employee), sub: `Leave · ${String(l.leave_type || "Annual")}`, status: String(l.status || "Open") })),
              ].slice(0,6).map((item, i) => (
                <div key={i} className="demo-alert" style={{ cursor:"default" }}>
                  <strong>{item.title}</strong><span style={{ display:"flex",justifyContent:"space-between" }}>{item.sub} <span className={statusCls(item.status)}>{item.status}</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Employees tab ─────────────────────────────────────────────────────────
  function EmployeesTab() {
    return (
      <div className="demo-panel">
        <div className="demo-panel-head">
          <div><h3>Employees <span style={{ fontSize:12,fontWeight:600,color:"var(--muted)" }}>({employees.length})</span></h3><p>All staff records from your company workspace</p></div>
          <div style={{ display:"flex",gap:8,alignItems:"center" }}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search employees…" style={{ padding:"8px 12px",border:"1px solid var(--line)",borderRadius:9,fontSize:13 }} />
            <button type="button" className="btn btn-teal" onClick={() => setModal("employee")}>+ Add Employee</button>
            <button type="button" className="btn" onClick={() => refresh("employees", setEmployees)}>↺ Refresh</button>
          </div>
        </div>
        <Table rows={employees} cols={[
          { key:"employee_name", label:"Name" },
          { key:"department", label:"Department" },
          { key:"designation", label:"Designation" },
          { key:"company_email", label:"Email" },
          { key:"date_of_joining", label:"Joined" },
        ]} />
      </div>
    );
  }

  // ── Attendance tab ────────────────────────────────────────────────────────
  function AttendanceTab() {
    return (
      <>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14,marginBottom:16 }}>
          <div className="demo-panel">
            <div className="demo-panel-head"><div><h3>Attendance Overview</h3><p>All records by status</p></div></div>
            <div style={{ height:220,padding:"8px 16px 16px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={attendanceStatusData} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} innerRadius={36}>
                    {attendanceStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tt} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:12,color:"var(--muted)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            {attendanceStatusData.map((d, i) => (
              <div key={d.status} style={{ background:"#fff",border:"1px solid var(--line)",borderRadius:10,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                  <div style={{ width:10,height:10,borderRadius:"50%",background:COLORS[i%COLORS.length] }} />
                  <span style={{ fontWeight:600,fontSize:13 }}>{d.status}</span>
                </div>
                <span style={{ fontWeight:800,fontSize:18,color:"var(--navy-ink)" }}>{d.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="demo-panel">
          <div className="demo-panel-head">
            <div><h3>Attendance Records <span style={{ fontSize:12,fontWeight:600,color:"var(--muted)" }}>({attendance.length})</span></h3></div>
            <div style={{ display:"flex",gap:8 }}>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" style={{ padding:"8px 12px",border:"1px solid var(--line)",borderRadius:9,fontSize:13 }} />
              <button type="button" className="btn btn-teal" onClick={() => setModal("attendance")}>+ Mark Attendance</button>
              <button type="button" className="btn" onClick={() => refresh("attendance", setAttendance)}>↺</button>
            </div>
          </div>
          <Table rows={attendance} cols={[
            { key:"employee_name", label:"Employee" },
            { key:"attendance_date", label:"Date" },
            { key:"working_hours", label:"Hours" },
          ]} />
        </div>
      </>
    );
  }

  // ── Leave tab ─────────────────────────────────────────────────────────────
  function LeaveTab() {
    return (
      <>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:14,marginBottom:16 }}>
          <KPI label="Total Applications" value={leave.length} hint="All leave requests" color="navy" />
          <KPI label="Approved" value={leave.filter((l) => String(l.status).toLowerCase() === "approved").length} hint="Approved leave" color="teal" />
          <KPI label="Pending" value={pendingLeave} hint="Awaiting approval" color="warn" />
        </div>
        <div className="demo-panel">
          <div className="demo-panel-head">
            <div><h3>Leave Applications <span style={{ fontSize:12,fontWeight:600,color:"var(--muted)" }}>({leave.length})</span></h3></div>
            <div style={{ display:"flex",gap:8 }}>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" style={{ padding:"8px 12px",border:"1px solid var(--line)",borderRadius:9,fontSize:13 }} />
              <button type="button" className="btn btn-teal" onClick={() => setModal("leave")}>+ New Leave</button>
              <button type="button" className="btn" onClick={() => refresh("leave", setLeave)}>↺</button>
            </div>
          </div>
          <Table rows={leave} cols={[
            { key:"employee_name", label:"Employee" },
            { key:"leave_type", label:"Type" },
            { key:"from_date", label:"From" },
            { key:"to_date", label:"To" },
            { key:"total_leave_days", label:"Days" },
          ]} />
        </div>
      </>
    );
  }

  // ── Payroll tab ───────────────────────────────────────────────────────────
  function PayrollTab() {
    const totalGross = payroll.reduce((s, p) => s + Number(p.gross_pay || 0), 0);
    const totalNet = payroll.reduce((s, p) => s + Number(p.net_pay || 0), 0);
    return (
      <>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:14,marginBottom:16 }}>
          <KPI label="Salary Slips" value={payroll.length} hint="Total slips" color="navy" />
          <KPI label="Total Gross Pay" value={money(totalGross)} hint="Sum of gross salaries" color="teal" />
          <KPI label="Total Net Pay" value={money(totalNet)} hint="Sum of net salaries" color="blue" />
        </div>

        {payrollTrend.length > 0 && (
          <div className="demo-panel" style={{ marginBottom:16 }}>
            <div className="demo-panel-head"><div><h3>Payroll — Gross vs Net</h3><p>Recent salary slip comparison</p></div></div>
            <div style={{ height:240,padding:"8px 16px 16px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payrollTrend} margin={{ top:4,right:8,left:0,bottom:30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize:10,fill:"var(--muted)" }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fontSize:11,fill:"var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R${(v/1000).toFixed(0)}k`} />
                  <Tooltip {...tt} formatter={(v: number) => [money(v)]} />
                  <Legend wrapperStyle={{ fontSize:12,color:"var(--muted)" }} />
                  <Bar dataKey="gross" fill="#28a486" radius={[4,4,0,0]} name="Gross Pay" />
                  <Bar dataKey="net" fill="#242048" radius={[4,4,0,0]} name="Net Pay" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="demo-panel">
          <div className="demo-panel-head">
            <div><h3>Salary Slips <span style={{ fontSize:12,fontWeight:600,color:"var(--muted)" }}>({payroll.length})</span></h3></div>
            <div style={{ display:"flex",gap:8 }}>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" style={{ padding:"8px 12px",border:"1px solid var(--line)",borderRadius:9,fontSize:13 }} />
              <button type="button" className="btn btn-teal" onClick={() => setModal("payroll")}>+ New Slip</button>
              <button type="button" className="btn" onClick={() => refresh("payroll", setPayroll)}>↺</button>
            </div>
          </div>
          <Table rows={payroll} cols={[
            { key:"employee_name", label:"Employee" },
            { key:"start_date", label:"Period Start" },
            { key:"end_date", label:"Period End" },
            { key:"gross_pay", label:"Gross Pay", money:true },
            { key:"net_pay", label:"Net Pay", money:true },
          ]} />
        </div>
      </>
    );
  }

  // ── Modal definitions ─────────────────────────────────────────────────────
  const MODALS: Record<string, { title: string; module: string; fields: ModalField[]; onSuccess: (r: Row) => void }> = {
    employee: {
      title: "Add Employee",
      module: "employees",  // → /api/hr/employees
      fields: [
        { name:"first_name", label:"First Name", required:true },
        { name:"last_name", label:"Last Name" },
        { name:"gender", label:"Gender", options:["Male","Female","Other"] },
        { name:"date_of_joining", label:"Date of Joining", type:"date", required:true },
        { name:"department", label:"Department" },
        { name:"designation", label:"Designation" },
        { name:"company_email", label:"Company Email", type:"email" },
        { name:"cell_number", label:"Cell Number", type:"tel" },
        { name:"status", label:"Status", options:["Active","Inactive","Suspended","Left"] },
      ],
      onSuccess: (r) => setEmployees((p) => [r, ...p]),
    },
    attendance: {
      title: "Mark Attendance",
      module: "attendance",  // → /api/hr/attendance
      fields: [
        { name:"employee", label:"Employee ID", required:true },
        { name:"attendance_date", label:"Date", type:"date", required:true },
        { name:"status", label:"Status", required:true, options:["Present","Absent","On Leave","Half Day","Work From Home"] },
        { name:"working_hours", label:"Working Hours", type:"number" },
      ],
      onSuccess: (r) => setAttendance((p) => [r, ...p]),
    },
    leave: {
      title: "New Leave Application",
      module: "leave",  // → /api/hr/leave-requests
      fields: [
        { name:"employee", label:"Employee ID", required:true },
        { name:"leave_type", label:"Leave Type", required:true, options:["Annual Leave","Sick Leave","Maternity Leave","Paternity Leave","Study Leave","Unpaid Leave","Family Responsibility Leave"] },
        { name:"from_date", label:"From Date", type:"date", required:true },
        { name:"to_date", label:"To Date", type:"date", required:true },
        { name:"description", label:"Reason", type:"textarea" },
        { name:"status", label:"Status", options:["Open","Approved","Rejected","Cancelled"] },
      ],
      onSuccess: (r) => setLeave((p) => [r, ...p]),
    },
    payroll: {
      title: "Create Salary Slip",
      module: "payroll",  // → /api/hr/payroll
      fields: [
        { name:"employee", label:"Employee ID", required:true },
        { name:"start_date", label:"Period Start", type:"date", required:true },
        { name:"end_date", label:"Period End", type:"date", required:true },
        { name:"posting_date", label:"Posting Date", type:"date" },
        { name:"payroll_frequency", label:"Frequency", options:["Monthly","Fortnightly","Bimonthly","Weekly","Daily"] },
      ],
      onSuccess: (r) => setPayroll((p) => [r, ...p]),
    },
  };

  const currentModal = modal ? MODALS[modal] : null;

  return (
    <div className="demo-workspace animate-fade-up">
      {/* Header */}
      <section className="demo-module-titlebar">
        <div>
          <div className="demo-eyebrow">People Workspace</div>
          <h1>{TABS.find((t) => t.id === tab)?.label === "Overview" ? "HR Overview" : `${TABS.find((t) => t.id === tab)?.label} Dashboard`}</h1>
          <p>{TABS.find((t) => t.id === tab)?.description}. Each area stays under HR but has its own focused dashboard.</p>
        </div>
        <div className="demo-module-actions">
          <button type="button" className="btn btn-teal" onClick={() => setModal("employee")}>+ Add Employee</button>
          <button type="button" className="btn" onClick={() => setModal("leave")}>+ Leave Request</button>
          <button type="button" className="btn" onClick={() => setModal("attendance")}>+ Attendance</button>
        </div>
      </section>

      {/* Notice */}
      {notice && (
        <div style={{ background:"var(--ok-bg)",border:"1px solid var(--ok)",color:"var(--ok)",borderRadius:9,padding:"10px 16px",marginBottom:14,fontSize:13,fontWeight:600 }}>
          ✓ {notice}
        </div>
      )}

      {/* Dashboard switcher */}
      <section className="demo-tabbar">
        {TABS.map((t) => {
          const count = t.id === "employees" ? employees.length : t.id === "attendance" ? attendance.length : t.id === "leave" ? leave.length : t.id === "payroll" ? payroll.length : 0;
          return (
            <button key={t.id} type="button" onClick={() => { setTab(t.id); setQuery(""); history.replaceState(null, "", t.id === "overview" ? "/portal/hr" : `/portal/hr?tab=${t.id}`); }} className={tab === t.id ? "active" : ""}>
              {t.label}{count ? ` (${count})` : ""}
            </button>
          );
        })}
      </section>

      {/* Tab content */}
      {tab === "overview" && <OverviewTab />}
      {tab === "employees" && <EmployeesTab />}
      {tab === "attendance" && <AttendanceTab />}
      {tab === "leave" && <LeaveTab />}
      {tab === "payroll" && <PayrollTab />}

      {/* Modal */}
      {currentModal && (
        <Modal
          title={currentModal.title}
          fields={currentModal.fields}
          onClose={() => { setModal(null); setFormError(""); }}
          onSubmit={(values) => submitForm(currentModal.module, values, currentModal.onSuccess)}
          busy={busy}
          error={formError}
        />
      )}
    </div>
  );
}
