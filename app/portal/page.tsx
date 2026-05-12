"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useWorkspace } from "./layout";

function fmt(n: number) {
  return "R " + Number(n || 0).toLocaleString("en-ZA", { minimumFractionDigits: 0 });
}

function KPI({ label, value, hint, color = "", icon }: { label: string; value: string | number; hint?: string; color?: string; icon: string }) {
  return (
    <div className={`kpi ${color}`}>
      <div className="ic-wrap">{icon}</div>
      <div className="label">{label}</div>
      <div className="val">{value}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

function MiniChart({ data }: { data: { month: string; revenue: number; expenses: number }[] }) {
  if (!data.length) return <div className="empty">No chart data</div>;
  const max = Math.max(...data.map((d) => d.revenue));
  return (
    <div className="mini-chart-wrap">
      {data.map((d) => (
        <div key={d.month} className="mini-bar-group" title={`${d.month}: R${d.revenue.toLocaleString()}`}>
          <div className="mini-bar rev" style={{ height: `${(d.revenue / max) * 80}px` }} />
          <div className="mini-bar exp" style={{ height: `${(d.expenses / max) * 80}px` }} />
          <div className="mini-bar-label">{d.month.slice(5)}</div>
        </div>
      ))}
      <div className="mini-legend">
        <span><i className="dot-rev" />Revenue</span>
        <span><i className="dot-exp" />Expenses</span>
      </div>
    </div>
  );
}

function ComplianceAlert({ items }: { items: { label: string; due: string; status: string; amount: number }[] }) {
  return (
    <div className="list">
      {items.map((item) => (
        <div key={item.label} className="list-row">
          <div className={`chip ${item.status === "overdue" ? "danger" : item.status === "pending" ? "warn" : "ok"}`}>
            {item.status === "overdue" ? "Overdue" : item.status === "pending" ? "Due Soon" : "Filed"}
          </div>
          <div>
            <div className="t">{item.label}</div>
            <div className="s">Due {item.due}</div>
          </div>
          <div className="r">
            <div style={{ fontWeight: 700, color: item.status === "overdue" ? "var(--danger)" : "var(--navy-ink)" }}>
              {fmt(item.amount)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { hasModule, currency } = useWorkspace();
  const [overview, setOverview] = useState<Record<string, number>>({});
  const [chart, setChart] = useState<{ month: string; revenue: number; expenses: number }[]>([]);
  const [topCustomers, setTopCustomers] = useState<{ name: string; total_revenue: number; invoice_count: number }[]>([]);
  const [pipeline, setPipeline] = useState<{ stage: string; count: number; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const COMPLIANCE_ALERTS = [
    { label: "PAYE (Apr 2025)", due: "7 May 2025", status: "overdue", amount: 38400 },
    { label: "UIF (Apr 2025)", due: "7 May 2025", status: "overdue", amount: 9100 },
    { label: "VAT (Apr 2025)", due: "30 May 2025", status: "pending", amount: 84200 },
    { label: "SDL (Apr 2025)", due: "7 May 2025", status: "pending", amount: 4800 },
    { label: "CIPC Annual", due: "14 Sep 2025", status: "ok", amount: 1500 },
  ];

  useEffect(() => {
    (async () => {
      const [ovRes, chartRes, custRes, pipeRes] = await Promise.allSettled([
        api.getBusinessOverview(),
        api.getRevenueChart(undefined, 6),
        api.getTopCustomers(undefined, 5),
        api.getPipelineSummary(),
      ]);

      if (ovRes.status === "fulfilled" && ovRes.value.data) {
        const d = ovRes.value.data as { cards: Record<string, number> };
        setOverview(d.cards ?? {});
      }
      if (chartRes.status === "fulfilled" && chartRes.value.data) {
        const d = chartRes.value.data as { chart: { month: string; revenue: number; expenses: number }[] };
        setChart(d.chart ?? []);
      }
      if (custRes.status === "fulfilled" && custRes.value.data) {
        const d = custRes.value.data as { customers: { name: string; total_revenue: number; invoice_count: number }[] };
        setTopCustomers(d.customers ?? []);
      }
      if (pipeRes.status === "fulfilled" && pipeRes.value.data) {
        const d = pipeRes.value.data as { stages: { stage: string; count: number; value: number }[] };
        setPipeline(d.stages ?? []);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" />
        <p>Loading your business overview…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Good morning 👋</h1>
          <p className="page-sub">Here&apos;s what needs your attention today — {new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
      </div>

      {/* ── Priority alerts ── */}
      {(overview.overdue_invoices > 0 || COMPLIANCE_ALERTS.some((a) => a.status === "overdue")) && (
        <div className="alert-banner">
          <span className="alert-icon">⚠</span>
          <div>
            <strong>Attention required:</strong>{" "}
            {overview.overdue_invoices > 0 && `${overview.overdue_invoices} overdue invoices totalling approx. R 486,200. `}
            {COMPLIANCE_ALERTS.filter((a) => a.status === "overdue").length > 0 &&
              `${COMPLIANCE_ALERTS.filter((a) => a.status === "overdue").length} compliance submissions overdue.`}
          </div>
          <Link href="/portal/compliance" className="btn" style={{ marginLeft: "auto", flexShrink: 0 }}>
            View compliance →
          </Link>
        </div>
      )}

      {/* ── Finance KPIs ── */}
      {hasModule("accounting") && (
        <>
          <div className="section-label">Finance — this month</div>
          <div className="kpi-grid">
            <KPI icon="◇" label="Month Revenue" value={fmt(overview.month_revenue)} hint="May 2025" color="teal" />
            <KPI icon="◈" label="Month Profit" value={fmt(overview.month_profit)} hint={`${overview.month_expenses ? Math.round((overview.month_profit / overview.month_revenue) * 100) : 0}% margin`} color="" />
            <KPI icon="◎" label="Receivables" value={fmt(overview.receivables)} hint={`${overview.overdue_invoices ?? 0} overdue`} color="warn" />
            <KPI icon="◯" label="Cash Position" value={fmt(overview.receivables - overview.payables)} hint="Estimated" color="" />
          </div>
        </>
      )}

      {/* ── CRM + Finance chart ── */}
      <div className="two-col">
        {hasModule("accounting") && (
          <div className="card">
            <div className="card-head">
              <h3>Revenue vs Expenses — Last 6 months</h3>
              <Link href="/portal/accounting" className="btn" style={{ fontSize: 12 }}>View finance →</Link>
            </div>
            <div className="card-body">
              <MiniChart data={chart} />
            </div>
          </div>
        )}

        {hasModule("crm") && (
          <div className="card">
            <div className="card-head">
              <h3>Sales Pipeline</h3>
              <Link href="/portal/crm" className="btn" style={{ fontSize: 12 }}>Open CRM →</Link>
            </div>
            <div className="card-body">
              {pipeline.map((s) => (
                <div key={s.stage} className="pipeline-mini-row">
                  <div className="pipeline-mini-stage">{s.stage}</div>
                  <div className="pipeline-mini-bar-wrap">
                    <div
                      className="pipeline-mini-bar"
                      style={{ width: `${Math.min(100, (s.value / 600000) * 100)}%` }}
                    />
                  </div>
                  <div className="pipeline-mini-val">{fmt(s.value)}</div>
                  <div className="chip info" style={{ fontSize: 10 }}>{s.count}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom row ── */}
      <div className="three-col" style={{ marginTop: 18 }}>
        {/* Top customers */}
        {hasModule("accounting") && (
          <div className="card">
            <div className="card-head"><h3>Top Customers</h3></div>
            <div className="list">
              {topCustomers.map((c, i) => (
                <div key={c.name} className="list-row">
                  <div className="rank-num">{i + 1}</div>
                  <div>
                    <div className="t">{c.name}</div>
                    <div className="s">{c.invoice_count} invoices</div>
                  </div>
                  <div className="r" style={{ fontWeight: 700 }}>{fmt(c.total_revenue)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compliance */}
        {hasModule("compliance") && (
          <div className="card">
            <div className="card-head">
              <h3>Compliance Deadlines</h3>
              <Link href="/portal/compliance" className="btn" style={{ fontSize: 12 }}>All →</Link>
            </div>
            <ComplianceAlert items={COMPLIANCE_ALERTS.slice(0, 4)} />
          </div>
        )}

        {/* HR quick stats */}
        {hasModule("hr") && (
          <div className="card">
            <div className="card-head">
              <h3>People</h3>
              <Link href="/portal/hr" className="btn" style={{ fontSize: 12 }}>HR →</Link>
            </div>
            <div className="card-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="stat-mini"><div className="stat-val">{overview.active_employees ?? 24}</div><div className="stat-lbl">Active staff</div></div>
                <div className="stat-mini"><div className="stat-val">{overview.open_projects ?? 11}</div><div className="stat-lbl">Open projects</div></div>
                <div className="stat-mini"><div className="stat-val">{overview.open_tasks ?? 43}</div><div className="stat-lbl">Open tasks</div></div>
                <div className="stat-mini"><div className="stat-val">{overview.customers ?? 142}</div><div className="stat-lbl">Customers</div></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Module upsells for locked modules ── */}
      {(!hasModule("hr") || !hasModule("helpdesk") || !hasModule("insights")) && (
        <div style={{ marginTop: 24 }}>
          <div className="section-label">Unlock more modules</div>
          <div className="upsell-grid">
            {!hasModule("hr") && (
              <div className="upsell-card">
                <div className="upsell-icon">◎</div>
                <div>
                  <div style={{ fontWeight: 700 }}>People & HR</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Employees, leave, payroll, attendance</div>
                </div>
                <Link href="/portal/settings" className="btn btn-teal" style={{ marginLeft: "auto", fontSize: 12 }}>Upgrade</Link>
              </div>
            )}
            {!hasModule("helpdesk") && (
              <div className="upsell-card">
                <div className="upsell-icon">◬</div>
                <div>
                  <div style={{ fontWeight: 700 }}>Helpdesk</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Customer support ticket management</div>
                </div>
                <Link href="/portal/settings" className="btn btn-teal" style={{ marginLeft: "auto", fontSize: 12 }}>Upgrade</Link>
              </div>
            )}
            {!hasModule("insights") && (
              <div className="upsell-card">
                <div className="upsell-icon">◯</div>
                <div>
                  <div style={{ fontWeight: 700 }}>Insights & BI</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Executive dashboards and reports</div>
                </div>
                <Link href="/portal/settings" className="btn btn-teal" style={{ marginLeft: "auto", fontSize: 12 }}>Upgrade</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
