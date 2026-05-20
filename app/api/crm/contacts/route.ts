import { NextResponse } from "next/server";
import { erpList, erpMethod } from "@/lib/server/erpnext";

type Row = Record<string, any>;

function rowsFrom(value: unknown): Row[] {
  const v = value as any;
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.contacts)) return v.contacts;
  if (Array.isArray(v?.data)) return v.data;
  if (Array.isArray(v?.message)) return v.message;
  if (Array.isArray(v?.rows)) return v.rows;
  if (Array.isArray(v?.records)) return v.records;
  if (Array.isArray(v?.data?.contacts)) return v.data.contacts;
  if (Array.isArray(v?.message?.contacts)) return v.message.contacts;
  return [];
}

function normaliseContact(row: Row): Row {
  const first = row.first_name || "";
  const last = row.last_name || "";
  const full = row.full_name || row.name || [first, last].filter(Boolean).join(" ");
  return {
    id: row.name || row.id || full,
    name: full || row.email_id || row.mobile_no || row.phone || "Contact",
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email || row.email_id || row.email_ids?.[0]?.email_id,
    phone: row.phone || row.mobile_no || row.phone_nos?.[0]?.phone,
    company: row.company || row.company_name || row.customer || row.organization,
    designation: row.designation,
    last_updated: row.modified,
    ...row,
  };
}

function applySearch(rows: Row[], search?: string | null) {
  const q = String(search || "").trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => [r.name, r.full_name, r.first_name, r.last_name, r.email_id, r.mobile_no, r.phone, r.company_name, r.designation]
    .some((v) => String(v || "").toLowerCase().includes(q)));
}

async function fallbackContacts(limit: number, offset: number, search?: string | null): Promise<Row[]> {
  const rows = await erpList<Row>("Contact", {
    fields: ["name", "first_name", "last_name", "full_name", "email_id", "mobile_no", "phone", "company_name", "designation", "modified"],
    limit: Math.max(limit + offset, 100),
    orderBy: "modified desc",
  });
  return applySearch(rows, search).slice(offset, offset + limit);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || 80);
  const offset = Number(searchParams.get("offset") || 0);
  const search = searchParams.get("search");

  try {
    let contacts: Row[] = [];
    try {
      contacts = rowsFrom(await erpMethod("crm.get_contacts", { limit, offset, search }));
    } catch {
      contacts = [];
    }
    if (!contacts.length) contacts = await fallbackContacts(limit, offset, search);
    const normalised = contacts.map(normaliseContact);
    return NextResponse.json({ success: true, data: normalised, contacts: normalised, count: normalised.length });
  } catch {
    return NextResponse.json({ success: true, data: [], contacts: [], count: 0 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const data = {
      first_name: body.first_name || body.full_name || body.name || "New",
      last_name: body.last_name || "Contact",
      full_name: body.full_name || body.name,
      email_id: body.email_id || body.email,
      mobile_no: body.mobile_no || body.phone,
      phone: body.phone || body.mobile_no,
      company_name: body.company_name || body.company || body.customer,
      designation: body.designation,
    };
    let result: any = null;
    try { result = await erpMethod("crm.create_contact", { data }); }
    catch { result = await erpMethod("business_crud.create_doctype", { doctype: "Contact", values: data, module_id: "contacts" }); }
    const row = normaliseContact((result as any)?.data || (result as any)?.message || result || data);
    return NextResponse.json({ success: true, data: row, contact: row }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Could not create contact" }, { status: error?.status || 500 });
  }
}
