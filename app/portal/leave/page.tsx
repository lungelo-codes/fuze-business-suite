"use client";
import { useState, useEffect } from "react";
import SearchTable, { StatusBadge } from "@/components/SearchTable";

interface LeaveApplication {
  name: string;
  employee?: string;
  employee_name?: string;
  leave_type?: string;
  from_date?: string;
  to_date?: string;
  total_leave_days?: number;
  status?: string;
  description?: string;
  posting_date?: string;
  [key: string]: unknown;
}

interface LeaveAllocation {
  name: string;
  employee?: string;
  employee_name?: string;
  leave_type?: string;
  from_date?: string;
  to_date?: string;
  new_leaves_allocated?: number;
  total_leaves_allocated?: number;
  [key: string]: unknown;
}

export default function LeavePage() {
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [allocations, setAllocations] = useState<LeaveAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"applications" | "allocations">("applications");

  useEffect(() => {
    async function load() {
      try {
        const [appRes, allocRes] = await Promise.all([
          fetch("/api/portal/leave/applications"),
          fetch("/api/portal/leave/allocations"),
        ]);
        if (appRes.ok) setApplications(await appRes.json());
        if (allocRes.ok) setAllocations(await allocRes.json());
      } catch {
        // silently fail — tables will show empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const approved = applications.filter((a) => a.status === "Approved").length;
  const pending = applications.filter((a) => a.status === "Open" || a.status === "Pending").length;
  const rejected = applications.filter((a) => a.status === "Rejected").length;
  const totalDays = applications
    .filter((a) => a.status === "Approved")
    .reduce((s, a) => s + (a.total_leave_days ?? 0), 0);

  if (loading) {
    return (
      <div>
        <div className="page-head">
          <div>
            <h1 className="page-title">Leave</h1>
            <div className="page-sub">Loading leave records…</div>
          </div>
        </div>
        <div className="kpi-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="kpi" style={{ minHeight: 100 }}>
              <div className="sk-block" style={{ width: 60, height: 10, marginBottom: 8 }} />
              <div className="sk-block" style={{ width: 80, height: 26 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Leave Management</h1>
          <div className="page-sub">{applications.length} leave applications from ERPNext</div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi teal">
          <div className="ic-wrap">🏖️</div>
          <div className="label">Total Applications</div>
          <div className="val">{applications.length}</div>
        </div>
        <div className="kpi">
          <div className="ic-wrap">✓</div>
          <div className="label">Approved</div>
          <div className="val">{approved}</div>
        </div>
        <div className="kpi warn">
          <div className="ic-wrap">⏳</div>
          <div className="label">Pending</div>
          <div className="val">{pending}</div>
        </div>
        <div className="kpi">
          <div className="ic-wrap">📅</div>
          <div className="label">Approved Days</div>
          <div className="val">{totalDays}</div>
          <div className="hint">{rejected} rejected</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 18, borderBottom: "2px solid var(--line)" }}>
        {(["applications", "allocations"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "10px 20px",
              fontWeight: 700,
              fontSize: 13,
              background: "none",
              border: "none",
              borderBottom: tab === t ? "2px solid var(--navy)" : "2px solid transparent",
              color: tab === t ? "var(--navy-ink)" : "var(--muted)",
              cursor: "pointer",
              marginBottom: -2,
              textTransform: "capitalize",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "applications" && (
        <div className="card">
          <div className="card-head"><h3>Leave Applications</h3></div>
          <div className="card-body">
            <SearchTable
              data={applications}
              pageSize={25}
              searchPlaceholder="Search by employee, leave type…"
              columns={[
                {
                  key: "employee_name",
                  label: "Employee",
                  render: (row) => (
                    <span style={{ fontWeight: 600, color: "var(--navy-ink)" }}>
                      {(row as LeaveApplication).employee_name || (row as LeaveApplication).employee || row.name}
                    </span>
                  ),
                },
                { key: "leave_type", label: "Leave Type" },
                {
                  key: "from_date",
                  label: "From",
                  render: (row) => (
                    <span style={{ fontSize: 12 }}>
                      {String((row as LeaveApplication).from_date || "").split(" ")[0] || "—"}
                    </span>
                  ),
                },
                {
                  key: "to_date",
                  label: "To",
                  render: (row) => (
                    <span style={{ fontSize: 12 }}>
                      {String((row as LeaveApplication).to_date || "").split(" ")[0] || "—"}
                    </span>
                  ),
                },
                {
                  key: "total_leave_days",
                  label: "Days",
                  render: (row) => (
                    <span style={{ fontWeight: 600 }}>
                      {(row as LeaveApplication).total_leave_days ?? "—"}
                    </span>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (row) => <StatusBadge status={(row as LeaveApplication).status} />,
                },
              ]}
              empty="No leave applications found in ERPNext"
            />
          </div>
        </div>
      )}

      {tab === "allocations" && (
        <div className="card">
          <div className="card-head"><h3>Leave Allocations</h3></div>
          <div className="card-body">
            <SearchTable
              data={allocations}
              pageSize={25}
              searchPlaceholder="Search by employee, leave type…"
              columns={[
                {
                  key: "employee_name",
                  label: "Employee",
                  render: (row) => (
                    <span style={{ fontWeight: 600, color: "var(--navy-ink)" }}>
                      {(row as LeaveAllocation).employee_name || (row as LeaveAllocation).employee || row.name}
                    </span>
                  ),
                },
                { key: "leave_type", label: "Leave Type" },
                {
                  key: "from_date",
                  label: "Period From",
                  render: (row) => (
                    <span style={{ fontSize: 12 }}>
                      {String((row as LeaveAllocation).from_date || "").split(" ")[0] || "—"}
                    </span>
                  ),
                },
                {
                  key: "to_date",
                  label: "Period To",
                  render: (row) => (
                    <span style={{ fontSize: 12 }}>
                      {String((row as LeaveAllocation).to_date || "").split(" ")[0] || "—"}
                    </span>
                  ),
                },
                {
                  key: "new_leaves_allocated",
                  label: "Allocated",
                  render: (row) => (
                    <span style={{ fontWeight: 600 }}>
                      {(row as LeaveAllocation).new_leaves_allocated ?? "—"}
                    </span>
                  ),
                },
                {
                  key: "total_leaves_allocated",
                  label: "Total",
                  render: (row) => (
                    <span style={{ fontWeight: 600, color: "var(--teal)" }}>
                      {(row as LeaveAllocation).total_leaves_allocated ?? "—"}
                    </span>
                  ),
                },
              ]}
              empty="No leave allocations found in ERPNext"
            />
          </div>
        </div>
      )}
    </div>
  );
}
