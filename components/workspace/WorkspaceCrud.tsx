"use client";

import { useMemo, useState } from "react";
import { CRUD_MODULES, CrudField } from "@/lib/crudConfig";

type Row = Record<string, unknown>;
type Mode = "create" | "edit";

type ModuleName = "crm" | "sales" | "projects" | "support" | "overview" | "hr" | "accounting" | "assets" | "buying" | "subcontracting" | "insights";

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function lower(value: unknown) { return text(value).toLowerCase(); }
function namePrefix(row?: Row | null) { return lower(row?.name || row?.id || ""); }

export function inferCrudModule(moduleName: string, tab?: string, row?: Row | null): string {
  const t = lower(tab);
  const n = namePrefix(row);
  const keys = Object.keys(row || {}).join(" ").toLowerCase();

  if (n.includes("qtn") || n.startsWith("quo") || t.includes("quotation") || t.includes("quote")) return "quotes";
  if (n.includes("sales-order") || n.startsWith("so-") || n.includes("sal-ord") || t.includes("sales order")) return "sales-orders";
  if (n.includes("sinv") || n.startsWith("inv-") || t.includes("invoice") || t.includes("sales invoice")) return "invoices";
  if (n.includes("payment") || n.includes("acc-pay") || n.startsWith("pe-") || t.includes("payment")) return "payments";
  if (n.includes("purch") || n.startsWith("po-") || t.includes("purchase order")) return "purchase-orders";
  if (n.includes("pinv") || t.includes("purchase invoice")) return "purchase-invoices";
  if (n.includes("prec") || t.includes("purchase receipt")) return "purchase-receipts";
  if (n.includes("mreq") || t.includes("material request")) return "material-requests";
  if (n.includes("rfq") || t.includes("request for quotation")) return "request-for-quotations";
  if (n.includes("sqtn") || t.includes("supplier quotation")) return "supplier-quotations";
  if (n.startsWith("sup") || t.includes("supplier")) return "suppliers";
  if (n.startsWith("ast") || moduleName === "assets" || t.includes("asset")) return "assets";
  if (n.startsWith("sco") || n.startsWith("scr") || moduleName === "subcontracting" || t.includes("subcontract")) return "subcontracting";
  if (n.startsWith("emp") || t.includes("employee")) return "employees";
  if (n.includes("att") || t.includes("attendance")) return "attendance";
  if (n.includes("leave") || t.includes("leave")) return "leave";
  if (n.includes("payroll") || t.includes("payroll")) return "payroll";
  if (n.startsWith("task") || t.includes("task") || keys.includes("exp_start_date")) return "tasks";
  if (n.startsWith("proj") || t.includes("project")) return "projects";
  if (n.startsWith("iss") || t.includes("ticket") || t.includes("support") || moduleName === "support") return "support";
  if (n.includes("lead") || t.includes("lead")) return "leads";
  if (n.includes("opp") || keys.includes("opportunity_amount") || t.includes("opportunit") || t.includes("deal")) return "opportunities";
  if (t.includes("contact")) return "contacts";
  if (t.includes("account") || t.includes("customer") || keys.includes("customer_name")) return "customers";

  if (moduleName === "crm") return "leads";
  if (moduleName === "sales") return "quotes";
  if (moduleName === "projects") return "projects";
  if (moduleName === "support") return "support";
  if (moduleName === "hr") return "employees";
  if (moduleName === "accounting") return "invoices";
  if (moduleName === "buying") return "purchase-orders";
  if (moduleName === "assets") return "assets";
  if (moduleName === "subcontracting") return "subcontracting";
  return "leads";
}

function initialValues(moduleId: string, row?: Row | null): Row {
  const cfg = CRUD_MODULES[moduleId];
  return { ...(cfg?.defaults || {}), ...(row || {}) };
}

function renderInput(field: CrudField, value: unknown, onChange: (value: unknown) => void) {
  const common = {
    name: field.name,
    required: field.required,
    value: field.type === "checkbox" ? undefined : text(value),
    placeholder: field.placeholder || field.label,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const target = event.currentTarget;
      if (field.type === "checkbox") onChange((target as HTMLInputElement).checked);
      else if (field.type === "number") onChange(target.value === "" ? "" : Number(target.value));
      else onChange(target.value);
    },
  };

  if (field.type === "textarea") return <textarea {...common} rows={4} />;
  if (field.type === "select") return <select {...common}><option value="">Select {field.label}</option>{(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}</select>;
  if (field.type === "checkbox") return <label className="phase7-checkbox"><input type="checkbox" checked={Boolean(value)} onChange={common.onChange} /> <span>Yes</span></label>;
  return <input {...common} type={field.type || "text"} />;
}

