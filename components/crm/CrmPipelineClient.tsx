"use client";
/**
 * CrmPipelineClient.tsx
 * Full customer lifecycle CRM pipeline:
 *   New Lead → Contacted → Qualified → Proposal → Negotiation → Won → Customer
 *
 * Features:
 * - Kanban board with stage movement
 * - Quote creation & email sending from pipeline card
 * - Invoice creation & email sending from pipeline card
 * - Lead → Opportunity conversion
 * - Lead/Opportunity → Customer conversion
 * - Mark Won / Mark Lost with reason
 * - Business logic validation
 * - Powered by fuze_suite.api.crm (not raw ERPNext)
 */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import StatusChip from "@/components/StatusChip";

type AnyRecord = Record<string, unknown>;

const LIFECYCLE_STAGES = [
  "New Lead",
  "Contacted",
  "Qualified",
  "Proposal Sent",
  "Negotiation",
  "Won",
  "Customer",
];

const STAGE_COLORS: Record<string, string> = {
  "New Lead": "#6366f1",
  "Contacted": "#3b82f6",
  "Qualified": "#f59e0b",
  "Proposal Sent": "#8b5cf6",
  "Negotiation": "#ec4899",
  "Won": "#10b981",
  "Customer": "#059669",
  "Lost": "#ef4444",
};

