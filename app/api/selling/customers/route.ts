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

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const args: Record<string, unknown> = {};
  if (p.get("company")) args.company = p.get("company");
  if (p.get("customer_group")) args.customer_group = p.get("customer_group");
  if (p.get("limit")) args.limit = Number(p.get("limit") || 80);
  if (p.get("offset")) args.offset = Number(p.get("offset") || 0);

  try {
    let customers = rowsFrom(await erpMethod("selling.get_customers", args));

    if (!customers.length) {
      customers = await erpList<Row>("Customer", {
        fields: ["name", "customer_name", "customer_type", "customer_group", "territory", "disabled", "modified"],
        limit: Number(args.limit || 100),
        orderBy: "modified desc",
      });
    }

    const data = customers.map(normalise);
    return NextResponse.json({ success: true, data, customers: data, count: data.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not load customers" }, { status: e?.status || 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    try {
      const result = await erpMethod("selling.create_customer", { data: body });
      return NextResponse.json(result, { status: 201 });
    } catch {
      const created = await createModuleRow("customers", body || {});
      return NextResponse.json({ success: true, data: normalise(created), customer: normalise(created) }, { status: 201 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not create customer. Check the name, group and territory." }, { status: e?.status || 500 });
  }
}
