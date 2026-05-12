"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
type ReportsTab = "operations" | "members" | "customer_report";

interface SaasMember {
  id: string; name: string; plan: string; reg_number: string; vat_number: string | null;
  industry: string; territory: string; joined: string; status: string;
  contacts: number; employees: number; projects: number;
  total_revenue: number; outstanding: number; overdue: number;
  compliance_score: number; last_activity: string;
}

interface OperationsSummary {
  currency: string; period: string;
  revenue: { total: number; vs_last_month: number; vs_last_year: number };
  expenses: { total: number; vs_last_month: number };
  profit: { total: number; margin: number };
  saas_metrics: {
    total_members: number; active_members: number; churned: number;
    mrr: number; arr: number; avg_revenue_per_user: number; new_this_month: number;
    plan_breakdown: Record<string, number>;
  };
  crm: { leads: number; deals: number; pipeline_value: number; won_this_month: number; conversion_rate: number };
  hr: { headcount: number; payroll: number; open_positions: number };
  projects: { open: number; completed_this_month: number; overdue_tasks: number; billable_hours: number };
  helpdesk: { open: number; resolved_this_month: number; avg_resolution_days: number; satisfaction: number };
  compliance: { overdue_items: number; pending_items: number; total_liability: number };
}

interface CustomerFullReport {
  customer: { id: string; name: string; plan: string; reg_number: string; vat_number: string; industry: string; territory: string; joined: string; status: string };
  financials: {
    currency: string; total_revenue: number; total_invoiced: number;
    outstanding: number; overdue: number; paid: number;
    monthly_trend: { month: string; revenue: number; paid: number }[];
  };
  invoices: { id: string; date: string; due: string; amount: number; status: string }[];
  projects: { id: string; name: string; status: string; progress: number; due: string }[];
  helpdesk: { id: string; subject: string; status: string; priority: string; created: string }[];
  compliance: { score: number; vat_registered: boolean; cipc_status: string; last_vat_filed: string; last_paye_filed: string };
  crm: { lead_source: string; converted_date: string; deals_won: number; deals_total: number; last_contact: string };
}

const fmt = (n: number) => "R " + Number(n || 0).toLocaleString("en-ZA", { maximumFractionDigits: 0 });
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

// Mini bar chart
function MiniBar({ value, max, color = "var(--teal)" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden", marginTop: 4 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width .4s" }} />
    </div>
  );
}

// Revenue sparkline (simple CSS bars)
function Sparkline({ data }: { data: { month: string; revenue: number; paid: number }[] }) {
  const maxVal = Math.max(...data.map((d) => d.revenue));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 48 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
          <div style={{ width: "100%", background: "var(--teal)", borderRadius: "2px 2px 0 0", height: `${(d.revenue / maxVal) * 44}px`, opacity: 0.85 }} />
        </div>
      ))}
    </div>
  );
}

// Score badge
function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "var(--ok)" : score >= 60 ? "var(--warn)" : "var(--danger)";
  const bg = score >= 80 ? "var(--ok-bg)" : score >= 60 ? "var(--warn-bg)" : "var(--danger-bg)";
  return <span className="chip" style={{ background: bg, color, fontWeight: 800 }}>{score}/100</span>;
}

// Plan chip
function PlanChip({ plan }: { plan: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    Starter: { bg: "#F0F1F7", color: "#6B7086" },
    Growth: { bg: "var(--blue-bg)", color: "var(--blue)" },
    Professional: { bg: "#F3EDFD", color: "#9B59D1" },
    Enterprise: { bg: "var(--ok-bg)", color: "var(--ok)" },
  };
  const c = colors[plan] ?? { bg: "#F0F1F7", color: "#6B7086" };
  return <span className="chip" style={{ background: c.bg, color: c.color }}>{plan}</span>;
}