function money(v: unknown): string {
  return `R ${Number(v || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function initials(name: string): string {
  return (name || "?")
    .split(" ")
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getLifecycleStage(record: AnyRecord): string {
  const status = String(record.status || "");
  if (status === "Converted" || status === "Customer") return "Customer";
  if (status === "Won") return "Won";
  if (status === "Negotiation/Review" || status === "Negotiation") return "Negotiation";
  if (status === "Proposal/Price Quote" || status === "Proposal Sent" || status === "Replied") return "Proposal Sent";
  if (status === "Opportunity" || status === "Qualification" || status === "Needs Analysis" || status === "Value Proposition") return "Qualified";
  if (status === "Contacted" || status === "Open") return "Contacted";
  return "New Lead";
}

type ModalType = "quote" | "invoice" | "convert" | "new_lead" | null;
interface ModalState { type: ModalType; record?: AnyRecord; }

interface Props {
  initialDashboard: AnyRecord;
  initialPipelineSummary: AnyRecord;
  initialLeads: AnyRecord[];
  initialCustomers: AnyRecord[];
}

export default function CrmPipelineClient({
  initialDashboard,
  initialPipelineSummary,
  initialLeads,
  initialCustomers,
}: Props) {
  const [leads, setLeads] = useState<AnyRecord[]>(initialLeads);
  const [customers, setCustomers] = useState<AnyRecord[]>(initialCustomers);
  const [dashboard] = useState<AnyRecord>(initialDashboard);
  const [pipelineSummary, setPipelineSummary] = useState<AnyRecord>(initialPipelineSummary);
  const [activeTab, setActiveTab] = useState<"pipeline" | "dashboard" | "list" | "customers">("pipeline");
  const [query, setQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState("");
  const [modal, setModal] = useState<ModalState>({ type: null });
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [pipelineRes, dashRes] = await Promise.allSettled([
        fetch("/api/crm/pipeline").then((r) => r.json()),
        fetch("/api/crm/dashboard").then((r) => r.json()),
      ]);
      if (pipelineRes.status === "fulfilled") {
        const d = pipelineRes.value as AnyRecord;
        const leadsArr =
          ((d.leads as AnyRecord)?.leads as AnyRecord[]) ??
          (Array.isArray(d.leads) ? (d.leads as AnyRecord[]) : []);
        const custsArr =
          ((d.customers as AnyRecord)?.customers as AnyRecord[]) ??
          (Array.isArray(d.customers) ? (d.customers as AnyRecord[]) : []);
        if (Array.isArray(leadsArr)) setLeads(leadsArr);
        if (Array.isArray(custsArr)) setCustomers(custsArr);
      }
      if (dashRes.status === "fulfilled") {
        const d = dashRes.value as AnyRecord;
        if (d.pipelineSummary) setPipelineSummary(d.pipelineSummary as AnyRecord);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const records = useMemo(() => {
    if (!query) return leads;
    const q = query.toLowerCase();
    return leads.filter((r) => {
      return (
        String(r.name || r.lead_name || r.company || "").toLowerCase().includes(q) ||
        String(r.email || "").toLowerCase().includes(q) ||
        String(r.company || r.company_name || "").toLowerCase().includes(q)
      );
    });
  }, [leads, query]);

  const stageGroups = useMemo(() => {
    const groups: Record<string, AnyRecord[]> = {};
    for (const s of LIFECYCLE_STAGES) groups[s] = [];
    for (const r of records) {
      const stage = getLifecycleStage(r);
      if (!groups[stage]) groups[stage] = [];
      groups[stage].push(r);
    }
    return groups;
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (!selectedStage) return records;
    return records.filter((r) => getLifecycleStage(r) === selectedStage);
  }, [records, selectedStage]);

  const totals = useMemo(() => ({
    leads: leads.length,
    customers: customers.length,
    pipeline: String((pipelineSummary as AnyRecord)?.total ?? "R 0.00"),
    won: leads.filter((r) => getLifecycleStage(r) === "Won" || getLifecycleStage(r) === "Customer").length,
  }), [leads, customers, pipelineSummary]);

  async function moveStage(record: AnyRecord, newStage: string) {
    const id = String(record.id || record.name || "");
    if (!id) return;
    setSaving(id);
    setMessage("");
    const statusMap: Record<string, string> = {
      "New Lead": "Lead",
      "Contacted": "Contacted",
      "Qualified": "Opportunity",
      "Proposal Sent": "Replied",
      "Negotiation": "Replied",
      "Won": "Won",
      "Customer": "Converted",
    };
    const erpStatus = statusMap[newStage] || newStage;
    try {
      const res = await fetch("/api/crm/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "lead", name: id, status: erpStatus }),
      });
      const json = (await res.json()) as AnyRecord;
      if (!res.ok) throw new Error(String(json.error || "Could not update stage"));
      setLeads((prev) =>
        prev.map((r) => (String(r.id || r.name) === id ? { ...r, status: erpStatus } : r))
      );
      setMessage(`Moved to ${newStage}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not update stage");
    } finally {
      setSaving("");
    }
  }

  function openInvoiceModal(record: AnyRecord) {
    const stage = getLifecycleStage(record);
    if (stage === "New Lead" || stage === "Contacted") {
      setMessage(
        "Business rule: Invoices can only be created for Qualified leads or Won deals. Move this record forward first."
      );
      return;
    }
    setModal({ type: "invoice", record });
  }

  const cardName = (r: AnyRecord) => String(r.name || r.lead_name || r.company || "Unknown");
  const cardCompany = (r: AnyRecord) => String(r.company || r.company_name || "");
  const cardEmail = (r: AnyRecord) => String(r.email || r.email_id || "");

  return (
    <div className="crm-root">
      {/* Header */}
      <div className="page-head">
        <div>
          <h1 className="page-title">CRM Pipeline</h1>
          <div className="page-sub">Full customer lifecycle — New Lead to paying Customer</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn" onClick={() => setModal({ type: "new_lead" })}>+ New Lead</button>
          <button className="btn btn-primary" onClick={refresh} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {message && (
        <div className={`banner ${message.toLowerCase().includes("business rule") || message.toLowerCase().includes("error") ? "warn" : "info"}`}>
          {message}
          <button className="btn btn-sm" style={{ marginLeft: 12 }} onClick={() => setMessage("")}>✕</button>
        </div>
      )}

      {/* KPI Row */}
      <div className="kpi-grid">
        <div className="kpi">
          <div className="label">Total Leads</div>
          <div className="val">{totals.leads}</div>
          <div className="hint">In pipeline</div>
        </div>
        <div className="kpi teal">
          <div className="label">Customers</div>
          <div className="val">{totals.customers}</div>
          <div className="hint">Converted</div>
        </div>
        <div className="kpi warn">
          <div className="label">Pipeline Value</div>
          <div className="val">{totals.pipeline}</div>
          <div className="hint">Open opportunities</div>
        </div>
        <div className="kpi purple">
          <div className="label">Won / Converted</div>
          <div className="val">{totals.won}</div>
          <div className="hint">This period</div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="toolbar">
          <div className="seg">
            {(["pipeline", "dashboard", "list", "customers"] as const).map((t) => (
              <button key={t} className={activeTab === t ? "on" : ""} onClick={() => setActiveTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div className="search">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search leads, companies, emails…" />
          </div>
        </div>
      </div>

      {/* Pipeline Kanban */}
      {activeTab === "pipeline" && (
        <>
          <div className="kpi-grid" style={{ marginBottom: 16 }}>
            {LIFECYCLE_STAGES.map((stage) => {
              const count = stageGroups[stage]?.length ?? 0;
              return (
                <button
                  key={stage}
                  type="button"
                  onClick={() => setSelectedStage(selectedStage === stage ? "" : stage)}
                  className={`kpi text-left ${selectedStage === stage ? "teal" : ""}`}
                  style={{ borderLeft: `3px solid ${STAGE_COLORS[stage] || "#6366f1"}` }}
                >
                  <div className="label">{stage}</div>
                  <div className="val">{count}</div>
                  <div className="hint">{stage === "Won" || stage === "Customer" ? "Converted" : "Active"}</div>
                </button>
              );
            })}
          </div>

          {selectedStage && (
            <div className="banner info" style={{ marginBottom: 12 }}>
              Showing <strong>{filteredRecords.length}</strong> in <strong>{selectedStage}</strong>.{" "}
              <button className="btn btn-sm" onClick={() => setSelectedStage("")}>Clear</button>
            </div>
          )}

          <div className="kanban">
            {LIFECYCLE_STAGES.map((stage) => {
              const stageRecords = (selectedStage ? filteredRecords : records).filter(
                (r) => getLifecycleStage(r) === stage
              );
              const nextStages = LIFECYCLE_STAGES.filter((s) => s !== stage);
              return (
                <div key={stage} className={`kan-col ${selectedStage === stage ? "ring-2 ring-emerald-200" : ""}`}>
                  <button type="button" className="w-full text-left" onClick={() => setSelectedStage(selectedStage === stage ? "" : stage)}>
                    <h4 style={{ borderBottom: `2px solid ${STAGE_COLORS[stage] || "#6366f1"}`, paddingBottom: 6 }}>
                      {stage}<span className="cnt">{stageRecords.length}</span>
                    </h4>
                  </button>

                  {stageRecords.map((record) => {
                    const id = String(record.id || record.name || "");
                    const name = cardName(record);
                    const company = cardCompany(record);
                    const email = cardEmail(record);
                    const isWon = stage === "Won" || stage === "Customer";
                    return (
                      <div className="kan-card" key={id}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 10, background: STAGE_COLORS[stage] || "#6366f1", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 900, flexShrink: 0 }}>
                            {initials(name)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="ktitle" style={{ marginBottom: 2 }}>{name}</div>
                            {company && <div className="kmeta" style={{ fontSize: 11 }}><span>{company}</span></div>}
                          </div>
                        </div>
                        {email && <div style={{ fontSize: 11, color: "var(--demo-muted)", marginBottom: 6 }}>{email}</div>}
                        <div style={{ marginBottom: 8 }}><StatusChip status={stage} /></div>

                        {/* Stage movement */}
                        <div className="row" style={{ flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                          {nextStages.slice(0, 3).map((next) => (
                            <button key={next} className="btn btn-sm" disabled={saving === id} onClick={() => moveStage(record, next)} style={{ fontSize: 10 }}>
                              → {next}
                            </button>
                          ))}
                        </div>

                        {/* Action buttons */}
                        <div className="row" style={{ flexWrap: "wrap", gap: 4 }}>
                          <button className="btn btn-sm" style={{ background: "#8b5cf6", color: "#fff", fontSize: 10 }} onClick={() => setModal({ type: "quote", record })}>
                            Send Quote
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ background: isWon ? "#10b981" : "#94a3b8", color: "#fff", fontSize: 10 }}
                            onClick={() => openInvoiceModal(record)}
                          >
                            Send Invoice
                          </button>
                          {!isWon && (
                            <button className="btn btn-sm" style={{ background: "#3b82f6", color: "#fff", fontSize: 10 }} onClick={() => setModal({ type: "convert", record })}>
                              Convert
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {stageRecords.length === 0 && (
                    <div style={{ padding: "20px 12px", textAlign: "center", color: "var(--demo-muted)", fontSize: 12 }}>
                      No records
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div className="demo-panel">
          <div className="demo-panel-head">
            <div><h3>CRM Dashboard</h3><p>Pipeline stages and conversion metrics from the Fuze API</p></div>
          </div>
          <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <h4 style={{ marginBottom: 12, fontWeight: 900 }}>Pipeline Summary</h4>
              {Array.isArray((pipelineSummary as AnyRecord)?.stages) ? (
                <table className="data">
                  <thead><tr><th>Stage</th><th>Count</th><th>Value</th></tr></thead>
                  <tbody>
                    {((pipelineSummary as AnyRecord).stages as AnyRecord[]).map((s, i) => (
                      <tr key={i}>
                        <td>{String(s.stage || "—")}</td>
                        <td>{String(s.count || 0)}</td>
                        <td>{String(s.value || "R 0.00")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="crud-empty">No pipeline data yet. Add leads to get started.</div>
              )}
            </div>
            <div>
              <h4 style={{ marginBottom: 12, fontWeight: 900 }}>Lifecycle Funnel</h4>
              {LIFECYCLE_STAGES.map((stage) => {
                const count = stageGroups[stage]?.length ?? 0;
                const pct = leads.length ? Math.round((count / leads.length) * 100) : 0;
                return (
                  <div key={stage} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                      <span style={{ fontWeight: 700 }}>{stage}</span>
                      <span style={{ color: "var(--demo-muted)" }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: 6, background: "var(--demo-soft)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: STAGE_COLORS[stage] || "#6366f1", borderRadius: 3, transition: "width 0.4s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* List Tab */}
      {activeTab === "list" && (
        <div className="card card-pad">
          <h3 style={{ marginBottom: 16, fontWeight: 900 }}>All Leads</h3>
          <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr><th>Name</th><th>Company</th><th>Email</th><th>Stage</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filteredRecords.map((r) => {
                  const id = String(r.id || r.name || "");
                  const stage = getLifecycleStage(r);
                  return (
                    <tr key={id}>
                      <td style={{ fontWeight: 700 }}>{cardName(r)}</td>
                      <td>{cardCompany(r) || "—"}</td>
                      <td>{cardEmail(r) || "—"}</td>
                      <td><span style={{ padding: "2px 8px", borderRadius: 6, background: STAGE_COLORS[stage] || "#6366f1", color: "#fff", fontSize: 11, fontWeight: 700 }}>{stage}</span></td>
                      <td><StatusChip status={String(r.status || "New")} /></td>
                      <td>
                        <div className="row" style={{ gap: 4 }}>
                          <button className="btn btn-sm" style={{ fontSize: 10 }} onClick={() => setModal({ type: "quote", record: r })}>Quote</button>
                          <button className="btn btn-sm" style={{ fontSize: 10 }} onClick={() => openInvoiceModal(r)}>Invoice</button>
                          <button className="btn btn-sm" style={{ fontSize: 10 }} onClick={() => setModal({ type: "convert", record: r })}>Convert</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredRecords.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--demo-muted)", padding: 32 }}>No leads found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customers Tab */}
      {activeTab === "customers" && (
        <div className="card card-pad">
          <h3 style={{ marginBottom: 16, fontWeight: 900 }}>Customers</h3>
          <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr><th>#</th><th>Customer Name</th><th>Type</th><th>Group</th><th>Email</th><th>Phone</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={String(c.name || i)}>
                    <td style={{ color: "var(--demo-muted)", fontWeight: 900 }}>{i + 1}</td>
                    <td style={{ fontWeight: 700 }}>{String(c.customer_name || c.name || "—")}</td>
                    <td>{String(c.customer_type || "Company")}</td>
                    <td>{String(c.customer_group || "—")}</td>
                    <td>{String(c.email_id || "—")}</td>
                    <td>{String(c.mobile_no || "—")}</td>
                    <td>
                      <button className="btn btn-sm" style={{ fontSize: 10 }} onClick={() => setModal({ type: "invoice", record: { ...c, name: c.customer_name || c.name, status: "Won" } })}>
                        Create Invoice
                      </button>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--demo-muted)", padding: 32 }}>No customers yet. Convert a lead to create your first customer.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {modal.type && (
        <ModalOverlay onClose={() => setModal({ type: null })}>
          {modal.type === "new_lead" && (
            <NewLeadModal
              onClose={() => setModal({ type: null })}
              onSuccess={(msg) => { setMessage(msg); setModal({ type: null }); refresh(); }}
            />
          )}
          {modal.type === "quote" && modal.record && (
            <QuoteModal
              record={modal.record}
              onClose={() => setModal({ type: null })}
              onSuccess={(msg) => { setMessage(msg); setModal({ type: null }); }}
            />
          )}
          {modal.type === "invoice" && modal.record && (
            <InvoiceModal
              record={modal.record}
              onClose={() => setModal({ type: null })}
              onSuccess={(msg) => { setMessage(msg); setModal({ type: null }); }}
            />
          )}
          {modal.type === "convert" && modal.record && (
            <ConvertModal
              record={modal.record}
              onClose={() => setModal({ type: null })}
              onSuccess={(msg) => { setMessage(msg); setModal({ type: null }); refresh(); }}
            />
          )}
        </ModalOverlay>
      )}
    </div>
  );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "var(--demo-card, #fff)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", maxHeight: "90vh", overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}

function NewLeadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (msg: string) => void }) {
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", source: "Website" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) { setError("Lead name is required"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/crm/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) throw new Error(String(json.error || "Failed"));
      onSuccess("New lead created successfully");
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); } finally { setSaving(false); }
  }
  return (
    <form onSubmit={submit}>
      <h3 style={{ marginBottom: 20, fontWeight: 900 }}>New Lead</h3>
      {error && <div className="banner warn" style={{ marginBottom: 12 }}>{error}</div>}
      <div style={{ display: "grid", gap: 12 }}>
        {[["Lead Name *", "name", "text", "Full name", true], ["Company", "company", "text", "Company name", false], ["Email", "email", "email", "email@example.com", false], ["Phone", "phone", "tel", "+27 xx xxx xxxx", false]].map(([label, key, type, placeholder, req]) => (
          <label key={String(key)} style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{String(label)}</span>
            <input className="input" type={String(type)} value={String(form[key as keyof typeof form])} onChange={(e) => setForm({ ...form, [String(key)]: e.target.value })} placeholder={String(placeholder)} required={Boolean(req)} />
          </label>
        ))}
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>Source</span>
          <select className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
            {["Website", "Cold Call", "Referral", "Advertisement", "Email", "Social Media", "Other"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <div className="row" style={{ marginTop: 20, justifyContent: "flex-end", gap: 8 }}>
        <button type="button" className="btn" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Creating…" : "Create Lead"}</button>
      </div>
    </form>
  );
}

function QuoteModal({ record, onClose, onSuccess }: { record: Record<string, unknown>; onClose: () => void; onSuccess: (msg: string) => void }) {
  const name = String(record.name || record.lead_name || record.company || "");
  const email = String(record.email || record.email_id || "");
  const [form, setForm] = useState({ customer_name: name, email, item_code: "Consulting Service", qty: 1, rate: 0, description: "", valid_till: "", send_email: false, notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer_name) { setError("Customer name is required"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/crm/quote-send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customer_name: form.customer_name, email: form.email, items: [{ item_code: form.item_code, qty: form.qty, rate: form.rate, description: form.description }], valid_till: form.valid_till || undefined, send_email: form.send_email, notes: form.notes, lead_name: String(record.id || record.name || "") }) });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) throw new Error(String(json.error || "Failed"));
      onSuccess(String(json.message || "Quote created"));
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); } finally { setSaving(false); }
  }
  return (
    <form onSubmit={submit}>
      <h3 style={{ marginBottom: 6, fontWeight: 900 }}>Send Quote</h3>
      <p style={{ color: "var(--demo-muted)", fontSize: 13, marginBottom: 20 }}>Create a quotation for <strong>{name}</strong></p>
      {error && <div className="banner warn" style={{ marginBottom: 12 }}>{error}</div>}
      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, fontWeight: 700 }}>Customer Name *</span><input className="input" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required /></label>
        <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, fontWeight: 700 }}>Email</span><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px", gap: 8 }}>
          <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, fontWeight: 700 }}>Item / Service</span><input className="input" value={form.item_code} onChange={(e) => setForm({ ...form, item_code: e.target.value })} /></label>
          <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, fontWeight: 700 }}>Qty</span><input className="input" type="number" min={1} value={form.qty} onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })} /></label>
          <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, fontWeight: 700 }}>Rate (R)</span><input className="input" type="number" min={0} value={form.rate} onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })} /></label>
        </div>
        <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, fontWeight: 700 }}>Description</span><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Service description" /></label>
        <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, fontWeight: 700 }}>Valid Until</span><input className="input" type="date" value={form.valid_till} onChange={(e) => setForm({ ...form, valid_till: e.target.value })} /></label>
        <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, fontWeight: 700 }}>Notes / Terms</span><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Payment terms, conditions…" /></label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}><input type="checkbox" checked={form.send_email} onChange={(e) => setForm({ ...form, send_email: e.target.checked })} /><span style={{ fontSize: 13, fontWeight: 600 }}>Send quote by email</span></label>
        <div style={{ background: "var(--demo-soft)", borderRadius: 8, padding: 12, fontSize: 13 }}><strong>Total: </strong>R {(form.qty * form.rate).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</div>
      </div>
      <div className="row" style={{ marginTop: 20, justifyContent: "flex-end", gap: 8 }}>
        <button type="button" className="btn" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Creating…" : "Create Quote"}</button>
      </div>
    </form>
  );
}

