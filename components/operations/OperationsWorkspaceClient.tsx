"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Any = Record<string, any>;
type Tab = "dashboard" | "procurement" | "projects" | "quality" | "data";
type Modal =
  | null
  | "supplier" | "material-request" | "rfq" | "supplier-quotation" | "purchase-order" | "purchase-receipt" | "purchase-invoice" | "supplier-payment"
  | "project" | "task" | "timesheet" | "project-billing"
  | "quality-goal" | "quality-inspection" | "non-conformance" | "supplier-quality" | "quality-action"
  | "data-import";

const TABS: { id: Tab; label: string; description: string }[] = [
  { id: "dashboard", label: "Overview", description: "Operational command centre" },
  { id: "procurement", label: "Procurement", description: "Material Request → RFQ → Supplier Quote → PO → Receipt → Bill → Payment" },
  { id: "projects", label: "Projects", description: "Project → Task → Assignment → Timesheet → Expense → Billing → Profitability" },
  { id: "quality", label: "Quality", description: "Inspection → Non-conformance → Corrective Action → Supplier Quality" },
  { id: "data", label: "Documents", description: "Documents, import templates, CSV/XLSX uploads and exports" },
];

const FLOW: Record<Exclude<Tab, "dashboard" | "data">, { label: string; action?: Modal }[]> = {
  procurement: [
    { label: "Material Request", action: "material-request" },
    { label: "RFQ", action: "rfq" },
    { label: "Supplier Quotation", action: "supplier-quotation" },
    { label: "Purchase Order", action: "purchase-order" },
    { label: "Receipt", action: "purchase-receipt" },
    { label: "Purchase Invoice", action: "purchase-invoice" },
    { label: "Payment", action: "supplier-payment" },
  ],
  projects: [
    { label: "Project", action: "project" },
    { label: "Task", action: "task" },
    { label: "Assignment" },
    { label: "Timesheet", action: "timesheet" },
    { label: "Expense" },
    { label: "Billing", action: "project-billing" },
    { label: "Profitability" },
  ],
  quality: [
    { label: "Inspection", action: "quality-inspection" },
    { label: "Non-conformance", action: "non-conformance" },
    { label: "Corrective Action", action: "quality-action" },
    { label: "Supplier Quality", action: "supplier-quality" },
  ],
};

const blankItem = { item_code: "", item_name: "Service Item", description: "", qty: 1, uom: "Nos", rate: 0, schedule_date: "" };

function asArray(v: any): Any[] { return Array.isArray(v) ? v : []; }
function source(json: any, key: string) { return json?.data?.[key] ?? json?.message?.[key] ?? json?.[key] ?? []; }
function text(v: any) { return v === null || v === undefined || v === "" ? "—" : String(v); }
function money(v: any) { const n = Number(v || 0); return `R ${n.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`; }
function date(v: any) { if (!v) return "—"; const d = new Date(v); return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }); }
function unwrap(json: any) { return json?.data ?? json?.message ?? json ?? {}; }
function chipClass(v: any) {
  const s = String(v || "").toLowerCase();
  if (s.includes("overdue") || s.includes("lost") || s.includes("cancel") || s.includes("reject") || s.includes("fail")) return "chip danger";
  if (s.includes("draft") || s.includes("pending") || s.includes("open") || s.includes("partial")) return "chip warn";
  if (s.includes("complete") || s.includes("success") || s.includes("paid") || s.includes("submitted") || s.includes("received") || s.includes("accepted")) return "chip ok";
  return "chip info";
}
async function api(url: string, init?: RequestInit) { const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) }, cache: "no-store" }); const json = await res.json().catch(() => ({})); if (!res.ok || json?.success === false) throw new Error(json?.error || json?.message || `Request failed (${res.status})`); return json; }

function Card({ label, value, hint }: { label: string; value: any; hint?: string }) { return <div className="demo-kpi-card"><div className="demo-kpi-icon">▸</div><div className="demo-kpi-label">{label}</div><div className="demo-kpi-value">{text(value)}</div>{hint && <div className="demo-kpi-hint">{hint}</div>}</div>; }
function Empty({ title = "No records yet", body = "Create the first record from the action buttons above." }) { return <div style={{ padding: 28, textAlign: "center", color: "var(--muted)" }}><b>{title}</b><div style={{ marginTop: 4, fontSize: 13 }}>{body}</div></div>; }
function Workflow({ steps, onOpen }: { steps: { label: string; action?: Modal }[]; onOpen: (m: Modal) => void }) { return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, padding: 16 }}>{steps.map((s, i) => <button key={s.label} type="button" disabled={!s.action} onClick={() => s.action && onOpen(s.action)} style={{ border: "1px solid var(--line)", borderRadius: 14, padding: 14, textAlign: "left", background: "#fff", cursor: s.action ? "pointer" : "default" }}><div className="demo-eyebrow">Step {i + 1}</div><b>{s.label}</b></button>)}</div>; }

