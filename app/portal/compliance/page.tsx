"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
type ComplianceStatus = "overdue" | "pending" | "filed" | "ok" | "upcoming";
type ComplianceTab = "overview" | "vat" | "paye" | "cipc" | "calendar";

interface ComplianceDashboard {
  vat: { next_due: string; period: string; amount_due: number; status: ComplianceStatus; filed_this_year: number; vat_number?: string; registration_date?: string };
  paye: { next_due: string; period: string; amount_due: number; status: ComplianceStatus; filed_this_year: number; emp_number?: string };
  uif: { next_due: string; period: string; amount_due: number; status: ComplianceStatus; filed_this_year: number };
  sdl: { next_due: string; period: string; amount_due: number; status: ComplianceStatus; filed_this_year: number };
  cipc: { next_due: string; period: string; amount_due: number; status: ComplianceStatus; filed_this_year: number; reg_number?: string; company_status?: string; directors?: number };
  workmen: { next_due: string; period: string; amount_due: number; status: ComplianceStatus; filed_this_year: number };
  provisional_tax: { next_due: string; period: string; amount_due: number; status: ComplianceStatus };
  overall_score: number;
  total_liability: number;
}

interface VatReturn {
  period: string; due: string; output_vat: number; input_vat: number; net_vat: number;
  status: "pending" | "filed" | "overdue"; filed_date?: string;
}

interface PayrollSubmission {
  period: string; due: string; paye: number; uif: number; sdl: number; total: number;
  status: "overdue" | "filed" | "pending"; filed_date?: string;
}

const fmt = (n: number) => "R " + Number(n || 0).toLocaleString("en-ZA", { minimumFractionDigits: 0 });
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "—";
const daysUntil = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);

const STATUS_CFG: Record<ComplianceStatus, { label: string; bg: string; color: string; icon: string }> = {
  overdue:  { label: "Overdue",    bg: "var(--danger-bg)", color: "var(--danger)", icon: "⚠" },
  pending:  { label: "Due Soon",   bg: "var(--warn-bg)",   color: "var(--warn)",   icon: "⏰" },
  filed:    { label: "Filed",      bg: "var(--ok-bg)",     color: "var(--ok)",     icon: "✓" },
  ok:       { label: "Up to Date", bg: "var(--ok-bg)",     color: "var(--ok)",     icon: "✓" },
  upcoming: { label: "Upcoming",   bg: "var(--blue-bg)",   color: "var(--blue)",   icon: "📅" },
};

// Score ring component
function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "var(--ok)" : score >= 60 ? "var(--warn)" : "var(--danger)";
  const label = score >= 80 ? "Good Standing" : score >= 60 ? "Needs Attention" : "Critical";
  return (
    <div style={{ textAlign: "center", padding: "16px 0" }}>
      <div style={{ position: "relative", display: "inline-block", width: 100, height: 100 }}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--line)" strokeWidth="10" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${(score / 100) * 264} 264`} strokeLinecap="round"
            transform="rotate(-90 50 50)" />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontWeight: 900, fontSize: 22, color, lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 700 }}>/ 100</div>
        </div>
      </div>
      <div style={{ fontWeight: 700, fontSize: 13, color, marginTop: 6 }}>{label}</div>
    </div>
  );
}

