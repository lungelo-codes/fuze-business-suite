"use client";

import { useMemo, useState } from "react";
import AIAssistantPanel from "@/components/ai/AIAssistantPanel";
import { WorkspaceCreateButton, WorkspaceRecordActions } from "@/components/workspace/WorkspaceCrud";

type Row = Record<string, unknown>;
type Tone = "blue" | "green" | "orange" | "purple" | "pink" | "teal";
type Metric = { label: string; value: string | number; hint: string; trend?: string; tone?: Tone };
type Action = { label: string; href: string; description: string };
type FlowStep = { label: string; count?: string | number; hint?: string; tone?: Tone };
type Insight = { title: string; detail: string; tone?: "ok" | "warn" | "danger" };

type Props = {
  moduleName: string;
  eyebrow: string;
  title: string;
  description: string;
  rows: Row[];
  metrics: Metric[];
  actions: Action[];
  flow: FlowStep[];
  insights: Insight[];
  tabs: string[];
  primaryField?: string;
  secondaryField?: string;
  statusField?: string;
  valueField?: string;
  aiTitle?: string;
  ownerQuestion?: string;
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
  return text((primaryField && row[primaryField]) || row.employee_name || row.account_name || row.asset_name || row.supplier_name || row.customer_name || row.project_name || row.report_name || row.subject || row.title || row.name);
}

function subFrom(row: Row, secondaryField?: string) {
  return text((secondaryField && row[secondaryField]) || row.department || row.company || row.customer || row.supplier || row.item_code || row.owner || row.modified);
}

function statusClass(value: unknown) {
  const s = String(value || "Active").toLowerCase();
  if (s.includes("overdue") || s.includes("urgent") || s.includes("failed") || s.includes("cancel") || s.includes("inactive")) return "chip danger";
  if (s.includes("pending") || s.includes("open") || s.includes("draft") || s.includes("waiting") || s.includes("to ")) return "chip warn";
  return "chip ok";
}

function toneClass(prefix: string, tone?: Tone) { return `${prefix} ${prefix}-${tone || "blue"}`; }

function fallbackRows(moduleName: string): Row[] {
  if (moduleName === "hr") return [
    { name: "HR-EMP-0001", employee_name: "Noluthando Mkhize", department: "Sales", status: "Active", modified: "Today" },
    { name: "HR-LEAVE-0002", employee_name: "Sipho Dlamini", department: "Operations", status: "Pending", modified: "Yesterday" },
    { name: "HR-ATT-0003", employee_name: "Lerato Nair", department: "Finance", status: "Present", modified: "2d ago" },
  ];
  if (moduleName === "accounting") return [
    { name: "ACC-SINV-0001", customer: "Bright Solutions", status: "Unpaid", outstanding_amount: 125000, modified: "Today" },
    { name: "ACC-PAY-0002", customer: "Summit Technologies", status: "Paid", paid_amount: 87000, modified: "Yesterday" },
    { name: "ACC-JV-0003", account_name: "Bank Reconciliation", status: "Draft", debit: 45000, modified: "2d ago" },
  ];
  if (moduleName === "assets") return [
    { name: "AST-0001", asset_name: "Delivery Vehicle", item_code: "VEH-001", status: "Active", gross_purchase_amount: 240000, modified: "Today" },
    { name: "AST-MNT-0002", asset_name: "Generator", item_code: "GEN-002", status: "Scheduled", gross_purchase_amount: 56000, modified: "Yesterday" },
    { name: "AST-0003", asset_name: "Laptop Fleet", item_code: "IT-003", status: "Active", gross_purchase_amount: 78000, modified: "3d ago" },
  ];
  if (moduleName === "buying") return [
    { name: "SUP-0001", supplier_name: "Durban Supplies", status: "Active", grand_total: 65000, modified: "Today" },
    { name: "PO-2026-0003", supplier: "KZN Logistics", status: "To Receive", grand_total: 118000, modified: "Yesterday" },
    { name: "PI-2026-0008", supplier: "Office Hub", status: "Unpaid", grand_total: 24500, modified: "2d ago" },
  ];
  if (moduleName === "subcontracting") return [
    { name: "SCO-2026-0001", supplier: "BuildPro Contractors", status: "Open", per_received: 40, modified: "Today" },
    { name: "SCR-2026-0002", supplier: "Steel Works SA", status: "Completed", per_received: 100, modified: "Yesterday" },
    { name: "SCO-2026-0003", supplier: "Site Team Alpha", status: "Draft", per_received: 0, modified: "3d ago" },
  ];
  return [
    { name: "INS-001", report_name: "Cash Flow Insight", status: "Ready", owner: "System", modified: "Today" },
    { name: "INS-002", report_name: "Sales Pipeline Report", status: "Ready", owner: "System", modified: "Yesterday" },
    { name: "INS-003", report_name: "HR Performance Overview", status: "Ready", owner: "System", modified: "2d ago" },
  ];
}

function getRecordStatus(row: Row, statusField: string) { return text(row[statusField] || row.priority || "Active"); }