function FlowLine({ title, steps, onOpen }: { title: string; steps: { label: string; action?: Modal }[]; onOpen: (m: Modal) => void }) {
  return <div className="ops-flow-card"><div className="ops-flow-title">{title}</div><div className="ops-flow-steps">{steps.map((step, i) => <button key={step.label} type="button" disabled={!step.action} onClick={() => step.action && onOpen(step.action)}><span>{i + 1}</span>{step.label}</button>)}</div></div>;
}

function OperationsOverview({ cards, onOpen, onTab }: { cards: { label: string; value: any; hint?: string }[]; onOpen: (m: Modal) => void; onTab: (tab: Tab) => void }) {
  const modules = TABS.filter((t) => t.id !== "dashboard");
  const quickActions: { label: string; hint: string; modal: Modal }[] = [
    { label: "Material Request", hint: "Start buying flow", modal: "material-request" },
    { label: "New Project", hint: "Open delivery work", modal: "project" },
    { label: "Quality Inspection", hint: "Capture inspection", modal: "quality-inspection" },
    { label: "Data Import", hint: "Upload or import records", modal: "data-import" },
  ];

  return <section className="ops-overview-shell">
    <div className="ops-overview-hero">
      <div>
        <div className="demo-eyebrow">Operations Control Room</div>
        <h2>Run procurement, projects, quality and documents from one clean workspace.</h2>
        <p>Each area stays under Operations, but the overview now gives users a clear command centre with fast actions and a readable workflow map.</p>
      </div>
      <div className="ops-quick-actions">
        {quickActions.map((item) => <button key={item.label} type="button" onClick={() => onOpen(item.modal)}><b>{item.label}</b><span>{item.hint}</span></button>)}
      </div>
    </div>

    <div className="ops-kpi-grid">{cards.map((c) => <Card key={c.label} {...c} />)}</div>

    <div className="ops-module-grid">
      {modules.map((m) => <button key={m.id} type="button" className="ops-module-card" onClick={() => onTab(m.id as Tab)}>
        <span>{m.label}</span>
        <b>{m.description.split(" → ")[0]}</b>
        <p>{m.description}</p>
        <em>Open dashboard →</em>
      </button>)}
    </div>

    <div className="ops-flow-grid">
      <FlowLine title="Procurement" steps={FLOW.procurement} onOpen={onOpen} />
      <FlowLine title="Projects" steps={FLOW.projects} onOpen={onOpen} />
      <FlowLine title="Quality" steps={FLOW.quality} onOpen={onOpen} />
    </div>
  </section>;
}

function Table({ rows, columns, onAction }: { rows: Any[]; columns: { key: string; label: string; kind?: "money" | "status" | "bold" | "date" }[]; onAction?: (row: Any) => void }) {
  return <div style={{ overflowX: "auto" }}><table className="demo-table"><thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}{onAction && <th>Action</th>}</tr></thead><tbody>{rows.map((row, i) => <tr key={String(row.name || row.id || i)}>{columns.map((c) => { const value = row[c.key]; if (c.kind === "status") return <td key={c.key}><span className={chipClass(value)}>{text(value)}</span></td>; if (c.kind === "money") return <td key={c.key}><b>{money(value)}</b></td>; if (c.kind === "bold") return <td key={c.key}><b>{text(value)}</b></td>; if (c.kind === "date") return <td key={c.key}>{date(value)}</td>; return <td key={c.key}>{text(value)}</td>; })}{onAction && <td><button className="btn btn-sm" onClick={() => onAction(row)}>Submit</button></td>}</tr>)}{!rows.length && <tr><td colSpan={columns.length + (onAction ? 1 : 0)}><Empty /></td></tr>}</tbody></table></div>;
}