// Compliance item card
function ComplianceCard({ id, label, fullName, authority, period, dueDate, amount, status, extra, onAction }: {
  id: string; label: string; fullName: string; authority: string; period: string;
  dueDate: string; amount: number; status: ComplianceStatus; extra?: React.ReactNode;
  onAction: (id: string) => void;
}) {
  const cfg = STATUS_CFG[status];
  const days = daysUntil(dueDate);
  return (
    <div className="compliance-row" style={{ borderLeft: `4px solid ${cfg.color}`, flexDirection: "column", alignItems: "stretch", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="compliance-tag" style={{ background: cfg.bg, color: cfg.color }}>{cfg.icon} {cfg.label}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{label} <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 12 }}>— {fullName}</span></div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{authority} · {period}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          {amount > 0 && <div style={{ fontWeight: 800, fontSize: 15, color: status === "overdue" ? "var(--danger)" : "var(--navy-ink)" }}>{fmt(amount)}</div>}
          <div style={{ fontSize: 11, color: status === "overdue" ? "var(--danger)" : "var(--muted)" }}>
            {status === "overdue" ? `${Math.abs(days)} days overdue` : status === "ok" || status === "filed" ? "Up to date" : `Due in ${days} days`}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>Due: {fmtDate(dueDate)}</div>
        </div>
      </div>
      {extra && <div style={{ paddingTop: 8, borderTop: "1px solid var(--line-2)" }}>{extra}</div>}
      {(status === "overdue" || status === "pending") && (
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-teal" style={{ fontSize: 12 }} onClick={() => onAction(id)}>
            {status === "overdue" ? "⚠ File Now" : "📤 Prepare Filing"}
          </button>
          <button className="btn" style={{ fontSize: 12 }}>View History</button>
        </div>
      )}
    </div>
  );
}

