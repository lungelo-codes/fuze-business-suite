import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

type Row = Record<string, any>;

function rowsFrom(value: unknown, key?: string): Row[] {
  const v = value as any;
  if (Array.isArray(v)) return v;
  if (key && Array.isArray(v?.[key])) return v[key];
  if (key && Array.isArray(v?.data?.[key])) return v.data[key];
  if (key && Array.isArray(v?.message?.[key])) return v.message[key];
  if (Array.isArray(v?.data)) return v.data;
  if (Array.isArray(v?.message)) return v.message;
  return [];
}
function objFrom(value: unknown): Row {
  const v = value as any;
  return (v?.data && !Array.isArray(v.data) ? v.data : v?.message && !Array.isArray(v.message) ? v.message : v || {}) as Row;
}
async function list(doctype: string, fields: string[], limit = 500): Promise<Row[]> {
  const res = await erpMethod("business_crud.list_doctype", { doctype, fields, filters: [], limit, order_by: "modified desc" });
  return rowsFrom(res);
}
function group(rows: Row[], field: string) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const key = String(r[field] || "Not Set");
    m.set(key, (m.get(key) || 0) + 1);
  }
  return Array.from(m.entries()).map(([label, value]) => ({ label, value })).sort((a,b)=>b.value-a.value);
}
function monthRows(rows: Row[], dateField: string, amountField: string) {
  const m = new Map<string, { label: string; count: number; value: number }>();
  for (const r of rows) {
    const label = String(r[dateField] || r.modified || "").slice(0, 7) || "Not Set";
    const entry = m.get(label) || { label, count: 0, value: 0 };
    entry.count += 1;
    entry.value += Number(r[amountField] || r.grand_total || r.total || 0);
    m.set(label, entry);
  }
  return Array.from(m.values()).sort((a,b)=>String(b.label).localeCompare(String(a.label))).slice(0,12);
}
export async function GET() {
  try {
    // Prefer the verified installed server method.
    const server = await erpMethod("crm.get_reporting_dashboard", {}).catch(() => null);
    const data = objFrom(server);
    if (data && Object.keys(data).length && (data.cards || data.pipeline || data.lead_status)) {
      return NextResponse.json({ success: true, data, ...data });
    }

    const [leads, opportunities, customers, contacts, quotes, orders, contracts] = await Promise.all([
      list("Lead", ["name", "status", "source", "modified"]),
      list("Opportunity", ["name", "status", "sales_stage", "opportunity_amount", "probability", "modified"]),
      list("Customer", ["name", "customer_group", "territory", "modified"]),
      list("Contact", ["name", "modified"]),
      list("Quotation", ["name", "status", "transaction_date", "grand_total", "currency", "modified"]),
      list("Sales Order", ["name", "status", "transaction_date", "grand_total", "currency", "modified"]),
      list("Contract", ["name", "status", "start_date", "end_date", "modified"]),
    ]);
    const pipeline = Object.values(opportunities.reduce<Record<string, Row>>((acc, r) => {
      const label = String(r.sales_stage || r.status || "Not Set");
      const item = acc[label] || { label, count: 0, value: 0, weighted_value: 0, probability: 0 };
      const value = Number(r.opportunity_amount || 0);
      const probability = Number(r.probability || 0);
      item.count += 1; item.value += value; item.weighted_value += value * probability / 100; item.probability += probability;
      acc[label] = item; return acc;
    }, {})).map((r:any) => ({ ...r, probability: r.count ? r.probability / r.count : 0 }));
    const out = {
      currency: "ZAR",
      cards: { leads: leads.length, opportunities: opportunities.length, customers: customers.length, contacts: contacts.length, quotations: quotes.length, sales_orders: orders.length, contracts: contracts.length },
      lead_status: group(leads, "status"),
      lead_source: group(leads, "source"),
      pipeline,
      opportunity_status: group(opportunities, "status"),
      customers_by_group: group(customers, "customer_group"),
      quotes_by_status: group(quotes, "status"),
      contracts_by_status: group(contracts, "status"),
      monthly_quotes: monthRows(quotes, "transaction_date", "grand_total"),
      monthly_sales_orders: monthRows(orders, "transaction_date", "grand_total"),
    };
    return NextResponse.json({ success: true, data: out, ...out });
  } catch (error: any) {
    return NextResponse.json({ success: true, data: { currency: "ZAR", cards: {}, lead_status: [], pipeline: [] }, error: error?.message || "Could not load CRM reports" });
  }
}
