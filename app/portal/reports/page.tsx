"use client";
import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

interface ReportData {
  invoicesByMonth: { month: string; total: number; count: number }[];
  paymentsByMonth: { month: string; total: number }[];
  customersByGroup: { group: string; count: number }[];
  tasksByStatus: { status: string; count: number }[];
  topCustomers: { name: string; total: number }[];
  supportByStatus: { status: string; count: number }[];
}

const COLORS = ["#28A486", "#242048", "#F59E0B", "#EF4444", "#6366F1", "#EC4899"];

function money(v: number) {
  return `R ${v.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/reports")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <div className="page-head">
          <div>
            <h1 className="page-title">Reports</h1>
            <div className="page-sub">Loading report data…</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card" style={{ height: 280 }}>
              <div className="card-head">
                <div className="sk-block" style={{ width: 160, height: 16 }} />
              </div>
              <div className="card-body" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="sk-block" style={{ width: "90%", height: 200 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <div className="page-head">
          <div>
            <h1 className="page-title">Reports</h1>
            <div className="page-sub">Business analytics from ERPNext</div>
          </div>
        </div>
        <div className="card card-pad" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
          <h3 style={{ color: "var(--navy-ink)", marginBottom: 8 }}>No report data available</h3>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>
            Report data will appear once your ERPNext instance has transactions. Check back after adding invoices, payments, and customers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Reports</h1>
          <div className="page-sub">Business analytics from your ERPNext data</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        {/* Revenue by month */}
        <div className="card">
          <div className="card-head"><h3>Revenue by Month</h3></div>
          <div className="card-body" style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.invoicesByMonth} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => money(v)} />
                <Bar dataKey="total" fill="var(--teal)" radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payments by month */}
        <div className="card">
          <div className="card-head"><h3>Payments Received by Month</h3></div>
          <div className="card-body" style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.paymentsByMonth} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => money(v)} />
                <Line type="monotone" dataKey="total" stroke="var(--navy)" strokeWidth={2} dot={{ r: 4 }} name="Payments" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tasks by status */}
        <div className="card">
          <div className="card-head"><h3>Tasks by Status</h3></div>
          <div className="card-body" style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.tasksByStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ status, count }) => `${status}: ${count}`}
                  labelLine={false}
                >
                  {data.tasksByStatus.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Support by status */}
        <div className="card">
          <div className="card-head"><h3>Support Tickets by Status</h3></div>
          <div className="card-body" style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.supportByStatus} layout="vertical" margin={{ top: 4, right: 16, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="status" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--navy)" radius={[0, 4, 4, 0]} name="Tickets" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top customers table */}
      {data.topCustomers.length > 0 && (
        <div className="card">
          <div className="card-head"><h3>Top Customers by Invoice Value</h3></div>
          <div className="card-body">
            <table className="data">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Total Invoiced</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {data.topCustomers.map((c, idx) => {
                  const grandTotal = data.topCustomers.reduce((s, x) => s + x.total, 0);
                  const pct = grandTotal > 0 ? ((c.total / grandTotal) * 100).toFixed(1) : "0";
                  return (
                    <tr key={c.name}>
                      <td style={{ color: "var(--muted)", fontSize: 12 }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600, color: "var(--navy-ink)" }}>{c.name}</td>
                      <td style={{ fontWeight: 700 }}>{money(c.total)}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 80, height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: "var(--teal)", borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 12, color: "var(--muted)" }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