function fieldsFor(modal: Modal): [string, string, string?][] {
  switch (modal) {
    case "supplier": return [["supplier_name", "Supplier Name"], ["supplier_group", "Supplier Group"], ["email_id", "Email"], ["mobile_no", "Mobile"]];
    case "material-request": return [["item_code", "Item Code"], ["item_name", "Item Name"], ["qty", "Qty", "number"], ["uom", "UOM"], ["schedule_date", "Required Date", "date"], ["material_request_type", "Request Type"]];
    case "rfq": return [["supplier", "Supplier"], ["transaction_date", "Date", "date"], ["schedule_date", "Required Date", "date"], ["item_code", "Item Code"], ["qty", "Qty", "number"]];
    case "supplier-quotation": return [["supplier", "Supplier"], ["transaction_date", "Date", "date"], ["valid_till", "Valid Till", "date"], ["item_code", "Item Code"], ["qty", "Qty", "number"], ["rate", "Rate", "number"]];
    case "purchase-order": return [["supplier", "Supplier"], ["transaction_date", "Date", "date"], ["schedule_date", "Required Date", "date"], ["item_code", "Item Code"], ["qty", "Qty", "number"], ["rate", "Rate", "number"]];
    case "purchase-receipt": return [["supplier", "Supplier"], ["purchase_order", "Purchase Order"], ["posting_date", "Posting Date", "date"], ["item_code", "Item Code"], ["qty", "Qty", "number"], ["rate", "Rate", "number"]];
    case "purchase-invoice": return [["supplier", "Supplier"], ["purchase_order", "Purchase Order"], ["purchase_receipt", "Purchase Receipt"], ["posting_date", "Posting Date", "date"], ["due_date", "Due Date", "date"], ["item_code", "Item Code"], ["qty", "Qty", "number"], ["rate", "Rate", "number"]];
    case "supplier-payment": return [["supplier", "Supplier"], ["purchase_invoice", "Purchase Invoice"], ["amount", "Amount", "number"], ["mode_of_payment", "Mode of Payment"], ["reference_no", "Reference No"], ["reference_date", "Reference Date", "date"]];
    case "project": return [["project_name", "Project Name"], ["customer", "Customer"], ["expected_start_date", "Start Date", "date"], ["expected_end_date", "End Date", "date"], ["estimated_costing", "Budget", "number"]];
    case "task": return [["subject", "Task"], ["project", "Project"], ["status", "Status"], ["priority", "Priority"], ["exp_start_date", "Start Date", "date"], ["exp_end_date", "Due Date", "date"], ["assigned_to", "Assign To"]];
    case "timesheet": return [["employee", "Employee"], ["project", "Project"], ["activity_type", "Activity Type"], ["from_time", "From", "datetime-local"], ["to_time", "To", "datetime-local"], ["hours", "Hours", "number"], ["billing_rate", "Billing Rate", "number"]];
    case "project-billing": return [["timesheet_id", "Timesheet ID"], ["customer", "Customer"], ["submit", "Submit Invoice? yes/no"]];
    case "quality-goal": return [["goal", "Goal"], ["frequency", "Frequency"], ["date", "Date", "date"], ["monitoring_by", "Owner"]];
    case "quality-inspection": return [["inspection_type", "Inspection Type"], ["reference_type", "Reference Type"], ["reference_name", "Reference Name"], ["item_code", "Item Code"], ["sample_size", "Sample Size", "number"], ["status", "Status"], ["submit", "Submit? yes/no"]];
    case "non-conformance": return [["subject", "Issue"], ["supplier", "Supplier"], ["priority", "Priority"], ["status", "Status"], ["corrective_action", "Corrective Action"]];
    case "supplier-quality": return [["supplier", "Supplier"], ["subject", "Issue"], ["priority", "Priority"], ["corrective_action", "Corrective Action"]];
    case "quality-action": return [["action", "Corrective Action"], ["review", "Review"], ["status", "Status"], ["responsible_person", "Owner"], ["date", "Date", "date"]];
    case "data-import": return [["reference_doctype", "Document Type"], ["import_type", "Import Type"], ["file", "CSV/XLSX File URL"]];
    default: return [];
  }
}
function title(modal: Modal) { return String(modal || "").split("-").map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join(" "); }

