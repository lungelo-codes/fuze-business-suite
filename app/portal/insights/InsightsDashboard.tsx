"use client";
import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";
import { format, parseISO, subMonths, startOfMonth } from "date-fns";

type Row = Record<string, unknown>;

interface Props {
  invoices: Row[]; payments: Row[]; customers: Row[];
  salesOrders: Row[]; purchaseOrders: Row[];
  employees: Row[]; salarySlips: Row[];
  tasks: Row[]; issues: Row[];
  leads: Row[]; opportunities: Row[];
  expenseClaims: Row[]; jobApplicants: Row[];
  insightsQueries: Row[]; insightsDashboards: Row[];
  insightsSources: Row[]; insightsCharts: Row[];
}

const PALETTE = ["#28A486","#2E6BE5","#F59E0B","#EF4444","#6366F1","#EC4899","#14B8A6","#8B5CF6"];

function money(v: number) {
  return `R ${v.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getMonth(dateStr?: unknown): string {
  if (!dateStr) return "";
  try { return format(parseISO(String(dateStr).split(" ")[0]), "MMM yy"); } catch { return ""; }
}

function kpiCard(label: string, value: string | number, sub: string, color = "#28A486") {
  return (
    <div key={label} style={{ background: "var(--demo-card)", border: "1px solid var(--demo-line)", borderRadius: 16, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--demo-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--demo-muted)" }}>{sub}</div>
    </div>
  );
}

const tt = {
  contentStyle: { background: "var(--demo-card)", border: "1px solid var(--demo-line)", borderRadius: 10, fontSize: 12, color: "var(--demo-text)" },
  cursor: { fill: "rgba(40,164,134,.08)" },
};

type Tab = "overview" | "finance" | "crm" | "operations" | "hr" | "sources";

export default function InsightsDashboard(p: Props) {
  const [tab, setTab] = useState<Tab>("overview");

  // ---------- derived data ----------
  const last12months = useMemo(() => {
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) months.push(format(subMonths(startOfMonth(new Date()), i), "MMM yy"));
    return months;
  }, []);

  const revenueByMonth = useMemo(() => {
    const map: Record<string, { revenue: number; count: number; collected: number }> = {};
    last12months.forEach((m) => { map[m] = { revenue: 0, count: 0, collected: 0 }; });
    for (const inv of p.invoices) {
      const m = getMonth(inv.posting_date);
      if (map[m]) { map[m].revenue += Number(inv.grand_total || 0); map[m].count += 1; }
    }
    for (const pay of p.payments) {
      const m = getMonth(pay.posting_date);
      if (map[m]) map[m].collected += Number(pay.paid_amount || 0);
    }
    return last12months.map((month) => ({ month, ...map[month] }));
  }, [p.invoices, p.payments, last12months]);

  const outstandingTotal = p.invoices.reduce((s, inv) => s + Number(inv.outstanding_amount || 0), 0);
  const totalRevenue = p.invoices.reduce((s, inv) => s + Number(inv.grand_total || 0), 0);
  const totalCollected = p.payments.filter((pay) => pay.payment_type === "Receive").reduce((s, pay) => s + Number(pay.paid_amount || 0), 0);
  const collectionRate = totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0;

  const customersByGroup = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of p.customers) { const g = String(c.customer_group || "Other"); map[g] = (map[g] ?? 0) + 1; }
    return Object.entries(map).sort((a,b) => b[1]-a[1]).map(([group, count]) => ({ group, count }));
  }, [p.customers]);

  const topCustomers = useMemo(() => {
    const map: Record<string, number> = {};
    for (const inv of p.invoices) { if (inv.customer) map[String(inv.customer)] = (map[String(inv.customer)] ?? 0) + Number(inv.grand_total || 0); }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, total]) => ({ name, total }));
  }, [p.invoices]);

  const crmFunnel = useMemo(() => [
    { stage: "Leads", count: p.leads.length },
    { stage: "Opportunities", count: p.opportunities.length },
    { stage: "Quotes", count: 0 },
    { stage: "Sales Orders", count: p.salesOrders.length },
    { stage: "Invoiced", count: p.invoices.length },
  ], [p.leads, p.opportunities, p.salesOrders, p.invoices]);

  const pipelineValue = p.opportunities.reduce((s, o) => s + Number(o.opportunity_amount || 0), 0);

  const tasksByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of p.tasks) { const s = String(t.status || "Unknown"); map[s] = (map[s] ?? 0) + 1; }
    return Object.entries(map).map(([status, count]) => ({ status, count }));
  }, [p.tasks]);

  const issuesByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    for (const i of p.issues) { const s = String(i.status || "Unknown"); map[s] = (map[s] ?? 0) + 1; }
    return Object.entries(map).map(([status, count]) => ({ status, count }));
  }, [p.issues]);

  const activeEmployees = p.employees.filter((e) => String(e.status || "").toLowerCase() === "active").length;
  const deptMap: Record<string, number> = {};
  for (const e of p.employees) { const d = String(e.department || "Other"); deptMap[d] = (deptMap[d] ?? 0) + 1; }
  const byDept = Object.entries(deptMap).sort((a,b) => b[1]-a[1]).slice(0,8).map(([dept, count]) => ({ dept, count }));
  const totalPayroll = p.salarySlips.filter((s) => Number(s.docstatus) === 1).reduce((s, slip) => s + Number(slip.net_pay || 0), 0);
  const totalExpenseClaimed = p.expenseClaims.reduce((s, e) => s + Number(e.total_claimed_amount || 0), 0);

  const insightsInstalled = p.insightsQueries.length > 0 || p.insightsDashboards.length > 0 || p.insightsSources.length > 0;

  // ---------- tab content ----------
  const tabs: { id: Tab; label: string; emoji: string }[] = [
    { id: "overview",    label: "Overview",    emoji: "📊" },
    { id: "finance",     label: "Finance",     emoji: "💰" },
    { id: "crm",         label: "CRM",         emoji: "📌" },
    { id: "operations",  label: "Operations",  emoji: "⚙️" },
    { id: "hr",          label: "People & HR", emoji: "👥" },
    { id: "sources",     label: "Data Sources", emoji: "🗄️" },
  ];

  const panelHead = (title: string, sub: string) => (
    <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--demo-line)" }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--demo-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{sub}</div>
      <div style={{ fontSize: 14, fontWeight: 900, color: "var(--demo-text)", marginTop: 2 }}>{title}</div>
    </div>
  );

  return (
    <div className="demo-workspace animate-fade-up">
      {/* Header */}
      <div className="demo-module-titlebar">
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, color: "#28A486", textTransform: "uppercase", letterSpacing: "0.14em", margin: "0 0 4px" }}>Analytics Workspace · Frappe Insights</p>
          <h1 style={{ margin: 0 }}>Insights</h1>
          <p style={{ margin: "4px 0 0", color: "var(--demo-muted)", fontSize: 13 }}>
            Connect data, build queries, visualise revenue · payables · churn · HR · operations across the business
          </p>
        </div>
        <div className="demo-module-actions">
          <a href="/portal/reports" className="btn">Reports</a>
          <a href="/portal/finance" className="btn btn-teal">Finance KPIs</a>
        </div>
      </div>

      {/* Tab bar */}
      <div className="demo-panel" style={{ padding: 0 }}>
        <div className="demo-tabbar" style={{ padding: "0 18px", borderBottom: "1px solid var(--demo-line)", marginBottom: 0 }}>
          {tabs.map((t) => (
            <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)} style={{ padding: "14px 12px" }}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
              {kpiCard("Total Revenue", money(totalRevenue), `${p.invoices.length} invoices`, "#28A486")}
              {kpiCard("Collected", money(totalCollected), `${collectionRate}% collection rate`, "#2E6BE5")}
              {kpiCard("Outstanding", money(outstandingTotal), "Unpaid invoices", "#F59E0B")}
              {kpiCard("Customers", p.customers.length, `${p.leads.length} leads in pipeline`, "#6366F1")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
              <div style={{ background: "var(--demo-card)", border: "1px solid var(--demo-line)", borderRadius: 14 }}>
                {panelHead("Revenue vs Collections (12 months)", "Financial Trend")}
                <div style={{ padding: "16px 20px 20px", height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueByMonth} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#28A486" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#28A486" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="gCol" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2E6BE5" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#2E6BE5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--demo-line)" vertical={false}/>
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--demo-muted)" }} axisLine={false} tickLine={false}/>
                      <YAxis tick={{ fontSize: 11, fill: "var(--demo-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R${(v/1000).toFixed(0)}k`}/>
                      <Tooltip {...tt} formatter={(v: number, n: string) => [money(v), n === "revenue" ? "Invoiced" : "Collected"]}/>
                      <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: "var(--demo-muted)" }}/>
                      <Area type="monotone" dataKey="revenue" stroke="#28A486" strokeWidth={2} fill="url(#gRev)" name="revenue"/>
                      <Area type="monotone" dataKey="collected" stroke="#2E6BE5" strokeWidth={2} fill="url(#gCol)" name="collected"/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ background: "var(--demo-card)", border: "1px solid var(--demo-line)", borderRadius: 14 }}>
                {panelHead("Customers by Group", "Segments")}
                <div style={{ padding: "16px 20px 20px", height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={customersByGroup.length ? customersByGroup : [{ group: "No data", count: 1 }]} dataKey="count" nameKey="group" cx="50%" cy="50%" outerRadius={80} innerRadius={38}>
                        {(customersByGroup.length ? customersByGroup : [{ group: "No data", count: 1 }]).map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]}/>)}
                      </Pie>
                      <Tooltip {...tt}/>
                      <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: "var(--demo-muted)" }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
              {kpiCard("Active Employees", activeEmployees, `${p.employees.length} total`, "#14B8A6")}
              {kpiCard("Open Opportunities", p.opportunities.filter((o) => o.status === "Open").length, money(pipelineValue) + " pipeline", "#8B5CF6")}
              {kpiCard("Open Tasks", p.tasks.filter((t) => t.status === "Open").length, `${p.tasks.length} total tasks`, "#F59E0B")}
              {kpiCard("Support Issues", p.issues.filter((i) => i.status === "Open").length, "Open support tickets", "#EF4444")}
            </div>
          </div>
        )}

        {/* ── FINANCE ── */}
        {tab === "finance" && (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
              {kpiCard("Total Invoiced", money(totalRevenue), `${p.invoices.length} invoices`)}
              {kpiCard("Collected", money(totalCollected), `${collectionRate}% rate`, "#2E6BE5")}
              {kpiCard("Outstanding", money(outstandingTotal), "Unpaid balance", "#F59E0B")}
              {kpiCard("Avg Invoice", money(p.invoices.length ? totalRevenue / p.invoices.length : 0), "Per invoice", "#6366F1")}
            </div>
            <div style={{ background: "var(--demo-card)", border: "1px solid var(--demo-line)", borderRadius: 14 }}>
              {panelHead("Monthly Invoiced vs Collected", "Revenue Analysis")}
              <div style={{ padding: "16px 20px 20px", height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByMonth} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--demo-line)" vertical={false}/>
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--demo-muted)" }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize: 11, fill: "var(--demo-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R${(v/1000).toFixed(0)}k`}/>
                    <Tooltip {...tt} formatter={(v: number, n: string) => [money(v), n === "revenue" ? "Invoiced" : "Collected"]}/>
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: "var(--demo-muted)" }}/>
                    <Bar dataKey="revenue" name="Invoiced" fill="#28A486" radius={[5,5,0,0]}/>
                    <Bar dataKey="collected" name="Collected" fill="#2E6BE5" radius={[5,5,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{ background: "var(--demo-card)", border: "1px solid var(--demo-line)", borderRadius: 14 }}>
              {panelHead("Top Customers by Revenue", "Revenue Concentration")}
              {topCustomers.length ? (
                <table className="demo-table">
                  <thead><tr><th>#</th><th>Customer</th><th>Invoiced</th><th>Share</th></tr></thead>
                  <tbody>
                    {topCustomers.map((c, idx) => {
                      const pct = totalRevenue > 0 ? ((c.total / totalRevenue) * 100).toFixed(1) : "0";
                      return (
                        <tr key={c.name}>
                          <td style={{ color: "var(--demo-muted)", fontWeight: 800, fontSize: 12 }}>{idx + 1}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 30, height: 30, borderRadius: 8, background: PALETTE[idx % PALETTE.length], color: "#fff", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 900, flexShrink: 0 }}>
                                {String(c.name).slice(0,2).toUpperCase()}
                              </div>
                              <span style={{ fontWeight: 800 }}>{c.name}</span>
                            </div>
                          </td>
                          <td style={{ fontWeight: 800 }}>{money(c.total)}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: "var(--demo-soft)", borderRadius: 3, overflow: "hidden", maxWidth: 100 }}>
                                <div style={{ width: `${pct}%`, height: "100%", background: PALETTE[idx % PALETTE.length], borderRadius: 3 }}/>
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 800, color: "var(--demo-muted)" }}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="crud-empty" style={{ padding: 32 }}>
                  <b>No invoice data yet</b>
                  <span>Create invoices to see customer revenue here.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CRM ── */}
        {tab === "crm" && (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
              {kpiCard("Leads", p.leads.length, "Top of funnel")}
              {kpiCard("Opportunities", p.opportunities.length, money(pipelineValue) + " value", "#2E6BE5")}
              {kpiCard("Sales Orders", p.salesOrders.length, "Confirmed orders", "#F59E0B")}
              {kpiCard("Applicants", p.jobApplicants.length, "In recruiting pipeline", "#6366F1")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "var(--demo-card)", border: "1px solid var(--demo-line)", borderRadius: 14 }}>
                {panelHead("Sales Funnel", "Conversion Pipeline")}
                <div style={{ padding: "16px 20px 20px", height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={crmFunnel} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--demo-line)" horizontal={false}/>
                      <XAxis type="number" tick={{ fontSize: 11, fill: "var(--demo-muted)" }} axisLine={false} tickLine={false}/>
                      <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: "var(--demo-muted)" }} axisLine={false} tickLine={false} width={90}/>
                      <Tooltip {...tt}/>
                      <Bar dataKey="count" radius={[0,6,6,0]}>
                        {crmFunnel.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ background: "var(--demo-card)", border: "1px solid var(--demo-line)", borderRadius: 14 }}>
                {panelHead("Customer Segments", "By Group")}
                <div style={{ padding: "16px 20px 20px", height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={customersByGroup.length ? customersByGroup : [{ group: "No data", count: 1 }]} dataKey="count" nameKey="group" cx="50%" cy="50%" outerRadius={85} innerRadius={40}>
                        {(customersByGroup.length ? customersByGroup : [{ group: "No data", count: 1 }]).map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]}/>)}
                      </Pie>
                      <Tooltip {...tt}/>
                      <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: "var(--demo-muted)" }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── OPERATIONS ── */}
        {tab === "operations" && (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
              {kpiCard("Tasks", p.tasks.length, `${p.tasks.filter((t) => t.status === "Open").length} open`)}
              {kpiCard("Support Issues", p.issues.length, `${p.issues.filter((i) => i.status === "Open").length} open`, "#EF4444")}
              {kpiCard("Purchase Orders", p.purchaseOrders.length, "Total POs", "#F59E0B")}
              {kpiCard("Expense Claims", p.expenseClaims.length, money(totalExpenseClaimed) + " claimed", "#6366F1")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "var(--demo-card)", border: "1px solid var(--demo-line)", borderRadius: 14 }}>
                {panelHead("Tasks by Status", "Project Operations")}
                <div style={{ padding: "16px 20px 20px", height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={tasksByStatus.length ? tasksByStatus : [{ status: "No data", count: 1 }]} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={82} innerRadius={36}>
                        {tasksByStatus.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]}/>)}
                      </Pie>
                      <Tooltip {...tt}/>
                      <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: "var(--demo-muted)" }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ background: "var(--demo-card)", border: "1px solid var(--demo-line)", borderRadius: 14 }}>
                {panelHead("Support Tickets by Status", "Helpdesk Operations")}
                <div style={{ padding: "16px 20px 20px", height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={issuesByStatus} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--demo-line)" horizontal={false}/>
                      <XAxis type="number" tick={{ fontSize: 11, fill: "var(--demo-muted)" }} axisLine={false} tickLine={false}/>
                      <YAxis type="category" dataKey="status" tick={{ fontSize: 11, fill: "var(--demo-muted)" }} axisLine={false} tickLine={false} width={80}/>
                      <Tooltip {...tt}/>
                      <Bar dataKey="count" radius={[0,6,6,0]}>
                        {issuesByStatus.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── HR ── */}
        {tab === "hr" && (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
              {kpiCard("Active Staff", activeEmployees, `${p.employees.length} total`, "#14B8A6")}
              {kpiCard("Monthly Payroll", money(totalPayroll), "Submitted salary slips", "#2E6BE5")}
              {kpiCard("Expense Claims", p.expenseClaims.length, money(totalExpenseClaimed) + " total", "#F59E0B")}
              {kpiCard("Job Applicants", p.jobApplicants.length, "In recruitment pipeline", "#6366F1")}
            </div>
            <div style={{ background: "var(--demo-card)", border: "1px solid var(--demo-line)", borderRadius: 14 }}>
              {panelHead("Headcount by Department", "People Analytics")}
              <div style={{ padding: "16px 20px 20px", height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byDept.length ? byDept : [{ dept: "No data", count: 0 }]} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--demo-line)" vertical={false}/>
                    <XAxis dataKey="dept" tick={{ fontSize: 11, fill: "var(--demo-muted)" }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize: 11, fill: "var(--demo-muted)" }} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <Tooltip {...tt}/>
                    <Bar dataKey="count" radius={[6,6,0,0]}>
                      {byDept.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
              <a href="/portal/hr" className="demo-stat-card" style={{ textDecoration: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 24 }}>👥</div>
                <div style={{ fontWeight: 900, color: "var(--demo-text)" }}>HR Workspace</div>
                <div style={{ fontSize: 12, color: "var(--demo-muted)" }}>Full HR analytics and people ops</div>
              </a>
              <a href="/portal/payroll" className="demo-stat-card" style={{ textDecoration: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 24 }}>💰</div>
                <div style={{ fontWeight: 900, color: "var(--demo-text)" }}>Payroll</div>
                <div style={{ fontSize: 12, color: "var(--demo-muted)" }}>Salary slips and pay runs</div>
              </a>
              <a href="/portal/recruitment" className="demo-stat-card" style={{ textDecoration: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 24 }}>🎯</div>
                <div style={{ fontWeight: 900, color: "var(--demo-text)" }}>Recruitment</div>
                <div style={{ fontSize: 12, color: "var(--demo-muted)" }}>Job openings and applicants</div>
              </a>
            </div>
          </div>
        )}

        {/* ── DATA SOURCES ── */}
        {tab === "sources" && (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
            {insightsInstalled ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
                  {kpiCard("Saved Queries", p.insightsQueries.length, "Reusable data queries")}
                  {kpiCard("Dashboards", p.insightsDashboards.length, "Visual dashboards", "#2E6BE5")}
                  {kpiCard("Data Sources", p.insightsSources.length, "Connected databases", "#F59E0B")}
                  {kpiCard("Charts", p.insightsCharts.length, "Insight visualisations", "#6366F1")}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ background: "var(--demo-card)", border: "1px solid var(--demo-line)", borderRadius: 14 }}>
                    {panelHead("Saved Queries", "Frappe Insights Queries")}
                    {p.insightsQueries.length ? (
                      <table className="demo-table">
                        <thead><tr><th>Title</th><th>Status</th><th>Modified</th></tr></thead>
                        <tbody>
                          {p.insightsQueries.slice(0, 10).map((q) => (
                            <tr key={String(q.name)}>
                              <td style={{ fontWeight: 700 }}>{String(q.title || q.name)}</td>
                              <td><span className={`demo-status-chip ${String(q.status || "").toLowerCase()}`}>{String(q.status || "—")}</span></td>
                              <td style={{ color: "var(--demo-muted)", fontSize: 11 }}>{String(q.modified || "—").split(" ")[0]}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : <div className="crud-empty" style={{ padding: 24 }}><b>No queries yet</b><span>Build queries in Frappe Insights</span></div>}
                  </div>
                  <div style={{ background: "var(--demo-card)", border: "1px solid var(--demo-line)", borderRadius: 14 }}>
                    {panelHead("Data Sources", "Connected Databases")}
                    {p.insightsSources.length ? (
                      <table className="demo-table">
                        <thead><tr><th>Source</th><th>Type</th><th>Status</th></tr></thead>
                        <tbody>
                          {p.insightsSources.map((s) => (
                            <tr key={String(s.name)}>
                              <td style={{ fontWeight: 700 }}>{String(s.title || s.name)}</td>
                              <td style={{ color: "var(--demo-muted)" }}>{String(s.database_type || "—")}</td>
                              <td><span className={`demo-status-chip ${String(s.status || "").toLowerCase()}`}>{String(s.status || "—")}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : <div className="crud-empty" style={{ padding: 24 }}><b>No data sources yet</b><span>Connect a database in Frappe Insights</span></div>}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ background: "var(--demo-card)", border: "1px solid var(--demo-line)", borderRadius: 16, padding: "48px 32px", textAlign: "center" }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>🗄️</div>
                <h3 style={{ color: "var(--demo-text)", fontWeight: 900, margin: "0 0 10px" }}>Frappe Insights App Not Detected</h3>
                <p style={{ color: "var(--demo-muted)", maxWidth: 480, margin: "0 auto 24px", fontSize: 14, lineHeight: 1.6 }}>
                  This tab shows your Frappe Insights saved queries, dashboards and data sources. Install the Insights app on your bench to unlock SQL query builder, chart builder and shareable dashboards.
                </p>
                <code style={{ display: "block", background: "var(--demo-soft)", borderRadius: 8, padding: "12px 20px", fontSize: 13, color: "var(--demo-text)", maxWidth: 480, margin: "0 auto 24px", textAlign: "left" }}>
                  bench get-app insights<br/>
                  bench install-app insights
                </code>
                <p style={{ color: "var(--demo-muted)", fontSize: 12 }}>The Overview, Finance, CRM, Operations and HR tabs above use live ERPNext data and work without the Insights app.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
