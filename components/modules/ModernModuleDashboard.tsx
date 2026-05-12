"use client";

import { useMemo, useState } from "react";

type Row = Record<string, unknown>;
type Metric = { label: string; value: string | number; hint: string };
type Action = { label: string; href?: string; description: string };
type Stage = { title: string; rows: Row[] };

type Props = {
  title: string;
  eyebrow: string;
  description: string;
  rows: Row[];
  tabs: string[];
  metrics: Metric[];
  actions: Action[];
  primaryField?: string;
  secondaryField?: string;
  statusField?: string;
  valueField?: string;
  mode?: "crm" | "finance" | "hr" | "support" | "projects" | "standard";
};

function text(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return value.toLocaleString("en-ZA");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function money(value: unknown): string {
  const n = Number(value || 0);
  return `R${n.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
}

function statusClass(value: unknown) {
  const s = String(value || "Active").toLowerCase();
  if (s.includes("overdue") || s.includes("urgent") || s.includes("lost") || s.includes("cancel")) return "chip danger";
  if (s.includes("pending") || s.includes("open") || s.includes("draft") || s.includes("waiting")) return "chip warn";
  return "chip ok";
}

function rowTitle(row: Row, primaryField?: string) {
  return text((primaryField && row[primaryField]) || row.subject || row.customer_name || row.lead_name || row.party_name || row.employee_name || row.project_name || row.name);
}

function rowSub(row: Row, secondaryField?: string) {
  return text((secondaryField && row[secondaryField]) || row.customer || row.company_name || row.project || row.email_id || row.modified);
}

function createStages(rows: Row[], mode: Props["mode"], statusField: string): Stage[] {
  const stageNames = mode === "crm"
    ? ["New", "Qualified", "Proposal", "Won"]
    : mode === "projects"
      ? ["Planning", "Working", "Review", "Completed"]
      : mode === "support"
        ? ["Open", "In Progress", "SLA Risk", "Resolved"]
        : [];

  if (!stageNames.length) return [];

  return stageNames.map((stage, index) => {
    const stageRows = rows.filter((row) => {
      const status = String(row[statusField] || row.status || row.name || "").toLowerCase();
      if (mode === "crm") {
        if (stage === "New") return status.includes("lead") || status.includes("open") || status.includes("new");
        if (stage === "Qualified") return status.includes("qualified") || status.includes("opportunity");
        if (stage === "Proposal") return status.includes("quote") || status.includes("quotation") || status.includes("proposal") || status.includes("draft");
        if (stage === "Won") return status.includes("won") || status.includes("converted") || status.includes("ordered");
      }
      if (mode === "projects") {
        if (stage === "Planning") return status.includes("open") || status.includes("planning") || status.includes("draft");
        if (stage === "Working") return status.includes("working") || status.includes("progress");
        if (stage === "Review") return status.includes("pending") || status.includes("review");
        if (stage === "Completed") return status.includes("complete") || status.includes("closed");
      }
      if (mode === "support") {
        if (stage === "Open") return status.includes("open");
        if (stage === "In Progress") return status.includes("replied") || status.includes("progress");
        if (stage === "SLA Risk") return status.includes("urgent") || status.includes("hold") || status.includes("overdue");
        if (stage === "Resolved") return status.includes("resolved") || status.includes("closed");
      }
      return false;
    });

    return {
      title: stage,
      rows: stageRows.length ? stageRows : rows.slice(index, index + 2),
    };
  });
}

function Timeline({ mode, rows, primaryField, secondaryField }: { mode: Props["mode"]; rows: Row[]; primaryField?: string; secondaryField?: string }) {
  const labels = mode === "crm"
    ? ["Lead created", "Follow-up scheduled", "Quote sent", "Decision pending"]
    : mode === "support"
      ? ["Ticket opened", "Agent replied", "SLA checked", "Resolution pending"]
      : mode === "projects"
        ? ["Project started", "Task assigned", "Milestone review", "Client update"]
        : ["Record created", "Updated", "Reviewed", "Action required"];

  return (
    <div className="demo-timeline">
      {labels.map((label, index) => {
        const row = rows[index] || rows[0] || {};
        return (
          <button key={label} type="button" className="demo-timeline-item">
            <span className="demo-timeline-dot" />
            <strong>{label}</strong>
            <em>{rowTitle(row, primaryField)}</em>
            <small>{rowSub(row, secondaryField)}</small>
          </button>
        );
      })}
    </div>
  );
}

function GanttPreview({ rows, primaryField }: { rows: Row[]; primaryField?: string }) {
  return (
    <div className="demo-gantt">
      {rows.slice(0, 6).map((row, index) => (
        <div key={String(row.name || index)} className="demo-gantt-row">
          <span>{rowTitle(row, primaryField)}</span>
          <div className="demo-gantt-track"><i style={{ width: `${35 + ((index * 13) % 55)}%` }} /></div>
          <b>{35 + ((index * 13) % 55)}%</b>
        </div>
      ))}
    </div>
  );
}

export default function ModernModuleDashboard({ title, eyebrow, description, rows, tabs, metrics, actions, primaryField, secondaryField, statusField = "status", valueField, mode = "standard" }: Props) {
  const [tab, setTab] = useState(tabs[0] || "Dashboard");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [rows, query]);

  const stages = useMemo(() => createStages(rows, mode, statusField), [rows, mode, statusField]);
  const isDashboardTab = tab === tabs[0];
  const canShowBoard = (mode === "crm" || mode === "projects" || mode === "support") && isDashboardTab;
  const showFinanceComposer = mode === "finance" && isDashboardTab;

  return (
    <div className="demo-workspace animate-fade-up">
      <section className="demo-module-titlebar">
        <div>
          <div className="demo-eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="demo-module-actions">
          {actions.slice(0, 3).map((action) => action.href
            ? <a key={action.label} href={action.href} className="btn btn-teal">{action.label}</a>
            : <button key={action.label} type="button" className="btn btn-teal">{action.label}</button>
          )}
        </div>
      </section>

      <section className="demo-tabbar">
        {tabs.map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={tab === item ? "active" : ""}>{item}</button>
        ))}
      </section>

      {isDashboardTab ? (
        <section className="demo-stat-grid">
          {metrics.map((metric, index) => (
            <button key={metric.label} type="button" className="demo-stat-card demo-interactive-card" style={{ animationDelay: `${index * 55}ms` }}>
              <div className="demo-stat-top">
                <div><div className="demo-stat-label">{metric.label}</div><div className="demo-stat-value">{metric.value}</div><div className="demo-stat-hint">{metric.hint}</div></div>
                <div className="demo-stat-icon">↗</div>
              </div>
            </button>
          ))}
        </section>
      ) : null}

      {canShowBoard ? (
        <section className="demo-panel demo-board-panel">
          <div className="demo-panel-head"><div><h3>{mode === "crm" ? "Sales Pipeline" : mode === "support" ? "SLA Work Queue" : "Project Work Board"}</h3><p>{mode === "projects" ? "Kanban view with progress preview." : "Stage-based work management for daily operations."}</p></div></div>
          <div className="demo-kanban">
            {stages.map((stage) => (
              <div key={stage.title} className="demo-kanban-column">
                <div className="demo-kanban-head"><b>{stage.title}</b><span>{stage.rows.length}</span></div>
                <div className="demo-kanban-list">
                  {stage.rows.slice(0, 6).map((row, index) => (
                    <button key={`${stage.title}-${String(row.name || index)}`} type="button" className="demo-kanban-card">
                      <b>{rowTitle(row, primaryField)}</b>
                      <p>{rowSub(row, secondaryField)}</p>
                      {valueField ? <strong>{money(row[valueField])}</strong> : <small>{text(row.modified)}</small>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {mode === "projects" && isDashboardTab ? (
        <section className="demo-panel"><div className="demo-panel-head"><div><h3>Project Timeline</h3><p>Gantt-style progress overview for operations.</p></div></div><div className="p-5"><GanttPreview rows={rows} primaryField={primaryField} /></div></section>
      ) : null}

      {(mode === "crm" || mode === "support" || mode === "projects") && isDashboardTab ? (
        <section className="demo-grid">
          <div className="demo-panel"><div className="demo-panel-head"><div><h3>{mode === "support" ? "Ticket Timeline" : mode === "projects" ? "Delivery Timeline" : "Sales Timeline"}</h3><p>Recent activity with next actions.</p></div></div><div className="p-5"><Timeline mode={mode} rows={rows} primaryField={primaryField} secondaryField={secondaryField} /></div></div>
          <div className="demo-panel"><div className="demo-panel-head"><div><h3>Smart Actions</h3><p>Quick actions for this workspace.</p></div></div><div className="demo-alert-list">{actions.map((action) => action.href ? <a key={action.label} href={action.href} className="demo-alert">{action.label}<span>{action.description}</span></a> : <button key={action.label} type="button" className="demo-alert">{action.label}<span>{action.description}</span></button>)}</div></div>
        </section>
      ) : null}

      {showFinanceComposer ? (
        <section className="demo-grid">
          <div className="demo-panel demo-invoice-composer">
            <div className="demo-panel-head"><div><h3>Invoice Composer</h3><p>Create, preview, send and track branded invoices.</p></div><a href="/portal/invoices" className="btn btn-sm">Create Invoice</a></div>
            <div className="demo-invoice-preview">
              <div className="invoice-paper">
                <div className="invoice-top"><div><h2>INVOICE</h2><p>INV-2026-0004</p></div><div><b>Business Suite</b><p>Powered by Fuze Digital</p></div></div>
                <div className="invoice-lines"><span>Customer</span><b>Customer account</b><span>Due Date</span><b>15 May 2026</b><span>VAT</span><b>Included</b><span>Total</span><strong>{metrics[0]?.value || "R0"}</strong></div>
              </div>
              <div className="invoice-actions">{["Send Invoice Email", "Download PDF", "Track Customer View", "Record Payment", "Share WhatsApp Copy"].map((a) => <button key={a} type="button" className="demo-alert">{a}<span>Open finance workflow</span></button>)}</div>
            </div>
          </div>
          <div className="demo-panel"><div className="demo-panel-head"><div><h3>Finance Health</h3><p>Payments, VAT and compliance summary.</p></div></div><div className="demo-alert-list">{["Outstanding invoices", "VAT submission", "Payment reconciliation", "Quote conversion"].map((a) => <a key={a} className="demo-alert" href="/portal/finance">{a}<span>View finance detail</span></a>)}</div></div>
        </section>
      ) : null}

      <section className="demo-grid">
        <div className="demo-panel">
          <div className="demo-panel-head"><div><h3>{tab}</h3><p>{isDashboardTab ? "Live records for this workspace." : "Tab-specific records and actions."}</p></div><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search records..." className="rounded-xl border border-slate-200 px-4 py-2 text-sm" /></div>
          <div className="overflow-auto"><table className="demo-table"><thead><tr><th>Record</th><th>Status</th><th>Related</th><th>Value</th><th>Action</th></tr></thead><tbody>{filtered.length ? filtered.slice(0, 25).map((row, index) => <tr key={String(row.name || index)}><td><b>{rowTitle(row, primaryField)}</b><div className="demo-record-sub">{text(row.name)}</div></td><td><span className={statusClass(row[statusField])}>{text(row[statusField] || "Active")}</span></td><td>{rowSub(row, secondaryField)}</td><td>{valueField ? money(row[valueField]) : text(row.modified)}</td><td><button className="btn btn-sm">Open</button></td></tr>) : <tr><td colSpan={5}>No records found yet.</td></tr>}</tbody></table></div>
        </div>
        <div className="demo-panel">
          <div className="demo-panel-head"><div><h3>Quick Actions</h3><p>Common actions for this module.</p></div></div>
          <div className="demo-alert-list">{actions.map((action) => action.href ? <a key={action.label} href={action.href} className="demo-alert">{action.label}<span>{action.description}</span></a> : <button key={action.label} type="button" className="demo-alert text-left">{action.label}<span>{action.description}</span></button>)}</div>
        </div>
      </section>
    </div>
  );
}