function CrudDrawer({ mode, moduleId, row, onClose }: { mode: Mode; moduleId: string; row?: Row | null; onClose: () => void }) {
  const cfg = CRUD_MODULES[moduleId];
  const [values, setValues] = useState<Row>(() => initialValues(moduleId, row));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fields = (cfg?.formFields || []).filter((field) => !field.readOnly).slice(0, 16);

  async function save() {
    if (!cfg) return;
    setSaving(true);
    setError("");
    try {
      const recordName = text(row?.name || row?.id);
      const url = mode === "edit" && recordName ? `/api/crud/${moduleId}/${encodeURIComponent(recordName)}` : `/api/crud/${moduleId}`;
      const res = await fetch(url, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || json.message || "Could not save record");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save record");
    } finally {
      setSaving(false);
    }
  }

  if (!cfg) return <div className="phase6-drawer-backdrop" onClick={onClose}><aside className="phase6-drawer" onClick={(event) => event.stopPropagation()}><button className="phase6-drawer-close" onClick={onClose}>×</button><h2>Action unavailable</h2><p>This workspace is not mapped to a supported ERPNext form yet.</p></aside></div>;

  return <div className="phase6-drawer-backdrop" role="presentation" onClick={onClose}>
    <aside className="phase6-drawer phase7-form-drawer" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
      <button className="phase6-drawer-close" type="button" onClick={onClose}>×</button>
      <div className="demo-eyebrow">{mode === "edit" ? "Edit ERPNext record" : "Create ERPNext record"}</div>
      <h2>{mode === "edit" ? `Edit ${cfg.title}` : `New ${cfg.title}`}</h2>
      <p>{cfg.subtitle}</p>
      <div className="phase7-form-grid">
        {fields.map((field) => <label key={field.name} className={field.type === "textarea" ? "phase7-field phase7-field-wide" : "phase7-field"}>
          <span>{field.label}{field.required ? " *" : ""}</span>
          {renderInput(field, values[field.name], (value) => setValues((current) => ({ ...current, [field.name]: value })))}
        </label>)}
      </div>
      {error ? <div className="phase7-error">{error}</div> : null}
      <div className="phase7-form-actions">
        <button className="btn" type="button" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" type="button" onClick={save} disabled={saving}>{saving ? "Saving…" : mode === "edit" ? "Save changes" : "Create record"}</button>
      </div>
    </aside>
  </div>;
}

export function WorkspaceCreateButton({ label, moduleName, tab, className = "btn btn-primary" }: { label: string; moduleName: ModuleName | string; tab?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const moduleId = useMemo(() => inferCrudModule(moduleName, `${tab || ""} ${label}`), [moduleName, tab, label]);
  return <>
    <button className={className} type="button" onClick={() => setOpen(true)}>{label}</button>
    {open ? <CrudDrawer mode="create" moduleId={moduleId} onClose={() => setOpen(false)} /> : null}
  </>;
}

export function WorkspaceRecordActions({ moduleName, tab, row, compact = false }: { moduleName: ModuleName | string; tab?: string; row: Row; compact?: boolean }) {
  const moduleId = useMemo(() => inferCrudModule(moduleName, tab, row), [moduleName, tab, row]);
  const cfg = CRUD_MODULES[moduleId];
  const [drawer, setDrawer] = useState<Mode | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const recordName = text(row.name || row.id);

  async function action(kind: "submit" | "cancel") {
    if (!recordName) return;
    setBusy(kind);
    setMessage("");
    try {
      const res = await fetch(`/api/crud/${moduleId}/${encodeURIComponent(recordName)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: kind }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || json.message || `Could not ${kind} record`);
      setMessage(`${kind === "submit" ? "Submitted" : "Cancelled"} successfully. Refreshing…`);
      window.setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : `Could not ${kind} record`);
    } finally {
      setBusy(null);
    }
  }

  return <div className={compact ? "phase7-inline-actions" : "phase7-record-actions"}>
    <button className="btn btn-primary" type="button" onClick={() => setDrawer("edit")}>Edit</button>
    {cfg?.submitEnabled ? <button className="btn" type="button" disabled={Boolean(busy)} onClick={() => action("submit")}>{busy === "submit" ? "Submitting…" : "Submit"}</button> : null}
    {cfg?.submitEnabled ? <button className="btn" type="button" disabled={Boolean(busy)} onClick={() => action("cancel")}>{busy === "cancel" ? "Cancelling…" : "Cancel"}</button> : null}
    {message ? <span className="phase7-action-message">{message}</span> : null}
    {drawer ? <CrudDrawer mode={drawer} moduleId={moduleId} row={row} onClose={() => setDrawer(null)} /> : null}
  </div>;
}
