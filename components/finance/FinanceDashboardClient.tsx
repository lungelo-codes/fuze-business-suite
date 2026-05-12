"use client";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import StatusChip from "@/components/StatusChip";

type Any = Record<string, any>;
const money = (v?: number) => `R ${Number(v || 0).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
const dateOnly = (v?: string) => (v ? String(v).slice(0, 10) : "—");

const emptyDashboard = { kpis: { revenue:0, expenses:0, profit:0, cashBalance:0, receivables:0, payables:0, cashIn:0, cashOut:0 }, monthly: [] as Any[], aging: ["Current","1-30","31-60","61-90","90+"].map(bucket=>({ bucket, receivable:0, payable:0 })), overdueInvoices: [] as Any[] };
const emptyVat = { outputVat:0, inputVat:0, netVat:0, monthly: [] as Any[], returns: [] as Any[] };
const emptyBank = { bankAccounts: [] as Any[], unreconciledPayments: [] as Any[], totals: { unreconciledCount:0, unreconciledAmount:0 } };
const emptyPayroll = { salarySlips: [] as Any[], totals: { employees:0, gross:0, deductions:0, net:0 } };

async function getJson(url: string) {
  try { const r = await fetch(url, { cache: "no-store" }); const j = await r.json().catch(()=>null); return r.ok && j && !j.error ? j : null; } catch { return null; }
}

const tt = {
  contentStyle: { background: "var(--demo-card)", border: "1px solid var(--demo-line)", borderRadius: 12, boxShadow: "0 8px 24px rgba(22,26,45,.12)", fontSize: 12, color: "var(--demo-text)" },
  cursor: { fill: "var(--demo-soft)" },
};

function StatCard({ label, value, hint, icon, accent }: { label: string; value: string; hint?: string; icon: string; accent?: string }) {
  return (
    <div className="demo-stat-card">
      <div className="demo-stat-top">
        <div>
          <div className="demo-stat-label">{label}</div>
          <div className="demo-stat-value" style={accent ? { color: accent } : {}}>{value}</div>
          {hint && <div className="demo-stat-hint">{hint}</div>}
        </div>
        <div className="demo-stat-icon" style={accent ? { background: `linear-gradient(135deg,${accent},#2E6BE5)` } : {}}>{icon}</div>
      </div>
    </div>
  );
}

function PanelTable({ head, children, empty }: { head: React.ReactNode; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-auto">
      <table className="demo-table">
        <thead><tr>{head}</tr></thead>
        <tbody>{empty ? <tr><td colSpan={99} style={{ color: "var(--demo-muted)", textAlign: "center", padding: 32 }}>No records found.</td></tr> : children}</tbody>
      </table>
    </div>
  );
}

