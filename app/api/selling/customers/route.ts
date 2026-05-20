import { NextResponse } from "next/server";
import { erpList, erpMethod } from "@/lib/server/erpnext";
import { createModuleRow } from "@/lib/server/moduleApi";

type Row = Record<string, any>;

function rowsFrom(value: unknown): Row[] {
  const v = value as any;
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.data)) return v.data;
  if (Array.isArray(v?.message)) return v.message;
  if (Array.isArray(v?.customers)) return v.customers;
  if (Array.isArray(v?.records)) return v.records;
  if (Array.isArray(v?.rows)) return v.rows;
  if (Array.isArray(v?.message?.customers)) return v.message.customers;
  if (Array.isArray(v?.data?.customers)) return v.data.customers;
  return [];
}

function normalise(row: Row): Row {
  return {
    id: row.name || row.id || row.customer_name,
    name: row.name || row.id || row.customer_name,
    customer_name: row.customer_name || row.name,
    customer_group: row.customer_group,
    territory: row.territory,
    status: row.status || (row.disabled === 1 ? "Disabled" : "Active"),
    modified: row.modified,
    ...row,
  };
}

async function fallbackCustomers(limit: number): Promise<Row[]> {
  return erpList<Row>("Customer", {
    fields: ["name", "customer_name", "customer_type", "customer_group", "territory", "disabled", "modified"],
    limit,
    orderBy: "modified desc",
  });
}

async function firstName(doctype: string, fallback: string): Promise<string> {
  try {
    const rows = await erpList<Row>(doctype, { fields: ["name"], limit: 1, orderBy: "modified desc" });
    return String(rows?.[0]?.name || fallback);
  } catch { return fallback; }
}

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const limit = Number(p.get("limit") || 80);
  const args: Record<string, unknown> = { limit, offset: Number(p.get("offset") || 0) };
  if (p.get("company")) args.company = p.get("company");
  if (p.get("customer_group")) args.customer_group = p.get("customer_group");

  try {
    let customers: Row[] = [];
    try { customers = rowsFrom(await erpMethod("selling.get_customers", args)); } catch { customers = []; }
    if (!customers.length) customers = await fallbackCustomers(limit);
    const data = customers.map(normalise);
    return NextResponse.json({ success: true, data, customers: data, count: data.length });
  } catch {
    return NextResponse.json({ success: true, data: [], customers: [], count: 0 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const data = {
      ...body,
      customer_name: body.customer_name || body.name || body.title || body.company_name || "New Customer",
      customer_type: body.customer_type || "Company",
      customer_group: body.customer_group || await firstName("Customer Group", "All Customer Groups"),
      territory: body.territory || await firstName("Territory", "All Territories"),
    };
    let created: Row;
    try { created = normalise((await erpMethod("selling.create_customer", { data })) as Row); }
    catch { created = normalise(await createModuleRow("customers", data)); }
    return NextResponse.json({ success: true, data: created, customer: created }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not create customer. Check the name, group and territory." }, { status: e?.status || 500 });
  }
}
