import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

type Row = Record<string, any>;

function rowsFrom(value: unknown): Row[] {
  const v = value as any;
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.records)) return v.records;
  if (Array.isArray(v?.data)) return v.data;
  if (Array.isArray(v?.message)) return v.message;
  if (Array.isArray(v?.data?.records)) return v.data.records;
  if (Array.isArray(v?.message?.records)) return v.message.records;
  if (Array.isArray(v?.data?.customers)) return v.data.customers;
  if (Array.isArray(v?.message?.customers)) return v.message.customers;
  if (Array.isArray(v?.customers)) return v.customers;
  
  return [];
}

function normalise(r: Row): Row {
  const name = r.name || r.id || r.customer_name || r.full_name;
  return {
    id: name,
    name,
    title: r.title || r.customer_name || r.full_name || r.contract_name || name,
    customer: r.customer || r.party_name || name,
    customer_name: r.customer_name || r.customer || r.party_name || r.company_name || name,
    status: r.status || (r.disabled === 1 ? "Disabled" : r.docstatus === 1 ? "Submitted" : "Active"),
    transaction_date: r.transaction_date || r.posting_date || r.start_date || r.modified,
    grand_total: r.grand_total ?? r.rounded_total ?? r.total ?? r.amount ?? 0,
    currency: r.currency || "ZAR",
    email: r.email || r.email_id,
    phone: r.phone || r.mobile_no,
    company: r.company || r.company_name || r.customer || r.party_name,
    ...r,
  };
}

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const limit = Number(p.get("limit") || 80);
  const offset = Number(p.get("offset") || 0);
  const search = p.get("search") || undefined;
  const customer = p.get("customer") || undefined;
  const status = p.get("status") || undefined;
  try {
    const result = await erpMethod("crm.get_crm_records", { kind: "customers", limit, offset, search, customer, status });
    let rows = rowsFrom(result);
    if (!rows.length) {
      const fallback = await erpMethod("business_crud.list_doctype", { doctype: "Customer", fields: ["name","customer_name","customer_type","customer_group","territory","disabled","modified","creation"], filters: [], limit: Math.max(limit + offset, 100), order_by: "modified desc" });
      rows = rowsFrom(fallback).slice(offset, offset + limit);
    }
    const data = rows.map(normalise);
    return NextResponse.json({ success: true, data, records: data, customers: data, count: data.length });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Could not load customers", data: [], records: [], customers: [], count: 0 }, { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await erpMethod("business_crud.create_doctype", { doctype: "Customer", values: body, ignore_mandatory: true, ignore_validate: true, mute_notifications: true });
    const row = normalise(((result as any)?.data || (result as any)?.message || result || body) as Row);
    return NextResponse.json({ success: true, data: row, record: row }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Could not save data" }, { status: e?.status || 500 });
  }
}
