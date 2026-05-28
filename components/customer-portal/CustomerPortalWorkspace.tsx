"use client";

import { useMemo, useState } from "react";
import AIAssistantPanel from "@/components/ai/AIAssistantPanel";

type PortalDoc = Record<string, unknown>;
type PortalSummary = {
  ok?: boolean;
  company?: string;
  customer?: string;
  customer_name?: string;
  totals?: Record<string, unknown>;
  invoices?: PortalDoc[];
  quotations?: PortalDoc[];
  tickets?: PortalDoc[];
  appointments?: PortalDoc[];
  payment_links?: PortalDoc[];
};

type Props = {
  initial: PortalSummary;
  site?: string;
  customer?: string;
};

function txt(value: unknown, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function money(value: unknown) {
  return `R${Number(value || 0).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
}

function chip(status: unknown) {
  const s = String(status || "Open").toLowerCase();
  if (s.includes("paid") || s.includes("accepted") || s.includes("resolved") || s.includes("completed")) return "chip ok";
  if (s.includes("overdue") || s.includes("unpaid") || s.includes("high") || s.includes("urgent")) return "chip danger";
  return "chip warn";
}

function sectionTitle(tab: string) {
  if (tab === "Invoices") return "Invoices & statements";
  if (tab === "Quotes") return "Quotes waiting for approval";
  if (tab === "Tickets") return "Support tickets";
  if (tab === "Appointments") return "Appointments & bookings";
  return "Customer account overview";
}

export default function CustomerPortalWorkspace({ initial, site = "", customer = "" }: Props) {
  const [tab, setTab] = useState("Overview");
  const [query, setQuery] = useState("");
  const totals = initial.totals || {};
  const invoices = initial.invoices || [];
  const quotations = initial.quotations || [];
  const tickets = initial.tickets || [];
  const appointments = initial.appointments || [];
  const customerLabel = initial.customer_name || initial.customer || customer || "Customer";
  const tabs = ["Overview", "Invoices", "Quotes", "Tickets", "Appointments"];

  const rows = useMemo(() => {
    const source = tab === "Invoices" ? invoices : tab === "Quotes" ? quotations : tab === "Tickets" ? tickets : tab === "Appointments" ? appointments : [...invoices.slice(0, 3), ...quotations.slice(0, 2), ...tickets.slice(0, 2)];
    const q = query.trim().toLowerCase();
    return q ? source.filter((row) => JSON.stringify(row).toLowerCase().includes(q)) : source;
  }, [tab, query, invoices, quotations, tickets, appointments]);

  async function createTicket() {
    const subject = window.prompt("What should the ticket subject be?");
    if (!subject) return;
    await fetch("/api/customer-portal/ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site, customer, subject, priority: "Medium" }),
    });
    window.location.reload();
  }

  return <div className="customer-portal-shell animate-fade-up">
    <section className="customer-portal-hero">
      <div>
        <div className="demo-eyebrow">Client Portal</div>
        <h1>Welcome, {customerLabel}</h1>
        <p>View quotes, invoices, support tickets, appointments and secure payment links from your supplier portal.</p>
        <div className="customer-portal-actions">
          <a className="btn btn-primary" href="/customer-portal/pay">Make payment</a>
          <button className="btn" type="button" onClick={createTicket}>Open support ticket</button>
          <a className="btn" href="/customer-portal/appointments">Book appointment</a>
        </div>
      </div>
      <div className="customer-portal-card customer-portal-balance">
        <span>Outstanding balance</span>
        <b>{money(totals.outstanding_amount || totals.receivables || 0)}</b>
        <small>{txt(initial.company || site, "Your business portal")}</small>
      </div>
    </section>

    <section className="customer-portal-stats">
      <div><span>Open invoices</span><b>{Number(totals.open_invoices || invoices.length || 0)}</b><small>{money(totals.invoice_total || 0)} total invoice value</small></div>
      <div><span>Quotes</span><b>{Number(totals.open_quotations || quotations.length || 0)}</b><small>Review, accept, or request changes</small></div>
      <div><span>Support tickets</span><b>{Number(totals.open_tickets || tickets.length || 0)}</b><small>Track replies and SLA status</small></div>
      <div><span>Appointments</span><b>{Number(totals.upcoming_appointments || appointments.length || 0)}</b><small>Upcoming meetings and bookings</small></div>
    </section>

    <section className="customer-portal-grid">
      <main className="customer-portal-main">
        <div className="customer-portal-tabs">
          {tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}
        </div>
        <div className="demo-panel customer-portal-panel">
          <div className="demo-panel-head">
            <div><h3>{sectionTitle(tab)}</h3><p>ERPNext customer portal data with SaaS branding and secure links.</p></div>
            <input className="phase2-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search portal records…" />
          </div>
          <div className="overflow-auto">
            <table className="demo-table">
              <thead><tr><th>Record</th><th>Status</th><th>Date</th><th>Amount / Details</th><th>Action</th></tr></thead>
              <tbody>
                {rows.slice(0, 12).map((row, index) => {
                  const name = txt(row.name || row.invoice || row.quotation || row.subject || `Portal-${index + 1}`);
                  const route = tab === "Quotes" || String(name).startsWith("QTN") ? `/customer-portal/quote?site=${encodeURIComponent(site)}&quotation=${encodeURIComponent(name)}` : tab === "Tickets" ? `/customer-portal/tickets?site=${encodeURIComponent(site)}&ticket=${encodeURIComponent(name)}` : tab === "Appointments" ? `/customer-portal/appointments?site=${encodeURIComponent(site)}&appointment=${encodeURIComponent(name)}` : `/customer-portal/invoice?site=${encodeURIComponent(site)}&invoice=${encodeURIComponent(name)}`;
                  return <tr key={`${name}-${index}`}>
                    <td><b>{txt(row.title || row.subject || row.customer_name || name)}</b><div className="demo-record-sub">{name}</div></td>
                    <td><span className={chip(row.status || row.priority)}>{txt(row.status || row.priority || "Open")}</span></td>
                    <td>{txt(row.due_date || row.transaction_date || row.appointment_date || row.creation)}</td>
                    <td><b>{row.grand_total || row.outstanding_amount ? money(row.outstanding_amount || row.grand_total) : txt(row.description || row.customer || row.contact_person)}</b></td>
                    <td><a className="btn btn-sm" href={route}>View</a></td>
                  </tr>;
                })}
                {!rows.length ? <tr><td colSpan={5}>No portal records found yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <aside className="customer-portal-side">
        <AIAssistantPanel moduleName="client-portal" title="Portal AI Assistant" />
        <div className="demo-panel">
          <div className="demo-panel-head"><div><h3>Customer self-service</h3><p>Actions your tenant clients can complete without calling the office.</p></div></div>
          <div className="customer-action-list">
            <a href="/customer-portal/invoice">Download invoice<span>View outstanding invoices and payment state.</span></a>
            <a href="/customer-portal/quote">Approve quote<span>Review quotation details before approval.</span></a>
            <a href="/customer-portal/tickets">Track ticket<span>Check support updates and replies.</span></a>
            <a href="/customer-portal/appointments">Manage appointment<span>Book or view upcoming appointments.</span></a>
          </div>
        </div>
      </aside>
    </section>
  </div>;
}
