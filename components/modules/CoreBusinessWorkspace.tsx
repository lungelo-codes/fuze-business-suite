"use client";

import { useMemo, useState } from "react";
import AIAssistantPanel from "@/components/ai/AIAssistantPanel";
import { WorkspaceCreateButton, WorkspaceRecordActions } from "@/components/workspace/WorkspaceCrud";

type Row = Record<string, unknown>;
type Tone = "blue" | "green" | "orange" | "purple" | "pink" | "teal";
type Metric = { label: string; value: string | number; hint: string; trend?: string; tone?: Tone };
type Action = { label: string; href: string; description: string };
type PipelineStage = { label: string; value: string | number; amount?: string; tone?: Tone };
type Insight = { title: string; detail: string; tone?: "ok" | "warn" | "danger" };

type Props = {
  moduleName: "crm" | "sales" | "projects" | "support" | "overview";
  eyebrow: string;
  title: string;
  description: string;
  rows: Row[];
  metrics: Metric[];
  actions: Action[];
  stages: PipelineStage[];
  insights: Insight[];
  tabs: string[];
  primaryField?: string;
  secondaryField?: string;
  statusField?: string;
  valueField?: string;
  aiTitle?: string;
};

function text(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return value.toLocaleString("en-ZA");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function money(value: unknown): string {
  const n = Number(value || 0);
  return `R${n.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
}

function titleFrom(row: Row, primaryField?: string) {
  return text((primaryField && row[primaryField]) || row.subject || row.title || row.customer_name || row.lead_name || row.party_name || row.project_name || row.name);
}

function subFrom(row: Row, secondaryField?: string) {
  return text((secondaryField && row[secondaryField]) || row.customer || row.company_name || row.organization || row.project || row.email_id || row.modified);
}

function statusClass(value: unknown) {
  const s = String(value || "Active").toLowerCase();
  if (s.includes("overdue") || s.includes("urgent") || s.includes("lost") || s.includes("cancel") || s.includes("high")) return "chip danger";
  if (s.includes("pending") || s.includes("open") || s.includes("draft") || s.includes("waiting") || s.includes("proposal")) return "chip warn";
  return "chip ok";
}

function stageTone(tone?: string) { return `phase2-stage phase2-stage-${tone || "blue"}`; }
function metricTone(tone?: string) { return `phase2-metric phase2-metric-${tone || "blue"}`; }

function fallbackRows(moduleName: Props["moduleName"]): Row[] {
  if (moduleName === "crm") return [
    { name: "CRM-LEAD-001", lead_name: "Bright Solutions", company_name: "Bright Solutions", status: "Qualified", value: 125000, modified: "2h ago" },
    { name: "CRM-DEAL-002", lead_name: "Summit Technologies", company_name: "Summit Technologies", status: "Proposal", value: 210000, modified: "5h ago" },
    { name: "CRM-DEAL-003", lead_name: "BluePeak Industries", company_name: "BluePeak Industries", status: "Negotiation", value: 450000, modified: "1d ago" },
  ];
  if (moduleName === "sales") return [
    { name: "QTN-2026-0001", customer: "Bright Solutions", status: "Open", grand_total: 125000, modified: "Today" },
    { name: "SO-2026-0004", customer: "Summit Technologies", status: "To Deliver", grand_total: 210000, modified: "Yesterday" },
    { name: "INV-2026-0008", customer: "BluePeak Industries", status: "Unpaid", grand_total: 450000, modified: "2d ago" },
  ];
  if (moduleName === "projects") return [
    { name: "PROJ-001", project_name: "Client onboarding portal", customer: "Bright Solutions", status: "In Progress", percent_complete: 68, modified: "Today" },
    { name: "PROJ-002", project_name: "Finance automation", customer: "Summit Technologies", status: "Planning", percent_complete: 24, modified: "Yesterday" },
    { name: "TASK-003", subject: "Prepare deployment review", project: "Client onboarding portal", status: "Open", percent_complete: 45, modified: "2d ago" },
  ];
  return [
    { name: "ISS-2026-0001", subject: "Invoice not opening", customer: "Bright Solutions", status: "Open", priority: "High", modified: "Today" },
    { name: "ISS-2026-0002", subject: "Payment allocation query", customer: "Summit Technologies", status: "Replied", priority: "Medium", modified: "Yesterday" },
    { name: "COM-2026-0003", subject: "Follow-up message", sender: "client@example.com", status: "Resolved", priority: "Normal", modified: "2d ago" },
  ];
}

function getRecordStatus(row: Row, statusField: string) {
  return text(row[statusField] || row.priority || "Active");
}

function recordScore(row: Row, valueField?: string) {
  const raw = valueField ? row[valueField] : row.grand_total || row.opportunity_amount || row.value || row.outstanding_amount || row.percent_complete;
  const n = Number(raw || 0);
  return Number.isFinite(n) ? n : 0;
}

function RecordDrawer({ row, onClose, primaryField, secondaryField, statusField, valueField, moduleName, tab }: { row: Row; onClose: () => void; primaryField?: string; secondaryField?: string; statusField: string; valueField?: string; moduleName: Props["moduleName"]; tab?: string }) {
  const details = Object.entries(row).filter(([, value]) => value !== null && value !== undefined && value !== "").slice(0, 14);
  const nextAction = moduleName === "crm" ? "Schedule follow-up" : moduleName === "sales" ? "Send customer update" : moduleName === "projects" ? "Review delivery progress" : "Respond to customer";
  return <div className="phase6-drawer-backdrop" role="presentation" onClick={onClose}>
    <aside className="phase6-drawer" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
      <button className="phase6-drawer-close" type="button" onClick={onClose}>×</button>
      <div className="demo-eyebrow">Record details</div>
      <h2>{titleFrom(row, primaryField)}</h2>
      <p>{subFrom(row, secondaryField)}</p>
      <div className="phase6-drawer-summary">
        <span className={statusClass(row[statusField])}>{getRecordStatus(row, statusField)}</span>
        <strong>{valueField ? money(row[valueField]) : text(row.modified)}</strong>
      </div>
      <div className="phase6-action-strip phase7-action-strip">
        <WorkspaceRecordActions moduleName={moduleName} tab={tab} row={row} />
        <button className="btn" type="button">Ask AI</button>
      </div>
      <div className="phase6-detail-grid">
        {details.map(([key, value]) => <div key={key}><span>{key.replace(/_/g, " ")}</span><b>{text(value)}</b></div>)}
      </div>
      <div className="phase6-timeline">
        <h3>Activity timeline</h3>
        <div><b>Latest update</b><span>{text(row.modified || "Today")}</span></div>
        <div><b>Recommended next step</b><span>{nextAction} and keep the owner updated.</span></div>
        <div><b>Automation</b><span>Convert repetitive follow-ups into reminders or workflow actions.</span></div>
      </div>
    </aside>
  </div>;
}

export default function CoreBusinessWorkspace({ moduleName, eyebrow, title, description, rows, metrics, actions, stages, insights, tabs, primaryField, secondaryField, statusField = "status", valueField, aiTitle }: Props) {
  const [tab, setTab] = useState(tabs[0] || "Dashboard");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [view, setView] = useState<"table" | "board">("table");
  const [selected, setSelected] = useState<Row | null>(null);
  const liveRows = rows.length ? rows : fallbackRows(moduleName);
  const statuses = useMemo(() => ["All", ...Array.from(new Set(liveRows.map((row) => getRecordStatus(row, statusField)).filter(Boolean))).slice(0, 8)], [liveRows, statusField]);
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return liveRows.filter((row) => {
      const matchesSearch = !q || JSON.stringify(row).toLowerCase().includes(q);
      const matchesStatus = statusFilter === "All" || getRecordStatus(row, statusField) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [liveRows, query, statusFilter, statusField]);
  const heroCopy = moduleName === "crm"
    ? "Salesforce-inspired sales workspace for leads, accounts, contacts, opportunities, activities and AI-powered owner decisions."
    : description;
  const boardStages = stages.length ? stages : statuses.slice(1).map((label) => ({ label, value: filteredRows.filter((row) => getRecordStatus(row, statusField) === label).length }));

  return (
    <div className="phase2-workspace phase6-workspace animate-fade-up">
      <section className="phase2-titlebar phase6-titlebar">
        <div>
          <div className="demo-eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{heroCopy}</p>
        </div>
        <div className="phase2-actions">
          {actions.slice(0, 3).map((action, index) => (
            <WorkspaceCreateButton key={action.label} label={action.label} moduleName={moduleName} tab={tab} className={index === 0 ? "btn btn-primary" : "btn"} />
          ))}
        </div>
      </section>

      <section className="phase2-grid-main">
        <div className="phase2-main-column">
          <div className="phase2-tabs phase6-tabs">
            {tabs.map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={tab === item ? "active" : ""}>{item}</button>)}
          </div>

          <section className="phase2-metrics">
            {metrics.map((metric) => (
              <div key={metric.label} className={metricTone(metric.tone)}>
                <span>{metric.label}</span>
                <b>{metric.value}</b>
                <small>{metric.trend || metric.hint}</small>
              </div>
            ))}
          </section>

          <section className="phase2-panel phase6-panel">
            <div className="phase2-panel-head">
              <div><h3>{moduleName === "crm" ? "Pipeline Overview" : moduleName === "sales" ? "Revenue Flow" : moduleName === "projects" ? "Delivery Board" : "Support Queue"}</h3><p>{description}</p></div>
              <a className="phase2-link" href={actions[0]?.href || "#"}>Open full workspace →</a>
            </div>
            <div className="phase2-stage-row phase6-stage-row">
              {stages.map((stage) => (
                <button key={stage.label} type="button" className={stageTone(stage.tone)} onClick={() => setStatusFilter(stage.label === "New Lead" ? "Open" : stage.label)}>
                  <span>{stage.label}</span>
                  <b>{stage.value}</b>
                  {stage.amount ? <small>{stage.amount}</small> : null}
                </button>
              ))}
            </div>
          </section>

          <section className="phase2-panel phase6-panel">
            <div className="phase2-panel-head phase6-record-head">
              <div><h3>{tab}</h3><p>{filteredRows.length} records found. Filter, open details, and use quick actions without leaving this workspace.</p></div>
              <div className="phase6-toolbar">
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this module…" className="phase2-search" />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="phase6-select" aria-label="Filter by status">
                  {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
                <div className="phase6-segmented" aria-label="Change view">
                  <button type="button" onClick={() => setView("table")} className={view === "table" ? "active" : ""}>Table</button>
                  <button type="button" onClick={() => setView("board")} className={view === "board" ? "active" : ""}>Board</button>
                </div>
              </div>
            </div>
            {view === "table" ? <div className="overflow-auto">
              <table className="demo-table phase2-table phase6-table">
                <thead><tr><th>Record</th><th>Status</th><th>Related</th><th>Value</th><th>Next action</th></tr></thead>
                <tbody>
                  {filteredRows.slice(0, 12).map((row, index) => (
                    <tr key={String(row.name || index)} onClick={() => setSelected(row)} className="phase6-clickable-row">
                      <td><b>{titleFrom(row, primaryField)}</b><div className="demo-record-sub">{text(row.name || row.id)}</div></td>
                      <td><span className={statusClass(row[statusField])}>{getRecordStatus(row, statusField)}</span></td>
                      <td>{subFrom(row, secondaryField)}</td>
                      <td><b>{valueField ? money(row[valueField]) : text(row.modified)}</b></td>
                      <td><button className="btn btn-sm" type="button" onClick={(event) => { event.stopPropagation(); setSelected(row); }}>Open</button></td>
                    </tr>
                  ))}
                  {!filteredRows.length ? <tr><td colSpan={5}>No records found yet.</td></tr> : null}
                </tbody>
              </table>
            </div> : <div className="phase6-board">
              {boardStages.slice(0, 5).map((stage) => {
                const stageRows = filteredRows.filter((row) => JSON.stringify(row).toLowerCase().includes(stage.label.toLowerCase()) || getRecordStatus(row, statusField) === stage.label).slice(0, 4);
                const cards = stageRows.length ? stageRows : filteredRows.slice(0, 2);
                return <div key={stage.label} className="phase6-board-column">
                  <div className="phase6-board-head"><b>{stage.label}</b><span>{stage.value}</span></div>
                  {cards.map((row, index) => <button key={String(row.name || `${stage.label}-${index}`)} className="phase6-board-card" type="button" onClick={() => setSelected(row)}>
                    <b>{titleFrom(row, primaryField)}</b>
                    <span>{subFrom(row, secondaryField)}</span>
                    <small>{valueField ? money(row[valueField]) : text(row.modified)}</small>
                  </button>)}
                </div>;
              })}
            </div>}
          </section>
        </div>

        <aside className="phase2-side-column">
          <AIAssistantPanel moduleName={moduleName} title={aiTitle || `${title} AI Assistant`} />
          <div className="phase2-panel phase6-panel">
            <div className="phase2-panel-head"><div><h3>Owner Insights</h3><p>Useful decisions for the company owner.</p></div></div>
            <div className="phase2-insights">
              {insights.map((insight) => <div key={insight.title} className={`phase2-insight ${insight.tone || "ok"}`}><b>{insight.title}</b><span>{insight.detail}</span></div>)}
            </div>
          </div>
          <div className="phase2-panel phase6-panel">
            <div className="phase2-panel-head"><div><h3>Quick Actions</h3><p>Common actions for this module.</p></div></div>
            <div className="phase2-action-list">
              {actions.map((action) => <a key={action.label} href={action.href}>{action.label}<span>{action.description}</span></a>)}
            </div>
          </div>
        </aside>
      </section>
      {selected ? <RecordDrawer row={selected} onClose={() => setSelected(null)} primaryField={primaryField} secondaryField={secondaryField} statusField={statusField} valueField={valueField} moduleName={moduleName} tab={tab} /> : null}
    </div>
  );
}