export default function FinanceDashboardClient() {
  const [tab, setTab] = useState("overview");
  const [dashboard, setDashboard] = useState<Any>(emptyDashboard);
  const [vat, setVat] = useState<Any>(emptyVat);
  const [bank, setBank] = useState<Any>(emptyBank);
  const [payroll, setPayroll] = useState<Any>(emptyPayroll);
  const [audit, setAudit] = useState<Any[]>([]);
  const [report, setReport] = useState<Any | null>(null);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [d, v, b, p, a] = await Promise.all([
        getJson("/api/finance/dashboard"), getJson("/api/finance/vat"),
        getJson("/api/finance/bank-reconciliation"), getJson("/api/finance/payroll"),
        getJson("/api/finance/audit"),
      ]);
      if (!alive) return;
      setDashboard({ ...emptyDashboard, ...(d||{}), kpis: { ...emptyDashboard.kpis, ...(d?.kpis||{}) }, monthly: Array.isArray(d?.monthly)?d.monthly:[], aging: Array.isArray(d?.aging)?d.aging:emptyDashboard.aging, overdueInvoices: Array.isArray(d?.overdueInvoices)?d.overdueInvoices:[] });
      setVat({ ...emptyVat, ...(v||{}), monthly: Array.isArray(v?.monthly)?v.monthly:[], returns: Array.isArray(v?.returns)?v.returns:[] });
      setBank({ ...emptyBank, ...(b||{}), bankAccounts: Array.isArray(b?.bankAccounts)?b.bankAccounts:[], unreconciledPayments: Array.isArray(b?.unreconciledPayments)?b.unreconciledPayments:[], totals: { ...emptyBank.totals, ...(b?.totals||{}) } });
      setPayroll({ ...emptyPayroll, ...(p||{}), salarySlips: Array.isArray(p?.salarySlips)?p.salarySlips:[], totals: { ...emptyPayroll.totals, ...(p?.totals||{}) } });
      setAudit(Array.isArray(a)?a:[]);
      setWarning(d ? "" : "Finance data is not fully available yet. Check accounting setup, permissions, or missing records.");
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  async function runReport(report_name: string) {
    try {
      const res = await fetch("/api/finance/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ report_name, filters: {} }) });
      setReport(await res.json().catch(()=>({ error: "Could not run report" })));
    } catch(e) { setReport({ error: e instanceof Error ? e.message : "Could not run report" }); }
    setTab("reports");
  }

  const reportRows = useMemo(() => { const rows = report?.result || report?.message?.result || []; return Array.isArray(rows) ? rows.slice(0, 40) : []; }, [report]);
  const k = { ...emptyDashboard.kpis, ...(dashboard?.kpis||{}) };
  const monthly = Array.isArray(dashboard?.monthly) ? dashboard.monthly : [];
  const aging = Array.isArray(dashboard?.aging) ? dashboard.aging : emptyDashboard.aging;
  const overdueInvoices = Array.isArray(dashboard?.overdueInvoices) ? dashboard.overdueInvoices : [];
  const vatMonthly = Array.isArray(vat?.monthly) ? vat.monthly : [];
  const vatReturns = Array.isArray(vat?.returns) ? vat.returns : [];
  const bankAccounts = Array.isArray(bank?.bankAccounts) ? bank.bankAccounts : [];
  const bankTotals = { ...emptyBank.totals, ...(bank?.totals||{}) };
  const unreconciledPayments = Array.isArray(bank?.unreconciledPayments) ? bank.unreconciledPayments : [];
  const payrollTotals = { ...emptyPayroll.totals, ...(payroll?.totals||{}) };
  const salarySlips = Array.isArray(payroll?.salarySlips) ? payroll.salarySlips : [];

  const tabs = ["overview", "bank", "vat", "payroll", "reports", "audit"];
  const tabLabels: Record<string,string> = { overview: "📊 Overview", bank: "🏦 Banking", vat: "🧾 VAT", payroll: "👥 Payroll", reports: "📈 Reports", audit: "🔍 Audit Trail" };

  return (
    <div className="demo-workspace animate-fade-up">
      {/* Header */}
      <div className="demo-module-titlebar">
        <div>
          <h1>Financial Dashboard</h1>
          <p>Accounting, VAT, cashflow, banking, payroll, reports and audit trail</p>
        </div>
        <div className="demo-module-actions">
          <button className="btn" onClick={()=>runReport("Profit and Loss Statement")}>P&amp;L</button>
          <button className="btn" onClick={()=>runReport("Balance Sheet")}>Balance Sheet</button>
          <button className="btn btn-teal" onClick={()=>runReport("Cash Flow")}>Cash Flow</button>
        </div>
      </div>

      {loading && (
        <div className="demo-panel" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ color: "var(--demo-muted)", fontSize: 14 }}>Loading financial dashboard…</div>
        </div>
      )}
      {!loading && warning && (
        <div className="demo-banner" style={{ borderColor: "rgba(245,158,11,.3)", background: "rgba(245,158,11,.08)", color: "#92400e" }}>
          ⚠️ {warning}
        </div>
      )}

      {/* Tab bar */}
      <div className="demo-panel" style={{ overflow: "visible" }}>
        <div style={{ padding: "14px 18px 0", borderBottom: "1px solid var(--demo-line)" }}>
          <div className="demo-tabbar" style={{ padding: 0, marginBottom: -1 }}>
            {tabs.map(t => (
              <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
                {tabLabels[t]}
              </button>
            ))}
          </div>
        </div>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && !loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {/* KPI rows */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, padding: 18 }}>
              <StatCard label="Revenue" value={money(k.revenue)} hint="Sales invoices" icon="₊" accent="#28a486" />
              <StatCard label="Expenses" value={money(k.expenses)} hint="Purchase invoices" icon="−" accent="#F59E0B" />
              <StatCard label="Profit" value={money(k.profit)} hint="Revenue − expenses" icon="=" accent={k.profit >= 0 ? "#28a486" : "#EF4444"} />
              <StatCard label="Cash Position" value={money(k.cashBalance)} hint="Cash in − cash out" icon="💰" />
              <StatCard label="Receivables" value={money(k.receivables)} hint="Customer outstanding" icon="↑" />
              <StatCard label="Payables" value={money(k.payables)} hint="Supplier outstanding" icon="↓" accent="#F59E0B" />
              <StatCard label="Cash In" value={money(k.cashIn)} hint="Received payments" icon="→" accent="#28a486" />
              <StatCard label="Cash Out" value={money(k.cashOut)} hint="Outgoing payments" icon="←" accent="#EF4444" />
            </div>
            {/* Charts */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid var(--demo-line)" }}>
              <div style={{ padding: "18px 18px 22px", borderRight: "1px solid var(--demo-line)" }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: "var(--demo-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>Profit & Loss Trend</div>
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--demo-line)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--demo-muted)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--demo-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v)=>`R${Number(v)/1000}k`} />
                      <Tooltip {...tt} formatter={(v: any)=>money(Number(v))} />
                      <Legend wrapperStyle={{ fontSize: 12, color: "var(--demo-muted)" }} />
                      <Bar dataKey="income" name="Income" fill="#28a486" radius={[5,5,0,0]} />
                      <Bar dataKey="expense" name="Expense" fill="#F59E0B" radius={[5,5,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ padding: "18px 18px 22px" }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: "var(--demo-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>Cashflow</div>
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--demo-line)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--demo-muted)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--demo-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v)=>`R${Number(v)/1000}k`} />
                      <Tooltip {...tt} formatter={(v: any)=>money(Number(v))} />
                      <Legend wrapperStyle={{ fontSize: 12, color: "var(--demo-muted)" }} />
                      <Area type="monotone" dataKey="cashIn" name="Cash In" stroke="#28a486" fill="#28a486" fillOpacity={0.12} />
                      <Area type="monotone" dataKey="cashOut" name="Cash Out" stroke="#EF4444" fill="#EF4444" fillOpacity={0.08} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            {/* Aging + Overdue */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid var(--demo-line)" }}>
              <div style={{ padding: "18px 18px 22px", borderRight: "1px solid var(--demo-line)" }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: "var(--demo-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>AR / AP Aging</div>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={aging} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--demo-line)" vertical={false} />
                      <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "var(--demo-muted)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--demo-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v)=>`R${Number(v)/1000}k`} />
                      <Tooltip {...tt} formatter={(v: any)=>money(Number(v))} />
                      <Legend wrapperStyle={{ fontSize: 12, color: "var(--demo-muted)" }} />
                      <Bar dataKey="receivable" name="Receivables" fill="#2E6BE5" radius={[5,5,0,0]} />
                      <Bar dataKey="payable" name="Payables" fill="#F59E0B" radius={[5,5,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ padding: 0 }}>
                <div style={{ padding: "18px 18px 8px", fontSize: 11, fontWeight: 900, color: "var(--demo-muted)", textTransform: "uppercase", letterSpacing: "0.12em" }}>Overdue Invoices</div>
                <PanelTable empty={overdueInvoices.length === 0} head={<><th>Invoice</th><th>Customer</th><th>Due</th><th>Outstanding</th><th>Status</th></>}>
                  {overdueInvoices.map((inv: Any) => (
                    <tr key={inv.name}>
                      <td style={{ fontWeight: 800 }}>{inv.name}</td>
                      <td>{inv.customer}</td>
                      <td>{dateOnly(inv.due_date)}</td>
                      <td style={{ fontWeight: 800 }}>{money(inv.outstanding_amount)}</td>
                      <td><StatusChip status={inv.status} /></td>
                    </tr>
                  ))}
                </PanelTable>
              </div>
            </div>
          </div>
        )}

        {/* ── BANK ── */}
        {tab === "bank" && !loading && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, padding: 18 }}>
              <StatCard label="Bank Accounts" value={String(bankAccounts.length)} hint="Bank ledgers" icon="🏦" />
              <StatCard label="Unreconciled" value={String(bankTotals.unreconciledCount)} hint="Payments & journals" icon="⚠" accent={bankTotals.unreconciledCount ? "#F59E0B" : "#28a486"} />
              <StatCard label="Variance Amount" value={money(bankTotals.unreconciledAmount)} hint="Needs matching" icon="≠" accent={bankTotals.unreconciledAmount ? "#EF4444" : "#28a486"} />
              <StatCard label="Status" value={bankTotals.unreconciledCount ? "Action Needed" : "Clean"} hint="Reconciliation control" icon={bankTotals.unreconciledCount ? "!" : "✓"} accent={bankTotals.unreconciledCount ? "#F59E0B" : "#28a486"} />
            </div>
            {bankAccounts.length > 0 && (
              <div style={{ padding: "0 18px 18px", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
                {bankAccounts.map((acc: Any) => (
                  <div key={acc.name} className="crud-stage-card">
                    <span>{acc.account_type || "Bank Account"}</span>
                    <b style={{ fontSize: 15, color: "var(--demo-text)" }}>{acc.account_name || acc.name}</b>
                    <span>{money(acc.balance || 0)} balance</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ borderTop: "1px solid var(--demo-line)" }}>
              <div style={{ padding: "16px 18px 8px", fontSize: 11, fontWeight: 900, color: "var(--demo-muted)", textTransform: "uppercase", letterSpacing: "0.12em" }}>Unreconciled Payments</div>
              <PanelTable empty={unreconciledPayments.length === 0} head={<><th>Payment</th><th>Date</th><th>Type</th><th>Party</th><th>Amount</th><th>Reference</th></>}>
                {unreconciledPayments.slice(0, 30).map((p: Any) => (
                  <tr key={p.name}>
                    <td style={{ fontWeight: 800 }}>{p.name}</td>
                    <td>{dateOnly(p.posting_date)}</td>
                    <td><span className="chip">{p.payment_type}</span></td>
                    <td>{p.party}</td>
                    <td style={{ fontWeight: 800 }}>{money(p.paid_amount)}</td>
                    <td style={{ color: "var(--demo-muted)" }}>{p.reference_no || "—"}</td>
                  </tr>
                ))}
              </PanelTable>
            </div>
          </div>
        )}

        {/* ── VAT ── */}
        {tab === "vat" && !loading && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, padding: 18 }}>
              <StatCard label="Output VAT" value={money(vat.outputVat)} hint="VAT charged on sales" icon="▲" />
              <StatCard label="Input VAT" value={money(vat.inputVat)} hint="VAT paid on purchases" icon="▼" accent="#28a486" />
              <StatCard label="Net VAT" value={money(vat.netVat)} hint="Payable / refundable" icon="=" accent={vat.netVat >= 0 ? "#F59E0B" : "#28a486"} />
              <StatCard label="VAT Returns" value={String(vatReturns.length)} hint="Total return records" icon="🧾" />
            </div>
            <div style={{ borderTop: "1px solid var(--demo-line)", padding: "18px 18px 22px" }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "var(--demo-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>VAT Movement</div>
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={vatMonthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--demo-line)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--demo-muted)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--demo-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v)=>`R${Number(v)/1000}k`} />
                    <Tooltip {...tt} formatter={(v: any)=>money(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "var(--demo-muted)" }} />
                    <Line dataKey="vatOutput" name="Output VAT" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line dataKey="vatInput" name="Input VAT" stroke="#28a486" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line dataKey="netVat" name="Net VAT" stroke="#242048" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{ borderTop: "1px solid var(--demo-line)" }}>
              <div style={{ padding: "16px 18px 8px", fontSize: 11, fontWeight: 900, color: "var(--demo-muted)", textTransform: "uppercase", letterSpacing: "0.12em" }}>Recent VAT Returns</div>
              <PanelTable empty={vatReturns.length === 0} head={<><th>Return</th><th>Company</th><th>Period</th><th>Status</th><th>Output</th><th>Input</th><th>Net</th></>}>
                {vatReturns.slice(0, 30).map((r: Any) => (
                  <tr key={r.name}>
                    <td style={{ fontWeight: 800 }}>{r.name}</td>
                    <td>{r.company}</td>
                    <td style={{ fontSize: 12, color: "var(--demo-muted)" }}>{dateOnly(r.from_date)} → {dateOnly(r.to_date)}</td>
                    <td><StatusChip status={r.status} /></td>
                    <td>{money(r.output_vat)}</td>
                    <td>{money(r.input_vat)}</td>
                    <td style={{ fontWeight: 800 }}>{money(r.net_vat)}</td>
                  </tr>
                ))}
              </PanelTable>
            </div>
          </div>
        )}

        {/* ── PAYROLL ── */}
        {tab === "payroll" && !loading && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, padding: 18 }}>
              <StatCard label="Employees" value={String(payrollTotals.employees)} hint="Active payroll records" icon="👥" />
              <StatCard label="Gross Pay" value={money(payrollTotals.gross)} hint="Total salary slips" icon="₊" />
              <StatCard label="Deductions" value={money(payrollTotals.deductions)} hint="PAYE / UIF / other" icon="−" accent="#F59E0B" />
              <StatCard label="Net Pay" value={money(payrollTotals.net)} hint="Employee payout" icon="✓" accent="#28a486" />
            </div>
            <div style={{ borderTop: "1px solid var(--demo-line)" }}>
              <div style={{ padding: "16px 18px 8px", fontSize: 11, fontWeight: 900, color: "var(--demo-muted)", textTransform: "uppercase", letterSpacing: "0.12em" }}>Latest Salary Slips</div>
              <PanelTable empty={salarySlips.length === 0} head={<><th>Slip</th><th>Employee</th><th>Period</th><th>Gross</th><th>Deductions</th><th>Net</th><th>Status</th></>}>
                {salarySlips.slice(0, 30).map((s: Any) => (
                  <tr key={s.name}>
                    <td style={{ fontWeight: 800 }}>{s.name}</td>
                    <td>{s.employee_name || s.employee}</td>
                    <td style={{ fontSize: 12, color: "var(--demo-muted)" }}>{dateOnly(s.start_date)} → {dateOnly(s.end_date)}</td>
                    <td>{money(s.gross_pay)}</td>
                    <td>{money(s.total_deduction)}</td>
                    <td style={{ fontWeight: 800 }}>{money(s.net_pay)}</td>
                    <td><StatusChip status={s.status || (s.docstatus === 1 ? "Submitted" : "Draft")} /></td>
                  </tr>
                ))}
              </PanelTable>
            </div>
          </div>
        )}

        {/* ── REPORTS ── */}
        {tab === "reports" && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ padding: 18, borderBottom: "1px solid var(--demo-line)", display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn" onClick={()=>runReport("Profit and Loss Statement")}>Profit & Loss</button>
              <button className="btn" onClick={()=>runReport("Balance Sheet")}>Balance Sheet</button>
              <button className="btn btn-teal" onClick={()=>runReport("Cash Flow")}>Cash Flow</button>
            </div>
            {report?.error ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--demo-muted)" }}>⚠️ {String(report.error)}</div>
            ) : !report ? (
              <div style={{ padding: 48, textAlign: "center", color: "var(--demo-muted)", fontSize: 14 }}>Choose a report above to run it live.</div>
            ) : (
              <PanelTable empty={reportRows.length === 0} head={<th colSpan={8}>Report Results</th>}>
                {reportRows.map((row: any, idx: number) => (
                  <tr key={idx}>
                    {(Array.isArray(row) ? row : Object.values(row)).slice(0, 8).map((cell: any, i: number) => (
                      <td key={i}>{typeof cell === "number" ? money(cell) : String(cell ?? "—")}</td>
                    ))}
                  </tr>
                ))}
              </PanelTable>
            )}
          </div>
        )}

        {/* ── AUDIT ── */}
        {tab === "audit" && (
          <div>
            <PanelTable empty={audit.length === 0} head={<><th>Date</th><th>User</th><th>Action</th><th>DocType</th><th>Document</th><th>Details</th></>}>
              {audit.slice(0, 80).map((r: Any) => (
                <tr key={r.name}>
                  <td style={{ fontSize: 12, color: "var(--demo-muted)" }}>{dateOnly(r.timestamp || r.modified)}</td>
                  <td>{r.user}</td>
                  <td><span className="chip">{r.action}</span></td>
                  <td>{r.reference_doctype}</td>
                  <td style={{ fontWeight: 800 }}>{r.reference_name}</td>
                  <td style={{ maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--demo-muted)", fontSize: 12 }}>{r.details || "—"}</td>
                </tr>
              ))}
            </PanelTable>
          </div>
        )}
      </div>
    </div>
  );
}
