"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

const fmt = (n: number) => "R " + Number(n || 0).toLocaleString("en-ZA", { minimumFractionDigits: 0 });
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) : "—";

type AccTab = "overview" | "invoices" | "bills" | "payments";

export default function AccountingPage() {
  const [tab, setTab] = useState<AccTab>("overview");
  const [cards, setCards] = useState<Record<string, number>>({});
  const [invoices, setInvoices] = useState<Record<string, string | number>[]>([]);
  const [chart, setChart] = useState<{ month: string; revenue: number; expenses: number; profit: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [dash, inv, chartRes] = await Promise.allSettled([
        api.getAccountingDashboard(),
        api.getInvoices(),
        api.getRevenueChart(undefined, 6),
      ]);

      if (dash.status === "fulfilled") setCards((dash.value.data as { cards: Record<string, number> })?.cards ?? {});
      if (inv.status === "fulfilled") setInvoices((inv.value.data as { invoices: Record<string, string | number>[] })?.invoices ?? []);
      if (chartRes.status === "fulfilled") setChart((chartRes.value.data as { chart: { month: string; revenue: number; expenses: number; profit: number }[] })?.chart ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="page-loading"><div className="loading-spinner" /><p>Loading finance…</p></div>;

  const statusColor: Record<string, string> = {
    Paid: "ok", Unpaid: "info", Overdue: "danger", Draft: "muted",
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Finance</h1>
          <p className="page-sub">Invoices, bills, payments, and profit & loss</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-teal">+ New Invoice</button>
          <button className="btn">+ Record Payment</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi teal">
          <div className="ic-wrap">◇</div>
          <div className="label">Monthly Revenue</div>
          <div className="val">{fmt(cards.monthly_revenue)}</div>
          <div className="hint">May 2025</div>
        </div>
        <div className="kpi">
          <div className="ic-wrap">◈</div>
          <div className="label">Monthly Profit</div>
          <div className="val">{fmt(cards.monthly_profit)}</div>
          <div className="hint">{cards.monthly_revenue ? Math.round((cards.monthly_profit / cards.monthly_revenue) * 100) : 0}% margin</div>
        </div>
        <div className="kpi warn">
          <div className="ic-wrap">◎</div>
          <div className="label">Receivables</div>
          <div className="val">{fmt(cards.receivables)}</div>
          <div className="hint" style={{ color: "var(--danger)" }}>{cards.overdue_invoices ?? 0} overdue</div>
        </div>
        <div className="kpi">
          <div className="ic-wrap">◯</div>
          <div className="label">Cash Position</div>
          <div className="val">{fmt(cards.cash_balance)}</div>
          <div className="hint">Estimated</div>
        </div>
      </div>

      {/* P&L quick chart */}
      {chart.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-head"><h3>Profit & Loss — Last 6 months</h3></div>
          <div className="card-body" style={{ overflowX: "auto" }}>
            <table className="data">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Revenue</th>
                  <th>Expenses</th>
                  <th>Profit</th>
                  <th>Margin</th>
                </tr>
              </thead>
              <tbody>
                {chart.map((row) => (
                  <tr key={row.month}>
                    <td>{row.month}</td>
                    <td style={{ color: "var(--teal)", fontWeight: 700 }}>{fmt(row.revenue)}</td>
                    <td style={{ color: "var(--danger)" }}>{fmt(row.expenses)}</td>
                    <td style={{ color: row.profit >= 0 ? "var(--ok)" : "var(--danger)", fontWeight: 700 }}>{fmt(row.profit)}</td>
                    <td>{row.revenue ? Math.round((row.profit / row.revenue) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="crm-tabs">
        {(["overview", "invoices", "bills", "payments"] as const).map((t) => (
          <button key={t} className={`crm-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "invoices" && (
        <div className="card">
          <div className="card-head">
            <h3>Sales Invoices</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-teal">+ New Invoice</button>
            </div>
          </div>
          <table className="data">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Due</th>
                <th>Total</th>
                <th>Outstanding</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={String(inv.name)}>
                  <td><strong>{String(inv.name)}</strong></td>
                  <td>{String(inv.customer_name)}</td>
                  <td>{fmtDate(String(inv.posting_date))}</td>
                  <td style={{ color: inv.status === "Overdue" ? "var(--danger)" : undefined }}>
                    {fmtDate(String(inv.due_date))}
                  </td>
                  <td>{fmt(Number(inv.grand_total))}</td>
                  <td style={{ color: Number(inv.outstanding_amount) > 0 ? "var(--warn)" : "var(--ok)" }}>
                    {Number(inv.outstanding_amount) > 0 ? fmt(Number(inv.outstanding_amount)) : "Paid ✓"}
                  </td>
                  <td><span className={`chip ${statusColor[String(inv.status)] || "muted"}`}>{String(inv.status)}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn" style={{ fontSize: 11, padding: "4px 8px" }}>View</button>
                      {Number(inv.outstanding_amount) > 0 && (
                        <button className="btn btn-teal" style={{ fontSize: 11, padding: "4px 8px" }}>Pay</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "overview" && (
        <div className="three-col">
          <div className="card">
            <div className="card-head"><h3>Quick Actions</h3></div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button className="btn btn-teal">+ Create Invoice</button>
              <button className="btn">+ Record Bill</button>
              <button className="btn">+ Log Payment</button>
              <Link href="/portal/compliance" className="btn">→ View VAT Returns</Link>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h3>Payables</h3></div>
            <div className="card-body">
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--navy-ink)" }}>{fmt(cards.payables ?? 139800)}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Outstanding bills</div>
              </div>
              <div className="dp-field"><span>Overdue bills</span><strong style={{ color: "var(--danger)" }}>{cards.overdue_bills ?? 3}</strong></div>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h3>Bank Balance (est.)</h3></div>
            <div className="card-body">
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--teal)" }}>{fmt(cards.cash_balance ?? 892400)}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Cash & bank estimate</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "bills" && (
        <div className="card">
          <div className="card-head"><h3>Purchase Bills</h3><button className="btn btn-teal">+ New Bill</button></div>
          <div className="empty" style={{ paddingTop: 32 }}>
            <div style={{ fontSize: 24 }}>◇</div>
            <div>Connect to Fuze API to see purchase bills</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>Mock data: R139,800 payables outstanding</div>
          </div>
        </div>
      )}

      {tab === "payments" && (
        <div className="card">
          <div className="card-head"><h3>Payments</h3><button className="btn btn-teal">+ Record Payment</button></div>
          <div className="empty" style={{ paddingTop: 32 }}>
            <div style={{ fontSize: 24 }}>◈</div>
            <div>Connect to Fuze API to see payment history</div>
          </div>
        </div>
      )}
    </div>
  );
}
