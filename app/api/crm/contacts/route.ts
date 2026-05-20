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

/**
 * GET  /api/crm/contacts?limit=50&offset=0&search=john
 * POST /api/crm/contacts body: { first_name, last_name, email, phone, company, designation, gender }
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || 80);
  const offset = Number(searchParams.get("offset") || 0);
  const search = searchParams.get("search");

  try {
    let contacts = rowsFrom(await erpMethod("crm.get_contacts", { limit, offset, search }));

    // Some older backend CRM methods return only contact counts for the dashboard.
    // Keep the list view reliable by falling back to the controlled Business Suite
    // doctype wrapper. This still avoids direct /api/resource calls from the SaaS UI.
    if (!contacts.length) {
      contacts = await erpList<Row>("Contact", {
        fields: ["name", "first_name", "last_name", "full_name", "email_id", "mobile_no", "phone", "company_name", "designation", "modified"],
        limit: Math.max(limit + offset, 100),
        orderBy: "modified desc",
      });
      contacts = applySearch(contacts, search).slice(offset, offset + limit);
    }

    const normalised = contacts.map(normaliseContact);
    return NextResponse.json({ data: normalised, contacts: normalised, count: normalised.length });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Could not load contacts" },
      { status: error?.status || 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await erpMethod("crm.create_contact", { data: body });
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Could not create contact" },
      { status: error?.status || 500 }
    );
  }
}