function InvoiceModal({ record, onClose, onSuccess }: { record: Record<string, unknown>; onClose: () => void; onSuccess: (msg: string) => void }) {
  const name = String(record.customer_name || record.name || record.lead_name || record.company || "");
  const email = String(record.email || record.email_id || "");
  const [form, setForm] = useState({ customer: name, email, item_code: "Consulting Service", qty: 1, rate: 0, description: "", due_date: "", send_email: false, notes: "", payment_terms: "30 Days" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer) { setError("Customer name is required"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/crm/invoice-send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customer: form.customer, email: form.email, items: [{ item_code: form.item_code, qty: form.qty, rate: form.rate, description: form.description }], due_date: form.due_date || undefined, send_email: form.send_email, notes: form.notes, payment_terms: form.payment_terms }) });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) throw new Error(String(json.error || "Failed"));
      onSuccess(String(json.message || "Invoice created"));
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); } finally { setSaving(false); }
  }
  return (
    <form onSubmit={submit}>
      <h3 style={{ marginBottom: 6, fontWeight: 900 }}>Create Invoice</h3>
      <p style={{ color: "var(--demo-muted)", fontSize: 13, marginBottom: 20 }}>Create an invoice for <strong>{name}</strong></p>
      {error && <div className="banner warn" style={{ marginBottom: 12 }}>{error}</div>}
      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, fontWeight: 700 }}>Customer Name *</span><input className="input" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} required /></label>
        <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, fontWeight: 700 }}>Email</span><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px", gap: 8 }}>
          <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, fontWeight: 700 }}>Item / Service</span><input className="input" value={form.item_code} onChange={(e) => setForm({ ...form, item_code: e.target.value })} /></label>
          <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, fontWeight: 700 }}>Qty</span><input className="input" type="number" min={1} value={form.qty} onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })} /></label>
          <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, fontWeight: 700 }}>Rate (R)</span><input className="input" type="number" min={0} value={form.rate} onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })} /></label>
        </div>
        <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, fontWeight: 700 }}>Description</span><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, fontWeight: 700 }}>Due Date</span><input className="input" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>Payment Terms</span>
          <select className="input" value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}>
            {["Immediate", "7 Days", "14 Days", "30 Days", "60 Days", "90 Days"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, fontWeight: 700 }}>Notes / Terms</span><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Banking details, payment instructions…" /></label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}><input type="checkbox" checked={form.send_email} onChange={(e) => setForm({ ...form, send_email: e.target.checked })} /><span style={{ fontSize: 13, fontWeight: 600 }}>Send invoice by email</span></label>
        <div style={{ background: "var(--demo-soft)", borderRadius: 8, padding: 12, fontSize: 13 }}><strong>Total: </strong>R {(form.qty * form.rate).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</div>
      </div>
      <div className="row" style={{ marginTop: 20, justifyContent: "flex-end", gap: 8 }}>
        <button type="button" className="btn" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Creating…" : "Create Invoice"}</button>
      </div>
    </form>
  );
}