export default function OperationsWorkspaceClient({ initialData }: { initialData: Any | null }) {
  const search = useSearchParams();
  const queryTab = String(search.get("tab") || "dashboard").toLowerCase();
  const [tab, setTab] = useState<Tab>((TABS.find((t) => t.id === queryTab)?.id || "dashboard") as Tab);
  const [data, setData] = useState<Any | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [modal, setModal] = useState<Modal>(null);
  const [form, setForm] = useState<Any>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function load() { setLoading(true); setError(""); try { const json = await api("/api/operations/workspace"); setData(unwrap(json)); } catch (e: any) { setError(e?.message || "Could not load operations"); } finally { setLoading(false); } }
  useEffect(() => { if (!initialData) load(); }, []);
  useEffect(() => { setTab((TABS.find((t) => t.id === queryTab)?.id || "dashboard") as Tab); }, [queryTab]);

  const p = data?.procurement || {}; const pr = data?.projects || {}; const q = data?.quality || {}; const dm = data?.data_management || {}; const dashboards = data?.dashboards || {};
  const cards = useMemo(() => {
    const pc = dashboards.procurement?.cards || {}; const pj = dashboards.projects?.cards || {}; const qc = dashboards.quality?.cards || {};
    return [
      { label: "Material Requests", value: pc.material_requests || asArray(p.material_requests).length, hint: "Needs raised" },
      { label: "Purchase Orders", value: pc.purchase_orders || asArray(p.purchase_orders).length, hint: "Supplier orders" },
      { label: "Purchase Bills", value: pc.bills || asArray(p.purchase_invoices).length, hint: "Supplier invoices" },
      { label: "Open Projects", value: pj.open_projects || asArray(pr.projects).length, hint: "Delivery work" },
      { label: "Open Tasks", value: pj.open_tasks || asArray(pr.tasks).length, hint: "Team workload" },
      { label: "Quality Issues", value: qc.open_actions || asArray(q.non_conformances).length, hint: "Action needed" },
    ];
  }, [dashboards, p, pr, q]);

  function open(m: Modal, extra: Any = {}) { setModal(m); setNotice(""); setError(""); setForm({ material_request_type: "Purchase", status: "Open", priority: "Medium", inspection_type: "Incoming", sample_size: 1, uom: "Nos", qty: 1, rate: 0, submit: false, ...extra }); }
  function setField(k: string, v: any) { setForm((old: Any) => ({ ...old, [k]: v })); }
  async function documentAction(doctype: string, name: string, action = "submit") { setError(""); try { await api("/api/workflow/document-action", { method: "POST", body: JSON.stringify({ doctype, name, action }) }); setNotice(`${doctype} ${action} done.`); await load(); } catch (e: any) { setError(e?.message || "Workflow action failed"); } }
  function payloadFor(m: Modal) { const x: Any = { ...form }; if (x.submit === "yes") x.submit = true; if (x.submit === "no") x.submit = false; const itemActions = ["material-request", "rfq", "supplier-quotation", "purchase-order", "purchase-receipt", "purchase-invoice"]; if (m && itemActions.includes(m) && (x.item_code || x.item_name)) x.items = [{ ...blankItem, ...x, qty: Number(x.qty || 1), rate: Number(x.rate || 0) }]; if (m === "timesheet") x.time_logs = [{ activity_type: x.activity_type || "Execution", project: x.project, from_time: x.from_time, to_time: x.to_time, hours: Number(x.hours || 1), billing_rate: Number(x.billing_rate || 0) }]; if (m === "project-billing") return { timesheet_id: x.timesheet_id, data: { customer: x.customer, submit: x.submit === true || x.submit === "yes" } }; return x; }
  async function submit() { if (!modal) return; setSaving(true); setError(""); try { await api("/api/operations/action", { method: "POST", body: JSON.stringify({ action: modal, data: payloadFor(modal) }) }); setNotice(`${title(modal)} saved.`); setModal(null); await load(); } catch (e: any) { setError(e?.message || "Could not save record"); } finally { setSaving(false); } }

  const current = TABS.find((t) => t.id === tab) || TABS[0];
  return <div className="demo-workspace animate-fade-up">
    <section className="demo-module-titlebar"><div><div className="demo-eyebrow">Operations</div><h1>{tab === "dashboard" ? "Operations Overview" : `${current.label} Dashboard`}</h1><p>{current.description}. Each area remains under Operations but has its own focused workflow dashboard.</p></div><div className="demo-module-actions"><button className="btn btn-teal" onClick={() => open("material-request")}>+ Material Request</button><button className="btn" onClick={() => open("project")}>+ Project</button><button className="btn" onClick={() => open("quality-inspection")}>+ Inspection</button></div></section>
    {notice && <div style={{ background: "var(--ok-bg)", border: "1px solid var(--ok)", color: "var(--ok)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>✓ {notice}</div>}
    {error && <div style={{ background: "var(--danger-bg)", border: "1px solid var(--danger)", color: "var(--danger)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>{error}</div>}
    <section className="demo-tabbar ops-tabbar">{TABS.map((t) => <button key={t.id} onClick={() => { setTab(t.id); window.history.replaceState(null, "", `/portal/operations?tab=${t.id}`); }} className={tab === t.id ? "active" : ""}>{t.label}</button>)}</section>
    {loading && <div className="demo-panel"><Empty title="Loading operations…" body="Fetching live workflow data." /></div>}
    {!loading && tab === "dashboard" && <OperationsOverview cards={cards} onOpen={open} onTab={(nextTab) => { setTab(nextTab); window.history.replaceState(null, "", `/portal/operations?tab=${nextTab}`); }} />}
    {!loading && tab === "procurement" && <div className="demo-panel"><div className="demo-panel-head"><div><h3>Procurement Workflow</h3><p>Full Business Suite engine buying flow from request to supplier payment.</p></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button className="btn" onClick={() => open("supplier")}>+ Supplier</button><button className="btn" onClick={() => open("rfq")}>+ RFQ</button><button className="btn btn-teal" onClick={() => open("purchase-invoice")}>+ Purchase Bill</button></div></div><Workflow steps={FLOW.procurement} onOpen={open} /><Table rows={asArray(p.material_requests)} columns={[{ key: "name", label: "Request", kind: "bold" }, { key: "material_request_type", label: "Type" }, { key: "schedule_date", label: "Required", kind: "date" }, { key: "status", label: "Status", kind: "status" }]} onAction={(r) => documentAction("Material Request", r.name)} /><div style={{ height: 18 }} /><Table rows={asArray(p.rfqs)} columns={[{ key: "name", label: "RFQ", kind: "bold" }, { key: "transaction_date", label: "Date", kind: "date" }, { key: "status", label: "Status", kind: "status" }]} onAction={(r) => documentAction("Request for Quotation", r.name)} /><div style={{ height: 18 }} /><Table rows={asArray(p.supplier_quotations)} columns={[{ key: "name", label: "Supplier Quote", kind: "bold" }, { key: "supplier_name", label: "Supplier" }, { key: "grand_total", label: "Total", kind: "money" }, { key: "status", label: "Status", kind: "status" }]} onAction={(r) => documentAction("Supplier Quotation", r.name)} /><div style={{ height: 18 }} /><Table rows={asArray(p.purchase_orders)} columns={[{ key: "name", label: "PO", kind: "bold" }, { key: "supplier_name", label: "Supplier" }, { key: "grand_total", label: "Total", kind: "money" }, { key: "status", label: "Status", kind: "status" }]} onAction={(r) => documentAction("Purchase Order", r.name)} /><div style={{ height: 18 }} /><Table rows={asArray(p.receipts)} columns={[{ key: "name", label: "Receipt", kind: "bold" }, { key: "supplier_name", label: "Supplier" }, { key: "posting_date", label: "Date", kind: "date" }, { key: "status", label: "Status", kind: "status" }]} onAction={(r) => documentAction("Purchase Receipt", r.name)} /><div style={{ height: 18 }} /><Table rows={asArray(p.purchase_invoices)} columns={[{ key: "name", label: "Purchase Invoice", kind: "bold" }, { key: "supplier_name", label: "Supplier" }, { key: "grand_total", label: "Total", kind: "money" }, { key: "outstanding_amount", label: "Outstanding", kind: "money" }, { key: "status", label: "Status", kind: "status" }]} onAction={(r) => documentAction("Purchase Invoice", r.name)} /></div>}
    {!loading && tab === "projects" && <div className="demo-panel"><div className="demo-panel-head"><div><h3>Projects Workflow</h3><p>Project execution with assignments, time, expenses, billing and profitability.</p></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button className="btn" onClick={() => open("task")}>+ Task</button><button className="btn" onClick={() => open("timesheet")}>+ Timesheet</button><button className="btn btn-teal" onClick={() => open("project-billing")}>Bill Timesheet</button></div></div><Workflow steps={FLOW.projects} onOpen={open} /><Table rows={asArray(pr.projects)} columns={[{ key: "project_name", label: "Project", kind: "bold" }, { key: "customer", label: "Customer" }, { key: "percent_complete", label: "Progress" }, { key: "expected_end_date", label: "Due", kind: "date" }, { key: "status", label: "Status", kind: "status" }]} /><div style={{ height: 18 }} /><Table rows={asArray(pr.tasks)} columns={[{ key: "subject", label: "Task", kind: "bold" }, { key: "project", label: "Project" }, { key: "priority", label: "Priority" }, { key: "exp_end_date", label: "Due", kind: "date" }, { key: "status", label: "Status", kind: "status" }]} /><div style={{ height: 18 }} /><Table rows={asArray(pr.timesheets)} columns={[{ key: "name", label: "Timesheet", kind: "bold" }, { key: "employee", label: "Employee" }, { key: "total_hours", label: "Hours" }, { key: "total_billable_amount", label: "Billable", kind: "money" }, { key: "status", label: "Status", kind: "status" }]} onAction={(r) => documentAction("Timesheet", r.name)} /></div>}
    {!loading && tab === "quality" && <div className="demo-panel"><div className="demo-panel-head"><div><h3>Quality Workflow</h3><p>Inspections, non-conformance, corrective action and supplier quality history.</p></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button className="btn" onClick={() => open("non-conformance")}>+ Non-conformance</button><button className="btn" onClick={() => open("quality-action")}>+ Corrective Action</button><button className="btn btn-teal" onClick={() => open("quality-inspection")}>+ Inspection</button></div></div><Workflow steps={FLOW.quality} onOpen={open} /><Table rows={asArray(q.inspections)} columns={[{ key: "name", label: "Inspection", kind: "bold" }, { key: "inspection_type", label: "Type" }, { key: "reference_name", label: "Reference" }, { key: "status", label: "Status", kind: "status" }]} onAction={(r) => documentAction("Quality Inspection", r.name)} /><div style={{ height: 18 }} /><Table rows={asArray(q.non_conformances)} columns={[{ key: "name", label: "Issue", kind: "bold" }, { key: "subject", label: "Subject" }, { key: "supplier", label: "Supplier" }, { key: "priority", label: "Priority" }, { key: "status", label: "Status", kind: "status" }]} /><div style={{ height: 18 }} /><Table rows={asArray(q.actions)} columns={[{ key: "name", label: "Action", kind: "bold" }, { key: "action", label: "Action" }, { key: "responsible_person", label: "Owner" }, { key: "status", label: "Status", kind: "status" }]} /></div>}
    {!loading && tab === "data" && <div className="demo-panel"><div className="demo-panel-head"><div><h3>Documents & Data Dashboard</h3><p>Templates, imports, exports, bulk updates and tenant document storage.</p></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><a className="btn" href="/portal/documents">Open Documents</a><button className="btn btn-teal" onClick={() => open("data-import")}>+ Import Job</button></div></div><Table rows={asArray(dm.imports)} columns={[{ key: "name", label: "Import", kind: "bold" }, { key: "reference_doctype", label: "Document" }, { key: "import_type", label: "Type" }, { key: "percent_complete", label: "Progress" }, { key: "status", label: "Status", kind: "status" }]} /></div>}
    {modal && <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(20,20,40,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}><div style={{ background: "var(--card)", borderRadius: 18, width: "100%", maxWidth: 760, padding: 24, boxShadow: "0 24px 80px rgba(0,0,0,.25)", maxHeight: "92vh", overflow: "auto" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}><div><h2 style={{ margin: 0 }}>{title(modal)}</h2><p style={{ color: "var(--muted)", margin: "4px 0 0" }}>Saved through your SaaS API layer, not direct backend resource calls.</p></div><button className="btn" onClick={() => setModal(null)}>Close</button></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>{fieldsFor(modal).map(([name, label, type]) => <label key={name}><span style={{ display: "block", fontSize: 12, fontWeight: 800, color: "var(--muted)", marginBottom: 5 }}>{label}</span><input type={type || "text"} value={String(form[name] ?? "")} onChange={(e) => setField(name, e.target.value)} style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", background: "#fff" }} /></label>)}</div>{error && <div style={{ color: "var(--danger)", marginTop: 12 }}>{error}</div>}<div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}><button className="btn" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-teal" disabled={saving} onClick={submit}>{saving ? "Saving…" : "Save Workflow Step"}</button></div></div></div>}
  </div>;
}
