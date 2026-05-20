import { NextResponse } from "next/server";
import { erpMethod, BusinessSuiteError } from "@/lib/server/erpnext";

type Row = Record<string, any>;

function rowsFrom(value: unknown): Row[] {
  const v = value as any;
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.data)) return v.data;
  if (Array.isArray(v?.message)) return v.message;
  if (Array.isArray(v?.records)) return v.records;
  if (Array.isArray(v?.rows)) return v.rows;
  for (const key of ["customers", "contacts", "quotations", "quotes", "sales_orders", "orders", "contracts"]) {
    if (Array.isArray(v?.[key])) return v[key];
    if (Array.isArray(v?.data?.[key])) return v.data[key];
    if (Array.isArray(v?.message?.[key])) return v.message[key];
  }
  return [];
}

async function probe(label: string, method: string, args: Row = {}) {
  try {
    const res = await erpMethod(method, args);
    const rows = rowsFrom(res);
    return { label, method, ok: true, count: rows.length, sample: rows[0] || null };
  } catch (error: any) {
    return {
      label,
      method,
      ok: false,
      error: error instanceof BusinessSuiteError ? error.rawMessage || error.message : error?.message || String(error),
    };
  }
}

async function crudProbe(label: string, doctype: string, fields: string[]) {
  return probe(label, "business_crud.list_doctype", {
    doctype,
    fields,
    filters: [],
    limit: 20,
    order_by: "modified desc",
  });
}

export async function GET() {
  const checks = await Promise.all([
    probe("CRM customers", "crm.get_customers", { limit: 20, offset: 0 }),
    crudProbe("Customer fallback", "Customer", ["name", "customer_name", "customer_group", "territory", "modified"]),
    probe("CRM contacts", "crm.get_contacts", { limit: 20, offset: 0 }),
    crudProbe("Contact fallback", "Contact", ["name", "full_name", "first_name", "last_name", "email_id", "mobile_no", "company_name", "modified"]),
    probe("Sales quotations", "sales.get_quotations", { limit: 20, offset: 0 }),
    crudProbe("Quotation fallback", "Quotation", ["name", "party_name", "customer_name", "transaction_date", "status", "grand_total", "currency", "modified"]),
    probe("Sales orders", "sales.get_sales_orders", { limit: 20, offset: 0 }),
    crudProbe("Sales Order fallback", "Sales Order", ["name", "customer", "customer_name", "transaction_date", "status", "grand_total", "currency", "modified"]),
    probe("CRM contracts", "crm.get_contracts", { limit: 20, offset: 0 }),
    crudProbe("Contract fallback", "Contract", ["name", "party_type", "party_name", "start_date", "end_date", "status", "modified"]),
  ]);

  return NextResponse.json({ success: true, checks });
}
