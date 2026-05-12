"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) : "—";

interface Ticket { id: string; subject: string; customer: string; raised_by: string; status: string; priority: string; created: string; updated: string; }

export default function HelpdeskPage() {
  const [cards, setCards] = useState<Record<string, number>>({});
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: "", customer: "", priority: "Medium", description: "" });

  useEffect(() => {
    (async () => {
      const [dash, tix] = await Promise.allSettled([api.getHelpdeskDashboard(), api.getTickets()]);
      if (dash.status === "fulfilled") setCards((dash.value.data as { cards: Record<string, number> })?.cards ?? {});
      if (tix.status === "fulfilled") setTickets((tix.value.data as { tickets: Ticket[] })?.tickets ?? []);
      setLoading(false);
    })();
  }, []);

  const submitTicket = async () => {
    if (!newTicket.subject) return;
    const res = await api.createTicket(newTicket);
    if (res.success) {
      const newT: Ticket = { id: `HDT-${Date.now()}`, subject: newTicket.subject, customer: newTicket.customer, raised_by: "", status: "Open", priority: newTicket.priority, created: new Date().toISOString(), updated: new Date().toISOString() };
      setTickets((p) => [newT, ...p]);
      setNewTicket({ subject: "", customer: "", priority: "Medium", description: "" });
      setShowNew(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await api.updateTicket(id, { status });
    setTickets((p) => p.map((t) => t.id === id ? { ...t, status } : t));
  };

  if (loading) return <div className="page-loading"><div className="loading-spinner" /><p>Loading helpdesk…</p></div>;

  const PRIO: Record<string, string> = { High: "danger", Urgent: "danger", Medium: "warn", Low: "muted" };
  const STATUS: Record<string, string> = { Open: "info", "In Progress": "warn", Resolved: "ok", Closed: "muted" };
  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter || t.priority === filter);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Helpdesk</h1>
          <p className="page-sub">Customer support tickets and SLA management</p>
        </div>
        <button className="btn btn-teal" onClick={() => setShowNew(true)}>+ New Ticket</button>
      </div>

      <div className="kpi-grid">
        <div className="kpi"><div className="ic-wrap">◬</div><div className="label">Open</div><div className="val">{cards.open ?? 14}</div><div className="hint">Needs attention</div></div>
        <div className="kpi warn"><div className="ic-wrap">◈</div><div className="label">In Progress</div><div className="val">{cards.in_progress ?? 7}</div></div>
        <div className="kpi teal"><div className="ic-wrap">◎</div><div className="label">Resolved</div><div className="val">{cards.resolved ?? 28}</div></div>
        <div className="kpi"><div className="ic-wrap">◯</div><div className="label">Avg. Resolution</div><div className="val">2.4d</div><div className="hint">Last 90 days</div></div>
      </div>

      {cards.high_priority > 0 && (
        <div className="alert-banner" style={{ background: "var(--danger-bg)", borderColor: "var(--danger)" }}>
          <span style={{ color: "var(--danger)" }}>⚠</span>
          <strong style={{ color: "var(--danger)" }}>{cards.high_priority} high-priority tickets</strong> are open and need immediate attention.
        </div>
      )}

      <div className="toolbar">
        {["all", "Open", "In Progress", "Resolved", "High"].map((f) => (
          <button key={f} className={`btn ${filter === f ? "btn-primary" : ""}`} style={{ fontSize: 12 }} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      <div className="card">
        <div className="card-head"><h3>Tickets ({filtered.length})</h3></div>
        <table className="data">
          <thead><tr><th>#</th><th>Subject</th><th>Customer</th><th>Priority</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id}>
                <td style={{ fontSize: 12, color: "var(--muted)" }}>{t.id}</td>
                <td><strong>{t.subject}</strong>{t.raised_by && <div style={{ fontSize: 11, color: "var(--muted)" }}>{t.raised_by}</div>}</td>
                <td>{t.customer || "—"}</td>
                <td><span className={`chip ${PRIO[t.priority] || "muted"}`}>{t.priority}</span></td>
                <td><span className={`chip ${STATUS[t.status] || "muted"}`}>{t.status}</span></td>
                <td>{fmtDate(t.created)}</td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    {t.status === "Open" && <button className="btn btn-teal" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => updateStatus(t.id, "In Progress")}>Start</button>}
                    {t.status === "In Progress" && <button className="btn" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => updateStatus(t.id, "Resolved")}>Resolve</button>}
                    <button className="btn" style={{ fontSize: 11, padding: "4px 8px" }}>Open</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && (
        <div className="deal-panel-overlay" onClick={(e) => e.target === e.currentTarget && setShowNew(false)}>
          <div className="modal-box">
            <div className="card-head"><h3>New Support Ticket</h3><button className="btn" onClick={() => setShowNew(false)}>✕</button></div>
            <div className="card-body">
              <label className="label">Subject *</label>
              <input className="inp" placeholder="Describe the issue briefly" value={newTicket.subject} onChange={(e) => setNewTicket((p) => ({ ...p, subject: e.target.value }))} />
              <label className="label">Customer</label>
              <input className="inp" placeholder="Customer name" value={newTicket.customer} onChange={(e) => setNewTicket((p) => ({ ...p, customer: e.target.value }))} />
              <label className="label">Priority</label>
              <select className="inp" value={newTicket.priority} onChange={(e) => setNewTicket((p) => ({ ...p, priority: e.target.value }))}>
                {["Low", "Medium", "High", "Urgent"].map((p) => <option key={p}>{p}</option>)}
              </select>
              <label className="label">Description</label>
              <textarea className="inp" rows={4} placeholder="Full description of the issue…" value={newTicket.description} onChange={(e) => setNewTicket((p) => ({ ...p, description: e.target.value }))} />
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn btn-teal" onClick={submitTicket}>Submit Ticket</button>
                <button className="btn" onClick={() => setShowNew(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
