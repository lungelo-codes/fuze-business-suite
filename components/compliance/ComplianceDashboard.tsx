"use client";
/**
 * ComplianceDashboard.tsx
 * Unified compliance dashboard: VAT + CIPC + SARS under one view.
 * Powered by fuze_suite.api.compliance
 */
import React, { useState, useCallback } from "react";
import StatusChip from "@/components/StatusChip";

type AnyRecord = Record<string, unknown>;

interface Props {
  overview: AnyRecord;
  sarsProfile: AnyRecord;
  vatReturns: AnyRecord;
  cipcReturns: AnyRecord;
  payeReturns: AnyRecord;
  tasks: AnyRecord;
  reminders: AnyRecord;
  companyCompliance: AnyRecord;
}

const TABS = ["Overview", "VAT", "CIPC", "SARS / PAYE", "Tasks & Reminders"] as const;
type Tab = typeof TABS[number];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h4 style={{ fontWeight: 900, marginBottom: 12, fontSize: 15, color: "var(--demo-text)" }}>{title}</h4>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  const color =
    s === "filed" || s === "submitted" || s === "compliant" || s === "active"
      ? "#10b981"
      : s === "overdue" || s === "non-compliant" || s === "expired"
      ? "#ef4444"
      : s === "pending" || s === "draft"
      ? "#f59e0b"
      : "#6366f1";
  return (
    <span style={{ padding: "2px 10px", borderRadius: 6, background: color, color: "#fff", fontSize: 11, fontWeight: 700 }}>
      {status || "Unknown"}
    </span>
  );
}

function ComplianceScore({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1, height: 10, background: "var(--demo-soft)", borderRadius: 5, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 5, transition: "width 0.5s ease" }} />
      </div>
      <span style={{ fontWeight: 900, color, minWidth: 40 }}>{pct}%</span>
    </div>
  );
}