// ─── Main Compliance Page ─────────────────────────────────────────────────────
export default function CompliancePage() {
  const [tab, setTab] = useState<ComplianceTab>("overview");
  const [dashboard, setDashboard] = useState<ComplianceDashboard | null>(null);
  const [vatReturns, setVatReturns] = useState<VatReturn[]>([]);
  const [payrollSubs, setPayrollSubs] = useState<PayrollSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<string | null>(null);
  const [recordFiling, setRecordFiling] = useState(false);
  const [filingForm, setFilingForm] = useState({ type: "VAT", period: "", reference: "", amount: "" });
  const [filingSaved, setFilingSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const [dash, vat, payroll] = await Promise.allSettled([
        api.getComplianceDashboard(), api.getVatReturns(), api.getPayrollSubmissions(),
      ]);
      if (dash.status === "fulfilled") setDashboard(dash.value.data as ComplianceDashboard);
      if (vat.status === "fulfilled") setVatReturns((vat.value.data as { returns: VatReturn[] })?.returns ?? []);
      if (payroll.status === "fulfilled") setPayrollSubs((payroll.value.data as { submissions: PayrollSubmission[] })?.submissions ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="page-loading"><div className="loading-spinner" /><p>Loading compliance data…</p></div>;
  if (!dashboard) return null;

  const overdueItems = Object.values(dashboard).filter((v) => typeof v === "object" && v !== null && "status" in v && (v as { status: string }).status === "overdue");
  const pendingItems = Object.values(dashboard).filter((v) => typeof v === "object" && v !== null && "status" in v && (v as { status: string }).status === "pending");
  const totalLiability = dashboard.total_liability;

  const saveFiling = () => {
    setFilingSaved(true);
    setTimeout(() => { setRecordFiling(false); setFilingSaved(false); setFilingForm({ type: "VAT", period: "", reference: "", amount: "" }); }, 1500);
  };

  // Calendar items
  const calendarItems = [
    { label: "PAYE / UIF / SDL", authority: "SARS", due: dashboard.paye.next_due, status: dashboard.paye.status, amount: dashboard.paye.amount_due + dashboard.uif.amount_due + dashboard.sdl.amount_due },
    { label: "VAT 201", authority: "SARS eFiling", due: dashboard.vat.next_due, status: dashboard.vat.status, amount: dashboard.vat.amount_due },
    { label: "CIPC Annual Return", authority: "CIPC", due: dashboard.cipc.next_due, status: dashboard.cipc.status, amount: dashboard.cipc.amount_due },
    { label: "WCA / COIDA", authority: "Compensation Fund", due: dashboard.workmen.next_due, status: dashboard.workmen.status, amount: dashboard.workmen.amount_due },
    { label: "Provisional Tax (IRP6)", authority: "SARS", due: dashboard.provisional_tax.next_due, status: dashboard.provisional_tax.status, amount: 0 },
  ].sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">SA Compliance Dashboard</h1>
          <p className="page-sub">Unified view of all South African business obligations — SARS (VAT · PAYE · UIF · SDL) · CIPC · Compensation Fund</p>
        </div>
        <button className="btn btn-teal" onClick={() => setRecordFiling(true)}>+ Record Filing</button>
      </div>

      {/* Overdue alert */}
      {overdueItems.length > 0 && (
        <div className="alert-banner" style={{ background: "var(--danger-bg)", borderColor: "var(--danger)", marginBottom: 16 }}>
          <span style={{ color: "var(--danger)", fontSize: 18 }}>⚠</span>
          <div>
            <strong style={{ color: "var(--danger)" }}>Urgent: {overdueItems.length} overdue submission{overdueItems.length > 1 ? "s" : ""}</strong>
            <div style={{ fontSize: 13, marginTop: 2 }}>
              Total outstanding: <strong>{fmt(totalLiability)}</strong>. SARS penalties accumulate daily — submit as soon as possible.
            </div>
          </div>
        </div>
      )}

      {/* KPI row */}
      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        <div className="kpi" style={{ borderLeft: "4px solid var(--danger)" }}>
          <div className="ic-wrap" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>⚠</div>
          <div className="label">Overdue</div>
          <div className="val">{overdueItems.length}</div>
          <div className="hint" style={{ color: "var(--danger)" }}>Immediate action needed</div>
        </div>
        <div className="kpi" style={{ borderLeft: "4px solid var(--warn)" }}>
          <div className="ic-wrap" style={{ background: "var(--warn-bg)", color: "var(--warn)" }}>⏰</div>
          <div className="label">Due Soon</div>
          <div className="val">{pendingItems.length}</div>
          <div className="hint">Prepare now</div>
        </div>
        <div className="kpi" style={{ borderLeft: "4px solid var(--teal)" }}>
          <div className="ic-wrap" style={{ background: "#E3F6F0", color: "var(--teal)" }}>R</div>
          <div className="label">Total Liability</div>
          <div className="val" style={{ fontSize: 18 }}>{fmt(totalLiability)}</div>
          <div className="hint">Outstanding to SARS</div>
        </div>
        <div className="kpi" style={{ borderLeft: "4px solid var(--ok)" }}>
          <div className="ic-wrap" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}>◉</div>
          <div className="label">Compliance Score</div>
          <div className="val">{dashboard.overall_score}/100</div>
          <div className="hint">{dashboard.overall_score >= 80 ? "Good standing" : dashboard.overall_score >= 60 ? "Needs attention" : "Critical"}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="crm-tabs">
        {([
          { id: "overview", label: "◉ Overview" },
          { id: "vat", label: "◇ VAT / SARS" },
          { id: "paye", label: "◎ PAYE / UIF / SDL" },
          { id: "cipc", label: "◈ CIPC" },
          { id: "calendar", label: "📅 Compliance Calendar" },
        ] as const).map(({ id, label }) => (
          <button key={id} className={`crm-tab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div className="two-col" style={{ alignItems: "flex-start" }}>
          <div>
            <div className="compliance-list">
              {/* SARS Section */}
              <div style={{ fontWeight: 800, fontSize: 12, color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, marginTop: 4 }}>SARS Obligations</div>
              <ComplianceCard id="paye" label="PAYE" fullName="Pay As You Earn" authority="SARS eFiling" period={dashboard.paye.period}
                dueDate={dashboard.paye.next_due} amount={dashboard.paye.amount_due} status={dashboard.paye.status}
                extra={dashboard.paye.emp_number ? <div style={{ fontSize: 12, color: "var(--muted)" }}>EMP Number: <strong>{dashboard.paye.emp_number}</strong></div> : undefined}
                onAction={setActionModal} />
              <ComplianceCard id="uif" label="UIF" fullName="Unemployment Insurance Fund" authority="Department of Employment" period={dashboard.uif.period}
                dueDate={dashboard.uif.next_due} amount={dashboard.uif.amount_due} status={dashboard.uif.status}
                onAction={setActionModal} />
              <ComplianceCard id="sdl" label="SDL" fullName="Skills Development Levy" authority="SARS eFiling" period={dashboard.sdl.period}
                dueDate={dashboard.sdl.next_due} amount={dashboard.sdl.amount_due} status={dashboard.sdl.status}
                onAction={setActionModal} />
              <ComplianceCard id="vat" label="VAT" fullName="Value Added Tax (VAT201)" authority="SARS eFiling" period={dashboard.vat.period}
                dueDate={dashboard.vat.next_due} amount={dashboard.vat.amount_due} status={dashboard.vat.status}
                extra={dashboard.vat.vat_number ? <div style={{ fontSize: 12, color: "var(--muted)" }}>VAT Number: <strong>{dashboard.vat.vat_number}</strong> · Registered: {fmtDate(dashboard.vat.registration_date || "")}</div> : undefined}
                onAction={setActionModal} />
              <ComplianceCard id="provisional_tax" label="Provisional Tax" fullName="IRP6 — Companies" authority="SARS eFiling" period={dashboard.provisional_tax.period}
                dueDate={dashboard.provisional_tax.next_due} amount={dashboard.provisional_tax.amount_due} status={dashboard.provisional_tax.status}
                onAction={setActionModal} />

              {/* CIPC Section */}
              <div style={{ fontWeight: 800, fontSize: 12, color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, marginTop: 16 }}>CIPC — Companies and Intellectual Property Commission</div>
              <ComplianceCard id="cipc" label="CIPC Annual Return" fullName="Companies and Intellectual Property Commission" authority="CIPC Portal" period={dashboard.cipc.period}
                dueDate={dashboard.cipc.next_due} amount={dashboard.cipc.amount_due} status={dashboard.cipc.status}
                extra={
                  <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                    {dashboard.cipc.reg_number && <span>Reg No: <strong>{dashboard.cipc.reg_number}</strong></span>}
                    {dashboard.cipc.company_status && <span>Status: <strong style={{ color: "var(--ok)" }}>{dashboard.cipc.company_status}</strong></span>}
                    {dashboard.cipc.directors && <span>Directors: <strong>{dashboard.cipc.directors}</strong></span>}
                  </div>
                }
                onAction={setActionModal} />

              {/* Compensation Fund */}
              <div style={{ fontWeight: 800, fontSize: 12, color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, marginTop: 16 }}>Compensation Fund (COIDA / WCA)</div>
              <ComplianceCard id="workmen" label="WCA / COIDA" fullName="Workmen's Compensation Assessment" authority="Compensation Fund" period={dashboard.workmen.period}
                dueDate={dashboard.workmen.next_due} amount={dashboard.workmen.amount_due} status={dashboard.workmen.status}
                onAction={setActionModal} />
            </div>
          </div>

          {/* Right: score + quick links */}
          <div>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-head"><h3>Compliance Score</h3></div>
              <div className="card-body">
                <ScoreRing score={dashboard.overall_score} />
                <div style={{ marginTop: 12 }}>
                  {[
                    { label: "PAYE / UIF / SDL", status: dashboard.paye.status },
                    { label: "VAT 201", status: dashboard.vat.status },
                    { label: "CIPC Annual Return", status: dashboard.cipc.status },
                    { label: "WCA / COIDA", status: dashboard.workmen.status },
                  ].map((item) => {
                    const cfg = STATUS_CFG[item.status];
                    return (
                      <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--line-2)", fontSize: 13 }}>
                        <span>{item.label}</span>
                        <span className="chip" style={{ background: cfg.bg, color: cfg.color, fontSize: 10 }}>{cfg.icon} {cfg.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head"><h3>Quick Links</h3></div>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "SARS eFiling", url: "https://www.sarsefiling.co.za", icon: "→" },
                  { label: "CIPC Portal", url: "https://www.cipc.co.za", icon: "→" },
                  { label: "uFiling (UIF)", url: "https://www.ufiling.co.za", icon: "→" },
                  { label: "Compensation Fund", url: "https://www.labour.gov.za", icon: "→" },
                ].map((link) => (
                  <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="btn" style={{ justifyContent: "space-between", textDecoration: "none" }}>
                    <span>{link.label}</span><span>{link.icon}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VAT / SARS ── */}
      {tab === "vat" && (
        <div>
          <div className="two-col" style={{ alignItems: "flex-start", marginBottom: 18 }}>
            <div className="card">
              <div className="card-head"><h3>VAT Profile</h3></div>
              <div className="card-body">
                <div className="dp-field"><span>VAT Number</span><strong>{dashboard.vat.vat_number || "Not registered"}</strong></div>
                <div className="dp-field"><span>Registration Date</span><strong>{fmtDate(dashboard.vat.registration_date || "")}</strong></div>
                <div className="dp-field"><span>Current Period</span><strong>{dashboard.vat.period}</strong></div>
                <div className="dp-field"><span>Next Due</span><strong style={{ color: dashboard.vat.status === "overdue" ? "var(--danger)" : "var(--navy-ink)" }}>{fmtDate(dashboard.vat.next_due)}</strong></div>
                <div className="dp-field"><span>Amount Due</span><strong style={{ color: "var(--teal)" }}>{fmt(dashboard.vat.amount_due)}</strong></div>
                <div className="dp-field"><span>Filed This Year</span><strong>{dashboard.vat.filed_this_year} returns</strong></div>
                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <button className="btn btn-teal">Submit VAT201 on eFiling →</button>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-head"><h3>VAT Calculation Guide</h3></div>
              <div className="card-body">
                <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                  <div style={{ marginBottom: 8 }}><strong>Output VAT</strong> — 15% charged on all taxable sales</div>
                  <div style={{ marginBottom: 8 }}><strong>Input VAT</strong> — 15% paid on business purchases (claimable)</div>
                  <div style={{ marginBottom: 8 }}><strong>Net VAT</strong> = Output VAT − Input VAT</div>
                  <div style={{ background: "var(--blue-bg)", borderRadius: 8, padding: 10, marginTop: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Current Period Estimate</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span>Output VAT</span><span>{fmt(vatReturns[0]?.output_vat ?? 51300)}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span>Input VAT (claimable)</span><span>− {fmt(vatReturns[0]?.input_vat ?? 32800)}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, borderTop: "1px solid var(--line)", marginTop: 6, paddingTop: 6 }}><span>Net VAT Payable</span><span style={{ color: "var(--teal)" }}>{fmt(vatReturns[0]?.net_vat ?? 18500)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>VAT Return History</h3></div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="data">
                <thead>
                  <tr><th>Period</th><th>Due Date</th><th>Output VAT</th><th>Input VAT</th><th>Net VAT</th><th>Status</th><th>Filed</th></tr>
                </thead>
                <tbody>
                  {vatReturns.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700 }}>{r.period}</td>
                      <td>{fmtDate(r.due)}</td>
                      <td>{fmt(r.output_vat)}</td>
                      <td>{fmt(r.input_vat)}</td>
                      <td style={{ fontWeight: 700 }}>{fmt(r.net_vat)}</td>
                      <td>
                        <span className={`chip ${r.status === "filed" ? "ok" : r.status === "overdue" ? "danger" : "warn"}`}>
                          {STATUS_CFG[r.status]?.icon} {STATUS_CFG[r.status]?.label ?? r.status}
                        </span>
                      </td>
                      <td style={{ color: "var(--muted)", fontSize: 12 }}>{r.filed_date ? fmtDate(r.filed_date) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── PAYE / UIF / SDL ── */}
      {tab === "paye" && (
        <div>
          <div className="two-col" style={{ alignItems: "flex-start", marginBottom: 18 }}>
            <div className="card">
              <div className="card-head"><h3>Payroll Taxes — Current Period</h3></div>
              <div className="card-body">
                <div style={{ background: dashboard.paye.status === "overdue" ? "var(--danger-bg)" : "var(--warn-bg)", borderRadius: 10, padding: 12, marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, color: dashboard.paye.status === "overdue" ? "var(--danger)" : "var(--warn)" }}>
                    {dashboard.paye.status === "overdue" ? "⚠ OVERDUE — Submit immediately" : "⏰ Due soon — Prepare EMP201"}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Period: {dashboard.paye.period} · Due: {fmtDate(dashboard.paye.next_due)}</div>
                </div>
                <div className="dp-field"><span>PAYE (Employees Tax)</span><strong style={{ color: "var(--danger)" }}>{fmt(dashboard.paye.amount_due)}</strong></div>
                <div className="dp-field"><span>UIF (1% employer + 1% employee)</span><strong>{fmt(dashboard.uif.amount_due)}</strong></div>
                <div className="dp-field"><span>SDL (1% of payroll)</span><strong>{fmt(dashboard.sdl.amount_due)}</strong></div>
                <div style={{ borderTop: "2px solid var(--line)", paddingTop: 10, marginTop: 10 }}>
                  <div className="dp-field"><span>Total EMP201 Submission</span><strong style={{ fontSize: 16, color: "var(--teal)" }}>{fmt(dashboard.paye.amount_due + dashboard.uif.amount_due + dashboard.sdl.amount_due)}</strong></div>
                </div>
                {dashboard.paye.emp_number && <div className="dp-field"><span>EMP Number</span><strong>{dashboard.paye.emp_number}</strong></div>}
                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <button className="btn btn-teal">Submit EMP201 on eFiling →</button>
                  <button className="btn">Submit UIF on uFiling →</button>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-head"><h3>What is EMP201?</h3></div>
              <div className="card-body" style={{ fontSize: 13, lineHeight: 1.7 }}>
                <p>The <strong>EMP201</strong> is a monthly declaration submitted to SARS that combines:</p>
                <ul style={{ paddingLeft: 18, marginTop: 8 }}>
                  <li><strong>PAYE</strong> — Tax withheld from employee salaries</li>
                  <li><strong>UIF</strong> — 1% employer + 1% employee contribution</li>
                  <li><strong>SDL</strong> — 1% of total payroll (if annual payroll &gt; R500k)</li>
                </ul>
                <div style={{ background: "var(--blue-bg)", borderRadius: 8, padding: 10, marginTop: 12 }}>
                  <strong>Due date:</strong> 7th of every month (or next business day).<br />
                  Late submissions attract a <strong>10% penalty</strong> plus interest.
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>Payroll Submission History</h3></div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="data">
                <thead>
                  <tr><th>Period</th><th>Due Date</th><th>PAYE</th><th>UIF</th><th>SDL</th><th>Total</th><th>Status</th><th>Filed</th></tr>
                </thead>
                <tbody>
                  {payrollSubs.map((s, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700 }}>{s.period}</td>
                      <td>{fmtDate(s.due)}</td>
                      <td>{fmt(s.paye)}</td>
                      <td>{fmt(s.uif)}</td>
                      <td>{fmt(s.sdl)}</td>
                      <td style={{ fontWeight: 700 }}>{fmt(s.total)}</td>
                      <td>
                        <span className={`chip ${s.status === "filed" ? "ok" : s.status === "overdue" ? "danger" : "warn"}`}>
                          {STATUS_CFG[s.status]?.icon} {STATUS_CFG[s.status]?.label ?? s.status}
                        </span>
                      </td>
                      <td style={{ color: "var(--muted)", fontSize: 12 }}>{s.filed_date ? fmtDate(s.filed_date) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── CIPC ── */}
      {tab === "cipc" && (
        <div className="two-col" style={{ alignItems: "flex-start" }}>
          <div className="card">
            <div className="card-head"><h3>CIPC — Company Registration</h3></div>
            <div className="card-body">
              <div style={{ background: "var(--ok-bg)", borderRadius: 10, padding: 12, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: "var(--ok)" }}>✓ Company in Good Standing</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Annual return due: {fmtDate(dashboard.cipc.next_due)}</div>
              </div>
              {dashboard.cipc.reg_number && <div className="dp-field"><span>Registration Number</span><strong>{dashboard.cipc.reg_number}</strong></div>}
              {dashboard.cipc.company_status && <div className="dp-field"><span>Company Status</span><strong style={{ color: "var(--ok)" }}>{dashboard.cipc.company_status}</strong></div>}
              {dashboard.cipc.directors && <div className="dp-field"><span>Number of Directors</span><strong>{dashboard.cipc.directors}</strong></div>}
              <div className="dp-field"><span>Annual Return Due</span><strong>{fmtDate(dashboard.cipc.next_due)}</strong></div>
              <div className="dp-field"><span>Filing Fee</span><strong>{fmt(dashboard.cipc.amount_due)}</strong></div>
              <div className="dp-field"><span>Filed This Year</span><strong>{dashboard.cipc.filed_this_year} return(s)</strong></div>
              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <button className="btn btn-teal">File on CIPC Portal →</button>
                <button className="btn">Download Certificate</button>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h3>CIPC Annual Return Guide</h3></div>
            <div className="card-body" style={{ fontSize: 13, lineHeight: 1.7 }}>
              <p>All registered companies must file an <strong>Annual Return</strong> with CIPC within the anniversary month of incorporation.</p>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Filing Fees (2025):</div>
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <thead><tr style={{ background: "#F9FAFC" }}><th style={{ padding: "6px 8px", textAlign: "left" }}>Turnover</th><th style={{ padding: "6px 8px", textAlign: "right" }}>Fee</th></tr></thead>
                  <tbody>
                    {[["R0 – R1M", "R475"], ["R1M – R10M", "R1,750"], ["R10M – R25M", "R3,450"], ["> R25M", "R3,450"]].map(([t, f]) => (
                      <tr key={t} style={{ borderBottom: "1px solid var(--line-2)" }}>
                        <td style={{ padding: "6px 8px" }}>{t}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700 }}>{f}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ background: "var(--warn-bg)", borderRadius: 8, padding: 10, marginTop: 12 }}>
                <strong>⚠ Important:</strong> Failure to file results in deregistration. A deregistered company cannot legally trade.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Compliance Calendar ── */}
      {tab === "calendar" && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head"><h3>📅 Upcoming Compliance Deadlines</h3></div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="data">
                <thead>
                  <tr><th>Obligation</th><th>Authority</th><th>Due Date</th><th>Days Left</th><th>Amount</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {calendarItems.map((item, i) => {
                    const days = daysUntil(item.due);
                    const cfg = STATUS_CFG[item.status];
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 700 }}>{item.label}</td>
                        <td style={{ color: "var(--muted)", fontSize: 12 }}>{item.authority}</td>
                        <td>{fmtDate(item.due)}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: days < 0 ? "var(--danger)" : days < 14 ? "var(--warn)" : "var(--ok)" }}>
                            {days < 0 ? `${Math.abs(days)}d overdue` : `${days} days`}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{item.amount > 0 ? fmt(item.amount) : "—"}</td>
                        <td><span className="chip" style={{ background: cfg.bg, color: cfg.color, fontSize: 10 }}>{cfg.icon} {cfg.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>Annual Compliance Timeline</h3></div>
            <div className="card-body">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 6 }}>
                {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month, i) => {
                  const monthItems = calendarItems.filter((item) => new Date(item.due).getMonth() === i);
                  const hasOverdue = monthItems.some((item) => item.status === "overdue");
                  const hasPending = monthItems.some((item) => item.status === "pending");
                  return (
                    <div key={month} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4, fontWeight: 700 }}>{month}</div>
                      <div style={{ background: hasOverdue ? "var(--danger-bg)" : hasPending ? "var(--warn-bg)" : monthItems.length > 0 ? "var(--ok-bg)" : "var(--bg)", borderRadius: 6, padding: "6px 4px", border: "1px solid var(--line-2)", minHeight: 40 }}>
                        {monthItems.map((item, j) => (
                          <div key={j} style={{ fontSize: 9, fontWeight: 700, color: STATUS_CFG[item.status].color, lineHeight: 1.4 }}>{item.label.split(" ")[0]}</div>
                        ))}
                        {monthItems.length === 0 && <div style={{ fontSize: 9, color: "var(--muted)" }}>—</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Record Filing Modal ── */}
      {recordFiling && (
        <div className="deal-panel-overlay" onClick={(e) => e.target === e.currentTarget && setRecordFiling(false)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 460, maxWidth: "95vw", boxShadow: "0 20px 60px rgba(0,0,0,.18)" }}>
            {filingSaved ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: "var(--ok)" }}>Filing Recorded!</div>
                <div style={{ color: "var(--muted)", marginTop: 8 }}>Your compliance record has been updated.</div>
              </div>
            ) : (
              <>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 20 }}>+ Record Filing</div>
                <label className="label">Compliance Type</label>
                <select className="inp" value={filingForm.type} onChange={(e) => setFilingForm({ ...filingForm, type: e.target.value })}>
                  {["VAT", "PAYE / UIF / SDL", "CIPC Annual Return", "WCA / COIDA", "Provisional Tax", "Other"].map((t) => <option key={t}>{t}</option>)}
                </select>
                <label className="label">Period</label>
                <input className="inp" value={filingForm.period} onChange={(e) => setFilingForm({ ...filingForm, period: e.target.value })} placeholder="e.g. April 2025" />
                <label className="label">Reference / Confirmation Number</label>
                <input className="inp" value={filingForm.reference} onChange={(e) => setFilingForm({ ...filingForm, reference: e.target.value })} placeholder="e.g. SARS-2025-04-001" />
                <label className="label">Amount Paid (ZAR)</label>
                <input type="number" className="inp" value={filingForm.amount} onChange={(e) => setFilingForm({ ...filingForm, amount: e.target.value })} placeholder="0.00" />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button className="btn btn-teal" style={{ flex: 1 }} onClick={saveFiling}>Save Filing Record</button>
                  <button className="btn" onClick={() => setRecordFiling(false)}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div className="deal-panel-overlay" onClick={(e) => e.target === e.currentTarget && setActionModal(null)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 440, maxWidth: "95vw", boxShadow: "0 20px 60px rgba(0,0,0,.18)" }}>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>File {actionModal.toUpperCase()}</div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Follow these steps to submit your compliance filing:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(actionModal === "paye" || actionModal === "uif" || actionModal === "sdl" ? [
                "Log into SARS eFiling at www.sarsefiling.co.za",
                "Navigate to Returns → EMP201",
                "Complete the PAYE, UIF, and SDL amounts",
                "Submit and pay the total amount",
                "Download the payment confirmation",
                "Record the filing in Fuze using '+ Record Filing'",
              ] : actionModal === "vat" ? [
                "Log into SARS eFiling at www.sarsefiling.co.za",
                "Navigate to Returns → VAT201",
                "Enter output VAT and input VAT amounts",
                "Submit the return and pay net VAT",
                "Download the VAT201 confirmation",
                "Record the filing in Fuze using '+ Record Filing'",
              ] : [
                "Log into the CIPC portal at www.cipc.co.za",
                "Navigate to Annual Returns",
                "Complete the annual return form",
                "Pay the filing fee",
                "Download the confirmation",
              ]).map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--teal)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ fontSize: 13, paddingTop: 2 }}>{step}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button className="btn btn-teal" style={{ flex: 1 }} onClick={() => { setActionModal(null); setRecordFiling(true); }}>+ Record Filing</button>
              <button className="btn" onClick={() => setActionModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
