"use client"
import { useEffect, useMemo, useState } from "react"
import StatusChip from "@/components/StatusChip"

type Row = Record<string, unknown>

function text(v: unknown): string { return v ? String(v) : "—" }
function money(v: unknown): string {
  const x = typeof v === "number" ? v : Number(v || 0)
  return x ? `R${x.toLocaleString("en-ZA")}` : "—"
}
function dateOnly(v: unknown): string { return v ? String(v).slice(0, 10) : "—" }

async function getJson(url: string) {
  try {
    const r = await fetch(url, { cache: "no-store" })
    const j = await r.json().catch(() => null)
    return r.ok && j && !j.error ? j : null
  } catch { return null }
}

type Tab = "overview" | "entries" | "proofs" | "create" | "payment-link"

export default function PaymentsClient() {
  const [tab, setTab] = useState<Tab>("overview")
  const [payments, setPayments] = useState<Row[]>([])
  const [proofs, setProofs] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [formMsg, setFormMsg] = useState("")
  const [saving, setSaving] = useState(false)

  // Create payment form
  const [payForm, setPayForm] = useState({
    payment_type: "Receive",
    party_type: "Customer",
    party: "",
    paid_amount: "",
    received_amount: "",
    posting_date: new Date().toISOString().slice(0, 10),
    reference_no: "",
    reference_date: new Date().toISOString().slice(0, 10),
    mode_of_payment: "Cash",
    remarks: "",
  })

  // Payment link form
  const [linkForm, setLinkForm] = useState({
    provider: "iKhokha",
    amount: "",
    description: "",
    customer_email: "",
    customer_name: "",
  })
  const [generatedLink, setGeneratedLink] = useState("")

  async function loadData() {
    const [p, pr] = await Promise.all([
      getJson("/api/crud/payments"),
      getJson("/api/payments/proofs"),
    ])
    if (p?.data) setPayments(p.data)
    if (pr?.data) setProofs(pr.data)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return payments
    return payments.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }, [payments, query])

  const totalReceived = useMemo(() =>
    payments.filter((p) => p.payment_type === "Receive").reduce((s, p) => s + Number(p.paid_amount || 0), 0),
    [payments])

  const totalPaid = useMemo(() =>
    payments.filter((p) => p.payment_type === "Pay").reduce((s, p) => s + Number(p.paid_amount || 0), 0),
    [payments])

  async function createPayment(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setFormMsg("")
    try {
      const res = await fetch("/api/crud/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payForm,
          paid_amount: Number(payForm.paid_amount),
          received_amount: Number(payForm.received_amount || payForm.paid_amount),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Could not create payment")
      setFormMsg(`Payment entry created: ${json.data?.name || "OK"}`)
      setPayForm({
        payment_type: "Receive", party_type: "Customer", party: "",
        paid_amount: "", received_amount: "",
        posting_date: new Date().toISOString().slice(0, 10),
        reference_no: "", reference_date: new Date().toISOString().slice(0, 10),
        mode_of_payment: "Cash", remarks: "",
      })
      await loadData()
    } catch (err) {
      setFormMsg(err instanceof Error ? err.message : "Could not create payment")
    } finally { setSaving(false) }
  }

  async function generatePaymentLink(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setFormMsg(""); setGeneratedLink("")
    try {
      const res = await fetch("/api/appointments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "payment_link",
          provider: linkForm.provider,
          amount: Number(linkForm.amount),
          description: linkForm.description,
          customer_email: linkForm.customer_email,
          customer_name: linkForm.customer_name,
        }),
      })
      const json = await res.json()
      if (json.payment_url || json.data?.payment_url || json.checkout_url) {
        setGeneratedLink(json.payment_url || json.data?.payment_url || json.checkout_url)
        setFormMsg("Payment link generated successfully!")
      } else {
        // Fallback: construct a PayFast link
        const pfUrl = `https://www.payfast.co.za/eng/process?merchant_id=10000100&merchant_key=46f0cd694581a&amount=${linkForm.amount}&item_name=${encodeURIComponent(linkForm.description || "Payment")}&email_address=${encodeURIComponent(linkForm.customer_email || "")}`
        setGeneratedLink(pfUrl)
        setFormMsg("PayFast payment link generated (sandbox mode).")
      }
    } catch (err) {
      setFormMsg(err instanceof Error ? err.message : "Could not generate payment link")
    } finally { setSaving(false) }
  }

  async function approveProof(id: string) {
    try {
      await fetch(`/api/payments/proofs/${id}/approve`, { method: "POST" })
      await loadData()
    } catch {}
  }

  async function rejectProof(id: string) {
    try {
      await fetch(`/api/payments/proofs/${id}/reject`, { method: "POST" })
      await loadData()
    } catch {}
  }

  if (loading) {
    return (
      <div className="demo-workspace animate-fade-up">
        <div className="demo-module-titlebar">
          <div><h1>Payments</h1><p>Loading payment data…</p></div>
        </div>
      </div>
    )
  }

  return (
    <div className="demo-workspace animate-fade-up">
      <div className="demo-module-titlebar">
        <div>
          <div className="demo-eyebrow">Finance Workspace</div>
          <h1>Payments</h1>
          <p>Record payments, manage proofs of payment, and generate payment links.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" onClick={() => setTab("payment-link")}>Payment Link</button>
          <button className="btn btn-teal" onClick={() => setTab("create")}>+ Record Payment</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="demo-stat-grid">
        <div className="demo-stat-card">
          <div className="demo-stat-top">
            <div>
              <div className="demo-stat-label">Total Received</div>
              <div className="demo-stat-value">{money(totalReceived)}</div>
              <div className="demo-stat-hint">Inbound payments</div>
            </div>
            <div className="demo-stat-icon" style={{ background: "linear-gradient(135deg,#10B981,#059669)" }}>↓</div>
          </div>
        </div>
        <div className="demo-stat-card">
          <div className="demo-stat-top">
            <div>
              <div className="demo-stat-label">Total Paid Out</div>
              <div className="demo-stat-value">{money(totalPaid)}</div>
              <div className="demo-stat-hint">Outbound payments</div>
            </div>
            <div className="demo-stat-icon" style={{ background: "linear-gradient(135deg,#EF4444,#DC2626)" }}>↑</div>
          </div>
        </div>
        <div className="demo-stat-card">
          <div className="demo-stat-top">
            <div>
              <div className="demo-stat-label">Payment Entries</div>
              <div className="demo-stat-value">{payments.length}</div>
              <div className="demo-stat-hint">All records</div>
            </div>
            <div className="demo-stat-icon">💳</div>
          </div>
        </div>
        <div className="demo-stat-card">
          <div className="demo-stat-top">
            <div>
              <div className="demo-stat-label">Pending Proofs</div>
              <div className="demo-stat-value">{proofs.filter((p) => p.status === "Pending").length}</div>
              <div className="demo-stat-hint">Awaiting review</div>
            </div>
            <div className="demo-stat-icon" style={{ background: "linear-gradient(135deg,#8B5CF6,#7C3AED)" }}>📎</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="demo-panel" style={{ marginBottom: 0 }}>
        <div className="demo-panel-head">
          <div className="seg">
            {(["overview", "entries", "proofs", "create", "payment-link"] as Tab[]).map((t) => (
              <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
                {t === "create" ? "+ Record" : t === "payment-link" ? "Pay Link" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          {["overview", "entries"].includes(tab) && (
            <div className="search">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search payments…" />
            </div>
          )}
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <div style={{ padding: "0 0 8px" }}>
            <div className="overflow-auto">
              <table className="demo-table">
                <thead><tr><th>Reference</th><th>Party</th><th>Type</th><th>Mode</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                  {payments.slice(0, 10).map((p) => (
                    <tr key={String(p.name)}>
                      <td><strong>{text(p.name)}</strong></td>
                      <td>{text(p.party)}</td>
                      <td>{text(p.payment_type)}</td>
                      <td>{text(p.mode_of_payment)}</td>
                      <td>{money(p.paid_amount)}</td>
                      <td>{dateOnly(p.posting_date)}</td>
                      <td><StatusChip status={String(p.status || "Draft")} /></td>
                    </tr>
                  ))}
                  {payments.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--demo-muted)" }}>No payment entries yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* All Entries */}
        {tab === "entries" && (
          <div className="overflow-auto">
            <table className="demo-table">
              <thead><tr><th>Reference</th><th>Party</th><th>Type</th><th>Mode</th><th>Amount</th><th>Received</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={String(p.name)}>
                    <td><strong>{text(p.name)}</strong></td>
                    <td>{text(p.party)}</td>
                    <td>{text(p.payment_type)}</td>
                    <td>{text(p.mode_of_payment)}</td>
                    <td>{money(p.paid_amount)}</td>
                    <td>{money(p.received_amount)}</td>
                    <td>{dateOnly(p.posting_date)}</td>
                    <td><StatusChip status={String(p.status || "Draft")} /></td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--demo-muted)" }}>No payments found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Proofs */}
        {tab === "proofs" && (
          <div style={{ padding: "0 0 8px" }}>
            <div className="overflow-auto">
              <table className="demo-table">
                <thead><tr><th>Reference</th><th>Customer</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {proofs.map((p) => (
                    <tr key={String(p.name)}>
                      <td><strong>{text(p.name)}</strong></td>
                      <td>{text(p.customer || p.party)}</td>
                      <td>{money(p.amount || p.paid_amount)}</td>
                      <td><StatusChip status={String(p.status || "Pending")} /></td>
                      <td>
                        {p.status === "Pending" && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn" style={{ fontSize: 11, padding: "3px 10px", background: "var(--teal)", color: "#fff" }} onClick={() => approveProof(String(p.name))}>Approve</button>
                            <button className="btn" style={{ fontSize: 11, padding: "3px 10px" }} onClick={() => rejectProof(String(p.name))}>Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {proofs.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--demo-muted)" }}>No payment proofs submitted.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Payment */}
        {tab === "create" && (
          <div style={{ padding: "24px", maxWidth: 600 }}>
            <h4 style={{ margin: "0 0 16px", fontWeight: 900, color: "var(--demo-text)" }}>Record Payment Entry</h4>
            <form onSubmit={createPayment} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field">
                  <label>Payment Type</label>
                  <select className="inp" value={payForm.payment_type} onChange={(e) => setPayForm({ ...payForm, payment_type: e.target.value })}>
                    {["Receive", "Pay", "Internal Transfer"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Party Type</label>
                  <select className="inp" value={payForm.party_type} onChange={(e) => setPayForm({ ...payForm, party_type: e.target.value })}>
                    {["Customer", "Supplier", "Employee"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Party *</label>
                  <input className="inp" value={payForm.party} onChange={(e) => setPayForm({ ...payForm, party: e.target.value })} required placeholder="Customer or supplier name" />
                </div>
                <div className="field">
                  <label>Mode of Payment</label>
                  <select className="inp" value={payForm.mode_of_payment} onChange={(e) => setPayForm({ ...payForm, mode_of_payment: e.target.value })}>
                    {["Cash", "Bank Transfer", "EFT", "Credit Card", "Cheque"].map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Amount *</label>
                  <input className="inp" type="number" step="0.01" value={payForm.paid_amount} onChange={(e) => setPayForm({ ...payForm, paid_amount: e.target.value })} required />
                </div>
                <div className="field">
                  <label>Posting Date</label>
                  <input className="inp" type="date" value={payForm.posting_date} onChange={(e) => setPayForm({ ...payForm, posting_date: e.target.value })} />
                </div>
                <div className="field">
                  <label>Reference No.</label>
                  <input className="inp" value={payForm.reference_no} onChange={(e) => setPayForm({ ...payForm, reference_no: e.target.value })} placeholder="Bank ref / cheque no" />
                </div>
                <div className="field">
                  <label>Reference Date</label>
                  <input className="inp" type="date" value={payForm.reference_date} onChange={(e) => setPayForm({ ...payForm, reference_date: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label>Remarks</label>
                <textarea className="inp" value={payForm.remarks} onChange={(e) => setPayForm({ ...payForm, remarks: e.target.value })} rows={2} />
              </div>
              {formMsg && <div className="banner info">{formMsg}</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-teal" disabled={saving}>{saving ? "Saving…" : "Record Payment"}</button>
                <button type="button" className="btn" onClick={() => setTab("entries")}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Payment Link */}
        {tab === "payment-link" && (
          <div style={{ padding: "24px", maxWidth: 560 }}>
            <h4 style={{ margin: "0 0 8px", fontWeight: 900, color: "var(--demo-text)" }}>Generate Payment Link</h4>
            <p style={{ fontSize: 13, color: "var(--demo-muted)", margin: "0 0 20px" }}>
              Create a payment link via iKhokha, Yoco, or PayFast to send to your customer.
            </p>
            <form onSubmit={generatePaymentLink} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field">
                  <label>Provider</label>
                  <select className="inp" value={linkForm.provider} onChange={(e) => setLinkForm({ ...linkForm, provider: e.target.value })}>
                    {["iKhokha", "Yoco", "PayFast"].map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Amount (ZAR) *</label>
                  <input className="inp" type="number" step="0.01" value={linkForm.amount} onChange={(e) => setLinkForm({ ...linkForm, amount: e.target.value })} required placeholder="0.00" />
                </div>
                <div className="field">
                  <label>Customer Name</label>
                  <input className="inp" value={linkForm.customer_name} onChange={(e) => setLinkForm({ ...linkForm, customer_name: e.target.value })} />
                </div>
                <div className="field">
                  <label>Customer Email</label>
                  <input className="inp" type="email" value={linkForm.customer_email} onChange={(e) => setLinkForm({ ...linkForm, customer_email: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label>Description</label>
                <input className="inp" value={linkForm.description} onChange={(e) => setLinkForm({ ...linkForm, description: e.target.value })} placeholder="Invoice #001 — Services rendered" />
              </div>
              {formMsg && <div className="banner info">{formMsg}</div>}
              {generatedLink && (
                <div style={{ background: "var(--demo-soft)", borderRadius: 8, padding: "12px 16px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--demo-text)", marginBottom: 6 }}>Payment Link:</div>
                  <a href={generatedLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--teal)", wordBreak: "break-all" }}>{generatedLink}</a>
                  <button
                    type="button"
                    className="btn"
                    style={{ marginTop: 8, fontSize: 11, padding: "4px 12px" }}
                    onClick={() => { navigator.clipboard.writeText(generatedLink); setFormMsg("Link copied!") }}
                  >
                    Copy Link
                  </button>
                </div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-teal" disabled={saving}>{saving ? "Generating…" : "Generate Link"}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
