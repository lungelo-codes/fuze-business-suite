"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Any = Record<string, any>;
type Tab = "dashboard" | "procurement" | "projects" | "quality" | "data";
type Modal = null | "supplier" | "material-request" | "purchase-order" | "project" | "task" | "quality-goal" | "quality-meeting" | "data-import";

const TABS: { id: Tab; label: string; description: string }[] = [
  { id: "dashboard", label: "Dashboard", description: "Overall operational health" },
  { id: "procurement", label: "Procurement", description: "Suppliers, requests, RFQs, purchase orders and receipts" },
  { id: "projects", label: "Projects", description: "Projects, tasks, timesheets and delivery work" },
  { id: "quality", label: "Quality", description: "Goals, meetings, reviews and corrective actions" },
  { id: "data", label: "Data", description: "Imports, exports and bulk operations" },
];

const blank: Any = {};

function asArray(v: any): Any[] { return Array.isArray(v) ? v : []; }
function text(v: any) { return v === null || v === undefined || v === "" ? "—" : String(v); }
function money(v: any) { const n = Number(v || 0); return n ? `R ${n.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}` : "R 0"; }
function chipClass(v: any) {
  const s = String(v || "").toLowerCase();
  if (s.includes("overdue") || s.includes("lost") || s.includes("cancel") || s.includes("error")) return "chip danger";
  if (s.includes("draft") || s.includes("pending") || s.includes("open") || s.includes("partial")) return "chip warn";
  if (s.includes("complete") || s.includes("success") || s.includes("paid") || s.includes("submitted") || s.includes("received")) return "chip ok";
  return "chip info";
}

function Card({ label, value, hint }: { label: string; value: any; hint?: string }) {
  return (
    <div className="demo-kpi-card">
      <div className="demo-kpi-icon">▸</div>
      <div className="demo-kpi-label">{label}</div>
      <div className="demo-kpi-value">{text(value)}</div>
      {hint && <div className="demo-kpi-hint">{hint}</div>}
    </div>
  );
}

function Empty({ title = "No records yet", text: body = "Create the first record from the action buttons above." }) {
  return <div style={{ padding: 34, textAlign: "center", color: "var(--muted)" }}><b>{title}</b><div style={{ marginTop: 4, fontSize: 13 }}>{body}</div></div>;
}

function SimpleTable({ rows, columns }: { rows: Any[]; columns: { key: string; label: string; kind?: "money" | "status" | "bold" }[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="demo-table">
        <thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={String(row.name || row.id || i)}>
              {columns.map((c) => {
                const value = row[c.key];
                if (c.kind === "status") return <td key={c.key}><span className={chipClass(value)}>{text(value)}</span></td>;
                if (c.kind === "money") return <td key={c.key} style={{ fontWeight: 800 }}>{money(value)}</td>;
                if (c.kind === "bold") return <td key={c.key}><b>{text(value)}</b></td>;
                return <td key={c.key}>{text(value)}</td>;
              })}
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={columns.length}><Empty /></td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, name, value, onChange, type = "text", options }: { label: string; name: string; value: any; onChange: (name: string, value: any) => void; type?: string; options?: string[] }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 800, color: "var(--muted)", marginBottom: 5 }}>{label}</span>
      {options ? (
        <select value={String(value || "")} onChange={(e) => onChange(name, e.target.value)} style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", background: "#fff" }}>
          <option value="">Select…</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={String(value || "")} onChange={(e) => onChange(name, e.target.value)} style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }} />
      )}
    </label>
  );
}

function modalTitle(modal: Modal) {
  const map: Record<string, string> = {
    supplier: "Add Supplier",
    "material-request": "Create Material Request",
    "purchase-order": "Create Purchase Order",
    project: "Create Project",
    task: "Create Task",
    "quality-goal": "Create Quality Goal",
    "quality-meeting": "Create Quality Meeting",
    "data-import": "Create Data Import Job",
  };
  return modal ? map[modal] || "Create Record" : "Create Record";
}

function fieldsFor(modal: Modal) {
  switch (modal) {
    case "supplier": return [
      ["supplier_name", "Supplier Name"], ["supplier_group", "Supplier Group"], ["supplier_type", "Supplier Type"], ["email_id", "Email"], ["mobile_no", "Mobile"], ["tax_id", "Tax/VAT Number"],
    ];
    case "material-request": return [
      ["material_request_type", "Type"], ["schedule_date", "Required By", "date"], ["item_code", "Item Code"], ["qty", "Qty", "number"], ["uom", "UOM"],
    ];
    case "purchase-order": return [
      ["supplier", "Supplier"], ["schedule_date", "Expected Delivery", "date"], ["item_code", "Item Code"], ["qty", "Qty", "number"], ["rate", "Rate", "number"],
    ];
    case "project": return [
      ["project_name", "Project Name"], ["customer", "Customer"], ["expected_start_date", "Start Date", "date"], ["expected_end_date", "End Date", "date"], ["estimated_costing", "Budget", "number"],
    ];
    case "task": return [
      ["subject", "Task"], ["project", "Project"], ["priority", "Priority"], ["exp_end_date", "Due Date", "date"], ["description", "Description"],
    ];
    case "quality-goal": return [
      ["goal", "Goal"], ["frequency", "Frequency"], ["date", "Target Date", "date"], ["monitoring_by", "Owner"],
    ];
    case "quality-meeting": return [
      ["date", "Meeting Date", "date"], ["status", "Status"], ["minutes", "Meeting Notes"],
    ];
    case "data-import": return [
      ["reference_doctype", "Document Type"], ["import_type", "Import Type"], ["file", "File URL / Path"],
    ];
    default: return [];
  }
}

