import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

type Row = Record<string, any>;

function rowsFrom(value: unknown): Row[] {
  const v = value as any;
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.data)) return v.data;
  if (Array.isArray(v?.message)) return v.message;
  if (Array.isArray(v?.records)) return v.records;
  if (Array.isArray(v?.rows)) return v.rows;
  if (Array.isArray(v?.message?.data)) return v.message.data;
  if (Array.isArray(v?.message?.records)) return v.message.records;
  if (Array.isArray(v?.data?.data)) return v.data.data;
  if (Array.isArray(v?.data?.records)) return v.data.records;
  if (Array.isArray(v?.customers)) return v.customers;
  if (Array.isArray(v?.data?.customers)) return v.data.customers;
  if (Array.isArray(v?.message?.customers)) return v.message.customers;
  return [];
}

async function listDocs(doctype: string, fields: string[], limit: number, offset: number): Promise<Row[]> {
  const attempts = [
    { fields, limit: Math.max(limit + offset, 100), offset: 0 },
    { fields: ["name", "modified"], limit: Math.max(limit + offset, 100), offset: 0 },
  ];
  for (const attempt of attempts) {
    try {
      const res = await erpMethod("business_crud.list_doctype", {
        doctype,
        fields: attempt.fields,
        filters: [],
        limit: attempt.limit,
        order_by: "modified desc",
      });
      const rows = rowsFrom(res);
      if (rows.length) return rows.slice(offset, offset + limit);
    } catch {}
  }
  return [];
}

async function createDoc(doctype: string, values: Row): Promise<Row> {
  const res = await erpMethod("business_crud.create_doctype", { doctype, values });
  const v = res as any;
  return (v?.data || v?.message || v || values) as Row;
}


function normalise(row: Row): Row {
  const name = row.name || row.id || row.customer_name;
  return {
    id: name,
    name,
    title: row.customer_name || name,
    customer_name: row.customer_name || name,
    customer: name,
    customer_group: row.customer_group,
    territory: row.territory,
    status: row.status || (row.disabled === 1 ? "Disabled" : "Active"),
    modified: row.modified,
    ...row,
  };
}

async function firstName(doctype: string, fallback: string): Promise<string> {
  try {
    const rows = await listDocs(doctype, ["name"], 1, 0);
    return String(rows?.[0]?.name || fallback);
  } catch { return fallback; }
}

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const limit = Number(p.get("limit") || 80);
  const offset = Number(p.get("offset") || 0);
  try {
    let rows = rowsFrom(await erpMethod("selling.get_customers", { limit, offset }).catch(() => []));
    if (!rows.length) rows = await listDocs("Customer", ["name", "customer_name", "customer_type", "customer_group", "territory", "disabled", "modified"], limit, offset);
    const data = rows.map(normalise);
    return NextResponse.json({ success: true, data, customers: data, records: data, count: data.length });
  } catch {
    return NextResponse.json({ success: true, data: [], customers: [], records: [], count: 0 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const values = {
      ...body,
      customer_name: body.customer_name || body.name || body.title || body.company_name || "New Customer",
      customer_type: body.customer_type || "Company",
      customer_group: body.customer_group || await firstName("Customer Group", "All Customer Groups"),
      territory: body.territory || await firstName("Territory", "All Territories"),
    };
    let row: Row;
    try { row = (await erpMethod("selling.create_customer", { data: values }) as any)?.data as Row; }
    catch { row = await createDoc("Customer", values); }
    const data = normalise(row || values);
    return NextResponse.json({ success: true, data, customer: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not create customer" }, { status: e?.status || 500 });
  }
}