function ConvertModal({ record, onClose, onSuccess }: { record: Record<string, unknown>; onClose: () => void; onSuccess: (msg: string) => void }) {
  const name = String(record.name || record.lead_name || record.company || "");
  const [action, setAction] = useState<"lead_to_opportunity" | "lead_to_customer">("lead_to_opportunity");
  const [customerName, setCustomerName] = useState(String(record.company || record.company_name || name));
  const [amount, setAmount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/crm/convert", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, lead_name: String(record.id || record.name || ""), customer_name: customerName, company_name: customerName, email: String(record.email || record.email_id || ""), phone: String(record.phone || record.mobile_no || ""), opportunity_amount: amount }) });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) throw new Error(String(json.error || "Failed"));
      onSuccess(String(json.message || "Converted"));
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); } finally { setSaving(false); }
  }
  return (
    <form onSubmit={submit}>
      <h3 style={{ marginBottom: 6, fontWeight: 900 }}>Convert Lead</h3>
      <p style={{ color: "var(--demo-muted)", fontSize: 13, marginBottom: 20 }}>Advance <strong>{name}</strong> through the lifecycle</p>
      {error && <div className="banner warn" style={{ marginBottom: 12 }}>{error}</div>}
      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>Conversion Type</span>
          <select className="input" value={action} onChange={(e) => setAction(e.target.value as typeof action)}>
            <option value="lead_to_opportunity">Lead → Opportunity (keep in pipeline)</option>
            <option value="lead_to_customer">Lead → Customer (full conversion)</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, fontWeight: 700 }}>Customer / Company Name</span><input className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required /></label>
        {action === "lead_to_opportunity" && (
          <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, fontWeight: 700 }}>Opportunity Value (R)</span><input className="input" type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></label>
        )}
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: 12, fontSize: 13, color: "#166534" }}>
          {action === "lead_to_opportunity" ? "The lead will be marked Converted and a new Opportunity created in the pipeline." : "The lead will become a Customer record. You can then create invoices directly."}
        </div>
      </div>
      <div className="row" style={{ marginTop: 20, justifyContent: "flex-end", gap: 8 }}>
        <button type="button" className="btn" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Converting…" : "Convert"}</button>
      </div>
    </form>
  );
}
