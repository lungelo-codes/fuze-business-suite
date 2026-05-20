import { NextResponse } from "next/server";
import { erpList, erpMethod } from "@/lib/server/erpnext";
import { createModuleRow } from "@/lib/server/moduleApi";

type Row = Record<string, any>;
function rowsFrom(value: unknown): Row[] { const v = value as any; if (Array.isArray(v)) return v; if (Array.isArray(v?.data)) return v.data; if (Array.isArray(v?.message)) return v.message; if (Array.isArray(v?.contracts)) return v.contracts; if (Array.isArray(v?.records)) return v.records; if (Array.isArray(v?.data?.contracts)) return v.data.contracts; if (Array.isArray(v?.message?.contracts)) return v.message.contracts; return []; }
function normalise(r: Row): Row { return { id: r.name || r.id, name: r.name || r.id, title: r.contract_name || r.title || r.name, customer: r.party_name || r.customer, customer_name: r.customer_name || r.party_name || r.customer, status: r.status || "Draft", start_date: r.start_date, end_date: r.end_date, grand_total: r.grand_total || r.contract_value, currency: r.currency || "ZAR", ...r }; }

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const args = { limit: Number(p.get("limit") || 80), offset: Number(p.get("offset") || 0), customer: p.get("customer") || undefined };
  try {
    let rows = rowsFrom(await erpMethod("crm.get_contracts", args));
    if (!rows.length) rows = await erpList<Row>("Contract", { fields: ["name","contract_name","party_type","party_name","start_date","end_date","status","modified"], limit: args.limit, orderBy: "modified desc" });
    const data = rows.map(normalise);
    return NextResponse.json({ success: true, data, contracts: data, count: data.length });
  } catch {
    return NextResponse.json({ success: true, data: [], contracts: [], count: 0 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const created = await createModuleRow("contracts", body || {});
    return NextResponse.json({ success: true, data: normalise(created), contract: normalise(created) }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not create contract. Check the customer and dates." }, { status: e?.status || 500 });
  }
}