// ─── Operations Report ────────────────────────────────────────────────────────
function OperationsReport({ data }: { data: OperationsSummary }) {
  const planColors = ["var(--teal)", "var(--blue)", "#9B59D1", "var(--ok)"];
  const planEntries = Object.entries(data.saas_metrics.plan_breakdown);
  const maxPlan = Math.max(...planEntries.map(([, v]) => v));

  return (
    <div>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0B1437 0%, #1A2B6B 100%)", borderRadius: 14, padding: "20px 24px", marginBottom: 20, color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 20 }}>Operations Report</div>
            <div style={{ opacity: 0.7, fontSize: 13, marginTop: 2 }}>{data.period} · Full business overview</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 900, fontSize: 24, color: "#4ECDC4" }}>{fmt(data.revenue.total)}</div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>Total Revenue</div>
          </div>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="kpi teal">
          <div className="ic-wrap">◇</div>
          <div className="label">Revenue</div>
          <div className="val">{fmt(data.revenue.total)}</div>
          <div className="hint" style={{ color: data.revenue.vs_last_month >= 0 ? "var(--ok)" : "var(--danger)" }}>
            {fmtPct(data.revenue.vs_last_month)} vs last month
          </div>
        </div>
        <div className="kpi">
          <div className="ic-wrap" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>◭</div>
          <div className="label">Expenses</div>
          <div className="val">{fmt(data.expenses.total)}</div>
          <div className="hint">{fmtPct(data.expenses.vs_last_month)} vs last month</div>
        </div>
        <div className="kpi">
          <div className="ic-wrap" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}>✓</div>
          <div className="label">Net Profit</div>
          <div className="val">{fmt(data.profit.total)}</div>
          <div className="hint">{data.profit.margin.toFixed(1)}% margin</div>
        </div>
        <div className="kpi">
          <div className="ic-wrap" style={{ background: "#F3EDFD", color: "#9B59D1" }}>◈</div>
          <div className="label">MRR</div>
          <div className="val">{fmt(data.saas_metrics.mrr)}</div>
          <div className="hint">ARR: {fmt(data.saas_metrics.arr)}</div>
        </div>
      </div>

      {/* Two-column detail */}
      <div className="two-col" style={{ alignItems: "flex-start", marginBottom: 20 }}>
        {/* SaaS Metrics */}
        <div className="card">
          <div className="card-head"><h3>SaaS Metrics</h3></div>
          <div className="card-body">
            <div className="dp-field"><span>Total Members</span><strong>{data.saas_metrics.total_members}</strong></div>
            <div className="dp-field"><span>Active Members</span><strong style={{ color: "var(--ok)" }}>{data.saas_metrics.active_members}</strong></div>
            <div className="dp-field"><span>Churned This Month</span><strong style={{ color: data.saas_metrics.churned > 0 ? "var(--danger)" : "var(--ok)" }}>{data.saas_metrics.churned}</strong></div>
            <div className="dp-field"><span>New This Month</span><strong style={{ color: "var(--teal)" }}>+{data.saas_metrics.new_this_month}</strong></div>
            <div className="dp-field"><span>Avg Revenue / User</span><strong>{fmt(data.saas_metrics.avg_revenue_per_user)}</strong></div>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Plan Distribution</div>
              {planEntries.map(([plan, count], i) => (
                <div key={plan} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                    <span>{plan}</span><span style={{ fontWeight: 700 }}>{count}</span>
                  </div>
                  <MiniBar value={count} max={maxPlan} color={planColors[i % planColors.length]} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CRM & Pipeline */}
        <div className="card">
          <div className="card-head"><h3>CRM & Pipeline</h3></div>
          <div className="card-body">
            <div className="dp-field"><span>Active Leads</span><strong>{data.crm.leads}</strong></div>
            <div className="dp-field"><span>Open Deals</span><strong>{data.crm.deals}</strong></div>
            <div className="dp-field"><span>Pipeline Value</span><strong style={{ color: "var(--teal)" }}>{fmt(data.crm.pipeline_value)}</strong></div>
            <div className="dp-field"><span>Won This Month</span><strong style={{ color: "var(--ok)" }}>{fmt(data.crm.won_this_month)}</strong></div>
            <div className="dp-field"><span>Conversion Rate</span><strong>{data.crm.conversion_rate}%</strong></div>
            <div style={{ height: 1, background: "var(--line)", margin: "14px 0" }} />
            <div style={{ fontWeight: 700, fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>HR</div>
            <div className="dp-field"><span>Headcount</span><strong>{data.hr.headcount}</strong></div>
            <div className="dp-field"><span>Monthly Payroll</span><strong>{fmt(data.hr.payroll)}</strong></div>
            <div className="dp-field"><span>Open Positions</span><strong>{data.hr.open_positions}</strong></div>
          </div>
        </div>
      </div>

      <div className="two-col" style={{ alignItems: "flex-start" }}>
        {/* Projects */}
        <div className="card">
          <div className="card-head"><h3>Projects & Delivery</h3></div>
          <div className="card-body">
            <div className="dp-field"><span>Open Projects</span><strong>{data.projects.open}</strong></div>
            <div className="dp-field"><span>Completed This Month</span><strong style={{ color: "var(--ok)" }}>{data.projects.completed_this_month}</strong></div>
            <div className="dp-field"><span>Overdue Tasks</span><strong style={{ color: data.projects.overdue_tasks > 0 ? "var(--danger)" : "var(--ok)" }}>{data.projects.overdue_tasks}</strong></div>
            <div className="dp-field"><span>Billable Hours</span><strong>{data.projects.billable_hours.toFixed(1)}h</strong></div>
          </div>
        </div>

        {/* Helpdesk & Compliance */}
        <div className="card">
          <div className="card-head"><h3>Helpdesk & Compliance</h3></div>
          <div className="card-body">
            <div style={{ fontWeight: 700, fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Helpdesk</div>
            <div className="dp-field"><span>Open Tickets</span><strong style={{ color: data.helpdesk.open > 10 ? "var(--danger)" : "var(--ok)" }}>{data.helpdesk.open}</strong></div>
            <div className="dp-field"><span>Resolved This Month</span><strong style={{ color: "var(--ok)" }}>{data.helpdesk.resolved_this_month}</strong></div>
            <div className="dp-field"><span>Avg Resolution</span><strong>{data.helpdesk.avg_resolution_days} days</strong></div>
            <div className="dp-field"><span>Satisfaction</span><strong>{data.helpdesk.satisfaction}/5 ⭐</strong></div>
            <div style={{ height: 1, background: "var(--line)", margin: "14px 0" }} />
            <div style={{ fontWeight: 700, fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Compliance</div>
            <div className="dp-field"><span>Overdue Items</span><strong style={{ color: data.compliance.overdue_items > 0 ? "var(--danger)" : "var(--ok)" }}>{data.compliance.overdue_items}</strong></div>
            <div className="dp-field"><span>Pending Items</span><strong style={{ color: "var(--warn)" }}>{data.compliance.pending_items}</strong></div>
            <div className="dp-field"><span>Total Liability</span><strong>{fmt(data.compliance.total_liability)}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Customer Full Report ─────────────────────────────────────────────────────
function CustomerReport({ customerId, onBack }: { customerId: string; onBack: () => void }) {
  const [data, setData] = useState<CustomerFullReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"summary" | "financials" | "invoices" | "projects" | "helpdesk" | "compliance" | "crm">("summary");

  useEffect(() => {
    api.getCustomerFullReport(customerId).then((r) => {
      setData(r.data as CustomerFullReport);
      setLoading(false);
    });
  }, [customerId]);

  if (loading) return <div className="page-loading"><div className="loading-spinner" /><p>Loading report…</p></div>;
  if (!data) return null;

  const { customer, financials, invoices, projects, helpdesk, compliance, crm } = data;
  const maxMonthly = Math.max(...financials.monthly_trend.map((d) => d.revenue));

  return (
    <div>
      <button className="btn" style={{ marginBottom: 16 }} onClick={onBack}>← Back to Members</button>

      {/* Report Header */}
      <div style={{ background: "linear-gradient(135deg, #0B1437 0%, #1A2B6B 100%)", borderRadius: 14, padding: "20px 24px", marginBottom: 20, color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 22 }}>{customer.name}</div>
            <div style={{ opacity: 0.7, fontSize: 13, marginTop: 4 }}>
              {customer.industry} · {customer.territory} · Member since {fmtDate(customer.joined)}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <span style={{ background: "rgba(255,255,255,.15)", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{customer.plan} Plan</span>
              {customer.reg_number && <span style={{ background: "rgba(255,255,255,.15)", borderRadius: 20, padding: "3px 10px", fontSize: 11 }}>Reg: {customer.reg_number}</span>}
              {customer.vat_number && <span style={{ background: "rgba(255,255,255,.15)", borderRadius: 20, padding: "3px 10px", fontSize: 11 }}>VAT: {customer.vat_number}</span>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 900, fontSize: 26, color: "#4ECDC4" }}>{fmt(financials.total_revenue)}</div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>Total Revenue</div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="kpi teal">
          <div className="ic-wrap">◇</div>
          <div className="label">Total Revenue</div>
          <div className="val">{fmt(financials.total_revenue)}</div>
          <div className="hint">{invoices.length} invoices</div>
        </div>
        <div className="kpi">
          <div className="ic-wrap" style={{ background: "var(--warn-bg)", color: "var(--warn)" }}>⏰</div>
          <div className="label">Outstanding</div>
          <div className="val">{fmt(financials.outstanding)}</div>
          <div className="hint">Awaiting payment</div>
        </div>
        <div className="kpi">
          <div className="ic-wrap" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>⚠</div>
          <div className="label">Overdue</div>
          <div className="val" style={{ color: financials.overdue > 0 ? "var(--danger)" : "var(--ok)" }}>{fmt(financials.overdue)}</div>
          <div className="hint">{financials.overdue > 0 ? "Needs follow-up" : "All clear"}</div>
        </div>
        <div className="kpi">
          <div className="ic-wrap" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}>◉</div>
          <div className="label">Compliance Score</div>
          <div className="val">{compliance.score}/100</div>
          <div className="hint">{compliance.score >= 80 ? "Good standing" : "Needs attention"}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="crm-tabs" style={{ marginBottom: 16 }}>
        {(["summary", "financials", "invoices", "projects", "helpdesk", "compliance", "crm"] as const).map((t) => (
          <button key={t} className={`crm-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)} style={{ fontSize: 12 }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Summary */}
      {tab === "summary" && (
        <div className="two-col" style={{ alignItems: "flex-start" }}>
          <div className="card">
            <div className="card-head"><h3>Revenue Trend</h3></div>
            <div className="card-body">
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80, marginBottom: 8 }}>
                {financials.monthly_trend.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <div style={{ width: "100%", background: "var(--teal)", borderRadius: "3px 3px 0 0", height: `${(d.revenue / maxMonthly) * 72}px`, opacity: 0.85 }} />
                    <div style={{ fontSize: 9, color: "var(--muted)", transform: "rotate(-45deg)", transformOrigin: "top left", marginTop: 4 }}>{d.month.slice(5)}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 20 }}>
                <span>Peak: {fmt(maxMonthly)}</span>
                <span>Latest: {fmt(financials.monthly_trend[financials.monthly_trend.length - 1]?.revenue ?? 0)}</span>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h3>Account Summary</h3></div>
            <div className="card-body">
              <div className="dp-field"><span>Customer ID</span><strong>{customer.id}</strong></div>
              <div className="dp-field"><span>Industry</span><strong>{customer.industry}</strong></div>
              <div className="dp-field"><span>Territory</span><strong>{customer.territory}</strong></div>
              <div className="dp-field"><span>Plan</span><PlanChip plan={customer.plan} /></div>
              <div className="dp-field"><span>Member Since</span><strong>{fmtDate(customer.joined)}</strong></div>
              <div className="dp-field"><span>Open Projects</span><strong>{projects.filter((p) => p.status === "Open").length}</strong></div>
              <div className="dp-field"><span>Open Tickets</span><strong>{helpdesk.filter((t) => t.status !== "Resolved").length}</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* Financials */}
      {tab === "financials" && (
        <div className="card">
          <div className="card-head"><h3>Financial Summary</h3></div>
          <div className="card-body">
            <div className="two-col" style={{ alignItems: "flex-start" }}>
              <div>
                <div className="dp-field"><span>Total Invoiced</span><strong>{fmt(financials.total_invoiced)}</strong></div>
                <div className="dp-field"><span>Total Paid</span><strong style={{ color: "var(--ok)" }}>{fmt(financials.paid)}</strong></div>
                <div className="dp-field"><span>Outstanding</span><strong style={{ color: "var(--warn)" }}>{fmt(financials.outstanding)}</strong></div>
                <div className="dp-field"><span>Overdue</span><strong style={{ color: financials.overdue > 0 ? "var(--danger)" : "var(--ok)" }}>{fmt(financials.overdue)}</strong></div>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Monthly Revenue</div>
                {financials.monthly_trend.map((d, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                      <span>{d.month}</span><span style={{ fontWeight: 700 }}>{fmt(d.revenue)}</span>
                    </div>
                    <MiniBar value={d.revenue} max={maxMonthly} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoices */}
      {tab === "invoices" && (
        <div className="card">
          <div className="card-head"><h3>Invoice History</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="data">
              <thead><tr><th>Invoice</th><th>Date</th><th>Due</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 700 }}>{inv.id}</td>
                    <td>{fmtDate(inv.date)}</td>
                    <td>{fmtDate(inv.due)}</td>
                    <td style={{ fontWeight: 700 }}>{fmt(inv.amount)}</td>
                    <td><span className={`chip ${inv.status === "Paid" ? "ok" : inv.status === "Overdue" ? "danger" : "warn"}`}>{inv.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Projects */}
      {tab === "projects" && (
        <div className="card">
          <div className="card-head"><h3>Projects</h3></div>
          <div className="card-body">
            {projects.map((p) => (
              <div key={p.id} style={{ background: "#F9FAFC", borderRadius: 10, padding: 14, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{p.id} · Due: {fmtDate(p.due)}</div>
                  </div>
                  <span className={`chip ${p.status === "Completed" ? "ok" : "info"}`}>{p.status}</span>
                </div>
                <div style={{ height: 8, background: "var(--line)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${p.progress}%`, background: p.progress === 100 ? "var(--ok)" : "var(--teal)", borderRadius: 4 }} />
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{p.progress}% complete</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Helpdesk */}
      {tab === "helpdesk" && (
        <div className="card">
          <div className="card-head"><h3>Support Tickets</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="data">
              <thead><tr><th>Ticket</th><th>Subject</th><th>Priority</th><th>Status</th><th>Created</th></tr></thead>
              <tbody>
                {helpdesk.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 700 }}>{t.id}</td>
                    <td>{t.subject}</td>
                    <td><span className={`chip ${t.priority === "High" ? "danger" : t.priority === "Medium" ? "warn" : "muted"}`}>{t.priority}</span></td>
                    <td><span className={`chip ${t.status === "Resolved" ? "ok" : t.status === "Open" ? "warn" : "info"}`}>{t.status}</span></td>
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>{fmtDate(t.created)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Compliance */}
      {tab === "compliance" && (
        <div className="card">
          <div className="card-head"><h3>Compliance Status</h3></div>
          <div className="card-body">
            <div className="dp-field"><span>Compliance Score</span><ScoreBadge score={compliance.score} /></div>
            <div className="dp-field"><span>VAT Registered</span><span className={`chip ${compliance.vat_registered ? "ok" : "muted"}`}>{compliance.vat_registered ? "Yes" : "No"}</span></div>
            <div className="dp-field"><span>CIPC Status</span><span className={`chip ${compliance.cipc_status === "Good Standing" ? "ok" : "warn"}`}>{compliance.cipc_status}</span></div>
            <div className="dp-field"><span>Last VAT Filed</span><strong>{fmtDate(compliance.last_vat_filed)}</strong></div>
            <div className="dp-field"><span>Last PAYE Filed</span><strong>{fmtDate(compliance.last_paye_filed)}</strong></div>
          </div>
        </div>
      )}

      {/* CRM */}
      {tab === "crm" && (
        <div className="card">
          <div className="card-head"><h3>CRM History</h3></div>
          <div className="card-body">
            <div className="dp-field"><span>Lead Source</span><strong>{crm.lead_source}</strong></div>
            <div className="dp-field"><span>Converted Date</span><strong>{fmtDate(crm.converted_date)}</strong></div>
            <div className="dp-field"><span>Deals Won</span><strong style={{ color: "var(--ok)" }}>{crm.deals_won} / {crm.deals_total}</strong></div>
            <div className="dp-field"><span>Last Contact</span><strong>{fmtDate(crm.last_contact)}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Reports Page ────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [tab, setTab] = useState<ReportsTab>("operations");
  const [operations, setOperations] = useState<OperationsSummary | null>(null);
  const [members, setMembers] = useState<SaasMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("All");

  useEffect(() => {
    (async () => {
      const [ops, mems] = await Promise.allSettled([
        api.getOperationsSummary(), api.getSaasMembers(),
      ]);
      if (ops.status === "fulfilled") setOperations(ops.value.data as OperationsSummary);
      if (mems.status === "fulfilled") setMembers((mems.value.data as { members: SaasMember[] })?.members ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="page-loading"><div className="loading-spinner" /><p>Loading reports…</p></div>;

  const filteredMembers = members.filter((m) => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.industry.toLowerCase().includes(search.toLowerCase()) || m.territory.toLowerCase().includes(search.toLowerCase());
    const matchPlan = planFilter === "All" || m.plan === planFilter;
    return matchSearch && matchPlan;
  });

  const totalRevenue = members.reduce((s, m) => s + m.total_revenue, 0);
  const totalOverdue = members.reduce((s, m) => s + m.overdue, 0);
  const avgCompliance = members.length > 0 ? Math.round(members.reduce((s, m) => s + m.compliance_score, 0) / members.length) : 0;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-sub">Full operations overview · SaaS member company reports · Per-customer analytics</p>
        </div>
        <button className="btn">📥 Export Report</button>
      </div>

      {/* Tabs */}
      <div className="crm-tabs">
        {([
          { id: "operations", label: "◯ Operations Report" },
          { id: "members", label: "◈ SaaS Members" },
          { id: "customer_report", label: "◇ Customer Report" },
        ] as const).map(({ id, label }) => (
          <button key={id} className={`crm-tab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {/* ── Operations Report ── */}
      {tab === "operations" && operations && (
        <OperationsReport data={operations} />
      )}

      {/* ── SaaS Members ── */}
      {tab === "members" && (
        <div>
          {/* Summary KPIs */}
          <div className="kpi-grid" style={{ marginBottom: 18 }}>
            <div className="kpi teal">
              <div className="ic-wrap">◈</div>
              <div className="label">Total Members</div>
              <div className="val">{members.length}</div>
              <div className="hint">Active SaaS subscribers</div>
            </div>
            <div className="kpi">
              <div className="ic-wrap" style={{ background: "#F3EDFD", color: "#9B59D1" }}>◇</div>
              <div className="label">Total Revenue</div>
              <div className="val" style={{ fontSize: 18 }}>{fmt(totalRevenue)}</div>
              <div className="hint">Across all members</div>
            </div>
            <div className="kpi">
              <div className="ic-wrap" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>⚠</div>
              <div className="label">Total Overdue</div>
              <div className="val" style={{ color: totalOverdue > 0 ? "var(--danger)" : "var(--ok)" }}>{fmt(totalOverdue)}</div>
              <div className="hint">Requires follow-up</div>
            </div>
            <div className="kpi">
              <div className="ic-wrap" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}>◉</div>
              <div className="label">Avg Compliance</div>
              <div className="val">{avgCompliance}/100</div>
              <div className="hint">Across all members</div>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            <input className="inp" style={{ margin: 0, width: 240 }} placeholder="Search members…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="inp" style={{ margin: 0, width: 160 }} value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
              {["All", "Starter", "Growth", "Professional", "Enterprise"].map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>

          {/* Members Table */}
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              <table className="data">
                <thead>
                  <tr>
                    <th>Company</th><th>Plan</th><th>Industry</th><th>Territory</th>
                    <th>Revenue</th><th>Outstanding</th><th>Compliance</th><th>Last Activity</th><th>Report</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>{m.reg_number}</div>
                      </td>
                      <td><PlanChip plan={m.plan} /></td>
                      <td style={{ fontSize: 12 }}>{m.industry}</td>
                      <td style={{ fontSize: 12 }}>{m.territory}</td>
                      <td style={{ fontWeight: 700 }}>{fmt(m.total_revenue)}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: m.overdue > 0 ? "var(--danger)" : "var(--ok)" }}>{fmt(m.outstanding)}</div>
                        {m.overdue > 0 && <div style={{ fontSize: 10, color: "var(--danger)" }}>{fmt(m.overdue)} overdue</div>}
                      </td>
                      <td><ScoreBadge score={m.compliance_score} /></td>
                      <td style={{ color: "var(--muted)", fontSize: 12 }}>{fmtDate(m.last_activity)}</td>
                      <td>
                        <button className="btn btn-teal" style={{ fontSize: 11, padding: "5px 10px" }}
                          onClick={() => { setSelectedMember(m.id); setTab("customer_report"); }}>
                          View Report →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Customer Report ── */}
      {tab === "customer_report" && (
        <div>
          {!selectedMember ? (
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Select a SaaS member to view their full company report</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                {members.map((m) => (
                  <div key={m.id} className="card" style={{ cursor: "pointer", padding: 16 }}
                    onClick={() => setSelectedMember(m.id)}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{m.name}</div>
                      <PlanChip plan={m.plan} />
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>{m.industry} · {m.territory}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ flex: 1, textAlign: "center", background: "var(--bg)", borderRadius: 8, padding: "8px 4px" }}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: "var(--teal)" }}>{fmt(m.total_revenue)}</div>
                        <div style={{ fontSize: 10, color: "var(--muted)" }}>Revenue</div>
                      </div>
                      <div style={{ flex: 1, textAlign: "center", background: "var(--bg)", borderRadius: 8, padding: "8px 4px" }}>
                        <div style={{ fontWeight: 800, fontSize: 13 }}>{m.compliance_score}</div>
                        <div style={{ fontSize: 10, color: "var(--muted)" }}>Compliance</div>
                      </div>
                      <div style={{ flex: 1, textAlign: "center", background: "var(--bg)", borderRadius: 8, padding: "8px 4px" }}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: m.overdue > 0 ? "var(--danger)" : "var(--ok)" }}>{m.overdue > 0 ? "⚠" : "✓"}</div>
                        <div style={{ fontSize: 10, color: "var(--muted)" }}>Overdue</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <CustomerReport customerId={selectedMember} onBack={() => setSelectedMember(null)} />
          )}
        </div>
      )}
    </div>
  );
}