export default function ComplianceDashboard({
  overview,
  sarsProfile,
  vatReturns,
  cipcReturns,
  payeReturns,
  tasks,
  reminders,
  companyCompliance,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [refreshData, setRefreshData] = useState({
    overview,
    sarsProfile,
    vatReturns,
    cipcReturns,
    payeReturns,
    tasks,
    reminders,
    companyCompliance,
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/compliance/dashboard");
      if (res.ok) {
        const data = (await res.json()) as AnyRecord;
        setRefreshData({
          overview: (data.overview as AnyRecord) ?? {},
          sarsProfile: (data.sarsProfile as AnyRecord) ?? {},
          vatReturns: (data.vatReturns as AnyRecord) ?? {},
          cipcReturns: (data.cipcReturns as AnyRecord) ?? {},
          payeReturns: (data.payeReturns as AnyRecord) ?? {},
          tasks: (data.tasks as AnyRecord) ?? {},
          reminders: (data.reminders as AnyRecord) ?? {},
          companyCompliance: (data.companyCompliance as AnyRecord) ?? {},
        });
        setMessage("Data refreshed");
      }
    } catch {
      setMessage("Could not refresh data");
    } finally {
      setLoading(false);
    }
  }, []);

  const d = refreshData;

  // Extract arrays safely
  const vatList = Array.isArray((d.vatReturns as AnyRecord)?.returns)
    ? ((d.vatReturns as AnyRecord).returns as AnyRecord[])
    : Array.isArray(d.vatReturns)
    ? (d.vatReturns as unknown as AnyRecord[])
    : [];

  const cipcList = Array.isArray((d.cipcReturns as AnyRecord)?.returns)
    ? ((d.cipcReturns as AnyRecord).returns as AnyRecord[])
    : Array.isArray(d.cipcReturns)
    ? (d.cipcReturns as unknown as AnyRecord[])
    : [];

  const payeList = Array.isArray((d.payeReturns as AnyRecord)?.returns)
    ? ((d.payeReturns as AnyRecord).returns as AnyRecord[])
    : Array.isArray(d.payeReturns)
    ? (d.payeReturns as unknown as AnyRecord[])
    : [];

  const taskList = Array.isArray((d.tasks as AnyRecord)?.tasks)
    ? ((d.tasks as AnyRecord).tasks as AnyRecord[])
    : Array.isArray(d.tasks)
    ? (d.tasks as unknown as AnyRecord[])
    : [];

  const reminderList = Array.isArray((d.reminders as AnyRecord)?.reminders)
    ? ((d.reminders as AnyRecord).reminders as AnyRecord[])
    : Array.isArray(d.reminders)
    ? (d.reminders as unknown as AnyRecord[])
    : [];

  const overviewCards = (d.overview as AnyRecord)?.cards as AnyRecord | undefined;
  const compScore = Number((d.companyCompliance as AnyRecord)?.compliance_score ?? (overviewCards?.compliance_score) ?? 0);

  return (
    <div>
      {/* Header */}
      <div className="page-head">
        <div>
          <h1 className="page-title">Compliance Dashboard</h1>
          <div className="page-sub">VAT · CIPC · SARS — all regulatory obligations in one place</div>
        </div>
        <button className="btn btn-primary" onClick={refresh} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {message && (
        <div className="banner info" style={{ marginBottom: 12 }}>
          {message}
          <button className="btn btn-sm" style={{ marginLeft: 12 }} onClick={() => setMessage("")}>✕</button>
        </div>
      )}

      {/* KPI Row */}
      <div className="kpi-grid">
        <div className="kpi">
          <div className="label">VAT Returns</div>
          <div className="val">{vatList.length}</div>
          <div className="hint">Total submissions</div>
        </div>
        <div className="kpi teal">
          <div className="label">CIPC Returns</div>
          <div className="val">{cipcList.length}</div>
          <div className="hint">Annual filings</div>
        </div>
        <div className="kpi warn">
          <div className="label">PAYE Returns</div>
          <div className="val">{payeList.length}</div>
          <div className="hint">Monthly submissions</div>
        </div>
        <div className="kpi purple">
          <div className="label">Open Tasks</div>
          <div className="val">{taskList.filter((t) => String(t.status || "").toLowerCase() !== "completed").length}</div>
          <div className="hint">Pending compliance tasks</div>
        </div>
      </div>

      {/* Compliance Score */}
      {compScore > 0 && (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h4 style={{ fontWeight: 900, margin: 0 }}>Overall Compliance Score</h4>
            <span style={{ fontSize: 12, color: "var(--demo-muted)" }}>From Fuze API</span>
          </div>
          <ComplianceScore score={compScore} />
        </div>
      )}

      {/* Tab Bar */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="seg">
          {TABS.map((t) => (
            <button key={t} className={activeTab === t ? "on" : ""} onClick={() => setActiveTab(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === "Overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* VAT Summary */}
          <div className="card card-pad">
            <Section title="VAT Summary">
              {vatList.length > 0 ? (
                <table className="data">
                  <thead><tr><th>Period</th><th>Status</th><th>Amount</th></tr></thead>
                  <tbody>
                    {vatList.slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        <td>{String(r.period || r.tax_period || "—")}</td>
                        <td><StatusBadge status={String(r.status || "Draft")} /></td>
                        <td>R {Number(r.amount || r.vat_amount || 0).toLocaleString("en-ZA")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="crud-empty">No VAT returns found</div>
              )}
              <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => setActiveTab("VAT")}>View All VAT →</button>
            </Section>
          </div>

          {/* CIPC Summary */}
          <div className="card card-pad">
            <Section title="CIPC Summary">
              {cipcList.length > 0 ? (
                <table className="data">
                  <thead><tr><th>Year</th><th>Status</th><th>Due Date</th></tr></thead>
                  <tbody>
                    {cipcList.slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        <td>{String(r.financial_year || r.year || "—")}</td>
                        <td><StatusBadge status={String(r.status || "Draft")} /></td>
                        <td>{String(r.due_date || "—")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="crud-empty">No CIPC returns found</div>
              )}
              <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => setActiveTab("CIPC")}>View All CIPC →</button>
            </Section>
          </div>

          {/* SARS / PAYE Summary */}
          <div className="card card-pad">
            <Section title="SARS / PAYE Summary">
              {payeList.length > 0 ? (
                <table className="data">
                  <thead><tr><th>Period</th><th>Status</th><th>Amount</th></tr></thead>
                  <tbody>
                    {payeList.slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        <td>{String(r.period || r.tax_period || "—")}</td>
                        <td><StatusBadge status={String(r.status || "Draft")} /></td>
                        <td>R {Number(r.amount || r.paye_amount || 0).toLocaleString("en-ZA")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="crud-empty">No PAYE returns found</div>
              )}
              <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => setActiveTab("SARS / PAYE")}>View All SARS →</button>
            </Section>
          </div>

          {/* Upcoming Tasks */}
          <div className="card card-pad">
            <Section title="Upcoming Compliance Tasks">
              {taskList.length > 0 ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {taskList.slice(0, 5).map((t, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--demo-soft)", borderRadius: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{String(t.title || t.task_type || "Task")}</div>
                        <div style={{ fontSize: 11, color: "var(--demo-muted)" }}>Due: {String(t.due_date || "—")}</div>
                      </div>
                      <StatusBadge status={String(t.status || "Pending")} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="crud-empty">No tasks found</div>
              )}
              <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => setActiveTab("Tasks & Reminders")}>View All Tasks →</button>
            </Section>
          </div>
        </div>
      )}

      {/* ── VAT Tab ── */}
      {activeTab === "VAT" && (
        <div className="card card-pad">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontWeight: 900, margin: 0 }}>VAT Returns</h3>
            <VatReturnForm onSuccess={(msg) => { setMessage(msg); refresh(); }} />
          </div>
          {vatList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data">
                <thead>
                  <tr><th>Period</th><th>Status</th><th>Output VAT</th><th>Input VAT</th><th>Net VAT</th><th>Due Date</th><th>Filed Date</th></tr>
                </thead>
                <tbody>
                  {vatList.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700 }}>{String(r.period || r.tax_period || "—")}</td>
                      <td><StatusBadge status={String(r.status || "Draft")} /></td>
                      <td>R {Number(r.output_vat || 0).toLocaleString("en-ZA")}</td>
                      <td>R {Number(r.input_vat || 0).toLocaleString("en-ZA")}</td>
                      <td style={{ fontWeight: 700 }}>R {Number(r.net_vat || r.amount || r.vat_amount || 0).toLocaleString("en-ZA")}</td>
                      <td>{String(r.due_date || "—")}</td>
                      <td>{String(r.filed_date || r.submission_date || "—")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="crud-empty">No VAT returns found. Create your first VAT return above.</div>
          )}
        </div>
      )}

      {/* ── CIPC Tab ── */}
      {activeTab === "CIPC" && (
        <div className="card card-pad">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontWeight: 900, margin: 0 }}>CIPC Annual Returns</h3>
            <CipcReturnForm onSuccess={(msg) => { setMessage(msg); refresh(); }} />
          </div>
          {cipcList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data">
                <thead>
                  <tr><th>Financial Year</th><th>Status</th><th>Due Date</th><th>Filed Date</th><th>Fee</th><th>Reg Number</th></tr>
                </thead>
                <tbody>
                  {cipcList.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700 }}>{String(r.financial_year || r.year || "—")}</td>
                      <td><StatusBadge status={String(r.status || "Draft")} /></td>
                      <td>{String(r.due_date || "—")}</td>
                      <td>{String(r.filed_date || r.submission_date || "—")}</td>
                      <td>R {Number(r.fee || r.filing_fee || 0).toLocaleString("en-ZA")}</td>
                      <td>{String(r.registration_number || r.reg_number || "—")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="crud-empty">No CIPC returns found. Add your first annual return above.</div>
          )}
        </div>
      )}

      {/* ── SARS / PAYE Tab ── */}
      {activeTab === "SARS / PAYE" && (
        <div style={{ display: "grid", gap: 20 }}>
          {/* SARS Profile */}
          <div className="card card-pad">
            <h3 style={{ fontWeight: 900, marginBottom: 16 }}>SARS Profile</h3>
            <SarsProfileView profile={d.sarsProfile as AnyRecord} onSuccess={(msg) => { setMessage(msg); refresh(); }} />
          </div>

          {/* PAYE Returns */}
          <div className="card card-pad">
            <h3 style={{ fontWeight: 900, marginBottom: 16 }}>PAYE Returns</h3>
            {payeList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="data">
                  <thead>
                    <tr><th>Period</th><th>Status</th><th>Employees</th><th>PAYE Amount</th><th>UIF</th><th>SDL</th><th>Due Date</th></tr>
                  </thead>
                  <tbody>
                    {payeList.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700 }}>{String(r.period || r.tax_period || "—")}</td>
                        <td><StatusBadge status={String(r.status || "Draft")} /></td>
                        <td>{String(r.employee_count || r.employees || "—")}</td>
                        <td>R {Number(r.paye_amount || r.amount || 0).toLocaleString("en-ZA")}</td>
                        <td>R {Number(r.uif || 0).toLocaleString("en-ZA")}</td>
                        <td>R {Number(r.sdl || 0).toLocaleString("en-ZA")}</td>
                        <td>{String(r.due_date || "—")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="crud-empty">No PAYE returns found.</div>
            )}
          </div>
        </div>
      )}

      {/* ── Tasks & Reminders Tab ── */}
      {activeTab === "Tasks & Reminders" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="card card-pad">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontWeight: 900, margin: 0 }}>Compliance Tasks</h3>
              <ComplianceTaskForm onSuccess={(msg) => { setMessage(msg); refresh(); }} />
            </div>
            {taskList.length > 0 ? (
              <div style={{ display: "grid", gap: 8 }}>
                {taskList.map((t, i) => (
                  <div key={i} style={{ padding: "12px 14px", background: "var(--demo-soft)", borderRadius: 10, borderLeft: `3px solid ${String(t.status || "").toLowerCase() === "completed" ? "#10b981" : String(t.status || "").toLowerCase() === "overdue" ? "#ef4444" : "#f59e0b"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{String(t.title || t.task_type || "Task")}</div>
                        <div style={{ fontSize: 11, color: "var(--demo-muted)", marginTop: 2 }}>
                          {String(t.task_type || "")} · Due: {String(t.due_date || "—")}
                        </div>
                        {!!t.description && <div style={{ fontSize: 11, marginTop: 4 }}>{`${t.description}`}</div>}
                      </div>
                      <StatusBadge status={String(t.status || "Pending")} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="crud-empty">No compliance tasks. Add a task to track obligations.</div>
            )}
          </div>

          <div className="card card-pad">
            <h3 style={{ fontWeight: 900, marginBottom: 16 }}>Reminders</h3>
            {reminderList.length > 0 ? (
              <div style={{ display: "grid", gap: 8 }}>
                {reminderList.map((r, i) => (
                  <div key={i} style={{ padding: "12px 14px", background: "var(--demo-soft)", borderRadius: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{String(r.title || r.reminder_type || "Reminder")}</div>
                    <div style={{ fontSize: 11, color: "var(--demo-muted)", marginTop: 2 }}>
                      {String(r.reminder_date || r.date || "—")}
                    </div>
                    {!!r.message && <div style={{ fontSize: 11, marginTop: 4 }}>{`${r.message}`}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="crud-empty">No reminders set.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── VAT Return Form ──────────────────────────────────────────────────────────
function VatReturnForm({ onSuccess }: { onSuccess: (msg: string) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ period: "", output_vat: 0, input_vat: 0, due_date: "", status: "Draft" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.period) { setError("Period is required"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/compliance/vat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = (await res.json()) as AnyRecord;
      if (!res.ok) throw new Error(String(json.error || "Failed"));
      onSuccess("VAT return created");
      setOpen(false);
      setForm({ period: "", output_vat: 0, input_vat: 0, due_date: "", status: "Draft" });
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); } finally { setSaving(false); }
  }

  if (!open) return <button className="btn btn-sm" onClick={() => setOpen(true)}>+ New VAT Return</button>;
  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
      {error && <div className="banner warn" style={{ width: "100%" }}>{error}</div>}
      <label style={{ display: "grid", gap: 2 }}><span style={{ fontSize: 11, fontWeight: 700 }}>Period</span><input className="input" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="e.g. 2024-01" style={{ width: 120 }} required /></label>
      <label style={{ display: "grid", gap: 2 }}><span style={{ fontSize: 11, fontWeight: 700 }}>Output VAT</span><input className="input" type="number" value={form.output_vat} onChange={(e) => setForm({ ...form, output_vat: Number(e.target.value) })} style={{ width: 100 }} /></label>
      <label style={{ display: "grid", gap: 2 }}><span style={{ fontSize: 11, fontWeight: 700 }}>Input VAT</span><input className="input" type="number" value={form.input_vat} onChange={(e) => setForm({ ...form, input_vat: Number(e.target.value) })} style={{ width: 100 }} /></label>
      <label style={{ display: "grid", gap: 2 }}><span style={{ fontSize: 11, fontWeight: 700 }}>Due Date</span><input className="input" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></label>
      <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
    </form>
  );
}

// ─── CIPC Return Form ─────────────────────────────────────────────────────────
function CipcReturnForm({ onSuccess }: { onSuccess: (msg: string) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ financial_year: "", registration_number: "", due_date: "", fee: 0, status: "Draft" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.financial_year) { setError("Financial year is required"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/compliance/cipc", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = (await res.json()) as AnyRecord;
      if (!res.ok) throw new Error(String(json.error || "Failed"));
      onSuccess("CIPC return created");
      setOpen(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); } finally { setSaving(false); }
  }

  if (!open) return <button className="btn btn-sm" onClick={() => setOpen(true)}>+ New CIPC Return</button>;
  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
      {error && <div className="banner warn" style={{ width: "100%" }}>{error}</div>}
      <label style={{ display: "grid", gap: 2 }}><span style={{ fontSize: 11, fontWeight: 700 }}>Financial Year</span><input className="input" value={form.financial_year} onChange={(e) => setForm({ ...form, financial_year: e.target.value })} placeholder="e.g. 2024" style={{ width: 100 }} required /></label>
      <label style={{ display: "grid", gap: 2 }}><span style={{ fontSize: 11, fontWeight: 700 }}>Reg Number</span><input className="input" value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} placeholder="2024/123456/07" style={{ width: 150 }} /></label>
      <label style={{ display: "grid", gap: 2 }}><span style={{ fontSize: 11, fontWeight: 700 }}>Due Date</span><input className="input" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></label>
      <label style={{ display: "grid", gap: 2 }}><span style={{ fontSize: 11, fontWeight: 700 }}>Fee (R)</span><input className="input" type="number" value={form.fee} onChange={(e) => setForm({ ...form, fee: Number(e.target.value) })} style={{ width: 80 }} /></label>
      <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
    </form>
  );
}

// ─── SARS Profile View ────────────────────────────────────────────────────────
function SarsProfileView({ profile, onSuccess }: { profile: AnyRecord; onSuccess: (msg: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    tax_number: String(profile.tax_number || ""),
    vat_number: String(profile.vat_number || ""),
    paye_number: String(profile.paye_number || ""),
    uif_number: String(profile.uif_number || ""),
    sdl_number: String(profile.sdl_number || ""),
    efiling_username: String(profile.efiling_username || ""),
    tax_clearance_status: String(profile.tax_clearance_status || ""),
    tax_clearance_expiry: String(profile.tax_clearance_expiry || ""),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/compliance/sars", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = (await res.json()) as AnyRecord;
      if (!res.ok) throw new Error(String(json.error || "Failed"));
      onSuccess("SARS profile updated");
      setEditing(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); } finally { setSaving(false); }
  }

  if (!editing) {
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          {[["Tax Number", form.tax_number], ["VAT Number", form.vat_number], ["PAYE Number", form.paye_number], ["UIF Number", form.uif_number], ["SDL Number", form.sdl_number], ["eFiling Username", form.efiling_username], ["Tax Clearance Status", form.tax_clearance_status], ["Clearance Expiry", form.tax_clearance_expiry]].map(([label, value]) => (
            <div key={label} style={{ padding: "10px 14px", background: "var(--demo-soft)", borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: "var(--demo-muted)", fontWeight: 700, marginBottom: 2 }}>{label}</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{value || "—"}</div>
            </div>
          ))}
        </div>
        <button className="btn btn-sm" onClick={() => setEditing(true)}>Edit SARS Profile</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      {error && <div className="banner warn" style={{ marginBottom: 12 }}>{error}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {([["Tax Number", "tax_number"], ["VAT Number", "vat_number"], ["PAYE Number", "paye_number"], ["UIF Number", "uif_number"], ["SDL Number", "sdl_number"], ["eFiling Username", "efiling_username"]] as [string, keyof typeof form][]).map(([label, key]) => (
          <label key={key} style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{label}</span>
            <input className="input" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
          </label>
        ))}
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>Tax Clearance Status</span>
          <select className="input" value={form.tax_clearance_status} onChange={(e) => setForm({ ...form, tax_clearance_status: e.target.value })}>
            {["", "Valid", "Expired", "Pending", "Not Applied"].map((s) => <option key={s} value={s}>{s || "Select…"}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>Clearance Expiry</span>
          <input className="input" type="date" value={form.tax_clearance_expiry} onChange={(e) => setForm({ ...form, tax_clearance_expiry: e.target.value })} />
        </label>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save Profile"}</button>
        <button type="button" className="btn" onClick={() => setEditing(false)}>Cancel</button>
      </div>
    </form>
  );
}

// ─── Compliance Task Form ─────────────────────────────────────────────────────
function ComplianceTaskForm({ onSuccess }: { onSuccess: (msg: string) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", task_type: "VAT", due_date: "", description: "", status: "Pending" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title) { setError("Title is required"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/compliance/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = (await res.json()) as AnyRecord;
      if (!res.ok) throw new Error(String(json.error || "Failed"));
      onSuccess("Task created");
      setOpen(false);
      setForm({ title: "", task_type: "VAT", due_date: "", description: "", status: "Pending" });
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); } finally { setSaving(false); }
  }

  if (!open) return <button className="btn btn-sm" onClick={() => setOpen(true)}>+ New Task</button>;
  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 8 }}>
      {error && <div className="banner warn">{error}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <label style={{ display: "grid", gap: 2, flex: 2 }}><span style={{ fontSize: 11, fontWeight: 700 }}>Title *</span><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
        <label style={{ display: "grid", gap: 2 }}><span style={{ fontSize: 11, fontWeight: 700 }}>Type</span>
          <select className="input" value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value })}>
            {["VAT", "PAYE", "CIPC", "Income Tax", "UIF", "SDL", "Other"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 2 }}><span style={{ fontSize: 11, fontWeight: 700 }}>Due Date</span><input className="input" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></label>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Create Task"}</button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
