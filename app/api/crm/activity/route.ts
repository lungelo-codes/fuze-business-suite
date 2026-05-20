import { NextResponse } from "next/server";
import { erpList, erpMethod } from "@/lib/server/erpnext";

type Row = Record<string, any>;

function rowsFrom(value: unknown): Row[] {
  const v = value as any;
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.data)) return v.data;
  if (Array.isArray(v?.message)) return v.message;
  if (Array.isArray(v?.activity)) return v.activity;
  if (Array.isArray(v?.timeline)) return v.timeline;
  if (Array.isArray(v?.records)) return v.records;
  if (Array.isArray(v?.data?.activity)) return v.data.activity;
  if (Array.isArray(v?.message?.activity)) return v.message.activity;
  return [];
}

async function safeList(doctype: string, filters: unknown[], fields: string[]): Promise<Row[]> {
  try { return await erpList<Row>(doctype, { fields, filters, limit: 80, orderBy: "modified desc" }); }
  catch { return []; }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const reference_doctype = searchParams.get("reference_doctype") || searchParams.get("doctype") || undefined;
  const reference_name = searchParams.get("reference_name") || searchParams.get("name") || searchParams.get("lead") || searchParams.get("deal") || undefined;
  const limit = Number(searchParams.get("limit") || 80);

  const args: Record<string, string | number> = {};
  for (const key of ["reference_doctype", "reference_name", "lead", "deal"]) {
    const value = searchParams.get(key);
    if (value) args[key] = value;
  }
  args.limit = limit;

  try {
    let activity = rowsFrom(await erpMethod("crm.get_activity_feed", args));

    if (!activity.length && reference_doctype && reference_name) {
      const communications = await safeList("Communication", [["reference_doctype", "=", reference_doctype], ["reference_name", "=", reference_name]], ["name", "subject", "sender", "communication_type", "content", "reference_doctype", "reference_name", "creation", "modified"]);
      const tasks = await safeList("ToDo", [["reference_type", "=", reference_doctype], ["reference_name", "=", reference_name]], ["name", "description", "status", "date", "priority", "reference_type", "reference_name", "creation", "modified"]);
      activity = [
        ...communications.map((r) => ({ ...r, type: "Communication", title: r.subject || "Communication" })),
        ...tasks.map((r) => ({ ...r, type: "Task", title: r.description || "Task" })),
      ].sort((a, b) => String(b.creation || b.modified || "").localeCompare(String(a.creation || a.modified || "")));
    }

    return NextResponse.json({ success: true, data: activity, activity, timeline: activity, count: activity.length });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch activity" }, { status: error?.status || 500 });
  }
}
