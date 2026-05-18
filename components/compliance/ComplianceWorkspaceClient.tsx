"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import StatusChip from "@/components/StatusChip";

type Any = Record<string, any>;
type Tab = "dashboard" | "sars" | "vat" | "paye" | "uif" | "sdl" | "cipc" | "calendar" | "reminders" | "audit";
type ModalType = null | "sars" | "vat" | "paye" | "uif" | "sdl" | "cipc" | "task" | "reminder";

const unwrap = (x: any) => x?.data || x?.message || x || {};
const dateOnly = (v?: string) => (v ? String(v).slice(0, 10) : "—");
const money = (v?: any) => `R ${Number(v || 0).toLocaleString("en-ZA", { maximumFractionDigits: 2 })}`;

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
        <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
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
      <div className="demo-panel" style={{ width: wide ? "min(1120px,96vw)" : "min(760px,96vw)", maxHeight: "92vh", overflow: "auto" }}>
        <div className="card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>{title}</h3>
          <button className="btn btn-sm" onClick={onClose}>Close</button>
        </div>
        <div className="card-body">{children}</div>
      </div>
    </div>
  );
}

const blankForm: Any = {
  vat_number: "", paye_number: "", uif_number: "", sdl_number: "", tax_number: "", registered_name: "", trading_name: "", vat_period: "", vat_category: "", compliance_status: "Good Standing",
  from_date: "", to_date: "", period_start: "", period_end: "", due_date: "", status: "Draft", output_vat: "", input_vat: "", total_sales: "", total_purchases: "", notes: "",
  total_employees: "", total_paye: "", total_uif: "", total_sdl: "", total_amount: "", emp201_reference: "",
  registration_number: "", annual_return_due_date: "", last_return_date: "", amount_due: "", payment_reference: "",
  title: "", task_type: "VAT", priority: "Medium", assigned_to: "", reminder_type: "General", reminder_date: "",
};

function normalizeTab(value: string | null): Tab {
  const v = String(value || "dashboard").toLowerCase();
  if (v.includes("sars") || v.includes("profile")) return "sars";
  if (v.includes("vat")) return "vat";
  if (v.includes("paye")) return "paye";
  if (v.includes("uif")) return "uif";
  if (v.includes("sdl")) return "sdl";
  if (v.includes("cipc")) return "cipc";
  if (v.includes("calendar") || v.includes("task")) return "calendar";
  if (v.includes("reminder")) return "reminders";
  if (v.includes("audit")) return "audit";
  return "dashboard";
}

