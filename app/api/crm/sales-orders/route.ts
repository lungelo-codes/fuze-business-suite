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
  if (Array.isArray(v?.sales_orders)) return v.sales_orders;
  if (Array.isArray(v?.orders)) return v.orders;
  if (Array.isArray(v?.data?.sales_orders)) return v.data.sales_orders;
  if (Array.isArray(v?.data?.orders)) return v.data.orders;
  if (Array.isArray(v?.data?.records)) return v.data.records;
  if (Array.isArray(v?.message?.sales_orders)) return v.message.sales_orders;
  if (Array.isArray(v?.message?.orders)) return v.message.orders;
  if (Array.isArray(v?.message?.records)) return v.message.records;
  return [];
}
async function listDocs(doctype: string, fields: string[], limit: number, offset: number): Promise<Row[]> {
  for (const attemptFields of [fields, ["name", "modified"]]) {
    try {
      const res = await erpMethod("business_crud.list_doctype", { doctype, fields: attemptFields, filters: [], limit: Math.max(limit + offset, 100), order_by: "modified desc" });
      const rows = rowsFrom(res);
      if (rows.length) return rows.slice(offset, offset + limit);
    } catch {}
  }
  return [];
}
function normalise(r: Row): Row {
  const name = r.name || r.id;
  return { id: name, name, title: r.title || name, customer: r.customer, customer_name: r.customer_name || r.customer, status: r.status || (r.docstatus === 1 ? "Submitted" : "Draft"), transaction_date: r.transaction_date, grand_total: r.grand_total ?? r.rounded_total ?? r.total ?? 0, currency: r.currency || "ZAR", ...r };
}
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const limit = Number(p.get("limit") || 80);
  const offset = Number(p.get("offset") || 0);
  try {
    let rows = rowsFrom(await erpMethod("sales.get_sales_orders", { limit, offset, customer: p.get("customer") || undefined }).catch(() => []));
    if (!rows.length) rows = await listDocs("Sales Order", ["name", "customer", "customer_name", "transaction_date", "delivery_date", "status", "docstatus", "grand_total", "rounded_total", "currency", "modified"], limit, offset);
    const data = rows.map(normalise);
    return NextResponse.json({ success: true, data, sales_orders: data, orders: data, records: data, count: data.length });
  } catch { return NextResponse.json({ success: true, data: [], sales_orders: [], orders: [], records: [], count: 0 }); }
}
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const values = { ...body, customer: body.customer || body.customer_name, transaction_date: body.transaction_date || new Date().toISOString().slice(0,10), delivery_date: body.delivery_date || body.transaction_date || new Date().toISOString().slice(0,10), currency: body.currency || "ZAR", conversion_rate: body.conversion_rate || 1, selling_price_list: body.selling_price_list || "Standard Selling", price_list_currency: body.price_list_currency || "ZAR", plc_conversion_rate: body.plc_conversion_rate || 1 };
    let row: Row;
    try { row = rowsFrom(await erpMethod("sales.create_sales_order", { data: values }))[0]; }
    catch { row = (await erpMethod("business_crud.create_doctype", { doctype: "Sales Order", values }) as any)?.data as Row; }
    const data = normalise(row || values);
    return NextResponse.json({ success: true, data, sales_order: data }, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e?.message || "Could not create sales order" }, { status: e?.status || 500 }); }
}
