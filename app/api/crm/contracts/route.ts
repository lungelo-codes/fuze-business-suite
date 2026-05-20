import { NextResponse } from "next/server";
import { erpList, erpMethod } from "@/lib/server/erpnext";
import { createModuleRow } from "@/lib/server/moduleApi";

type Row = Record<string, any>;
function rowsFrom(value: unknown): Row[] { const v = value as any; if (Array.isArray(v)) return v; if (Array.isArray(v?.data)) return v.data; if (Array.isArray(v?.message)) return v.message; if (Array.isArray(v?.contracts)) return v.contracts; if (Array.isArray(v?.records)) return v.records; if (Array.isArray(v?.data?.contracts)) return v.data.contracts; if (Array.isArray(v?.message?.contracts)) return v.message.contracts; return []; }
function normalise(r: Row): Row { return { id: r.name || r.id, name: r.name || r.id, title: r.contract_name || r.title || r.name, customer: r.party_name || r.customer, customer_name: r.customer_name || r.party_name || r.customer, status: r.status || "Draft", start_date: r.start_date, end_date: r.end_date, grand_total: r.grand_total || r.contract_value, currency: r.currency || "ZAR", ...r }; }
async function fallback(limit: number): Promise<Row[]> { return erpList<Row>("Contract", { fields: ["name","party_type","party_name","start_date","end_date","status","modified"], limit, orderBy: "modified desc" }); }

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const limit = Number(p.get("limit") || 80);
  const args = { limit, offset: Number(p.get("offset") || 0), customer: p.get("customer") || undefined };
  try {
    let rows: Row[] = [];
    try { rows = rowsFrom(await erpMethod("crm.get_contracts", args)); } catch { rows = []; }
    if (!rows.length) rows = await fallback(limit);
    const data = rows.map(normalise);
    return NextResponse.json({ success: true, data, contracts: data, count: data.length });
  } catch { return NextResponse.json({ success: true, data: [], contracts: [], count: 0 }); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const data = { ...body, party_type: body.party_type || "Customer", party_name: body.party_name || body.customer || body.customer_name, status: body.status || "Unsigned" };
    const created = await createModuleRow("contracts", data || {});
    return NextResponse.json({ success: true, data: normalise(created), contract: normalise(created) }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not create contract. Check the customer and dates." }, { status: e?.status || 500 });
  }
}
