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
  if (Array.isArray(v?.quotes)) return v.quotes;
  if (Array.isArray(v?.quotations)) return v.quotations;
  if (Array.isArray(v?.data?.quotes)) return v.data.quotes;
  if (Array.isArray(v?.data?.quotations)) return v.data.quotations;
  if (Array.isArray(v?.data?.records)) return v.data.records;
  if (Array.isArray(v?.message?.quotes)) return v.message.quotes;
  if (Array.isArray(v?.message?.quotations)) return v.message.quotations;
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
  return {
    id: name,
    name,
    title: r.title || name,
    customer: r.customer || r.party_name,
    customer_name: r.customer_name || r.party_name || r.customer,
    party_name: r.party_name || r.customer,
    status: r.status || (r.docstatus === 1 ? "Submitted" : "Draft"),
    transaction_date: r.transaction_date,
    grand_total: r.grand_total ?? r.rounded_total ?? r.total ?? 0,
    currency: r.currency || "ZAR",
    ...r,
  };
}

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const limit = Number(p.get("limit") || 80);
  const offset = Number(p.get("offset") || 0);
  try {
    let rows = rowsFrom(await erpMethod("sales.get_quotations", { limit, offset, customer: p.get("customer") || undefined }).catch(() => []));
    if (!rows.length) rows = await listDocs("Quotation", ["name", "quotation_to", "party_name", "customer_name", "transaction_date", "valid_till", "status", "docstatus", "grand_total", "rounded_total", "currency", "modified"], limit, offset);
    const data = rows.map(normalise);
    return NextResponse.json({ success: true, data, quotations: data, quotes: data, records: data, count: data.length });
  } catch {
    return NextResponse.json({ success: true, data: [], quotations: [], quotes: [], records: [], count: 0 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const values = {
      ...body,
      quotation_to: body.quotation_to || "Customer",
      party_name: body.party_name || body.customer || body.customer_name,
      company: body.company,
      transaction_date: body.transaction_date || new Date().toISOString().slice(0, 10),
      valid_till: body.valid_till || body.due_date,
      currency: body.currency || "ZAR",
      conversion_rate: body.conversion_rate || 1,
      selling_price_list: body.selling_price_list || "Standard Selling",
      price_list_currency: body.price_list_currency || "ZAR",
      plc_conversion_rate: body.plc_conversion_rate || 1,
    };
    let row: Row;
    try { row = rowsFrom(await erpMethod("sales.create_quotation", { data: values }))[0]; }
    catch { row = (await erpMethod("business_crud.create_doctype", { doctype: "Quotation", values, ignore_mandatory: true, ignore_validate: true, mute_notifications: true }) as any)?.data as Row; }
    const data = normalise(row || values);
    return NextResponse.json({ success: true, data, quotation: data, quote: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not create quote" }, { status: e?.status || 500 });
  }
}
