"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import StatusChip from "@/components/StatusChip";

type Any = Record<string, any>;
type ModalType = null | "invoice" | "payment" | "paymentLink" | "bank" | "bankTransaction" | "reconcile" | "vat" | "invoiceDetail";

const money = (v?: any) => `R ${Number(v || 0).toLocaleString("en-ZA", { maximumFractionDigits: 2 })}`;
const dateOnly = (v?: string) => (v ? String(v).slice(0, 10) : "—");
const unwrap = (x: any) => x?.data || x?.message || x || {};

async function api(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) throw new Error(json?.error || json?.message || "Request failed");
  return unwrap(json);
}

function Card({ label, value, hint }: { label: string; value: any; hint?: string }) {
  return (
    <div className="demo-stat-card">
      <div className="demo-stat-label">{label}</div>
      <div className="demo-stat-value">{value}</div>
      {hint && <div className="demo-stat-hint">{hint}</div>}
    </div>
  );
}

function Table({ cols, rows, render }: { cols: string[]; rows: Any[]; render: (r: Any, i: number) => React.ReactNode }) {
  return (
    <div className="overflow-auto">
      <table className="demo-table">
        <thead>
          <tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((r, i) => <tr key={r.name || r.id || i}>{render(r, i)}</tr>) : (
            <tr><td colSpan={cols.length} style={{ textAlign: "center", padding: 30, color: "var(--demo-muted)" }}>No records found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="demo-panel" style={{ width: wide ? "min(1120px,96vw)" : "min(860px,96vw)", maxHeight: "92vh", overflow: "auto" }}>
        <div className="card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>{title}</h3>
          <button className="btn btn-sm" onClick={onClose}>Close</button>
        </div>
        <div className="card-body">{children}</div>
      </div>
    </div>
  );
}

const blankItem = { item_code: "", item_name: "", description: "", qty: 1, rate: 0, uom: "Nos", save_as_item: true };
const blankForm: Any = {
  customer: "",
  posting_date: "",
  due_date: "",
  payment_terms_template: "",
  taxes_and_charges: "",
  submit: false,
  send_email: false,
  email_to: "",
  payment_provider: "payfast",
  mode_of_payment: "Bank Transfer",
  amount: "",
  reference_no: "",
  invoice: "",
  bank: "",
  bank_account_no: "",
  branch_code: "",
  bank_account: "",
  date: "",
  description: "",
  deposit: "",
  withdrawal: "",
  transaction_id: "",
  status: "Draft",
  from_date: "",
  to_date: "",
  due_date_compliance: "",
  items: [{ ...blankItem }],
};

export default function FinanceWorkspaceClient() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const initial = params.get("tab") || "dashboard";
  const [tab, setTab] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<Any>({});
  const [compliance, setCompliance] = useState<Any>({});
  const [reconciliation, setReconciliation] = useState<Any>({});
  const [modal, setModal] = useState<ModalType>(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Any | null>(null);
  const [form, setForm] = useState<Any>({ ...blankForm });
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      await api("/api/accounting/setup", { method: "POST", body: JSON.stringify({}) }).catch(() => null);
      const [finance, comp, recon] = await Promise.all([
        api("/api/accounting/workspace"),
        api("/api/compliance/dashboard"),
        api("/api/accounting/reconcile"),
      ]);
      setData(finance);
      setCompliance(comp);
      setReconciliation(recon);
    } catch (e: any) {
      setError(e?.message || "Could not load finance workspace");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const cards = data.dashboard?.cards || {};
  const invoices = data.invoices || [];
  const payments = data.payments || [];
  const bankAccounts = data.bank_accounts || [];
  const bankTx = reconciliation.transactions || data.bank_transactions || [];
  const openInvoices = reconciliation.open_invoices || invoices.filter((i: Any) => Number(i.outstanding_amount || 0) > 0);
  const compCards = compliance.cards || {};
  const upcoming = compliance.upcoming || [];
  const currency = data.currency || "ZAR";
  const tabs = [["dashboard", "Dashboard"], ["invoices", "Invoices"], ["payments", "Payments"], ["banking", "Banking"], ["compliance", "Compliance"]];

  const invoiceOptions = useMemo(() => openInvoices.map((i: Any) => ({ value: i.name, label: `${i.name} • ${i.customer_name || i.customer} • ${money(i.outstanding_amount || i.grand_total)}` })), [openInvoices]);

  function resetForm(extra: Any = {}) {
    setForm({ ...blankForm, items: [{ ...blankItem }], ...extra });
  }

  function openModal(kind: ModalType, row?: Any) {
    setNotice("");
    setSelected(row || null);
    if (kind === "payment" && row?.name) resetForm({ invoice: row.name, customer: row.customer, amount: row.outstanding_amount || row.grand_total || "" });
    else if (kind === "paymentLink" && row?.name) resetForm({ invoice: row.name, customer: row.customer, amount: row.outstanding_amount || row.grand_total || "", payment_provider: "payfast" });
    else if (kind === "reconcile" && row?.name) resetForm({ bank_transaction: row.name, amount: row.deposit || row.withdrawal || "", reference_no: row.reference_number || row.transaction_id || "" });
    else resetForm();
    setModal(kind);
  }

  function setItem(i: number, patch: Any) {
    const items = [...(form.items || [])];
    items[i] = { ...items[i], ...patch };
    setForm({ ...form, items });
  }

  async function documentAction(doctype: string, name: string, action: "submit" | "cancel") {
    try {
      await api("/api/workflow/document-action", { method: "POST", body: JSON.stringify({ doctype, name, action }) });
      setNotice(`${doctype} ${action} completed.`);
      await load();
    } catch (e: any) {
      alert(e?.message || "Could not update document");
    }
  }

  async function submit(kind: string) {
    setSaving(true);
    setNotice("");
    try {
      let url = "/api/accounting/invoices";
      let body: Any = {};
      if (kind === "invoice") {
        body = {
          customer: form.customer,
          posting_date: form.posting_date,
          due_date: form.due_date,
          payment_terms_template: form.payment_terms_template,
          taxes_and_charges: form.taxes_and_charges,
          submit: Boolean(form.submit),
          items: (form.items || []).filter((x: Any) => x.item_name || x.item_code).map((x: Any) => ({ ...x, qty: Number(x.qty || 1), rate: Number(x.rate || 0) })),
        };
      }
      if (kind === "payment") {
        url = "/api/accounting/payments";
        body = { invoice: form.invoice, party: form.customer, amount: Number(form.amount || 0), reference_no: form.reference_no, payment_type: "Receive", mode_of_payment: form.mode_of_payment || "Bank Transfer", submit: true };
      }
      if (kind === "paymentLink") {
        url = "/api/accounting/payment-links";
        body = { invoice: form.invoice, provider: form.payment_provider || "payfast", amount: Number(form.amount || 0) || undefined };
      }
      if (kind === "bank") {
        url = "/api/accounting/banks";
        body = { bank: form.bank, account_name: form.bank, bank_account_no: form.bank_account_no, branch_code: form.branch_code };
      }
      if (kind === "bankTransaction") {
        url = "/api/accounting/bank-transactions";
        body = { bank_account: form.bank_account, date: form.date, description: form.description, deposit: Number(form.deposit || 0), withdrawal: Number(form.withdrawal || 0), transaction_id: form.transaction_id, reference_number: form.reference_no };
      }
      if (kind === "reconcile") {
        url = "/api/accounting/reconcile";
        body = { bank_transaction: form.bank_transaction || selected?.name, invoice: form.invoice, amount: Number(form.amount || 0), reference_no: form.reference_no, mode_of_payment: form.mode_of_payment || "Bank Transfer" };
      }
      if (kind === "vat") {
        url = "/api/compliance/vat";
        body = { status: form.status, from_date: form.from_date, to_date: form.to_date, due_date: form.due_date_compliance };
      }
      const result = await api(url, { method: "POST", body: JSON.stringify(body) });
      if (kind === "paymentLink") {
        const link = result.payment_link || result.transaction?.payment_url || result.data?.payment_link;
        setNotice(link ? `Payment link created: ${link}` : "Payment link created.");
      } else {
        setModal(null);
      }
      await load();
    } catch (e: any) {
      alert(e?.message || "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="demo-workspace animate-fade-up">
      <div className="demo-module-titlebar">
        <div>
          <h1>Finance</h1>
          <p>Invoices, payments, payment links, banking reconciliation and South African compliance.</p>
        </div>
        <div className="demo-module-actions">
          <button className="btn" onClick={() => openModal("invoice")}>New Invoice</button>
          <button className="btn" onClick={() => openModal("payment")}>Record Payment</button>
          <button className="btn btn-teal" onClick={() => openModal("bankTransaction")}>Import Bank Line</button>
        </div>
      </div>

      {error && <div className="demo-banner" style={{ color: "#991b1b" }}>{error}</div>}

      <div className="demo-panel">
        <div className="demo-tabbar">
          {tabs.map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => { setTab(id); history.replaceState(null, "", `/portal/finance?tab=${id}`); }}>{label}</button>)}
        </div>
        {loading ? <div style={{ padding: 40, color: "var(--demo-muted)" }}>Loading finance…</div> : (
          <div style={{ padding: 18 }}>
            {tab === "dashboard" && <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
                <Card label="Receivables" value={money(cards.receivables)} hint="Customer outstanding" />
                <Card label="Payables" value={money(cards.payables)} hint="Supplier outstanding" />
                <Card label="Monthly Revenue" value={money(cards.monthly_revenue)} hint="This month" />
                <Card label="Monthly Profit" value={money(cards.monthly_profit)} hint="Revenue less expenses" />
                <Card label="Overdue Invoices" value={cards.overdue_invoices || 0} />
                <Card label="Unreconciled Bank Lines" value={bankTx.filter((x: Any) => String(x.status || "").toLowerCase() !== "reconciled").length} />
              </div>
              <div className="demo-panel" style={{ marginTop: 18 }}>
                <div className="card-head"><h3>Recent invoices</h3></div>
                <InvoiceTable rows={invoices.slice(0, 8)} openModal={openModal} onDocAction={documentAction} />
              </div>
            </>}

            {tab === "invoices" && <>
              <div className="demo-module-actions" style={{ marginBottom: 14 }}>
                <button className="btn btn-teal" onClick={() => openModal("invoice")}>Create Invoice</button>
              </div>
              <InvoiceTable rows={invoices} openModal={openModal} onDocAction={documentAction} />
            </>}

            {tab === "payments" && <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 18 }}>
                <Card label="Open invoices" value={openInvoices.length} />
                <Card label="Payment entries" value={payments.length} />
                <Card label="Currency" value={currency} />
              </div>
              <div className="demo-module-actions" style={{ marginBottom: 14 }}>
                <button className="btn" onClick={() => openModal("payment")}>Record Payment</button>
                <button className="btn btn-teal" onClick={() => openModal("paymentLink")}>Create Payment Link</button>
              </div>
              <Table cols={["Payment", "Party", "Date", "Amount", "Type", "Mode", "Status"]} rows={payments} render={(r) => <><td>{r.name}</td><td>{r.party_name || r.party}</td><td>{dateOnly(r.posting_date)}</td><td>{money(r.paid_amount || r.received_amount)}</td><td>{r.payment_type}</td><td>{r.mode_of_payment}</td><td><StatusChip status={r.status} /></td></>} />
            </>}

            {tab === "banking" && <>
              <div className="demo-module-actions" style={{ marginBottom: 14 }}>
                <button className="btn" onClick={() => openModal("bank")}>Add Bank Account</button>
                <button className="btn btn-teal" onClick={() => openModal("bankTransaction")}>Import Bank Line</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginBottom: 18 }}>
                {bankAccounts.map((b: Any) => <div key={b.name} className="demo-stat-card"><div className="demo-stat-label">{b.bank || "Bank Account"}</div><div className="demo-stat-value" style={{ fontSize: 18 }}>{b.account_name || b.name}</div><div className="demo-stat-hint">{b.account_type || "Current"} • {b.currency || "ZAR"}</div></div>)}
                {!bankAccounts.length && <div className="demo-banner">Add your business bank account to start reconciliation.</div>}
              </div>
              <Table cols={["Date", "Description", "Deposit", "Withdrawal", "Status", "Action"]} rows={bankTx} render={(r) => <><td>{dateOnly(r.date)}</td><td>{r.description || r.reference_number || r.transaction_id}</td><td>{money(r.deposit)}</td><td>{money(r.withdrawal)}</td><td><StatusChip status={r.status || "Unreconciled"} /></td><td><button className="btn btn-sm" onClick={() => openModal("reconcile", r)}>Reconcile</button></td></>} />
            </>}

            {tab === "compliance" && <>
              <div className="demo-module-actions" style={{ marginBottom: 14 }}><button className="btn btn-teal" onClick={() => openModal("vat")}>Create VAT Return</button></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 18 }}>
                <Card label="VAT Due" value={compCards.vat_returns_due || 0} />
                <Card label="VAT Overdue" value={compCards.vat_overdue || 0} />
                <Card label="PAYE Due" value={compCards.paye_due || 0} />
                <Card label="CIPC Due" value={compCards.cipc_due || 0} />
                <Card label="Deadlines" value={compCards.upcoming_deadlines || 0} />
              </div>
              <Table cols={["Deadline", "Type", "Due Date", "Priority", "Status"]} rows={upcoming} render={(r) => <><td>{r.title || r.name}</td><td>{r.task_type || "Compliance"}</td><td>{dateOnly(r.due_date)}</td><td>{r.priority || "—"}</td><td><StatusChip status={r.status} /></td></>} />
            </>}
          </div>
        )}
      </div>

      {modal === "invoice" && <Modal title="Create Invoice" onClose={() => setModal(null)} wide>
        <div className="field-row"><div className="field"><label>Customer</label><input value={form.customer || ""} onChange={e => setForm({ ...form, customer: e.target.value })} placeholder="Customer name" /></div><div className="field"><label>Posting date</label><input type="date" value={form.posting_date || ""} onChange={e => setForm({ ...form, posting_date: e.target.value })} /></div><div className="field"><label>Due date</label><input type="date" value={form.due_date || ""} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div></div>
        <div className="field-row"><div className="field"><label>Terms template</label><input value={form.payment_terms_template || ""} onChange={e => setForm({ ...form, payment_terms_template: e.target.value })} placeholder="Optional" /></div><div className="field"><label>Tax template</label><input value={form.taxes_and_charges || ""} onChange={e => setForm({ ...form, taxes_and_charges: e.target.value })} placeholder="Optional" /></div><div className="field"><label><input type="checkbox" checked={Boolean(form.submit)} onChange={e => setForm({ ...form, submit: e.target.checked })} /> Submit invoice</label></div></div>
        <div className="demo-panel" style={{ margin: "14px 0" }}><div className="card-head"><h3>Line items</h3><button className="btn btn-sm" onClick={() => setForm({ ...form, items: [...(form.items || []), { ...blankItem }] })}>Add item</button></div>{(form.items || []).map((it: Any, i: number) => <div className="field-row" key={i} style={{ padding: "0 14px 12px" }}><div className="field"><label>Item code</label><input value={it.item_code || ""} onChange={e => setItem(i, { item_code: e.target.value })} placeholder="Optional existing item" /></div><div className="field"><label>Item / Service</label><input value={it.item_name || ""} onChange={e => setItem(i, { item_name: e.target.value })} placeholder="Website Package" /></div><div className="field"><label>Qty</label><input type="number" value={it.qty || 1} onChange={e => setItem(i, { qty: e.target.value })} /></div><div className="field"><label>Rate</label><input type="number" value={it.rate || 0} onChange={e => setItem(i, { rate: e.target.value })} /></div><div className="field"><label>UOM</label><input value={it.uom || "Nos"} onChange={e => setItem(i, { uom: e.target.value })} /></div></div>)}</div>
        <button className="btn btn-teal" disabled={saving} onClick={() => submit("invoice")}>{saving ? "Saving…" : "Create Invoice"}</button>
      </Modal>}

      {modal === "payment" && <Modal title="Record Invoice Payment" onClose={() => setModal(null)}>
        <div className="field-row"><div className="field"><label>Invoice</label><select value={form.invoice || ""} onChange={e => { const inv = openInvoices.find((x: Any) => x.name === e.target.value); setForm({ ...form, invoice: e.target.value, customer: inv?.customer, amount: inv?.outstanding_amount || inv?.grand_total || form.amount }); }}><option value="">Select invoice</option>{invoiceOptions.map((o: Any) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div><div className="field"><label>Amount</label><input type="number" value={form.amount || ""} onChange={e => setForm({ ...form, amount: e.target.value })} /></div></div>
        <div className="field-row"><div className="field"><label>Mode of payment</label><input value={form.mode_of_payment || "Bank Transfer"} onChange={e => setForm({ ...form, mode_of_payment: e.target.value })} /></div><div className="field"><label>Reference</label><input value={form.reference_no || ""} onChange={e => setForm({ ...form, reference_no: e.target.value })} /></div></div>
        <button className="btn btn-teal" disabled={saving} onClick={() => submit("payment")}>{saving ? "Saving…" : "Record Payment"}</button>
      </Modal>}

      {modal === "paymentLink" && <Modal title="Create Invoice Payment Link" onClose={() => setModal(null)}>
        <div className="field-row"><div className="field"><label>Invoice</label><select value={form.invoice || ""} onChange={e => { const inv = openInvoices.find((x: Any) => x.name === e.target.value); setForm({ ...form, invoice: e.target.value, amount: inv?.outstanding_amount || inv?.grand_total || form.amount }); }}><option value="">Select invoice</option>{invoiceOptions.map((o: Any) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div><div className="field"><label>Provider</label><select value={form.payment_provider || "payfast"} onChange={e => setForm({ ...form, payment_provider: e.target.value })}><option value="payfast">PayFast</option><option value="yoco">Yoco</option><option value="ikhokha">iKhokha</option></select></div></div>
        <div className="field"><label>Amount override</label><input type="number" value={form.amount || ""} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="Leave blank to use outstanding amount" /></div>
        {notice && <div className="demo-banner" style={{ marginBottom: 14, wordBreak: "break-all" }}>{notice}</div>}
        <button className="btn btn-teal" disabled={saving} onClick={() => submit("paymentLink")}>{saving ? "Creating…" : "Create Payment Link"}</button>
      </Modal>}

      {modal === "bank" && <Modal title="Add Bank Account" onClose={() => setModal(null)}><div className="field-row"><div className="field"><label>Bank</label><input value={form.bank || ""} onChange={e => setForm({ ...form, bank: e.target.value })} placeholder="FNB" /></div><div className="field"><label>Account No</label><input value={form.bank_account_no || ""} onChange={e => setForm({ ...form, bank_account_no: e.target.value })} /></div><div className="field"><label>Branch Code</label><input value={form.branch_code || ""} onChange={e => setForm({ ...form, branch_code: e.target.value })} /></div></div><button className="btn btn-teal" disabled={saving} onClick={() => submit("bank")}>{saving ? "Saving…" : "Save Bank Account"}</button></Modal>}

      {modal === "bankTransaction" && <Modal title="Import Bank Line" onClose={() => setModal(null)}><div className="field-row"><div className="field"><label>Bank account</label><input value={form.bank_account || ""} onChange={e => setForm({ ...form, bank_account: e.target.value })} placeholder="Bank Account ID" /></div><div className="field"><label>Date</label><input type="date" value={form.date || ""} onChange={e => setForm({ ...form, date: e.target.value })} /></div></div><div className="field"><label>Description</label><input value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} /></div><div className="field-row"><div className="field"><label>Deposit</label><input type="number" value={form.deposit || ""} onChange={e => setForm({ ...form, deposit: e.target.value })} /></div><div className="field"><label>Withdrawal</label><input type="number" value={form.withdrawal || ""} onChange={e => setForm({ ...form, withdrawal: e.target.value })} /></div><div className="field"><label>Reference</label><input value={form.reference_no || ""} onChange={e => setForm({ ...form, reference_no: e.target.value })} /></div></div><button className="btn btn-teal" disabled={saving} onClick={() => submit("bankTransaction")}>{saving ? "Saving…" : "Import Bank Line"}</button></Modal>}

      {modal === "reconcile" && <Modal title="Reconcile Bank Transaction" onClose={() => setModal(null)}>
        <div className="demo-banner" style={{ marginBottom: 14 }}>{selected?.description || selected?.reference_number || "Bank transaction"} • {money(selected?.deposit || selected?.withdrawal || form.amount)}</div>
        <div className="field-row"><div className="field"><label>Match to invoice</label><select value={form.invoice || ""} onChange={e => { const inv = openInvoices.find((x: Any) => x.name === e.target.value); setForm({ ...form, invoice: e.target.value, amount: selected?.deposit || inv?.outstanding_amount || form.amount }); }}><option value="">Select open invoice</option>{invoiceOptions.map((o: Any) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div><div className="field"><label>Amount</label><input type="number" value={form.amount || ""} onChange={e => setForm({ ...form, amount: e.target.value })} /></div></div>
        <div className="field"><label>Reference</label><input value={form.reference_no || ""} onChange={e => setForm({ ...form, reference_no: e.target.value })} /></div>
        <button className="btn btn-teal" disabled={saving} onClick={() => submit("reconcile")}>{saving ? "Reconciling…" : "Reconcile"}</button>
      </Modal>}

      {modal === "vat" && <Modal title="Create VAT Return" onClose={() => setModal(null)}><div className="field-row"><div className="field"><label>From</label><input type="date" value={form.from_date || ""} onChange={e => setForm({ ...form, from_date: e.target.value })} /></div><div className="field"><label>To</label><input type="date" value={form.to_date || ""} onChange={e => setForm({ ...form, to_date: e.target.value })} /></div><div className="field"><label>Due date</label><input type="date" value={form.due_date_compliance || ""} onChange={e => setForm({ ...form, due_date_compliance: e.target.value })} /></div></div><button className="btn btn-teal" disabled={saving} onClick={() => submit("vat")}>{saving ? "Saving…" : "Create VAT Return"}</button></Modal>}
    </div>
  );
}

function InvoiceTable({ rows, openModal, onDocAction }: { rows: Any[]; openModal: (kind: ModalType, row?: Any) => void; onDocAction: (doctype: string, name: string, action: "submit" | "cancel") => void }) {
  return <Table cols={["Invoice", "Customer", "Date", "Due", "Total", "Outstanding", "Status", "Actions"]} rows={rows} render={(r) => <><td>{r.name}</td><td>{r.customer_name || r.customer}</td><td>{dateOnly(r.posting_date)}</td><td>{dateOnly(r.due_date)}</td><td>{money(r.grand_total)}</td><td>{money(r.outstanding_amount)}</td><td><StatusChip status={r.status} /></td><td><div className="demo-module-actions"><button className="btn btn-sm" onClick={() => onDocAction("Sales Invoice", r.name, "submit")}>Submit</button><button className="btn btn-sm" onClick={() => openModal("paymentLink", r)}>Payment Link</button><button className="btn btn-sm" onClick={() => openModal("payment", r)}>Receive</button><button className="btn btn-sm" onClick={() => onDocAction("Sales Invoice", r.name, "cancel")}>Cancel</button></div></td></>} />;
}
