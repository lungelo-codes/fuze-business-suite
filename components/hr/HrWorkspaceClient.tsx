"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Employee = {
  name: string; employee_name: string; first_name?: string; last_name?: string;
  department?: string; designation?: string; branch?: string; grade?: string;
  employment_type?: string; status: string; cell_number?: string;
  company_email?: string; personal_email?: string;
  date_of_joining?: string; gender?: string; image?: string; reports_to?: string;
};

type DashboardCards = {
  active_employees: number; present_today: number; absent_today: number;
  on_leave_today: number; pending_leave: number; open_positions: number;
  pending_appraisals: number; pending_expenses: number; open_onboarding: number;
  monthly_payroll: string; pending_expense_amount: string; departments: number;
};

type LeaveRequest = {
  name: string; employee: string; employee_name: string; leave_type: string;
  from_date: string; to_date: string; total_leave_days: number;
  status: string; description?: string; half_day?: number;
};

type Attendance = {
  name: string; employee: string; employee_name: string;
  attendance_date: string; status: string; working_hours?: number;
  in_time?: string; out_time?: string; department?: string; shift?: string;
};

type JobOpening = {
  name: string; job_title: string; status: string; department?: string;
  designation?: string; expected_compensation?: number; closes_on?: string;
  no_of_positions?: number;
};

type JobApplicant = {
  name: string; applicant_name: string; email_id: string;
  job_title: string; status: string; source?: string; creation: string;
};

type SalarySlip = {
  name: string; employee: string; employee_name: string; department?: string;
  start_date: string; end_date: string; gross_pay: number;
  total_deduction: number; net_pay: number; status?: string; docstatus: number;
};

type ExpenseClaim = {
  name: string; employee: string; employee_name: string;
  posting_date: string; total_claimed_amount: number;
  total_sanctioned_amount?: number; approval_status: string;
};

type Appraisal = {
  name: string; employee: string; employee_name: string;
  department?: string; appraisal_cycle?: string; status: string;
  total_score?: number; final_score?: number;
};

type TrainingEvent = {
  name: string; event_name: string; training_program?: string;
  trainer_name?: string; location?: string;
  start_time?: string; status?: string;
};

// ─── Nav sections ─────────────────────────────────────────────────────────────

const NAV: { id: string; label: string; icon: string; group: string }[] = [
  { id: "dashboard",    label: "Dashboard",     icon: "⬛", group: "Overview" },
  { id: "employees",   label: "Employees",     icon: "👤", group: "Organisation" },
  { id: "orgchart",    label: "Org Chart",     icon: "🏗️", group: "Organisation" },
  { id: "departments", label: "Departments",   icon: "🗂️", group: "Organisation" },
  { id: "attendance",  label: "Attendance",    icon: "🕐", group: "Time & Leave" },
  { id: "shifts",      label: "Shifts",        icon: "🔄", group: "Time & Leave" },
  { id: "leave",       label: "Leave",         icon: "🌴", group: "Time & Leave" },
  { id: "payroll",     label: "Payroll",       icon: "💰", group: "Payroll" },
  { id: "recruitment", label: "Recruitment",   icon: "🎯", group: "Recruitment" },
  { id: "interviews",  label: "Interviews",    icon: "🗣️", group: "Recruitment" },
  { id: "appraisals",  label: "Appraisals",    icon: "⭐", group: "Performance" },
  { id: "goals",       label: "Goals",         icon: "🏆", group: "Performance" },
  { id: "training",    label: "Training",      icon: "📚", group: "Training" },
  { id: "expenses",    label: "Expenses",      icon: "🧾", group: "Expenses" },
  { id: "advances",    label: "Advances",      icon: "💳", group: "Expenses" },
  { id: "lifecycle",   label: "Lifecycle",     icon: "🔁", group: "Lifecycle" },
  { id: "fleet",       label: "Fleet",         icon: "🚗", group: "Fleet" },
];

// ─── Colour helpers ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981", inactive: "#6b7280",
  present: "#10b981", absent: "#ef4444", "on leave": "#f59e0b",
  open: "#3b82f6", approved: "#10b981", rejected: "#ef4444",
  pending: "#f59e0b", submitted: "#6366f1", cancelled: "#6b7280",
  qualified: "#10b981", "not qualified": "#ef4444", draft: "#f59e0b",
  won: "#10b981", lost: "#ef4444", interview: "#8b5cf6",
};

function statusColor(s: string) {
  return STATUS_COLORS[s?.toLowerCase()] ?? "#6b7280";
}

function Badge({ label, color }: { label: string; color?: string }) {
  const c = color || statusColor(label);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: c + "18", color: c, border: `1px solid ${c}30`,
      borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600,
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c }} />
      {label}
    </span>
  );
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function apiFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SearchInput({ value, onChange, placeholder = "Search…" }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div style={{ position: "relative" }}>
      <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 14 }}>🔍</span>
      <input
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
          border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13,
          outline: "none", width: 200, background: "#F9FAFC",
        }}
      />
    </div>
  );
}

function KPICard({ label, value, sub, color = "#6366f1", icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon?: string;
}) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: "20px 24px",
      border: "1px solid var(--line)", boxShadow: "var(--shadow)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--navy-ink)", lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{sub}</div>}
        </div>
        {icon && (
          <div style={{ width: 44, height: 44, borderRadius: 10, background: color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ height: 3, background: "#f1f5f9", borderRadius: 2, marginTop: 16 }}>
        <div style={{ height: 3, width: "60%", background: color, borderRadius: 2 }} />
      </div>
    </div>
  );
}