export default function OperationsWorkspaceClient({ initialData }: { initialData: Any | null }) {
  const search = useSearchParams();
  const queryTab = String(search.get("tab") || "dashboard").toLowerCase();
  const [tab, setTab] = useState<Tab>((TABS.find((t) => t.id === queryTab)?.id || "dashboard") as Tab);
  const [data, setData] = useState<Any | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [modal, setModal] = useState<Modal>(null);
  const [form, setForm] = useState<Any>({ ...blank });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/operations/workspace", { cache: "no-store" });
      const json = await res.json();
      setData(json.data || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load operations");
    } finally { setLoading(false); }
  }

  useEffect(() => { if (!initialData) load(); }, []);

  const cards = useMemo(() => {
    const p = data?.dashboards?.procurement?.cards || {};
    const pr = data?.dashboards?.projects?.cards || {};
    const q = data?.dashboards?.quality?.cards || {};
    const dm = data?.dashboards?.data?.cards || {};
    return [
      { label: "Purchase Orders", value: p.purchase_orders || 0, hint: "Procurement pipeline" },
      { label: "Open Projects", value: pr.open_projects || 0, hint: "Delivery work" },
      { label: "Open Tasks", value: pr.open_tasks || 0, hint: "Team workload" },
      { label: "Quality Actions", value: q.open_actions || 0, hint: "Corrective work" },
      { label: "Low Stock", value: p.low_stock_items || 0, hint: "Inventory attention" },
      { label: "Data Imports", value: dm.pending_imports || 0, hint: "Pending imports" },
    ];
  }, [data]);

  function open(m: Modal) { setModal(m); setForm({}); setNotice(""); setError(""); }
  function setField(k: string, v: any) { setForm((p: Any) => ({ ...p, [k]: v })); }

  async function submit() {
    if (!modal) return;
    setSaving(true); setError("");
    const payload: Any = { ...form };
    if (["material-request", "purchase-order"].includes(modal) && payload.item_code) {
      payload.items = [{ item_code: payload.item_code, qty: Number(payload.qty || 1), uom: payload.uom, rate: Number(payload.rate || 0), schedule_date: payload.schedule_date }];
    }
    try {
      const res = await fetch("/api/operations/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: modal, data: payload }) });
      const json = await res.json();
      if (!res.ok || json?.success === false) throw new Error(json?.message || json?.error || "Could not save record");
      setNotice("Saved successfully."); setModal(null); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save record"); }
    finally { setSaving(false); }
  }

  const procurement = data?.procurement || {};
  const projects = data?.projects || {};
  const quality = data?.quality || {};
  const management = data?.data_management || {};

  return (
    <div className="demo-workspace animate-fade-up">
      <section className="demo-module-titlebar">
        <div>
          <div className="demo-eyebrow">Operations</div>
          <h1>Operations Dashboard</h1>
          <p>One simple workspace for procurement, projects, quality and operational data work.</p>
        </div>
        <div className="demo-module-actions">
          <button className="btn btn-teal" type="button" onClick={() => open("material-request")}>+ Request Material</button>
          <button className="btn" type="button" onClick={() => open("project")}>+ Project</button>
          <button className="btn" type="button" onClick={() => open("quality-goal")}>+ Quality Goal</button>
        </div>
      </section>

      {notice && <div style={{ background: "var(--ok-bg)", border: "1px solid var(--ok)", color: "var(--ok)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>✓ {notice}</div>}
      {error && <div style={{ background: "var(--danger-bg)", border: "1px solid var(--danger)", color: "var(--danger)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>{error}</div>}

      <section className="demo-tabbar">
        {TABS.map((t) => <button key={t.id} type="button" onClick={() => setTab(t.id)} className={tab === t.id ? "active" : ""}>{t.label}</button>)}
      </section>

      {loading && <div className="demo-panel"><Empty title="Loading operations…" text="Fetching live operational data." /></div>}

      {!loading && tab === "dashboard" && <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 14, marginBottom: 16 }}>
          {cards.map((c) => <Card key={c.label} {...c} />)}
        </div>
        <div className="demo-panel">
          <div className="demo-panel-head"><div><h3>Operational flow</h3><p>Request materials, compare suppliers, deliver work, track quality and keep data clean.</p></div></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, padding: 16 }}>
            {["Request", "Procure", "Deliver", "Review"].map((s, i) => <div key={s} style={{ border: "1px solid var(--line)", borderRadius: 14, padding: 16, background: "#fff" }}><div className="demo-eyebrow">Step {i+1}</div><h3 style={{ margin: "4px 0" }}>{s}</h3><p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>{["Raise material or project needs.", "RFQ, supplier quotation and purchase order.", "Track projects, tasks, receipts and timesheets.", "Quality checks, reviews and data cleanup."][i]}</p></div>)}
          </div>
        </div>
      </>}

      {!loading && tab === "procurement" && <div className="demo-panel">
        <div className="demo-panel-head"><div><h3>Procurement</h3><p>Suppliers, material requests, RFQs, purchase orders and receipts.</p></div><div style={{ display: "flex", gap: 8 }}><button className="btn" onClick={() => open("supplier")}>+ Supplier</button><button className="btn btn-teal" onClick={() => open("purchase-order")}>+ Purchase Order</button></div></div>
        <SimpleTable rows={asArray(procurement.purchase_orders)} columns={[{ key: "name", label: "PO", kind: "bold" }, { key: "supplier_name", label: "Supplier" }, { key: "transaction_date", label: "Date" }, { key: "grand_total", label: "Total", kind: "money" }, { key: "status", label: "Status", kind: "status" }]} />
        <div style={{ height: 18 }} />
        <SimpleTable rows={asArray(procurement.material_requests)} columns={[{ key: "name", label: "Request", kind: "bold" }, { key: "material_request_type", label: "Type" }, { key: "schedule_date", label: "Required" }, { key: "status", label: "Status", kind: "status" }]} />
      </div>}

      {!loading && tab === "projects" && <div className="demo-panel">
        <div className="demo-panel-head"><div><h3>Projects & Tasks</h3><p>Project delivery, task progress, timesheets and costing.</p></div><div style={{ display: "flex", gap: 8 }}><button className="btn" onClick={() => open("task")}>+ Task</button><button className="btn btn-teal" onClick={() => open("project")}>+ Project</button></div></div>
        <SimpleTable rows={asArray(projects.projects)} columns={[{ key: "project_name", label: "Project", kind: "bold" }, { key: "customer", label: "Customer" }, { key: "percent_complete", label: "Progress" }, { key: "expected_end_date", label: "Due" }, { key: "status", label: "Status", kind: "status" }]} />
        <div style={{ height: 18 }} />
        <SimpleTable rows={asArray(projects.tasks)} columns={[{ key: "subject", label: "Task", kind: "bold" }, { key: "project", label: "Project" }, { key: "priority", label: "Priority" }, { key: "exp_end_date", label: "Due" }, { key: "status", label: "Status", kind: "status" }]} />
      </div>}

      {!loading && tab === "quality" && <div className="demo-panel">
        <div className="demo-panel-head"><div><h3>Quality</h3><p>Goals, meetings, reviews and corrective actions.</p></div><div style={{ display: "flex", gap: 8 }}><button className="btn" onClick={() => open("quality-meeting")}>+ Meeting</button><button className="btn btn-teal" onClick={() => open("quality-goal")}>+ Goal</button></div></div>
        <SimpleTable rows={asArray(quality.goals)} columns={[{ key: "goal", label: "Goal", kind: "bold" }, { key: "frequency", label: "Frequency" }, { key: "date", label: "Date" }, { key: "monitoring_by", label: "Owner" }]} />
        <div style={{ height: 18 }} />
        <SimpleTable rows={asArray(quality.actions)} columns={[{ key: "name", label: "Action", kind: "bold" }, { key: "status", label: "Status", kind: "status" }, { key: "date", label: "Date" }]} />
      </div>}

      {!loading && tab === "data" && <div className="demo-panel">
        <div className="demo-panel-head"><div><h3>Data Management</h3><p>Import, export and bulk clean operational records.</p></div><button className="btn btn-teal" onClick={() => open("data-import")}>+ Import Job</button></div>
        <SimpleTable rows={asArray(management.imports)} columns={[{ key: "name", label: "Import", kind: "bold" }, { key: "reference_doctype", label: "Document" }, { key: "import_type", label: "Type" }, { key: "percent_complete", label: "Progress" }, { key: "status", label: "Status", kind: "status" }]} />
      </div>}

      {modal && <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(20,20,40,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ background: "var(--card)", borderRadius: 18, width: "100%", maxWidth: 620, padding: 24, boxShadow: "0 24px 80px rgba(0,0,0,.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}><h2 style={{ margin: 0 }}>{modalTitle(modal)}</h2><button className="btn" onClick={() => setModal(null)}>Close</button></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {fieldsFor(modal).map(([name, label, type]) => <Field key={String(name)} name={String(name)} label={String(label)} type={String(type || "text")} value={form[String(name)]} onChange={setField} />)}
          </div>
          {error && <div style={{ color: "var(--danger)", marginTop: 12 }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}><button className="btn" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-teal" disabled={saving} onClick={submit}>{saving ? "Saving…" : "Save"}</button></div>
        </div>
      </div>}
    </div>
  );
}
