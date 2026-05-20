import { NextResponse } from "next/server";
import { erpList, erpMethod } from "@/lib/server/erpnext";
import { createModuleRow } from "@/lib/server/moduleApi";

type Row = Record<string, any>;
function rowsFrom(value: unknown): Row[] { const v = value as any; if (Array.isArray(v)) return v; if (Array.isArray(v?.data)) return v.data; if (Array.isArray(v?.message)) return v.message; if (Array.isArray(v?.sales_orders)) return v.sales_orders; if (Array.isArray(v?.orders)) return v.orders; if (Array.isArray(v?.records)) return v.records; if (Array.isArray(v?.data?.sales_orders)) return v.data.sales_orders; if (Array.isArray(v?.message?.sales_orders)) return v.message.sales_orders; return []; }
function normalise(r: Row): Row { return { id: r.name || r.id, name: r.name || r.id, title: r.title || r.name, customer: r.customer, customer_name: r.customer_name || r.customer, status: r.status || (r.docstatus === 1 ? "Submitted" : "Draft"), transaction_date: r.transaction_date, grand_total: r.grand_total || r.rounded_total || r.total, currency: r.currency || "ZAR", ...r }; }

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const args = { limit: Number(p.get("limit") || 80), offset: Number(p.get("offset") || 0), customer: p.get("customer") || undefined };
  try {
    let rows = rowsFrom(await erpMethod("sales.get_sales_orders", args));
    if (!rows.length) rows = await erpList<Row>("Sales Order", { fields: ["name","title","customer","customer_name","transaction_date","delivery_date","status","docstatus","grand_total","rounded_total","currency","modified"], limit: args.limit, orderBy: "modified desc" });
    const data = rows.map(normalise);
    return NextResponse.json({ success: true, data, sales_orders: data, orders: data, count: data.length });
  } catch {
    return NextResponse.json({ success: true, data: [], sales_orders: [], orders: [], count: 0 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const created = await createModuleRow("sales-orders", body || {});
    return NextResponse.json({ success: true, data: normalise(created), sales_order: normalise(created) }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not create sales order. Check the customer, item and amount." }, { status: e?.status || 500 });
  }
}