function DataTable({ columns, rows, loading, empty = "No records found" }: {
  columns: { key: string; label: string; render?: (v: unknown, row: Record<string, unknown>) => React.ReactNode }[];
  rows: Record<string, unknown>[];
  loading?: boolean;
  empty?: string;
}) {
  if (loading) return (
    <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>Loading…
    </div>
  );
  if (!rows.length) return (
    <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>{empty}
    </div>
  );
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
            {columns.map(c => (
              <th key={c.key} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f8fafc", transition: "background .12s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
              onMouseLeave={e => (e.currentTarget.style.background = "")}>
              {columns.map(c => (
                <td key={c.key} style={{ padding: "12px 16px", color: "#374151", verticalAlign: "middle" }}>
                  {c.render ? c.render(row[c.key], row) : String(row[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--navy-ink)", margin: 0 }}>{title}</h2>
        {sub && <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", size = "sm" }: {
  children: React.ReactNode; onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary:   { background: "#6366f1", color: "#fff", border: "none" },
    secondary: { background: "#f1f5f9", color: "#374151", border: "1px solid #e2e8f0" },
    ghost:     { background: "transparent", color: "#6366f1", border: "1px solid #e0e7ff" },
  };
  const pad = size === "md" ? "10px 20px" : "7px 14px";
  return (
    <button onClick={onClick} style={{
      ...styles[variant], padding: pad, borderRadius: 8, fontSize: 13,
      fontWeight: 600, cursor: "pointer", display: "inline-flex",
      alignItems: "center", gap: 6, transition: "opacity .15s",
    }}
      onMouseEnter={e => (e.currentTarget.style.opacity = ".85")}
      onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
      {children}
    </button>
  );
}

function fmtDate(v?: string) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}
function fmt(v: unknown) { return v == null || v === "" ? "—" : String(v); }

// ─── SECTION: Dashboard ───────────────────────────────────────────────────────

function DashboardSection() {
  const [data, setData]     = useState<{ cards: DashboardCards; departments: { department: string; count: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/hr/dashboard").then(r => setData(r)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>⏳ Loading dashboard…</div>;
  if (!data) return <div style={{ padding: 48, color: "#ef4444" }}>Failed to load dashboard</div>;

  const c = data.cards;
  const kpis = [
    { label: "Active Employees",   value: c.active_employees,   color: "#6366f1", icon: "👤" },
    { label: "Present Today",      value: c.present_today,      color: "#10b981", icon: "✅" },
    { label: "Absent Today",       value: c.absent_today,       color: "#ef4444", icon: "❌" },
    { label: "On Leave Today",     value: c.on_leave_today,     color: "#f59e0b", icon: "🌴" },
    { label: "Pending Leave",      value: c.pending_leave,      color: "#f97316", icon: "📋" },
    { label: "Open Positions",     value: c.open_positions,     color: "#3b82f6", icon: "🎯" },
    { label: "Open Onboarding",    value: c.open_onboarding,    color: "#8b5cf6", icon: "🔁" },
    { label: "Pending Appraisals", value: c.pending_appraisals, color: "#ec4899", icon: "⭐" },
    { label: "Monthly Payroll",    value: c.monthly_payroll,    color: "#10b981", icon: "💰" },
    { label: "Pending Expenses",   value: c.pending_expense_amount, color: "#f59e0b", icon: "🧾" },
    { label: "Departments",        value: c.departments,        color: "#6366f1", icon: "🗂️" },
  ];

  return (
    <div>
      <SectionHeader title="HR Dashboard" sub="Organisation-wide snapshot" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        {kpis.map(k => <KPICard key={k.label} {...k} />)}
      </div>
      {data.departments.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#374151", marginBottom: 12 }}>Headcount by Department</h3>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", overflow: "hidden" }}>
            {data.departments.map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderBottom: i < data.departments.length - 1 ? "1px solid #f8fafc" : "none" }}>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#374151" }}>{d.department}</div>
                <div style={{ width: 200, height: 6, background: "#f1f5f9", borderRadius: 3, margin: "0 16px" }}>
                  <div style={{ height: 6, width: `${Math.min(100, (d.count / (c.active_employees || 1)) * 100)}%`, background: "#6366f1", borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#6366f1", width: 30, textAlign: "right" }}>{d.count}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── SECTION: Employees ───────────────────────────────────────────────────────

function EmployeesSection() {
  const [rows, setRows]       = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [status, setStatus]   = useState("Active");
  const [total, setTotal]     = useState(0);
  const [offset, setOffset]   = useState(0);
  const limit = 25;

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ status, limit: String(limit), offset: String(offset) });
    if (search) p.set("search", search);
    apiFetch(`/api/hr/employees?${p}`)
      .then(r => { setRows(r.employees || []); setTotal(r.meta?.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, status, offset]);

  useEffect(() => { load(); }, [load]);

  const cols = [
    { key: "employee_name", label: "Name",        render: (v: unknown, row: Record<string, unknown>) => (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#6366f1" }}>
          {String(v)[0]}
        </div>
        <div>
          <div style={{ fontWeight: 600, color: "var(--navy-ink)" }}>{fmt(v)}</div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmt(row.company_email)}</div>
        </div>
      </div>
    )},
    { key: "department",    label: "Department" },
    { key: "designation",   label: "Designation" },
    { key: "status",        label: "Status", render: (v: unknown) => <Badge label={fmt(v)} /> },
    { key: "date_of_joining", label: "Joined", render: (v: unknown) => fmtDate(String(v || "")) },
    { key: "cell_number",   label: "Phone" },
  ];

  return (
    <div>
      <SectionHeader title="Employees" sub={`${total} total employees`}
        action={<Btn variant="primary">+ New Employee</Btn>} />
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <SearchInput value={search} onChange={s => { setSearch(s); setOffset(0); }} placeholder="Search employees…" />
        <select value={status} onChange={e => { setStatus(e.target.value); setOffset(0); }}
          style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#F9FAFC" }}>
          <option value="all">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Left">Left</option>
        </select>
      </div>
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9" }}>
        <DataTable columns={cols} rows={rows as Record<string, unknown>[]} loading={loading} />
        {total > limit && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid #f1f5f9" }}>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="secondary" onClick={() => setOffset(Math.max(0, offset - limit))}>← Prev</Btn>
              <Btn variant="secondary" onClick={() => setOffset(offset + limit)}>Next →</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SECTION: Attendance ──────────────────────────────────────────────────────

function AttendanceSection() {
  const [rows, setRows]     = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate]     = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("all");
  const [total, setTotal]   = useState(0);

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams({ limit: "50" });
    if (date) p.set("date", date);
    if (status !== "all") p.set("status", status);
    apiFetch(`/api/hr/attendance?${p}`)
      .then(r => { setRows(r.attendance || []); setTotal(r.meta?.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [date, status]);

  const summary = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return counts;
  }, [rows]);

  const cols = [
    { key: "employee_name", label: "Employee" },
    { key: "attendance_date", label: "Date", render: (v: unknown) => fmtDate(String(v || "")) },
    { key: "status", label: "Status", render: (v: unknown) => <Badge label={fmt(v)} /> },
    { key: "in_time", label: "In Time", render: (v: unknown) => fmt(v) },
    { key: "out_time", label: "Out Time", render: (v: unknown) => fmt(v) },
    { key: "working_hours", label: "Hours", render: (v: unknown) => v ? `${Number(v).toFixed(1)}h` : "—" },
    { key: "shift", label: "Shift" },
  ];

  return (
    <div>
      <SectionHeader title="Attendance" sub={`${total} records`} action={<Btn variant="primary">+ Mark Attendance</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[["Present","#10b981"],["Absent","#ef4444"],["On Leave","#f59e0b"],["Half Day","#6366f1"]].map(([s, c]) => (
          <div key={s} style={{ background: "#fff", border: `1px solid ${c}30`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: c as string, fontWeight: 600, textTransform: "uppercase" }}>{s}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--navy-ink)" }}>{summary[s] || 0}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#F9FAFC" }} />
        <select value={status} onChange={e => setStatus(e.target.value)}
          style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#F9FAFC" }}>
          <option value="all">All Status</option>
          <option value="Present">Present</option>
          <option value="Absent">Absent</option>
          <option value="On Leave">On Leave</option>
          <option value="Half Day">Half Day</option>
        </select>
      </div>
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9" }}>
        <DataTable columns={cols} rows={rows as Record<string, unknown>[]} loading={loading} />
      </div>
    </div>
  );
}

// ─── SECTION: Leave ───────────────────────────────────────────────────────────

function LeaveSection() {
  const [rows, setRows]     = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [total, setTotal]   = useState(0);
  const [tab, setTab]       = useState<"requests" | "allocations">("requests");

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ limit: "50" });
    if (status !== "all") p.set("status", status);
    apiFetch(`/api/hr/leave-requests?${p}`)
      .then(r => { setRows(r.leave_requests || []); setTotal(r.meta?.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const cols = [
    { key: "employee_name", label: "Employee" },
    { key: "leave_type",    label: "Leave Type" },
    { key: "from_date",     label: "From",  render: (v: unknown) => fmtDate(String(v || "")) },
    { key: "to_date",       label: "To",    render: (v: unknown) => fmtDate(String(v || "")) },
    { key: "total_leave_days", label: "Days" },
    { key: "status", label: "Status", render: (v: unknown) => <Badge label={fmt(v)} /> },
    { key: "name", label: "Actions", render: (_v: unknown, row: Record<string, unknown>) =>
      row.status === "Open" ? (
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => apiFetch(`/api/hr/leave-requests/${row.name}/approve`, { method: "PUT" }).then(load)}
            style={{ padding: "4px 10px", borderRadius: 6, background: "#d1fae5", color: "#065f46", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            Approve
          </button>
          <button onClick={() => apiFetch(`/api/hr/leave-requests/${row.name}/reject`, { method: "PUT", body: JSON.stringify({}), headers: {"Content-Type":"application/json"} }).then(load)}
            style={{ padding: "4px 10px", borderRadius: 6, background: "#fee2e2", color: "#991b1b", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            Reject
          </button>
        </div>
      ) : null
    },
  ];

  return (
    <div>
      <SectionHeader title="Leave Management" sub={`${total} leave requests`}
        action={<Btn variant="primary">+ New Request</Btn>} />
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#F9FAFC", borderRadius: 8, padding: 4, width: "fit-content" }}>
        {(["requests", "allocations"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "7px 16px", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: tab === t ? "#fff" : "transparent",
              color: tab === t ? "#6366f1" : "#64748b",
              boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>
            {t === "requests" ? "Requests" : "Allocations"}
          </button>
        ))}
      </div>
      {tab === "requests" && (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <select value={status} onChange={e => setStatus(e.target.value)}
              style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#F9FAFC" }}>
              <option value="all">All Status</option>
              <option value="Open">Open</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9" }}>
            <DataTable columns={cols} rows={rows as Record<string, unknown>[]} loading={loading} />
          </div>
        </>
      )}
      {tab === "allocations" && <LeaveAllocationsTab />}
    </div>
  );
}

function LeaveAllocationsTab() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiFetch("/api/hr/leave-allocations?limit=50")
      .then(r => setRows(r.allocations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  const cols = [
    { key: "employee_name", label: "Employee" },
    { key: "leave_type", label: "Leave Type" },
    { key: "new_leaves_allocated", label: "Allocated" },
    { key: "total_leaves_allocated", label: "Total" },
    { key: "from_date", label: "From", render: (v: unknown) => fmtDate(String(v || "")) },
    { key: "to_date",   label: "To",   render: (v: unknown) => fmtDate(String(v || "")) },
    { key: "carry_forward", label: "Carry Fwd", render: (v: unknown) => v ? "Yes" : "No" },
  ];
  return <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9" }}>
    <DataTable columns={cols} rows={rows} loading={loading} />
  </div>;
}

// ─── SECTION: Payroll ─────────────────────────────────────────────────────────

function PayrollSection() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const lastDay  = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [from, setFrom]     = useState(firstDay);
  const [to, setTo]         = useState(lastDay);
  const [data, setData]     = useState<{ slips: SalarySlip[]; totals: Record<string, unknown> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/hr/payroll-summary?from_date=${from}&to_date=${to}`)
      .then(r => setData(r))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [from, to]);

  const cols = [
    { key: "employee_name", label: "Employee" },
    { key: "department", label: "Department" },
    { key: "start_date", label: "Period", render: (v: unknown, row: Record<string, unknown>) =>
      `${fmtDate(String(v || ""))} – ${fmtDate(String(row.end_date || ""))}` },
    { key: "gross_pay", label: "Gross", render: (v: unknown) => `R ${Number(v || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}` },
    { key: "total_deduction", label: "Deductions", render: (v: unknown) => `R ${Number(v || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}` },
    { key: "net_pay", label: "Net Pay", render: (v: unknown) => (
      <span style={{ fontWeight: 700, color: "#10b981" }}>R {Number(v || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</span>
    )},
    { key: "docstatus", label: "Status", render: (v: unknown) =>
      <Badge label={v === 1 ? "Submitted" : v === 2 ? "Cancelled" : "Draft"} /> },
  ];

  const t = data?.totals || {};

  return (
    <div>
      <SectionHeader title="Payroll" sub="Salary slips and payroll runs" />
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <label style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
          From <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#F9FAFC" }} />
        </label>
        <label style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
          To <input type="date" value={to} onChange={e => setTo(e.target.value)}
            style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#F9FAFC" }} />
        </label>
      </div>
      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          <KPICard label="Salary Slips"  value={String(t.count || 0)}        color="#6366f1" icon="📋" />
          <KPICard label="Gross Pay"     value={String(t.gross_pay || "—")}   color="#10b981" icon="💰" />
          <KPICard label="Deductions"    value={String(t.total_deductions || "—")} color="#f59e0b" icon="➖" />
          <KPICard label="Net Pay"       value={String(t.net_pay || "—")}     color="#3b82f6" icon="✅" />
        </div>
      )}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9" }}>
        <DataTable columns={cols} rows={(data?.slips || []) as Record<string, unknown>[]} loading={loading} empty="No salary slips for this period" />
      </div>
    </div>
  );
}

// ─── SECTION: Recruitment ─────────────────────────────────────────────────────

function RecruitmentSection() {
  const [openings, setOpenings]   = useState<JobOpening[]>([]);
  const [applicants, setApplicants] = useState<JobApplicant[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<"openings" | "applicants">("openings");
  const [statusFilter, setStatus] = useState("all");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/hr/job-openings?limit=50"),
      apiFetch("/api/hr/job-applicants?limit=50"),
    ]).then(([o, a]) => {
      setOpenings(o.openings || []);
      setApplicants(a.applicants || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const openingCols = [
    { key: "job_title",    label: "Job Title", render: (v: unknown) => <span style={{ fontWeight: 600, color: "var(--navy-ink)" }}>{fmt(v)}</span> },
    { key: "department",   label: "Department" },
    { key: "designation",  label: "Designation" },
    { key: "no_of_positions", label: "Positions" },
    { key: "expected_compensation", label: "Compensation", render: (v: unknown) => v ? `R ${Number(v).toLocaleString()}` : "—" },
    { key: "closes_on",    label: "Closes", render: (v: unknown) => fmtDate(String(v || "")) },
    { key: "status", label: "Status", render: (v: unknown) => <Badge label={fmt(v)} /> },
  ];

  const applicantCols = [
    { key: "applicant_name", label: "Applicant", render: (v: unknown) => <span style={{ fontWeight: 600 }}>{fmt(v)}</span> },
    { key: "email_id",       label: "Email" },
    { key: "job_title",      label: "Role" },
    { key: "source",         label: "Source" },
    { key: "status", label: "Status", render: (v: unknown) => <Badge label={fmt(v)} /> },
    { key: "creation", label: "Applied", render: (v: unknown) => fmtDate(String(v || "")) },
    { key: "name", label: "Actions", render: (_v: unknown, row: Record<string, unknown>) => (
      <select defaultValue={String(row.status)} onChange={e => {
        apiFetch(`/api/hr/job-applicants/${row.name}`, {
          method: "PUT", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ status: e.target.value }),
        }).then(() => {
          const copy = [...applicants];
          const idx  = copy.findIndex(a => a.name === row.name);
          if (idx >= 0) copy[idx] = { ...copy[idx], status: e.target.value };
          setApplicants(copy);
        });
      }} style={{ padding: "4px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, background: "#F9FAFC" }}>
        {["Open","Replied","Accepted","Rejected","Hold","Interesting"].map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    )},
  ];

  const filteredOpenings   = statusFilter === "all" ? openings   : openings.filter(o => o.status === statusFilter);
  const filteredApplicants = statusFilter === "all" ? applicants : applicants.filter(a => a.status === statusFilter);

  return (
    <div>
      <SectionHeader title="Recruitment" sub={`${openings.length} openings · ${applicants.length} applicants`}
        action={<Btn variant="primary">+ New Opening</Btn>} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 4, background: "#F9FAFC", borderRadius: 8, padding: 4, width: "fit-content" }}>
          {(["openings","applicants"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: "7px 16px", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: tab === t ? "#fff" : "transparent", color: tab === t ? "#6366f1" : "#64748b",
                boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>
              {t === "openings" ? `Openings (${openings.length})` : `Applicants (${applicants.length})`}
            </button>
          ))}
        </div>
        <select value={statusFilter} onChange={e => setStatus(e.target.value)}
          style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#F9FAFC" }}>
          <option value="all">All Status</option>
          {tab === "openings" ? ["Open","Closed","Cancelled"] : ["Open","Replied","Accepted","Rejected","Hold","Interesting"]}
          {tab === "openings"
            ? ["Open","Closed","Cancelled"].map(s => <option key={s}>{s}</option>)
            : ["Open","Replied","Accepted","Rejected","Hold","Interesting"].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9" }}>
        {tab === "openings"
          ? <DataTable columns={openingCols}   rows={filteredOpenings   as Record<string, unknown>[]} loading={loading} empty="No job openings" />
          : <DataTable columns={applicantCols} rows={filteredApplicants as Record<string, unknown>[]} loading={loading} empty="No applicants" />}
      </div>
    </div>
  );
}

// ─── SECTION: Appraisals ──────────────────────────────────────────────────────

function AppraisalsSection() {
  const [rows, setRows]     = useState<Appraisal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/hr/appraisals?limit=50")
      .then(r => setRows(r.appraisals || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cols = [
    { key: "employee_name",   label: "Employee" },
    { key: "department",      label: "Department" },
    { key: "appraisal_cycle", label: "Cycle" },
    { key: "status",          label: "Status", render: (v: unknown) => <Badge label={fmt(v)} /> },
    { key: "total_score",     label: "Score", render: (v: unknown) => v ? `${Number(v).toFixed(1)}%` : "—" },
    { key: "final_score",     label: "Final", render: (v: unknown) => v ? `${Number(v).toFixed(1)}%` : "—" },
  ];

  return (
    <div>
      <SectionHeader title="Appraisals" sub="Performance appraisal cycles" />
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9" }}>
        <DataTable columns={cols} rows={rows as Record<string, unknown>[]} loading={loading} empty="No appraisals found" />
      </div>
    </div>
  );
}

// ─── SECTION: Goals ───────────────────────────────────────────────────────────

function GoalsSection() {
  const [rows, setRows]     = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/hr/goals?limit=50")
      .then(r => setRows(r.goals || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cols = [
    { key: "employee_name", label: "Employee" },
    { key: "title",         label: "Goal",     render: (v: unknown) => <span style={{ fontWeight: 600 }}>{fmt(v)}</span> },
    { key: "goal_type",     label: "Type" },
    { key: "status",        label: "Status",   render: (v: unknown) => <Badge label={fmt(v)} /> },
    { key: "progress",      label: "Progress", render: (v: unknown) => (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 60, height: 4, background: "#f1f5f9", borderRadius: 2 }}>
          <div style={{ height: 4, width: `${Math.min(100, Number(v) || 0)}%`, background: "#6366f1", borderRadius: 2 }} />
        </div>
        <span style={{ fontSize: 11, color: "#64748b" }}>{Number(v) || 0}%</span>
      </div>
    )},
    { key: "end_date", label: "Due", render: (v: unknown) => fmtDate(String(v || "")) },
  ];

  return (
    <div>
      <SectionHeader title="Goals" sub="Employee performance goals" action={<Btn variant="primary">+ New Goal</Btn>} />
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9" }}>
        <DataTable columns={cols} rows={rows} loading={loading} empty="No goals found" />
      </div>
    </div>
  );
}

// ─── SECTION: Training ────────────────────────────────────────────────────────

function TrainingSection() {
  const [events, setEvents]   = useState<TrainingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/hr/training-events?limit=50")
      .then(r => setEvents(r.training_events || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cols = [
    { key: "event_name",      label: "Event",   render: (v: unknown) => <span style={{ fontWeight: 600 }}>{fmt(v)}</span> },
    { key: "training_program", label: "Program" },
    { key: "trainer_name",    label: "Trainer" },
    { key: "location",        label: "Location" },
    { key: "start_time",      label: "Date",    render: (v: unknown) => fmtDate(String(v || "")) },
    { key: "status",          label: "Status",  render: (v: unknown) => v ? <Badge label={fmt(v)} /> : <span style={{ color: "#94a3b8" }}>—</span> },
    { key: "has_certificate", label: "Cert.",   render: (v: unknown) => v ? "✅" : "—" },
  ];

  return (
    <div>
      <SectionHeader title="Training" sub="Training events and programmes" />
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9" }}>
        <DataTable columns={cols} rows={events as Record<string, unknown>[]} loading={loading} empty="No training events" />
      </div>
    </div>
  );
}

// ─── SECTION: Expense Claims ──────────────────────────────────────────────────

function ExpensesSection() {
  const [rows, setRows]     = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ limit: "50" });
    if (status !== "all") p.set("status", status);
    apiFetch(`/api/hr/expense-claims?${p}`)
      .then(r => setRows(r.expense_claims || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const cols = [
    { key: "employee_name",           label: "Employee" },
    { key: "posting_date",            label: "Date",    render: (v: unknown) => fmtDate(String(v || "")) },
    { key: "total_claimed_amount",    label: "Claimed", render: (v: unknown) => `R ${Number(v || 0).toLocaleString()}` },
    { key: "total_sanctioned_amount", label: "Sanctioned", render: (v: unknown) => v ? `R ${Number(v).toLocaleString()}` : "—" },
    { key: "approval_status", label: "Status", render: (v: unknown) => <Badge label={fmt(v)} /> },
    { key: "name", label: "Actions", render: (_v: unknown, row: Record<string, unknown>) =>
      row.approval_status === "Draft" ? (
        <button onClick={() => apiFetch(`/api/hr/expense-claims/${row.name}/approve`, { method: "PUT" }).then(load)}
          style={{ padding: "4px 10px", borderRadius: 6, background: "#d1fae5", color: "#065f46", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          Approve
        </button>
      ) : null
    },
  ];

  return (
    <div>
      <SectionHeader title="Expense Claims" sub="Employee reimbursement requests" action={<Btn variant="primary">+ New Claim</Btn>} />
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <select value={status} onChange={e => setStatus(e.target.value)}
          style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#F9FAFC" }}>
          <option value="all">All Status</option>
          <option value="Draft">Draft</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9" }}>
        <DataTable columns={cols} rows={rows as Record<string, unknown>[]} loading={loading} empty="No expense claims" />
      </div>
    </div>
  );
}

// ─── SECTION: Advances ────────────────────────────────────────────────────────

function AdvancesSection() {
  const [rows, setRows]     = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/hr/employee-advances?limit=50")
      .then(r => setRows(r.employee_advances || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cols = [
    { key: "employee_name",  label: "Employee" },
    { key: "purpose",        label: "Purpose" },
    { key: "posting_date",   label: "Date",     render: (v: unknown) => fmtDate(String(v || "")) },
    { key: "advance_amount", label: "Advance",  render: (v: unknown) => `R ${Number(v || 0).toLocaleString()}` },
    { key: "paid_amount",    label: "Paid",     render: (v: unknown) => `R ${Number(v || 0).toLocaleString()}` },
    { key: "claimed_amount", label: "Claimed",  render: (v: unknown) => `R ${Number(v || 0).toLocaleString()}` },
    { key: "return_amount",  label: "Returned", render: (v: unknown) => `R ${Number(v || 0).toLocaleString()}` },
    { key: "status",         label: "Status",   render: (v: unknown) => <Badge label={fmt(v)} /> },
  ];

  return (
    <div>
      <SectionHeader title="Employee Advances" sub="Salary & travel advances" action={<Btn variant="primary">+ New Advance</Btn>} />
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9" }}>
        <DataTable columns={cols} rows={rows} loading={loading} empty="No advances found" />
      </div>
    </div>
  );
}

// ─── SECTION: Lifecycle ───────────────────────────────────────────────────────

function LifecycleSection() {
  const [tab, setTab] = useState<"onboarding" | "separations" | "promotions" | "transfers">("onboarding");
  const [rows, setRows]     = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const ep: Record<string, string> = {
      onboarding:   "/api/hr/onboardings",
      separations:  "/api/hr/separations",
      promotions:   "/api/hr/promotions",
      transfers:    "/api/hr/transfers",
    };
    apiFetch(`${ep[tab]}?limit=50`)
      .then(r => setRows(Object.values(r).find(v => Array.isArray(v)) as Record<string, unknown>[] || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab]);

  const colMap: Record<string, { key: string; label: string; render?: (v: unknown) => React.ReactNode }[]> = {
    onboarding:  [
      { key: "employee_name", label: "Employee" },
      { key: "department", label: "Department" },
      { key: "designation", label: "Designation" },
      { key: "date_of_joining", label: "Joining Date", render: (v) => fmtDate(String(v || "")) },
      { key: "boarding_status", label: "Status", render: (v) => <Badge label={fmt(v)} /> },
    ],
    separations: [
      { key: "employee_name", label: "Employee" },
      { key: "department", label: "Department" },
      { key: "separation_date", label: "Date", render: (v) => fmtDate(String(v || "")) },
      { key: "boarding_status", label: "Status", render: (v) => <Badge label={fmt(v)} /> },
    ],
    promotions: [
      { key: "employee_name", label: "Employee" },
      { key: "promotion_date", label: "Date", render: (v) => fmtDate(String(v || "")) },
      { key: "docstatus", label: "Status", render: (v) => <Badge label={v === 1 ? "Submitted" : "Draft"} /> },
    ],
    transfers: [
      { key: "employee_name", label: "Employee" },
      { key: "transfer_date", label: "Date", render: (v) => fmtDate(String(v || "")) },
      { key: "docstatus", label: "Status", render: (v) => <Badge label={v === 1 ? "Submitted" : "Draft"} /> },
    ],
  };

  const tabs = ["onboarding","separations","promotions","transfers"] as const;

  return (
    <div>
      <SectionHeader title="Employee Lifecycle" sub="Onboarding, promotions, transfers, separations" />
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#F9FAFC", borderRadius: 8, padding: 4, width: "fit-content", flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "7px 16px", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: tab === t ? "#fff" : "transparent", color: tab === t ? "#6366f1" : "#64748b",
              boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,.08)" : "none",
              textTransform: "capitalize" }}>
            {t}
          </button>
        ))}
      </div>
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9" }}>
        <DataTable columns={colMap[tab]} rows={rows} loading={loading} empty={`No ${tab} records`} />
      </div>
    </div>
  );
}

// ─── SECTION: Shifts ──────────────────────────────────────────────────────────

function ShiftsSection() {
  const [assignments, setAssignments] = useState<Record<string, unknown>[]>([]);
  const [types, setTypes]             = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/hr/shift-assignments?limit=50"),
      apiFetch("/api/hr/shift-types"),
    ]).then(([a, t]) => {
      setAssignments(a.shift_assignments || []);
      setTypes(t.shift_types || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const cols = [
    { key: "employee_name", label: "Employee" },
    { key: "shift_type",    label: "Shift Type" },
    { key: "start_date",    label: "From", render: (v: unknown) => fmtDate(String(v || "")) },
    { key: "end_date",      label: "To",   render: (v: unknown) => fmtDate(String(v || "")) },
    { key: "status",        label: "Status", render: (v: unknown) => <Badge label={fmt(v)} /> },
  ];

  return (
    <div>
      <SectionHeader title="Shift Management" sub={`${types.length} shift types · ${assignments.length} assignments`} action={<Btn variant="primary">+ Assign Shift</Btn>} />
      {types.length > 0 && (
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          {types.map((t: Record<string, unknown>) => (
            <div key={String(t.name)} style={{ background: "#fff", border: "1px solid #e0e7ff", borderRadius: 10, padding: "12px 16px", minWidth: 160 }}>
              <div style={{ fontWeight: 600, color: "var(--navy-ink)", fontSize: 14 }}>{fmt(t.name)}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{fmt(t.start_time)} – {fmt(t.end_time)}</div>
              {Boolean(t.enable_auto_attendance) && <div style={{ fontSize: 11, color: "#10b981", marginTop: 4 }}>Auto Attendance</div>}
            </div>
          ))}
        </div>
      )}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9" }}>
        <DataTable columns={cols} rows={assignments} loading={loading} empty="No shift assignments" />
      </div>
    </div>
  );
}

// ─── SECTION: Fleet ───────────────────────────────────────────────────────────

function FleetSection() {
  const [vehicles, setVehicles] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    apiFetch("/api/hr/vehicles?limit=50")
      .then(r => setVehicles(r.vehicles || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cols = [
    { key: "license_plate", label: "Plate",   render: (v: unknown) => <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#6366f1" }}>{fmt(v)}</span> },
    { key: "make",          label: "Make" },
    { key: "model",         label: "Model" },
    { key: "year",          label: "Year" },
    { key: "fuel_type",     label: "Fuel" },
    { key: "color",         label: "Color" },
    { key: "employee",      label: "Assigned To" },
    { key: "last_odometer", label: "Odometer", render: (v: unknown) => v ? `${Number(v).toLocaleString()} km` : "—" },
  ];

  return (
    <div>
      <SectionHeader title="Fleet Management" sub={`${vehicles.length} vehicles`} />
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9" }}>
        <DataTable columns={cols} rows={vehicles} loading={loading} empty="No vehicles registered" />
      </div>
    </div>
  );
}

// ─── SECTION: Departments ────────────────────────────────────────────────────

function DepartmentsSection() {
  const [depts, setDepts]         = useState<Record<string, unknown>[]>([]);
  const [designations, setDesig]  = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/hr/departments"),
      apiFetch("/api/hr/designations"),
    ]).then(([d, des]) => {
      setDepts(d.departments || []);
      setDesig(des.designations || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <SectionHeader title="Departments & Designations" sub="Organisation structure" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 12 }}>Departments</h3>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9" }}>
            <DataTable
              columns={[
                { key: "department_name", label: "Department" },
                { key: "parent_department", label: "Parent" },
                { key: "is_group", label: "Group", render: (v) => v ? "Yes" : "No" },
              ]}
              rows={depts} loading={loading} empty="No departments" />
          </div>
        </div>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 12 }}>Designations</h3>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9" }}>
            <DataTable
              columns={[{ key: "name", label: "Designation" }]}
              rows={designations} loading={loading} empty="No designations" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SECTION: Interviews ─────────────────────────────────────────────────────

function InterviewsSection() {
  const [rows, setRows]     = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/hr/interviews?limit=50")
      .then(r => setRows(r.interviews || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cols = [
    { key: "applicant_name", label: "Candidate", render: (v: unknown) => <span style={{ fontWeight: 600 }}>{fmt(v)}</span> },
    { key: "interview_round", label: "Round" },
    { key: "interview_type",  label: "Type" },
    { key: "scheduled_on",   label: "Scheduled", render: (v: unknown) => fmtDate(String(v || "")) },
    { key: "expected_average_rating", label: "Exp. Rating" },
    { key: "average_rating", label: "Avg. Rating" },
    { key: "status", label: "Status", render: (v: unknown) => <Badge label={fmt(v)} /> },
  ];

  return (
    <div>
      <SectionHeader title="Interviews" sub="Scheduled interview rounds" action={<Btn variant="primary">+ Schedule Interview</Btn>} />
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9" }}>
        <DataTable columns={cols} rows={rows} loading={loading} empty="No interviews scheduled" />
      </div>
    </div>
  );
}

// ─── MAIN WORKSPACE ───────────────────────────────────────────────────────────

const SECTION_MAP: Record<string, React.ComponentType> = {
  dashboard:   DashboardSection,
  employees:   EmployeesSection,
  orgchart:    OrgChartSection,
  departments: DepartmentsSection,
  attendance:  AttendanceSection,
  shifts:      ShiftsSection,
  leave:       LeaveSection,
  payroll:     PayrollSection,
  recruitment: RecruitmentSection,
  interviews:  InterviewsSection,
  appraisals:  AppraisalsSection,
  goals:       GoalsSection,
  training:    TrainingSection,
  expenses:    ExpensesSection,
  advances:    AdvancesSection,
  lifecycle:   LifecycleSection,
  fleet:       FleetSection,
};

function OrgChartSection() {
  const [nodes, setNodes]   = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/hr/org-chart")
      .then(r => setNodes(r.nodes || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>⏳ Loading org chart…</div>;

  // Build top-level nodes (no reports_to)
  const roots = nodes.filter((n: Record<string, unknown>) => !n.reports_to);

  function NodeCard({ node }: { node: Record<string, unknown> }) {
    const reports = nodes.filter((n: Record<string, unknown>) => n.reports_to === node.name);
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ background: "#fff", border: "2px solid #e0e7ff", borderRadius: 10, padding: "12px 16px", textAlign: "center", minWidth: 140, boxShadow: "0 2px 8px rgba(99,102,241,.08)" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e0e7ff", margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#6366f1" }}>
            {String(node.employee_name || "?")[0]}
          </div>
          <div style={{ fontWeight: 600, fontSize: 12, color: "var(--navy-ink)" }}>{fmt(node.employee_name)}</div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{fmt(node.designation)}</div>
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>{fmt(node.department)}</div>
        </div>
        {reports.length > 0 && (
          <div style={{ display: "flex", gap: 16, marginTop: 24, position: "relative" }}>
            <div style={{ position: "absolute", top: -12, left: "50%", width: 1, height: 12, background: "#e0e7ff" }} />
            {reports.map((r: Record<string, unknown>) => (
              <div key={String(r.name)} style={{ position: "relative" }}>
                <div style={{ position: "absolute", top: -12, left: "50%", width: 1, height: 12, background: "#e0e7ff" }} />
                <NodeCard node={r} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title="Organisational Chart" sub={`${nodes.length} employees`} />
      <div style={{ overflowX: "auto", padding: 24, background: "#F9FAFC", borderRadius: 12, border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap" }}>
          {roots.map((r: Record<string, unknown>) => <NodeCard key={String(r.name)} node={r} />)}
          {!roots.length && <div style={{ color: "#94a3b8", padding: 48 }}>No reporting structure defined</div>}
        </div>
      </div>
    </div>
  );
}

// ─── ROOT COMPONENT ───────────────────────────────────────────────────────────

export default function HrWorkspaceClient() {
  const [active, setActive] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const ActiveSection = SECTION_MAP[active] || DashboardSection;

  // Group nav items
  const groups = useMemo(() => {
    const g: Record<string, typeof NAV> = {};
    NAV.forEach(item => {
      if (!g[item.group]) g[item.group] = [];
      g[item.group].push(item);
    });
    return g;
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 120px)", background: "transparent", fontFamily: "inherit" }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? 240 : 60, transition: "width .2s ease",
        background: "#fff", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "var(--shadow)",
        display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: "20px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {sidebarOpen && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,var(--navy),var(--teal))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontSize: 14 }}>HR</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: 15, color: "var(--navy-ink)" }}>HR Workspace</span>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16, padding: 4 }}>
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        {/* Nav */}
        <div style={{ overflowY: "auto", flex: 1, padding: "12px 8px" }}>
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} style={{ marginBottom: 8 }}>
              {sidebarOpen && (
                <div style={{ fontSize: 10, fontWeight: 700, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.08em", padding: "8px 10px 4px" }}>
                  {group}
                </div>
              )}
              {items.map(item => (
                <button key={item.id} onClick={() => setActive(item.id)}
                  title={!sidebarOpen ? item.label : undefined}
                  style={{
                    width: "100%", display: "flex", alignItems: "center",
                    gap: sidebarOpen ? 10 : 0, justifyContent: sidebarOpen ? "flex-start" : "center",
                    padding: sidebarOpen ? "8px 10px" : "10px",
                    borderRadius: 8, border: "none", cursor: "pointer",
                    background: active === item.id ? "rgba(40,164,134,.10)" : "transparent",
                    color: active === item.id ? "var(--navy)" : "#64748b",
                    fontWeight: active === item.id ? 600 : 400,
                    fontSize: 13, transition: "all .12s", textAlign: "left",
                  }}
                  onMouseEnter={e => { if (active !== item.id) e.currentTarget.style.background = "#f8fafc"; }}
                  onMouseLeave={e => { if (active !== item.id) e.currentTarget.style.background = "transparent"; }}>
                  <span style={{ fontSize: 15 }}>{item.icon}</span>
                  {sidebarOpen && item.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 32 }}>
        <ActiveSection />
      </div>
    </div>
  );
}