export default function ComplianceWorkspaceClient() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const [tab, setTab] = useState<Tab>(normalizeTab(params.get("tab")));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<Any>({});
  const [profile, setProfile] = useState<Any>({});
  const [vat, setVat] = useState<Any[]>([]);
  const [paye, setPaye] = useState<Any[]>([]);
  const [cipc, setCipc] = useState<Any[]>([]);
  const [tasks, setTasks] = useState<Any[]>([]);
  const [reminders, setReminders] = useState<Any[]>([]);
  const [audit, setAudit] = useState<Any[]>([]);
  const [modal, setModal] = useState<ModalType>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Any>({ ...blankForm });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [dash, sars, vatRows, payeRows, cipcRows, taskRows, reminderRows, auditRows] = await Promise.all([
        api("/api/compliance/dashboard"),
        api("/api/compliance/profile"),
        api("/api/compliance/vat"),
        api("/api/compliance/paye"),
        api("/api/compliance/cipc"),
        api("/api/compliance/tasks"),
        api("/api/compliance/reminders"),
        api("/api/compliance/audit"),
      ]);
      setDashboard(dash);
      setProfile(sars.profile || sars || {});
      setVat(vatRows.vat_returns || []);
      setPaye(payeRows.paye_returns || []);
      setCipc(cipcRows.cipc_returns || []);
      setTasks(taskRows.tasks || []);
      setReminders(reminderRows.reminders || []);
      setAudit(auditRows.logs || []);
    } catch (e: any) {
      setError(e?.message || "Could not load compliance workspace");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const cards = dashboard.cards || {};
  const upcoming = dashboard.upcoming || tasks.slice(0, 8);
  const installed = dashboard.installed || {};
  const missing = useMemo(() => Object.entries(installed).filter(([, v]) => !v).map(([k]) => k.replace(/_/g, " ")), [installed]);
  const tabs: [Tab, string][] = [["dashboard", "Dashboard"], ["sars", "SARS Profile"], ["vat", "VAT"], ["paye", "PAYE"], ["uif", "UIF"], ["sdl", "SDL"], ["cipc", "CIPC"], ["calendar", "Calendar"], ["reminders", "Reminders"], ["audit", "Audit"]];

  function resetForm(extra: Any = {}) {
    setForm({ ...blankForm, ...extra });
  }

  function openModal(kind: ModalType, row?: Any) {
    if (kind === "sars") resetForm({ ...profile });
    else resetForm(row || {});
    setModal(kind);
  }

  function go(next: Tab) {
    setTab(next);
    history.replaceState(null, "", `/portal/compliance?tab=${next}`);
  }

  async function submit(kind: Exclude<ModalType, null>) {
    setSaving(true);
    try {
      let url = "/api/compliance/profile";
      let body: Any = { ...form };
      if (kind === "vat") url = "/api/compliance/vat";
      if (kind === "paye") url = "/api/compliance/paye";
      if (kind === "uif") url = "/api/compliance/tasks", body = { ...form, task_type: "UIF" };
      if (kind === "sdl") url = "/api/compliance/tasks", body = { ...form, task_type: "SDL" };
      if (kind === "cipc") url = "/api/compliance/cipc";
      if (kind === "task") url = "/api/compliance/tasks";
      if (kind === "reminder") url = "/api/compliance/reminders";
      await api(url, { method: "POST", body: JSON.stringify(body) });
      setModal(null);
      await load();
    } catch (e: any) {
      alert(e?.message || "Could not save compliance record");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="demo-workspace animate-fade-up">
      <div className="demo-module-titlebar">
        <div>
          <h1>Compliance</h1>
          <p>South African business compliance: SARS profile, VAT, PAYE, UIF, SDL, CIPC deadlines, reminders and audit trail.</p>
        </div>
        <div className="demo-module-actions">
          <button className="btn" onClick={() => openModal("sars")}>Update SARS Profile</button>
          <button className="btn btn-teal" onClick={() => openModal("vat")}>New VAT Return</button>
          <button className="btn" onClick={() => openModal("task")}>Add Deadline</button>
        </div>
      </div>

      {error && <div className="demo-banner" style={{ color: "#991b1b" }}>{error}</div>}
      {!!missing.length && <div className="demo-banner">Some compliance records are not installed yet. The workspace will still show available sections and fallback calendar tasks until setup is completed.</div>}

      <div className="demo-panel">
        <div className="demo-tabbar">
          {tabs.map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => go(id)}>{label}</button>)}
        </div>
        {loading ? <div style={{ padding: 40, color: "var(--demo-muted)" }}>Loading compliance…</div> : (
          <div style={{ padding: 18 }}>
            {tab === "dashboard" && <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
                <Card label="VAT Due" value={cards.vat_returns_due || 0} />
                <Card label="VAT Overdue" value={cards.vat_overdue || 0} />
                <Card label="PAYE Due" value={cards.paye_due || 0} />
                <Card label="CIPC Due" value={cards.cipc_due || 0} />
                <Card label="Deadlines" value={cards.upcoming_deadlines || upcoming.length || 0} />
              </div>
              <div className="demo-panel" style={{ marginTop: 18 }}>
                <div className="card-head"><h3>Upcoming deadlines</h3><button className="btn btn-sm" onClick={() => openModal("task")}>Add deadline</button></div>
                <Table cols={["Deadline", "Type", "Due Date", "Priority", "Status"]} rows={upcoming} render={(r) => <><td>{r.title || r.name}</td><td>{r.task_type || "Compliance"}</td><td>{dateOnly(r.due_date)}</td><td>{r.priority || "—"}</td><td><StatusChip status={r.status || "Open"} /></td></>} />
              </div>
            </>}

            {tab === "sars" && <>
              <div className="demo-module-actions" style={{ marginBottom: 14 }}><button className="btn btn-teal" onClick={() => openModal("sars")}>Edit SARS Profile</button></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
                <Card label="Registered Name" value={profile.registered_name || profile.trading_name || "Not set"} />
                <Card label="VAT Number" value={profile.vat_number || "Not set"} />
                <Card label="PAYE Number" value={profile.paye_number || "Not set"} />
                <Card label="UIF Number" value={profile.uif_number || "Not set"} />
                <Card label="SDL Number" value={profile.sdl_number || "Not set"} />
                <Card label="Status" value={profile.compliance_status || "Not set"} />
              </div>
            </>}

            {tab === "vat" && <><div className="demo-module-actions" style={{ marginBottom: 14 }}><button className="btn btn-teal" onClick={() => openModal("vat")}>Create VAT Return</button></div><Table cols={["Return", "Period", "Due", "Output VAT", "Input VAT", "Net VAT", "Status"]} rows={vat} render={(r) => <><td>{r.name}</td><td>{dateOnly(r.from_date || r.period_start)} → {dateOnly(r.to_date || r.period_end)}</td><td>{dateOnly(r.due_date)}</td><td>{money(r.output_vat)}</td><td>{money(r.input_vat)}</td><td>{money(r.net_vat || r.vat_payable || r.vat_refundable)}</td><td><StatusChip status={r.status || "Draft"} /></td></>} /></>}

            {tab === "paye" && <><div className="demo-module-actions" style={{ marginBottom: 14 }}><button className="btn btn-teal" onClick={() => openModal("paye")}>Create PAYE Return</button></div><Table cols={["Return", "Period", "Due", "Employees", "PAYE", "UIF", "SDL", "Status"]} rows={paye} render={(r) => <><td>{r.name}</td><td>{dateOnly(r.period_start)} → {dateOnly(r.period_end)}</td><td>{dateOnly(r.due_date)}</td><td>{r.total_employees || 0}</td><td>{money(r.total_paye)}</td><td>{money(r.total_uif)}</td><td>{money(r.total_sdl)}</td><td><StatusChip status={r.status || "Draft"} /></td></>} /></>}

            {tab === "uif" && <ComplianceTaskList title="UIF declarations" taskType="UIF" rows={tasks} onNew={() => openModal("uif")} />}
            {tab === "sdl" && <ComplianceTaskList title="SDL declarations" taskType="SDL" rows={tasks} onNew={() => openModal("sdl")} />}

            {tab === "cipc" && <><div className="demo-module-actions" style={{ marginBottom: 14 }}><button className="btn btn-teal" onClick={() => openModal("cipc")}>Create CIPC Return</button></div><Table cols={["Return", "Registration", "Due Date", "Amount", "Reference", "Status"]} rows={cipc} render={(r) => <><td>{r.name}</td><td>{r.registration_number || "—"}</td><td>{dateOnly(r.annual_return_due_date)}</td><td>{money(r.amount_due)}</td><td>{r.payment_reference || "—"}</td><td><StatusChip status={r.status || "Due"} /></td></>} /></>}

            {tab === "calendar" && <><div className="demo-module-actions" style={{ marginBottom: 14 }}><button className="btn btn-teal" onClick={() => openModal("task")}>Add Deadline</button></div><Table cols={["Deadline", "Type", "Due Date", "Assigned", "Priority", "Status"]} rows={tasks} render={(r) => <><td>{r.title || r.name}</td><td>{r.task_type || "Compliance"}</td><td>{dateOnly(r.due_date)}</td><td>{r.assigned_to || "—"}</td><td>{r.priority || "Medium"}</td><td><StatusChip status={r.status || "Open"} /></td></>} /></>}

            {tab === "reminders" && <><div className="demo-module-actions" style={{ marginBottom: 14 }}><button className="btn btn-teal" onClick={() => openModal("reminder")}>Add Reminder</button></div><Table cols={["Reminder", "Type", "Date", "Status", "Notes"]} rows={reminders} render={(r) => <><td>{r.title || r.name}</td><td>{r.reminder_type || "General"}</td><td>{dateOnly(r.reminder_date)}</td><td><StatusChip status={r.status || "Open"} /></td><td>{r.notes || "—"}</td></>} /></>}

            {tab === "audit" && <Table cols={["Date", "User", "Action", "Reference", "Details"]} rows={audit} render={(r) => <><td>{dateOnly(r.timestamp || r.modified || r.creation)}</td><td>{r.user || r.owner || "—"}</td><td>{r.action || "—"}</td><td>{[r.reference_doctype, r.reference_name].filter(Boolean).join(" ") || "—"}</td><td>{r.details || "—"}</td></>} />}
          </div>
        )}
      </div>

      {modal === "sars" && <Modal title="SARS Profile" onClose={() => setModal(null)} wide><SarsForm form={form} setForm={setForm} /><button className="btn btn-teal" disabled={saving} onClick={() => submit("sars")}>{saving ? "Saving…" : "Save SARS Profile"}</button></Modal>}
      {modal === "vat" && <Modal title="VAT Return" onClose={() => setModal(null)}><PeriodFields form={form} setForm={setForm} /><div className="field-row"><Num label="Output VAT" name="output_vat" form={form} setForm={setForm} /><Num label="Input VAT" name="input_vat" form={form} setForm={setForm} /></div><button className="btn btn-teal" disabled={saving} onClick={() => submit("vat")}>{saving ? "Saving…" : "Save VAT Return"}</button></Modal>}
      {modal === "paye" && <Modal title="PAYE / EMP201 Return" onClose={() => setModal(null)}><PeriodFields form={form} setForm={setForm} /><div className="field-row"><Num label="Employees" name="total_employees" form={form} setForm={setForm} /><Num label="PAYE" name="total_paye" form={form} setForm={setForm} /><Num label="UIF" name="total_uif" form={form} setForm={setForm} /><Num label="SDL" name="total_sdl" form={form} setForm={setForm} /></div><div className="field"><label>EMP201 Reference</label><input value={form.emp201_reference || ""} onChange={e => setForm({ ...form, emp201_reference: e.target.value })} /></div><button className="btn btn-teal" disabled={saving} onClick={() => submit("paye")}>{saving ? "Saving…" : "Save PAYE Return"}</button></Modal>}
      {(modal === "uif" || modal === "sdl" || modal === "task") && <Modal title={modal === "task" ? "Compliance Deadline" : `${modal.toUpperCase()} Declaration`} onClose={() => setModal(null)}><TaskForm form={form} setForm={setForm} forcedType={modal === "uif" ? "UIF" : modal === "sdl" ? "SDL" : undefined} /><button className="btn btn-teal" disabled={saving} onClick={() => submit(modal)}>{saving ? "Saving…" : "Save Deadline"}</button></Modal>}
      {modal === "cipc" && <Modal title="CIPC Annual Return" onClose={() => setModal(null)}><div className="field-row"><Field label="Registration Number" name="registration_number" form={form} setForm={setForm} /><DateField label="Annual Return Due Date" name="annual_return_due_date" form={form} setForm={setForm} /></div><div className="field-row"><Num label="Amount Due" name="amount_due" form={form} setForm={setForm} /><Field label="Payment Reference" name="payment_reference" form={form} setForm={setForm} /></div><button className="btn btn-teal" disabled={saving} onClick={() => submit("cipc")}>{saving ? "Saving…" : "Save CIPC Return"}</button></Modal>}
      {modal === "reminder" && <Modal title="Compliance Reminder" onClose={() => setModal(null)}><TaskForm form={form} setForm={setForm} reminder /><button className="btn btn-teal" disabled={saving} onClick={() => submit("reminder")}>{saving ? "Saving…" : "Save Reminder"}</button></Modal>}
    </div>
  );
}

