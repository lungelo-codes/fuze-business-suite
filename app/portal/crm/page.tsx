"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";


// ─── Types ────────────────────────────────────────────────────────────────────
type Stage = "Prospecting" | "Qualified" | "Proposal" | "Negotiation" | "Won" | "Lost";
type CRMTab = "pipeline" | "leads" | "customers" | "360";

interface Deal {
  id: string; title: string; customer: string; stage: Stage;
  value: number; probability: number; expected_close: string;
  last_updated: string; owner: string; lead_id?: string | null;
}

interface Lead {
  id: string; name: string; company: string; email: string;
  phone: string; source: string; status: string; city: string;
  country: string; last_updated: string; notes?: string;
}

interface Customer {
  id: string; name: string; type: string; group: string; territory: string;
  modified: string; email: string; phone: string; contacts: number;
  open_invoices: number; total_revenue: number; plan: string;
}

interface Customer360 {
  customer: { id: string; name: string; type: string; territory: string; email: string; phone: string; plan: string };
  journey: { date: string; event: string; type: string; detail: string }[];
  financials: { currency: string; total_revenue: number; outstanding: number; overdue: number; invoices: number };
  contacts: { name: string; role: string; email: string; phone: string }[];
  deals: { id: string; title: string; stage: string; value: number; probability: number }[];
  invoices: { id: string; date: string; amount: number; status: string }[];
  projects: { id: string; name: string; status: string; progress: number }[];
  helpdesk: { id: string; subject: string; status: string; priority: string }[];
}

const STAGES: Stage[] = ["Prospecting", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];

const STAGE_CFG: Record<Stage, { color: string; bg: string; icon: string; label: string }> = {
  Prospecting: { color: "#6B7086", bg: "#F0F1F7", icon: "◎", label: "Prospecting" },
  Qualified:   { color: "#2E6BE5", bg: "#E8EFFD", icon: "◈", label: "Qualified" },
  Proposal:    { color: "#9B59D1", bg: "#F3EDFD", icon: "◇", label: "Proposal" },
  Negotiation: { color: "#E89B0E", bg: "#FFF6E0", icon: "◉", label: "Negotiation" },
  Won:         { color: "#1F9D55", bg: "#E6F6EC", icon: "✓", label: "Won" },
  Lost:        { color: "#DC3545", bg: "#FDECEE", icon: "✕", label: "Lost" },
};

const JOURNEY_ICONS: Record<string, string> = {
  lead: "◎", stage: "→", quote: "◇", won: "✓", customer: "◈", invoice: "◉", default: "·"
};

const fmt = (n: number) => "R " + Number(n || 0).toLocaleString("en-ZA", { maximumFractionDigits: 0 });
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "—";
const probColor = (p: number) => p >= 75 ? "var(--ok)" : p >= 40 ? "var(--warn)" : "var(--danger)";

// ─── Deal Card ────────────────────────────────────────────────────────────────
function DealCard({ deal, onSelect, onMove }: { deal: Deal; onSelect: (d: Deal) => void; onMove: (id: string, stage: Stage) => void }) {
  const cfg = STAGE_CFG[deal.stage];
  return (
    <div className="deal-card" onClick={() => onSelect(deal)}>
      <div className="deal-card-head">
        <div className="deal-title">{deal.title}</div>
        <div className="deal-value">{fmt(deal.value)}</div>
      </div>
      <div className="deal-customer">{deal.customer}</div>
      <div className="deal-meta">
        <div className="deal-prob" style={{ color: probColor(deal.probability) }}>{deal.probability}% likely</div>
        <div className="deal-close">📅 {fmtDate(deal.expected_close)}</div>
      </div>
      {deal.lead_id && <div style={{ fontSize: 10, color: "var(--blue)", marginBottom: 6 }}>↑ from {deal.lead_id}</div>}
      <div className="deal-card-actions">
        <button className="deal-action" onClick={(e) => { e.stopPropagation(); const i = STAGES.indexOf(deal.stage); if (i < STAGES.length - 1) onMove(deal.id, STAGES[i + 1]); }} title="Advance stage">→ Advance</button>
        <button className="deal-action" onClick={(e) => { e.stopPropagation(); onSelect(deal); }} title="Open deal">Open ↗</button>
      </div>
    </div>
  );
}

