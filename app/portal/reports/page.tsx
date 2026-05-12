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

function StatCard({ label, value, hint, icon }: { label: string; value: string | number; hint: string; icon: string }) {
  return (
    <div className="demo-stat-card">
      <div className="demo-stat-top">
        <div>
          <div className="demo-stat-label">{label}</div>
          <div className="demo-stat-value">{value}</div>
          <div className="demo-stat-hint">{hint}</div>
        </div>
        <div className="demo-stat-icon">{icon}</div>
      </div>
    </div>
  );
}

const skeletonStyle: React.CSSProperties = { background: "var(--demo-soft)", borderRadius: 8 };

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "finance" | "customers" | "operations">("overview");

  useEffect(() => {
    fetch("/api/portal/reports")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="demo-workspace animate-fade-up">
        <div className="demo-module-titlebar"><div><h1>Insights</h1><p>Loading analytics…</p></div></div>
        <div className="demo-stat-grid">
          {[1,2,3,4].map((i) => (
            <div key={i} className="demo-stat-card">
              <div style={{ ...skeletonStyle, height: 12, width: "60%", marginBottom: 10 }} />
              <div style={{ ...skeletonStyle, height: 30, width: "80%", marginBottom: 6 }} />
              <div style={{ ...skeletonStyle, height: 10, width: "50%" }} />
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          {[1,2,3,4].map((i) => (
            <div key={i} className="demo-panel" style={{ height: 280 }}>
              <div className="demo-panel-head"><div style={{ ...skeletonStyle, height: 14, width: 160 }} /></div>
              <div style={{ padding: 20 }}><div style={{ ...skeletonStyle, height: 200 }} /></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="demo-workspace animate-fade-up">
        <div className="demo-module-titlebar"><div><h1>Insights</h1><p>Business analytics and insights</p></div></div>
        <div className="demo-panel" style={{ textAlign: "center", padding: "56px 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <h3 style={{ color: "var(--demo-text)", fontSize: 20, fontWeight: 900, margin: "0 0 8px" }}>No report data yet</h3>
          <p style={{ color: "var(--demo-muted)", fontSize: 14, maxWidth: 440, margin: "0 auto" }}>
            Analytics appear once your workspace has invoices, payments, tasks and customers.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24 }}>
            <a href="/portal/invoices" className="btn btn-teal">Create Invoice</a>
            <a href="/portal/customers" className="btn">Add Customer</a>
          </div>
        </div>
      </div>
    );
  }

  const totalRevenue = data.invoicesByMonth.reduce((s, r) => s + r.total, 0);
  const totalPayments = data.paymentsByMonth.reduce((s, r) => s + r.total, 0);
  const totalInvoices = data.invoicesByMonth.reduce((s, r) => s + r.count, 0);

  const tt = {
    contentStyle: {
      background: "var(--demo-card)",
      border: "1px solid var(--demo-line)",
      borderRadius: 12,
      boxShadow: "0 8px 24px rgba(22,26,45,.12)",
      fontSize: 12,
      color: "var(--demo-text)",
    },
    cursor: { fill: "var(--demo-soft)" },
  };

  return (
    <div className="demo-workspace animate-fade-up">
      {/* Header */}
      <div className="demo-module-titlebar">
        <div>
          <h1>Insights</h1>
          <p>Business analytics and financial insights across all modules</p>
        </div>
        <div className="demo-module-actions">
          <button className="btn">Export</button>
          <button className="btn btn-teal">Print</button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="demo-stat-grid">
        <StatCard label="Total Revenue" value={money(totalRevenue)} hint="From all invoices" icon="₊" />
        <StatCard label="Payments Received" value={money(totalPayments)} hint="Cleared payments" icon="✓" />
        <StatCard label="Invoices Issued" value={totalInvoices} hint="Across all periods" icon="⚡" />
        <StatCard label="Top Customers" value={data.topCustomers.length} hint="By invoice value" icon="★" />
      </div>

      {/* Tabbed chart panel */}
      <div className="demo-panel">
        {/* Tab bar */}
        <div style={{ padding: "14px 18px 0", borderBottom: "1px solid var(--demo-line)" }}>
          <div className="demo-tabbar" style={{ padding: 0, marginBottom: -1 }}>
            {(["overview","finance","customers","operations"] as const).map((tab) => (
              <button
                key={tab}
                className={activeTab === tab ? "active" : ""}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "overview" ? "📊 Overview" : tab === "finance" ? "💰 Finance" : tab === "customers" ? "👥 Customers" : "⚙️ Operations"}
              </button>
            ))}
          </div>
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            <div style={{ padding: "20px 20px 24px", borderRight: "1px solid var(--demo-line)" }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "var(--demo-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>Revenue Trend</div>
              <div style={{ height: 230 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.invoicesByMonth} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--demo-line)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--demo-muted)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--demo-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R${(v/1000).toFixed(0)}k`} />
                    <Tooltip {...tt} formatter={(v: number) => [money(v), "Revenue"]} />
                    <Bar dataKey="total" fill="#28a486" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{ padding: "20px 20px 24px" }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "var(--demo-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>Payments Received</div>
              <div style={{ height: 230 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.paymentsByMonth} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--demo-line)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--demo-muted)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--demo-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R${(v/1000).toFixed(0)}k`} />
                    <Tooltip {...tt} formatter={(v: number) => [money(v), "Payments"]} />
                    <Line type="monotone" dataKey="total" stroke="#242048" strokeWidth={2.5} dot={{ r: 4, fill: "#242048" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Finance */}
        {activeTab === "finance" && (
          <div style={{ padding: "20px 20px 24px" }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: "var(--demo-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>Revenue & Invoice Count by Month</div>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.invoicesByMonth} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--demo-line)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--demo-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--demo-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R${(v/1000).toFixed(0)}k`} />
                  <Tooltip {...tt} formatter={(v: number, n: string) => n === "total" ? [money(v), "Revenue"] : [v, "Invoices"]} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "var(--demo-muted)" }} />
                  <Bar dataKey="total" fill="#28a486" radius={[6,6,0,0]} name="Revenue" />
                  <Bar dataKey="count" fill="rgba(36,32,72,0.25)" radius={[6,6,0,0]} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Customers */}
        {activeTab === "customers" && (
          <div>
            {data.topCustomers.length > 0 ? (
              <table className="demo-table">
                <thead>
                  <tr><th style={{ width: 48 }}>#</th><th>Customer</th><th>Total Invoiced</th><th>Revenue Share</th></tr>
                </thead>
                <tbody>
                  {data.topCustomers.map((c, idx) => {
                    const grand = data.topCustomers.reduce((s, x) => s + x.total, 0);
                    const pct = grand > 0 ? ((c.total / grand) * 100).toFixed(1) : "0";
                    return (
                      <tr key={c.name}>
                        <td style={{ color: "var(--demo-muted)", fontSize: 12, fontWeight: 900 }}>{idx + 1}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 10, background: COLORS[idx % COLORS.length], color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 900, flexShrink: 0 }}>
                              {c.name.slice(0,2).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 800 }}>{c.name}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 800 }}>{money(c.total)}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ flex: 1, height: 7, background: "var(--demo-soft)", borderRadius: 4, overflow: "hidden", maxWidth: 120 }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#28a486,#2E6BE5)", borderRadius: 4 }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--demo-muted)" }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="crud-empty" style={{ padding: 40 }}>
                <b>No customer data yet</b>
                <span>Add customers and invoices to see their analytics here.</span>
              </div>
            )}
          </div>
        )}

        {/* Operations */}
        {activeTab === "operations" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            <div style={{ padding: "20px 20px 24px", borderRight: "1px solid var(--demo-line)" }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "var(--demo-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>Tasks by Status</div>
              <div style={{ height: 230 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.tasksByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={85} innerRadius={42}>
                      {data.tasksByStatus.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <Tooltip {...tt} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--demo-muted)" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{ padding: "20px 20px 24px" }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "var(--demo-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>Support Tickets by Status</div>
              <div style={{ height: 230 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.supportByStatus} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--demo-line)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "var(--demo-muted)" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="status" tick={{ fontSize: 11, fill: "var(--demo-muted)" }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip {...tt} />
                    <Bar dataKey="count" fill="#242048" radius={[0,6,6,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Customer group breakdown (overview only) */}
      {activeTab === "overview" && data.customersByGroup.length > 0 && (
        <div className="demo-panel">
          <div className="demo-panel-head">
            <div><h3>Customers by Group</h3><p>Breakdown of your customer segments</p></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, padding: 18 }}>
            {data.customersByGroup.map((g, idx) => (
              <div key={g.group} className="crud-stage-card" style={{ gap: 6 }}>
                <span>{g.group || "Ungrouped"}</span>
                <b style={{ color: COLORS[idx % COLORS.length], fontSize: 28 }}>{g.count}</b>
                <span>customers</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
