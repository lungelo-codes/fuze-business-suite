import { NextResponse } from "next/server";
import { erpList, erpMethod } from "@/lib/server/erpnext";

type Params = { params: { id: string } };
type Row = Record<string, any>;

function docFrom(value: unknown): Row {
  const v = value as any;
  if (v?.data && !Array.isArray(v.data)) return v.data;
  if (v?.message && !Array.isArray(v.message)) return v.message;
  if (v && typeof v === "object") return v as Row;
  return {};
}

function rowsFrom(value: unknown, keys: string[] = []): Row[] {
  const v = value as any;
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.data)) return v.data;
  if (Array.isArray(v?.message)) return v.message;
  for (const key of keys) {
    if (Array.isArray(v?.[key])) return v[key];
    if (Array.isArray(v?.data?.[key])) return v.data[key];
    if (Array.isArray(v?.message?.[key])) return v.message[key];
  }
  return [];
}

async function safeList(doctype: string, filters: unknown[], fields: string[]): Promise<Row[]> {
  try { return await erpList<Row>(doctype, { fields, filters, limit: 80, orderBy: "modified desc" }); }
  catch { return []; }
}

async function linkedActivity(referenceName: string) {
  const communications = await safeList("Communication", [["reference_doctype", "=", "Lead"], ["reference_name", "=", referenceName]], ["name", "subject", "sender", "communication_type", "content", "reference_doctype", "reference_name", "creation", "modified"]);
  const tasks = await safeList("ToDo", [["reference_type", "=", "Lead"], ["reference_name", "=", referenceName]], ["name", "description", "status", "date", "priority", "reference_type", "reference_name", "creation", "modified"]);
  const activity = [
    ...communications.map((r) => ({ ...r, type: "Communication", title: r.subject || "Communication" })),
    ...tasks.map((r) => ({ ...r, type: "Task", title: r.description || "Task" })),
  ].sort((a, b) => String(b.creation || b.modified || "").localeCompare(String(a.creation || a.modified || "")));
  return { communications, tasks, activity };
}

export async function GET(_req: Request, { params }: Params) {
  try {
    let result: any = null;
    try { result = await erpMethod("crm.get_lead", { lead: params.id }); } catch { result = null; }

    const base = docFrom(result);
    const lead = base.lead || base.doc || base;
    const fallbackLead = Object.keys(lead || {}).length ? lead : (await safeList("Lead", [["name", "=", params.id]], ["name", "lead_name", "company_name", "email_id", "mobile_no", "status", "source", "modified"]))[0] || {};
    const linked = await linkedActivity(params.id);

    const communications = rowsFrom(base, ["communications", "emails"]).length ? rowsFrom(base, ["communications", "emails"]) : linked.communications;
    const tasks = rowsFrom(base, ["tasks", "todos"]).length ? rowsFrom(base, ["tasks", "todos"]) : linked.tasks;
    const activity = rowsFrom(base, ["activity", "timeline"]).length ? rowsFrom(base, ["activity", "timeline"]) : linked.activity;

    return NextResponse.json({ data: { ...base, lead: fallbackLead, communications, tasks, activity } });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Lead not found" }, { status: error?.status || 404 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const body = await req.json();
    const result = await erpMethod("crm.update_lead", { lead: params.id, data: body });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update lead" }, { status: error?.status || 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const result = await erpMethod("crm.delete_lead", { lead: params.id });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to delete lead" }, { status: error?.status || 500 });
  }
}