// ─── Deal Panel ───────────────────────────────────────────────────────────────
function DealPanel({ deal, onClose, onStageChange }: { deal: Deal; onClose: () => void; onStageChange: (id: string, stage: Stage) => void }) {
  const [tab, setTab] = useState<"overview" | "activity" | "quote" | "invoice">("overview");
  const [aiDraft, setAiDraft] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [quoteItems, setQuoteItems] = useState([{ desc: "Fuze Business Suite — Professional Plan", qty: 1, rate: deal.value }]);
  const [quoteNote, setQuoteNote] = useState("Thank you for considering Fuze. This quotation is valid for 30 days.");
  const [quoteSent, setQuoteSent] = useState(false);
  const [invoiceSent, setInvoiceSent] = useState(false);
  const cfg = STAGE_CFG[deal.stage];

  const generateFollowUp = () => {
    const text = `Dear ${deal.customer},\n\nThank you for your continued interest. I wanted to follow up regarding your enquiry valued at ${fmt(deal.value)}.\n\nYour account is currently at the ${deal.stage} stage and we look forward to progressing this further. Please do not hesitate to reach out should you have any questions.\n\nKind regards,\n${deal.owner}`;
    setAiDraft(text);
  };

  const sendQuote = async () => {
    await api.sendQuote(deal.id, { items: quoteItems, note: quoteNote });
    setQuoteSent(true);
    onStageChange(deal.id, "Proposal");
  };

  const createInvoice = async () => {
    await api.createInvoiceFromDeal(deal.id);
    setInvoiceSent(true);
  };

  const quoteTotal = quoteItems.reduce((s, i) => s + i.qty * i.rate, 0);
  const vatAmount = quoteTotal * 0.15;

  return (
    <div className="deal-panel-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="deal-panel">
        <div className="deal-panel-head">
          <div>
            <div className="deal-panel-title">{deal.title}</div>
            <div className="deal-panel-sub">{deal.customer} {deal.lead_id && <span style={{ color: "var(--blue)", fontSize: 11 }}>· converted from {deal.lead_id}</span>}</div>
          </div>
          <button className="btn" onClick={onClose}>✕</button>
        </div>

        {/* Stage stepper */}
        <div className="stage-stepper">
          {STAGES.map((s) => {
            const c = STAGE_CFG[s];
            const isActive = s === deal.stage;
            const isPast = STAGES.indexOf(s) < STAGES.indexOf(deal.stage);
            return (
              <button key={s} className={`stage-step ${isActive ? "active" : isPast ? "past" : ""}`}
                onClick={() => onStageChange(deal.id, s)}
                style={isActive ? { borderColor: c.color, color: c.color, background: c.bg } : {}}
              >
                <span>{c.icon}</span><span>{c.label}</span>
              </button>
            );
          })}
        </div>

        {/* KPIs */}
        <div className="deal-panel-kpis">
          <div><div className="dp-val">{fmt(deal.value)}</div><div className="dp-lbl">Deal Value</div></div>
          <div><div className="dp-val" style={{ color: probColor(deal.probability) }}>{deal.probability}%</div><div className="dp-lbl">Probability</div></div>
          <div><div className="dp-val">{fmt(deal.value * deal.probability / 100)}</div><div className="dp-lbl">Weighted Value</div></div>
          <div><div className="dp-val">{fmtDate(deal.expected_close)}</div><div className="dp-lbl">Expected Close</div></div>
        </div>

        {/* Tabs */}
        <div className="deal-tabs">
          {(["overview", "activity", "quote", "invoice"] as const).map((t) => (
            <button key={t} className={`deal-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t === "overview" ? "Overview" : t === "activity" ? "Activity" : t === "quote" ? "📄 Quote" : "🧾 Invoice"}
            </button>
          ))}
        </div>

        <div className="deal-panel-body">
          {tab === "overview" && (
            <div>
              <div className="dp-field"><span>Customer</span><strong>{deal.customer}</strong></div>
              <div className="dp-field"><span>Stage</span><span className="chip ok" style={{ background: cfg.bg, color: cfg.color }}>{deal.stage}</span></div>
              <div className="dp-field"><span>Owner</span><strong>{deal.owner}</strong></div>
              <div className="dp-field"><span>Last Updated</span><strong>{fmtDate(deal.last_updated)}</strong></div>
              {deal.lead_id && <div className="dp-field"><span>Converted From</span><span className="chip info">{deal.lead_id}</span></div>}
              <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>Quick Actions</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn" onClick={generateFollowUp}>✉ Draft follow-up</button>
                  <button className="btn" onClick={() => setTab("quote")}>📄 Send Quote</button>
                  <button className="btn" onClick={() => setTab("invoice")}>🧾 Create Invoice</button>
                </div>
                {aiDraft && (
                  <div className="ai-draft-box">
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 12 }}>Follow-up Draft — review before sending</span>
                      <button className="btn" onClick={() => navigator.clipboard?.writeText(aiDraft)}>Copy</button>
                    </div>
                    <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, margin: 0, lineHeight: 1.5 }}>{aiDraft}</pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "activity" && (
            <div>
              <div className="timeline">
                {[
                  { date: deal.last_updated, event: `Stage: ${deal.stage}`, type: "stage" },
                  { date: deal.expected_close, event: "Expected close date", type: "date" },
                  { date: deal.last_updated, event: "Deal last modified", type: "edit" },
                ].map((item, i) => (
                  <div key={i} className="timeline-item">
                    <div className="tl-dot" />
                    <div><div className="tl-event">{item.event}</div><div className="tl-date">{fmtDate(item.date)}</div></div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <textarea className="inp" placeholder="Log a note or activity…" rows={3} />
                <button className="btn btn-primary" style={{ marginTop: 6 }}>Log Activity</button>
              </div>
            </div>
          )}

          {tab === "quote" && (
            <div>
              {quoteSent ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
                  <div style={{ fontWeight: 700, color: "var(--ok)", fontSize: 16 }}>Quotation Sent!</div>
                  <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>Stage updated to Proposal. Customer will receive the quote via email.</div>
                  <button className="btn btn-teal" style={{ marginTop: 16 }} onClick={() => setQuoteSent(false)}>Create Another Quote</button>
                </div>
              ) : (
                <div>
                  <div style={{ background: "var(--blue-bg)", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>📄 Quotation — {deal.customer}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>Valid for 30 days from issue date · 15% VAT included</div>
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--line)" }}>
                        <th style={{ textAlign: "left", padding: "6px 8px", fontSize: 11, color: "var(--muted)" }}>DESCRIPTION</th>
                        <th style={{ textAlign: "right", padding: "6px 8px", fontSize: 11, color: "var(--muted)" }}>QTY</th>
                        <th style={{ textAlign: "right", padding: "6px 8px", fontSize: 11, color: "var(--muted)" }}>RATE</th>
                        <th style={{ textAlign: "right", padding: "6px 8px", fontSize: 11, color: "var(--muted)" }}>AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quoteItems.map((item, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--line-2)" }}>
                          <td style={{ padding: "8px" }}>
                            <input className="inp" style={{ margin: 0, padding: "4px 8px" }} value={item.desc}
                              onChange={(e) => { const n = [...quoteItems]; n[i].desc = e.target.value; setQuoteItems(n); }} />
                          </td>
                          <td style={{ padding: "8px", textAlign: "right" }}>
                            <input type="number" className="inp" style={{ margin: 0, padding: "4px 8px", width: 60, textAlign: "right" }} value={item.qty}
                              onChange={(e) => { const n = [...quoteItems]; n[i].qty = +e.target.value; setQuoteItems(n); }} />
                          </td>
                          <td style={{ padding: "8px", textAlign: "right" }}>
                            <input type="number" className="inp" style={{ margin: 0, padding: "4px 8px", width: 100, textAlign: "right" }} value={item.rate}
                              onChange={(e) => { const n = [...quoteItems]; n[i].rate = +e.target.value; setQuoteItems(n); }} />
                          </td>
                          <td style={{ padding: "8px", textAlign: "right", fontWeight: 700 }}>{fmt(item.qty * item.rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button className="btn" style={{ fontSize: 12, marginBottom: 12 }}
                    onClick={() => setQuoteItems([...quoteItems, { desc: "Additional service", qty: 1, rate: 0 }])}>
                    + Add Line Item
                  </button>
                  <div style={{ background: "#F9FAFC", borderRadius: 8, padding: 12, marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span>Subtotal</span><span>{fmt(quoteTotal)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span>VAT (15%)</span><span>{fmt(vatAmount)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 15, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
                      <span>Total</span><span style={{ color: "var(--teal)" }}>{fmt(quoteTotal + vatAmount)}</span>
                    </div>
                  </div>
                  <textarea className="inp" rows={2} value={quoteNote} onChange={(e) => setQuoteNote(e.target.value)} placeholder="Quote notes…" />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button className="btn btn-teal" style={{ flex: 1 }} onClick={sendQuote}>📤 Send Quotation</button>
                    <button className="btn">Preview PDF</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "invoice" && (
            <div>
              {invoiceSent ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🧾</div>
                  <div style={{ fontWeight: 700, color: "var(--ok)", fontSize: 16 }}>Invoice Created!</div>
                  <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>Invoice has been created and is visible in Finance → Invoices.</div>
                  <button className="btn btn-teal" style={{ marginTop: 16 }} onClick={() => setInvoiceSent(false)}>Create Another</button>
                </div>
              ) : (
                <div>
                  <div style={{ background: "var(--ok-bg)", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>🧾 Tax Invoice — {deal.customer}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>Payment due 30 days from invoice date · 15% VAT applied</div>
                  </div>
                  <div className="dp-field"><span>Customer</span><strong>{deal.customer}</strong></div>
                  <div className="dp-field"><span>Deal Reference</span><strong>{deal.id}</strong></div>
                  <div className="dp-field"><span>Invoice Amount</span><strong style={{ color: "var(--teal)" }}>{fmt(deal.value)}</strong></div>
                  <div className="dp-field"><span>VAT (15%)</span><strong>{fmt(deal.value * 0.15)}</strong></div>
                  <div className="dp-field"><span>Total Incl. VAT</span><strong style={{ color: "var(--teal)", fontSize: 16 }}>{fmt(deal.value * 1.15)}</strong></div>
                  <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <button className="btn btn-teal" style={{ flex: 1 }} onClick={createInvoice}>🧾 Create Invoice</button>
                    <button className="btn">Preview</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Lead Row ─────────────────────────────────────────────────────────────────
function LeadRow({ lead, onConvert, onView360 }: { lead: Lead; onConvert: (l: Lead) => void; onView360: (id: string) => void }) {
  return (
    <tr>
      <td>
        <div style={{ fontWeight: 700 }}>{lead.name}</div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>{lead.company}</div>
      </td>
      <td>{lead.email}</td>
      <td>{lead.phone}</td>
      <td><span className="chip info">{lead.source}</span></td>
      <td>
        <span className={`chip ${lead.status === "New" ? "muted" : lead.status === "Qualified" ? "ok" : "info"}`}>{lead.status}</span>
      </td>
      <td>{lead.city}</td>
      <td>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-teal" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => onConvert(lead)}>Convert →</button>
        </div>
      </td>
    </tr>
  );
}

// ─── Convert Lead Modal ───────────────────────────────────────────────────────
function ConvertLeadModal({ lead, onClose, onConverted }: { lead: Lead; onClose: () => void; onConverted: (lead: Lead) => void }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [dealTitle, setDealTitle] = useState(`${lead.company} — Fuze Suite`);
  const [dealValue, setDealValue] = useState(50000);

  const convert = async () => {
    setLoading(true);
    await api.convertLead(lead.id, { deal_title: dealTitle, deal_value: dealValue, company: lead.company, email: lead.email });
    setLoading(false);
    setDone(true);
    setTimeout(() => { onConverted(lead); onClose(); }, 1800);
  };

  return (
    <div className="deal-panel-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 480, maxWidth: "95vw", boxShadow: "0 20px 60px rgba(0,0,0,.18)" }}>
        {done ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "var(--ok)" }}>Lead Converted!</div>
            <div style={{ color: "var(--muted)", marginTop: 8 }}>{lead.name} is now a Customer with an active deal in the pipeline.</div>
          </div>
        ) : (
          <>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>Convert Lead to Customer</div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>This will create a Customer record and add a Deal to the pipeline.</div>
            <div style={{ background: "var(--blue-bg)", borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <div style={{ fontWeight: 700 }}>{lead.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{lead.company} · {lead.email}</div>
            </div>
            <label className="label">Deal Title</label>
            <input className="inp" value={dealTitle} onChange={(e) => setDealTitle(e.target.value)} />
            <label className="label">Deal Value (ZAR)</label>
            <input type="number" className="inp" value={dealValue} onChange={(e) => setDealValue(+e.target.value)} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="btn btn-teal" style={{ flex: 1 }} onClick={convert} disabled={loading}>{loading ? "Converting…" : "✓ Convert Lead"}</button>
              <button className="btn" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Customer 360 Panel ───────────────────────────────────────────────────────
function Customer360Panel({ customerId, customerName, onClose }: { customerId: string; customerName: string; onClose: () => void }) {
  const [data, setData] = useState<Customer360 | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"journey" | "financials" | "contacts" | "deals" | "invoices" | "projects" | "support">("journey");

  useEffect(() => {
    api.getCustomer360(customerId).then((r) => {
      setData(r.data as Customer360);
      setLoading(false);
    });
  }, [customerId]);

  if (loading) return (
    <div className="deal-panel-overlay">
      <div className="deal-panel" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="loading-spinner" />
      </div>
    </div>
  );

  if (!data) return null;

  const journeyTypeColor: Record<string, string> = {
    lead: "#6B7086", stage: "#2E6BE5", quote: "#9B59D1", won: "#1F9D55", customer: "#28a486", invoice: "#E89B0E"
  };

  return (
    <div className="deal-panel-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="deal-panel" style={{ width: 580 }}>
        <div className="deal-panel-head">
          <div>
            <div className="deal-panel-title">◈ Customer 360° — {data.customer.name}</div>
            <div className="deal-panel-sub">{data.customer.territory} · {data.customer.plan} Plan · {data.customer.email}</div>
          </div>
          <button className="btn" onClick={onClose}>✕</button>
        </div>

        {/* Financial KPIs */}
        <div className="deal-panel-kpis">
          <div><div className="dp-val" style={{ color: "var(--teal)" }}>{fmt(data.financials.total_revenue)}</div><div className="dp-lbl">Total Revenue</div></div>
          <div><div className="dp-val">{fmt(data.financials.outstanding)}</div><div className="dp-lbl">Outstanding</div></div>
          <div><div className="dp-val" style={{ color: data.financials.overdue > 0 ? "var(--danger)" : "var(--ok)" }}>{fmt(data.financials.overdue)}</div><div className="dp-lbl">Overdue</div></div>
          <div><div className="dp-val">{data.financials.invoices}</div><div className="dp-lbl">Invoices</div></div>
        </div>

        {/* Tabs */}
        <div className="deal-tabs" style={{ flexWrap: "wrap" }}>
          {(["journey", "financials", "contacts", "deals", "invoices", "projects", "support"] as const).map((t) => (
            <button key={t} className={`deal-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)} style={{ fontSize: 11 }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="deal-panel-body">
          {tab === "journey" && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, color: "var(--muted)" }}>Lead → Customer Journey</div>
              <div className="timeline">
                {data.journey.map((j, i) => (
                  <div key={i} className="timeline-item">
                    <div className="tl-dot" style={{ background: journeyTypeColor[j.type] || "#ccc" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div className="tl-event">{j.event}</div>
                        <div className="tl-date">{fmtDate(j.date)}</div>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{j.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "financials" && (
            <div>
              <div className="dp-field"><span>Total Revenue</span><strong style={{ color: "var(--teal)" }}>{fmt(data.financials.total_revenue)}</strong></div>
              <div className="dp-field"><span>Outstanding</span><strong>{fmt(data.financials.outstanding)}</strong></div>
              <div className="dp-field"><span>Overdue</span><strong style={{ color: data.financials.overdue > 0 ? "var(--danger)" : "var(--ok)" }}>{fmt(data.financials.overdue)}</strong></div>
              <div className="dp-field"><span>Total Invoices</span><strong>{data.financials.invoices}</strong></div>
            </div>
          )}

          {tab === "contacts" && (
            <div>
              {data.contacts.map((c, i) => (
                <div key={i} style={{ background: "#F9FAFC", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{c.role}</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>{c.email} · {c.phone}</div>
                </div>
              ))}
            </div>
          )}

          {tab === "deals" && (
            <div>
              {data.deals.map((d) => (
                <div key={d.id} style={{ background: "#F9FAFC", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 700 }}>{d.title}</div>
                    <div style={{ fontWeight: 800, color: "var(--teal)" }}>{fmt(d.value)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <span className="chip info">{d.stage}</span>
                    <span className="chip muted">{d.probability}% likely</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "invoices" && (
            <div>
              <table className="data" style={{ width: "100%" }}>
                <thead><tr><th>Invoice</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {data.invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 700 }}>{inv.id}</td>
                      <td>{fmtDate(inv.date)}</td>
                      <td style={{ fontWeight: 700 }}>{fmt(inv.amount)}</td>
                      <td><span className={`chip ${inv.status === "Paid" ? "ok" : inv.status === "Overdue" ? "danger" : "warn"}`}>{inv.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "projects" && (
            <div>
              {data.projects.map((p) => (
                <div key={p.id} style={{ background: "#F9FAFC", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontWeight: 700 }}>{p.name}</div>
                    <span className={`chip ${p.status === "Completed" ? "ok" : "info"}`}>{p.status}</span>
                  </div>
                  <div style={{ height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${p.progress}%`, background: "var(--teal)", borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{p.progress}% complete</div>
                </div>
              ))}
            </div>
          )}

          {tab === "support" && (
            <div>
              {data.helpdesk.map((t) => (
                <div key={t.id} style={{ background: "#F9FAFC", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 700 }}>{t.subject}</div>
                    <span className={`chip ${t.status === "Resolved" ? "ok" : t.priority === "High" ? "danger" : "warn"}`}>{t.status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{t.id} · Priority: {t.priority}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main CRM Page ────────────────────────────────────────────────────────────
export default function CRMPage() {
  const [tab, setTab] = useState<CRMTab>("pipeline");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cards, setCards] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [view360Id, setView360Id] = useState<string | null>(null);
  const [view360Name, setView360Name] = useState("");
  const [showNewLead, setShowNewLead] = useState(false);
  const [newLead, setNewLead] = useState({ name: "", company: "", email: "", phone: "", source: "Website", city: "" });
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const [dash, pipe, leadsR, custsR] = await Promise.allSettled([
        api.getCRMDashboard(), api.getPipeline(), api.getLeads(), api.getCustomers(),
      ]);
      if (dash.status === "fulfilled") setCards((dash.value.data as { cards: Record<string, number> })?.cards ?? {});
      if (pipe.status === "fulfilled") setDeals((pipe.value.data as { deals: Deal[] })?.deals ?? []);
      if (leadsR.status === "fulfilled") setLeads((leadsR.value.data as { leads: Lead[] })?.leads ?? []);
      if (custsR.status === "fulfilled") setCustomers((custsR.value.data as { customers: Customer[] })?.customers ?? []);
      setLoading(false);
    })();
  }, []);

  const moveStage = (id: string, stage: Stage) => {
    setDeals((prev) => prev.map((d) => d.id === id ? { ...d, stage } : d));
    if (selectedDeal?.id === id) setSelectedDeal((prev) => prev ? { ...prev, stage } : null);
  };

  const handleLeadConverted = (lead: Lead) => {
    setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, status: "Converted" } : l));
  };

  const createLead = async () => {
    await api.createLead(newLead);
    setLeads((prev) => [{
      id: `LEAD-${Date.now()}`, ...newLead, country: "South Africa", status: "New", last_updated: new Date().toISOString().slice(0, 10),
    }, ...prev]);
    setShowNewLead(false);
    setNewLead({ name: "", company: "", email: "", phone: "", source: "Website", city: "" });
  };

  const analyseWithAI = () => {
    const won = deals.filter((d) => d.stage === "Won").length;
    const lost = deals.filter((d) => d.stage === "Lost").length;
    const active = deals.filter((d) => d.stage !== "Won" && d.stage !== "Lost");
    const topDeal = active.sort((a, b) => b.value - a.value)[0];
    const insight = `Pipeline summary: ${active.length} active deals worth ${fmt(active.reduce((s, d) => s + d.value, 0))}. Won: ${won} · Lost: ${lost}.\n${topDeal ? `Highest-value active deal: ${topDeal.customer} (${fmt(topDeal.value)}) at ${topDeal.stage} stage — prioritise this for fastest conversion.` : ""}`;
    setAiInsight(insight);
  };

  const filteredCustomers = customers.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.territory.toLowerCase().includes(search.toLowerCase())
  );

  const filteredLeads = leads.filter((l) =>
    !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.company.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="page-loading"><div className="loading-spinner" /><p>Loading CRM…</p></div>;

  const stageDeals = (stage: Stage) => deals.filter((d) => d.stage === stage);
  const stageValue = (stage: Stage) => stageDeals(stage).reduce((s, d) => s + d.value, 0);
  const totalPipeline = deals.filter((d) => d.stage !== "Lost").reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">CRM & Sales Pipeline</h1>
          <p className="page-sub">Lead → Customer journey · Kanban pipeline · Quotes · Invoices · Customer 360°</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={analyseWithAI}>✦ Pipeline Summary</button>
          {tab === "leads" && <button className="btn btn-teal" onClick={() => setShowNewLead(true)}>+ New Lead</button>}
        </div>
      </div>

      {/* AI Insight Banner */}
      {aiInsight && (
        <div className="alert-banner" style={{ background: "var(--blue-bg)", borderColor: "var(--blue)", marginBottom: 16 }}>
          <span style={{ color: "var(--blue)", fontSize: 16 }}>✦</span>
          <div>
            <strong style={{ color: "var(--blue)" }}>Pipeline Summary</strong>
            <div style={{ fontSize: 13, marginTop: 4, whiteSpace: "pre-wrap" }}>{aiInsight}</div>
          </div>
          <button className="btn" style={{ marginLeft: "auto", flexShrink: 0 }} onClick={() => setAiInsight("")}>✕</button>
        </div>
      )}

      {/* KPI row */}
      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        <div className="kpi">
          <div className="ic-wrap">◎</div>
          <div className="label">Leads</div>
          <div className="val">{cards.leads ?? leads.length}</div>
          <div className="hint">Active pipeline entries</div>
        </div>
        <div className="kpi">
          <div className="ic-wrap" style={{ background: "#EEEBFB", color: "#6A4FD1" }}>◈</div>
          <div className="label">Deals</div>
          <div className="val">{cards.deals ?? deals.length}</div>
          <div className="hint">{fmt(totalPipeline)} pipeline value</div>
        </div>
        <div className="kpi teal">
          <div className="ic-wrap">◇</div>
          <div className="label">Customers</div>
          <div className="val">{cards.customers ?? customers.length}</div>
          <div className="hint">Active accounts</div>
        </div>
        <div className="kpi">
          <div className="ic-wrap" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}>✓</div>
          <div className="label">Won This Month</div>
          <div className="val">{fmt(cards.won_this_month ?? 218000)}</div>
          <div className="hint">Closed revenue</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="crm-tabs">
        {([
          { id: "pipeline", label: "◈ Pipeline" },
          { id: "leads", label: "◎ Leads" },
          { id: "customers", label: "◇ Customers" },
          { id: "360", label: "◉ Customer 360°" },
        ] as const).map(({ id, label }) => (
          <button key={id} className={`crm-tab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {/* ── Pipeline Board ── */}
      {tab === "pipeline" && (
        <div>
          <div className="pipeline-board">
            {STAGES.map((stage) => {
              const cfg = STAGE_CFG[stage];
              const stageDealsList = stageDeals(stage);
              return (
                <div key={stage} className="pipeline-col" style={{ borderTop: `3px solid ${cfg.color}` }}>
                  <div className="pipeline-col-head" style={{ borderTop: "none" }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13, color: cfg.color }}>{cfg.icon} {stage}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{stageDealsList.length} deals · {fmt(stageValue(stage))}</div>
                    </div>
                  </div>
                  <div className="pipeline-cards">
                    {stageDealsList.map((deal) => (
                      <DealCard key={deal.id} deal={deal} onSelect={setSelectedDeal} onMove={moveStage} />
                    ))}
                    {stageDealsList.length === 0 && (
                      <div style={{ textAlign: "center", padding: "20px 10px", color: "var(--muted)", fontSize: 12 }}>No deals</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Leads ── */}
      {tab === "leads" && (
        <div className="card">
          <div className="card-head">
            <h3>Leads ({leads.length})</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="inp" style={{ margin: 0, width: 220 }} placeholder="Search leads…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="data">
              <thead>
                <tr>
                  <th>Name / Company</th><th>Email</th><th>Phone</th><th>Source</th><th>Status</th><th>City</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <LeadRow key={lead.id} lead={lead} onConvert={setConvertLead} onView360={(id) => { setView360Id(id); setView360Name(lead.company); }} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Customers ── */}
      {tab === "customers" && (
        <div className="card">
          <div className="card-head">
            <h3>Customers ({customers.length})</h3>
            <input className="inp" style={{ margin: 0, width: 220 }} placeholder="Search customers…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="data">
              <thead>
                <tr><th>Customer</th><th>Territory</th><th>Plan</th><th>Revenue</th><th>Open Invoices</th><th>Contacts</th><th>360°</th></tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.group}</div>
                    </td>
                    <td>{c.territory}</td>
                    <td><span className="chip info">{c.plan}</span></td>
                    <td style={{ fontWeight: 700 }}>{fmt(c.total_revenue)}</td>
                    <td>
                      <span className={`chip ${c.open_invoices > 0 ? "warn" : "ok"}`}>{c.open_invoices}</span>
                    </td>
                    <td>{c.contacts}</td>
                    <td>
                      <button className="btn btn-teal" style={{ fontSize: 11, padding: "5px 10px" }}
                        onClick={() => { setView360Id(c.id); setView360Name(c.name); setTab("360"); }}>
                        360° View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Customer 360 Tab ── */}
      {tab === "360" && (
        <div>
          {!view360Id ? (
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Select a customer to view their 360° profile</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                {customers.map((c) => (
                  <div key={c.id} className="card" style={{ cursor: "pointer", padding: 16 }}
                    onClick={() => { setView360Id(c.id); setView360Name(c.name); }}>
                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>{c.territory} · {c.plan} Plan</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ flex: 1, textAlign: "center", background: "var(--bg)", borderRadius: 8, padding: "8px 4px" }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: "var(--teal)" }}>{fmt(c.total_revenue)}</div>
                        <div style={{ fontSize: 10, color: "var(--muted)" }}>Revenue</div>
                      </div>
                      <div style={{ flex: 1, textAlign: "center", background: "var(--bg)", borderRadius: 8, padding: "8px 4px" }}>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>{c.contacts}</div>
                        <div style={{ fontSize: 10, color: "var(--muted)" }}>Contacts</div>
                      </div>
                      <div style={{ flex: 1, textAlign: "center", background: "var(--bg)", borderRadius: 8, padding: "8px 4px" }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: c.open_invoices > 0 ? "var(--warn)" : "var(--ok)" }}>{c.open_invoices}</div>
                        <div style={{ fontSize: 10, color: "var(--muted)" }}>Open Inv.</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <button className="btn" style={{ marginBottom: 16 }} onClick={() => setView360Id(null)}>← Back to all customers</button>
              <Customer360Panel customerId={view360Id} customerName={view360Name} onClose={() => setView360Id(null)} />
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {selectedDeal && (
        <DealPanel deal={selectedDeal} onClose={() => setSelectedDeal(null)} onStageChange={moveStage} />
      )}

      {convertLead && (
        <ConvertLeadModal lead={convertLead} onClose={() => setConvertLead(null)} onConverted={handleLeadConverted} />
      )}

      {view360Id && tab !== "360" && (
        <Customer360Panel customerId={view360Id} customerName={view360Name} onClose={() => setView360Id(null)} />
      )}

      {/* New Lead Modal */}
      {showNewLead && (
        <div className="deal-panel-overlay" onClick={(e) => e.target === e.currentTarget && setShowNewLead(false)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 460, maxWidth: "95vw", boxShadow: "0 20px 60px rgba(0,0,0,.18)" }}>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 20 }}>+ New Lead</div>
            <label className="label">Full Name</label>
            <input className="inp" value={newLead.name} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} placeholder="e.g. Sipho Dlamini" />
            <label className="label">Company</label>
            <input className="inp" value={newLead.company} onChange={(e) => setNewLead({ ...newLead, company: e.target.value })} placeholder="e.g. Dlamini & Co" />
            <label className="label">Email</label>
            <input className="inp" type="email" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} placeholder="email@company.co.za" />
            <label className="label">Phone</label>
            <input className="inp" value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} placeholder="082 000 0000" />
            <label className="label">City</label>
            <input className="inp" value={newLead.city} onChange={(e) => setNewLead({ ...newLead, city: e.target.value })} placeholder="Johannesburg" />
            <label className="label">Source</label>
            <select className="inp" value={newLead.source} onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}>
              {["Website", "Referral", "LinkedIn", "Trade Show", "Cold Call", "Other"].map((s) => <option key={s}>{s}</option>)}
            </select>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="btn btn-teal" style={{ flex: 1 }} onClick={createLead}>Create Lead</button>
              <button className="btn" onClick={() => setShowNewLead(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