function ComplianceTaskList({ title, taskType, rows, onNew }: { title: string; taskType: string; rows: Any[]; onNew: () => void }) {
  const filtered = rows.filter((r) => String(r.task_type || "").toUpperCase() === taskType.toUpperCase());
  return <><div className="demo-module-actions" style={{ marginBottom: 14 }}><button className="btn btn-teal" onClick={onNew}>Create {taskType}</button></div><div className="card-head"><h3>{title}</h3></div><Table cols={["Record", "Due Date", "Priority", "Status", "Notes"]} rows={filtered} render={(r) => <><td>{r.title || r.name}</td><td>{dateOnly(r.due_date)}</td><td>{r.priority || "Medium"}</td><td><StatusChip status={r.status || "Open"} /></td><td>{r.notes || "—"}</td></>} /></>;
}

function Field({ label, name, form, setForm }: { label: string; name: string; form: Any; setForm: (v: Any) => void }) { return <div className="field"><label>{label}</label><input value={form[name] || ""} onChange={e => setForm({ ...form, [name]: e.target.value })} /></div>; }
function Num(props: { label: string; name: string; form: Any; setForm: (v: Any) => void }) { return <div className="field"><label>{props.label}</label><input type="number" value={props.form[props.name] || ""} onChange={e => props.setForm({ ...props.form, [props.name]: e.target.value })} /></div>; }
function DateField(props: { label: string; name: string; form: Any; setForm: (v: Any) => void }) { return <div className="field"><label>{props.label}</label><input type="date" value={props.form[props.name] || ""} onChange={e => props.setForm({ ...props.form, [props.name]: e.target.value })} /></div>; }
function PeriodFields({ form, setForm }: { form: Any; setForm: (v: Any) => void }) { return <><div className="field-row"><DateField label="From" name="from_date" form={form} setForm={setForm} /><DateField label="To" name="to_date" form={form} setForm={setForm} /><DateField label="Due Date" name="due_date" form={form} setForm={setForm} /></div><div className="field"><label>Status</label><select value={form.status || "Draft"} onChange={e => setForm({ ...form, status: e.target.value })}><option>Draft</option><option>Ready</option><option>Submitted</option><option>Paid</option><option>Due</option><option>Overdue</option></select></div></>; }
function SarsForm({ form, setForm }: { form: Any; setForm: (v: Any) => void }) { return <><div className="field-row"><Field label="Registered Name" name="registered_name" form={form} setForm={setForm} /><Field label="Trading Name" name="trading_name" form={form} setForm={setForm} /></div><div className="field-row"><Field label="VAT Number" name="vat_number" form={form} setForm={setForm} /><Field label="PAYE Number" name="paye_number" form={form} setForm={setForm} /><Field label="UIF Number" name="uif_number" form={form} setForm={setForm} /></div><div className="field-row"><Field label="SDL Number" name="sdl_number" form={form} setForm={setForm} /><Field label="Income Tax Number" name="tax_number" form={form} setForm={setForm} /><Field label="B-BBEE Level" name="bee_level" form={form} setForm={setForm} /></div><div className="field"><label>Compliance Status</label><select value={form.compliance_status || "Good Standing"} onChange={e => setForm({ ...form, compliance_status: e.target.value })}><option>Good Standing</option><option>Attention Required</option><option>Overdue</option><option>Not Registered</option></select></div></>; }
function TaskForm({ form, setForm, forcedType, reminder }: { form: Any; setForm: (v: Any) => void; forcedType?: string; reminder?: boolean }) { return <><div className="field"><label>Title</label><input value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={reminder ? "Reminder title" : "Compliance deadline"} /></div><div className="field-row"><div className="field"><label>Type</label><select value={forcedType || form.task_type || form.reminder_type || "VAT"} disabled={Boolean(forcedType)} onChange={e => setForm({ ...form, [reminder ? "reminder_type" : "task_type"]: e.target.value })}><option>VAT</option><option>PAYE</option><option>UIF</option><option>SDL</option><option>CIPC</option><option>General</option></select></div><DateField label={reminder ? "Reminder Date" : "Due Date"} name={reminder ? "reminder_date" : "due_date"} form={form} setForm={setForm} /><div className="field"><label>Priority</label><select value={form.priority || "Medium"} onChange={e => setForm({ ...form, priority: e.target.value })}><option>Low</option><option>Medium</option><option>High</option></select></div></div><div className="field"><label>Notes</label><textarea value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div></>; }
