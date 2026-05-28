"use client";

type Props = {
  type: "invoice" | "quote" | "ticket" | "appointment" | "payment";
  title: string;
  subtitle: string;
  document?: Record<string, unknown>;
  actions?: { label: string; href: string; primary?: boolean }[];
};

function txt(value: unknown, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function money(value: unknown) {
  return `R${Number(value || 0).toLocaleString("en-ZA", { maximumFractionDigits: 2 })}`;
}

function statusClass(value: unknown) {
  const s = String(value || "Open").toLowerCase();
  if (s.includes("paid") || s.includes("accepted") || s.includes("complete") || s.includes("resolved")) return "chip ok";
  if (s.includes("overdue") || s.includes("unpaid") || s.includes("high")) return "chip danger";
  return "chip warn";
}

export default function PortalDocumentView({ type, title, subtitle, document = {}, actions = [] }: Props) {
  const amount = document.outstanding_amount || document.grand_total || document.rounded_total || document.amount;
  return <main className="customer-document-page animate-fade-up">
    <section className="customer-document-hero">
      <div>
        <div className="demo-eyebrow">{type === "invoice" ? "Invoice" : type === "quote" ? "Quotation" : type === "ticket" ? "Support" : type === "appointment" ? "Appointment" : "Payment"}</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <span className={statusClass(document.status || document.priority)}>{txt(document.status || document.priority || "Open")}</span>
    </section>
    <section className="customer-document-grid">
      <div className="demo-panel customer-document-main">
        <div className="demo-panel-head"><div><h3>Document details</h3><p>Live portal-ready record from ERPNext/Frappe.</p></div></div>
        <div className="customer-document-fields">
          <div><span>Reference</span><b>{txt(document.name || title)}</b></div>
          <div><span>Customer</span><b>{txt(document.customer || document.party_name || document.contact_person)}</b></div>
          <div><span>Date</span><b>{txt(document.transaction_date || document.posting_date || document.appointment_date || document.creation)}</b></div>
          <div><span>Due / next step</span><b>{txt(document.due_date || document.starts_on || document.modified)}</b></div>
          <div><span>Amount</span><b>{amount ? money(amount) : txt(document.subject || document.description)}</b></div>
          <div><span>Status</span><b>{txt(document.status || document.priority || "Open")}</b></div>
        </div>
        {document.items && Array.isArray(document.items) ? <div className="overflow-auto"><table className="demo-table"><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>{(document.items as Record<string, unknown>[]).map((item, index) => <tr key={index}><td>{txt(item.item_name || item.item_code || item.description)}</td><td>{txt(item.qty)}</td><td>{money(item.rate)}</td><td>{money(item.amount)}</td></tr>)}</tbody></table></div> : null}
      </div>
      <aside className="demo-panel customer-document-side">
        <div className="demo-panel-head"><div><h3>Available actions</h3><p>Self-service options for this customer.</p></div></div>
        <div className="customer-action-list">
          {actions.map((action) => <a key={action.label} className={action.primary ? "primary" : ""} href={action.href}>{action.label}<span>{action.primary ? "Recommended next action" : "Open secure customer portal workflow"}</span></a>)}
          {!actions.length ? <a href="/customer-portal">Back to portal<span>Return to the customer dashboard.</span></a> : null}
        </div>
      </aside>
    </section>
  </main>;
}
