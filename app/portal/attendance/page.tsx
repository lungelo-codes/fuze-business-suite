"use client";
import { useState, useEffect } from "react";
import SearchTable, { StatusBadge } from "@/components/SearchTable";

interface AttendanceRecord {
  name: string;
  employee?: string;
  employee_name?: string;
  attendance_date?: string;
  status?: string;
  in_time?: string;
  out_time?: string;
  working_hours?: number;
  late_entry?: number;
  early_exit?: number;
  company?: string;
  modified?: string;
  [key: string]: unknown;
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/attendance")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setRecords(Array.isArray(d) ? d : []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, []);

  const present = records.filter((r) => r.status === "Present").length;
  const absent = records.filter((r) => r.status === "Absent").length;
  const halfDay = records.filter((r) => r.status === "Half Day").length;
  const lateEntries = records.filter((r) => Number(r.late_entry) === 1).length;

  if (loading) {
    return (
      <div>
        <div className="page-head">
          <div>
            <h1 className="page-title">Attendance</h1>
            <div className="page-sub">Loading attendance records…</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Attendance</h1>
          <div className="page-sub">{records.length} attendance records from ERPNext</div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi teal">
          <div className="ic-wrap">📋</div>
          <div className="label">Total Records</div>
          <div className="val">{records.length}</div>
        </div>
        <div className="kpi">
          <div className="ic-wrap">✓</div>
          <div className="label">Present</div>
          <div className="val">{present}</div>
        </div>
        <div className="kpi warn">
          <div className="ic-wrap">✗</div>
          <div className="label">Absent</div>
          <div className="val">{absent}</div>
        </div>
        <div className="kpi">
          <div className="ic-wrap">½</div>
          <div className="label">Half Day</div>
          <div className="val">{halfDay}</div>
          <div className="hint">{lateEntries} late entries</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Attendance Records</h3></div>
        <div className="card-body">
          <SearchTable
            data={records}
            pageSize={25}
            searchPlaceholder="Search by employee name, date…"
            columns={[
              {
                key: "employee_name",
                label: "Employee",
                render: (row) => (
                  <span style={{ fontWeight: 600, color: "var(--navy-ink)" }}>
                    {(row as AttendanceRecord).employee_name || (row as AttendanceRecord).employee || row.name}
                  </span>
                ),
              },
              {
                key: "attendance_date",
                label: "Date",
                render: (row) => (
                  <span style={{ fontSize: 13 }}>
                    {String((row as AttendanceRecord).attendance_date || "").split(" ")[0] || "—"}
                  </span>
                ),
              },
              {
                key: "status",
                label: "Status",
                render: (row) => <StatusBadge status={(row as AttendanceRecord).status} />,
              },
              {
                key: "in_time",
                label: "In Time",
                render: (row) => (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {(row as AttendanceRecord).in_time
                      ? String((row as AttendanceRecord).in_time).split(" ")[1] || String((row as AttendanceRecord).in_time)
                      : "—"}
                  </span>
                ),
              },
              {
                key: "out_time",
                label: "Out Time",
                render: (row) => (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {(row as AttendanceRecord).out_time
                      ? String((row as AttendanceRecord).out_time).split(" ")[1] || String((row as AttendanceRecord).out_time)
                      : "—"}
                  </span>
                ),
              },
              {
                key: "working_hours",
                label: "Hours",
                render: (row) => {
                  const h = (row as AttendanceRecord).working_hours;
                  return <span style={{ fontWeight: 600 }}>{h != null ? `${h}h` : "—"}</span>;
                },
              },
              {
                key: "late_entry",
                label: "Late",
                render: (row) =>
                  Number((row as AttendanceRecord).late_entry) === 1 ? (
                    <span className="chip warn" style={{ fontSize: 11 }}>Late</span>
                  ) : (
                    <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
                  ),
              },
            ]}
            empty="No attendance records found in ERPNext"
          />
        </div>
      </div>
    </div>
  );
}