function ERPRecordDrawer({ row, onClose, primaryField, secondaryField, statusField, valueField, title, moduleName, tab }: { row: Row; onClose: () => void; primaryField?: string; secondaryField?: string; statusField: string; valueField?: string; title: string; moduleName: Props["moduleName"]; tab?: string }) {
  const details = Object.entries(row).filter(([, value]) => value !== null && value !== undefined && value !== "").slice(0, 16);
  return <div className="phase6-drawer-backdrop" role="presentation" onClick={onClose}>
    <aside className="phase6-drawer" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
      <button className="phase6-drawer-close" type="button" onClick={onClose}>×</button>
      <div className="demo-eyebrow">{title} details</div>
      <h2>{titleFrom(row, primaryField)}</h2>
      <p>{subFrom(row, secondaryField)}</p>
      <div className="phase6-drawer-summary"><span className={statusClass(row[statusField])}>{getRecordStatus(row, statusField)}</span><strong>{valueField ? money(row[valueField]) : text(row.modified)}</strong></div>
      <div className="phase6-action-strip phase7-action-strip">
        <WorkspaceRecordActions moduleName={moduleName} tab={tab} row={row} />
        <button className="btn" type="button">Export PDF</button>
      </div>
      <div className="phase6-detail-grid">{details.map(([key, value]) => <div key={key}><span>{key.replace(/_/g, " ")}</span><b>{text(value)}</b></div>)}</div>
      <div className="phase6-timeline"><h3>ERP workflow notes</h3><div><b>Document status</b><span>{getRecordStatus(row, statusField)}</span></div><div><b>Owner action</b><span>Review the record, approve next step, and keep the audit trail clean.</span></div><div><b>Automation</b><span>Use ERPNext workflow actions for submit, cancel, approval and reporting.</span></div></div>
    </aside>
  </div>;
}

export default function ERPModuleWorkspace({ moduleName, eyebrow, title, description, rows, metrics, actions, flow, insights, tabs, primaryField, secondaryField, statusField = "status", valueField, aiTitle, ownerQuestion }: Props) {
  const [tab, setTab] = useState(tabs[0] || "Overview");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
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

  return (
    <div className="erp-workspace phase2-workspace phase6-workspace animate-fade-up">
      <section className="phase2-titlebar erp-titlebar phase6-titlebar">
        <div>
          <div className="demo-eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{description}</p>
          {ownerQuestion ? <div className="erp-owner-question">Owner question: {ownerQuestion}</div> : null}
        </div>
        <div className="phase2-actions">
          {actions.slice(0, 3).map((action, index) => <WorkspaceCreateButton key={action.label} label={action.label} moduleName={moduleName} tab={tab} className={index === 0 ? "btn btn-primary" : "btn"} />)}
        </div>
      </section>

      <section className="phase2-grid-main">
        <div className="phase2-main-column">
          <div className="phase2-tabs erp-tabs phase6-tabs">{tabs.map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={tab === item ? "active" : ""}>{item}</button>)}</div>

          <section className="phase2-metrics erp-metrics">{metrics.map((metric) => <div key={metric.label} className={toneClass("phase2-metric", metric.tone)}><span>{metric.label}</span><b>{metric.value}</b><small>{metric.trend || metric.hint}</small></div>)}</section>

          <section className="phase2-panel phase6-panel">
            <div className="phase2-panel-head"><div><h3>{title} Flow</h3><p>ERPNext/Frappe workflow shortcuts for this workspace.</p></div><a className="phase2-link" href={actions[0]?.href || "#"}>Start workflow →</a></div>
            <div className="erp-flow-row phase6-flow-row">
              {flow.map((step, index) => <button key={`${step.label}-${index}`} type="button" className={toneClass("erp-flow-step", step.tone)} onClick={() => setTab(step.label)}><span>{String(index + 1).padStart(2, "0")}</span><b>{step.label}</b><small>{step.count !== undefined ? text(step.count) : step.hint}</small></button>)}
            </div>
          </section>

          <section className="phase2-panel phase6-panel">
            <div className="phase2-panel-head phase6-record-head">
              <div><h3>{tab}</h3><p>{filteredRows.length} tenant records. Open any row for detail actions and workflow notes.</p></div>
              <div className="phase6-toolbar">
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`} className="phase2-search" />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="phase6-select" aria-label="Filter by status">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
              </div>
            </div>
            <div className="overflow-auto">
              <table className="demo-table phase2-table phase6-table">
                <thead><tr><th>Record</th><th>Status</th><th>Related</th><th>Value</th><th>Action</th></tr></thead>
                <tbody>
                  {filteredRows.slice(0, 12).map((row, index) => <tr key={String(row.name || index)} onClick={() => setSelected(row)} className="phase6-clickable-row"><td><b>{titleFrom(row, primaryField)}</b><div className="demo-record-sub">{text(row.name || row.id)}</div></td><td><span className={statusClass(row[statusField])}>{getRecordStatus(row, statusField)}</span></td><td>{subFrom(row, secondaryField)}</td><td><b>{valueField ? money(row[valueField]) : text(row.modified)}</b></td><td><button className="btn btn-sm" type="button" onClick={(event) => { event.stopPropagation(); setSelected(row); }}>Open</button></td></tr>)}
                  {!filteredRows.length ? <tr><td colSpan={5}>No records found yet.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="phase2-side-column">
          <AIAssistantPanel moduleName={moduleName} title={aiTitle || `${title} AI Analyst`} />
          <div className="phase2-panel phase6-panel"><div className="phase2-panel-head"><div><h3>Owner Improvements</h3><p>AI-ready focus areas for the company owner.</p></div></div><div className="phase2-insights">{insights.map((insight) => <div key={insight.title} className={`phase2-insight ${insight.tone || "ok"}`}><b>{insight.title}</b><span>{insight.detail}</span></div>)}</div></div>
          <div className="phase2-panel phase6-panel"><div className="phase2-panel-head"><div><h3>Quick Actions</h3><p>Common actions for this ERP module.</p></div></div><div className="phase2-action-list">{actions.map((action) => <a key={action.label} href={action.href}>{action.label}<span>{action.description}</span></a>)}</div></div>
        </aside>
      </section>
      {selected ? <ERPRecordDrawer row={selected} onClose={() => setSelected(null)} primaryField={primaryField} secondaryField={secondaryField} statusField={statusField} valueField={valueField} title={title} moduleName={moduleName} tab={tab} /> : null}
    </div>
  );
}
