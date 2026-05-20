import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

type Row = Record<string, any>;

function rows(value: any, keys: string[] = []): Row[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.message)) return value.message;
  for (const key of keys) if (Array.isArray(value?.[key])) return value[key];
  return [];
}

function normaliseLead(row: Row): Row {
  return {
    ...row,
    name: row.name || row.id,
    lead_name: row.lead_name || row.name || row.full_name || row.id,
    company_name: row.company_name || row.company || row.organization,
    status: row.status || row.stage || "Lead",
  };
}

function normaliseDeal(row: Row): Row {
  return {
    ...row,
    name: row.name || row.id,
    party_name: row.party_name || row.organization || row.company || row.title || row.id,
    opportunity_from: row.opportunity_from || row.reference_doctype || "CRM",
    opportunity_amount: row.opportunity_amount || row.deal_value || row.value || row.raw_value || 0,
    status: row.stage || row.sales_stage || row.status || "Open",
  };
}

async function safeMethod(method: string, args: Row, keys: string[]): Promise<Row[]> {
  try {
    const result = await erpMethod<any>(method, args);
    return rows(result, keys);
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const search = params.get("search") || undefined;
  const stage = params.get("stage") || undefined;
  const owner = params.get("owner") || undefined;
  const limit = Number(params.get("limit") || 120);
  const offset = Number(params.get("offset") || 0);

  const [leadRows, dealRows] = await Promise.all([
    safeMethod("crm.get_leads", { limit, offset, search, status: stage, owner }, ["leads"]),
    safeMethod("crm.get_pipeline", { limit, offset, search, stage, owner }, ["deals", "opportunities", "pipeline"]),
  ]);

  return NextResponse.json({
    success: true,
    leads: leadRows.map(normaliseLead),
    opportunities: dealRows.map(normaliseDeal),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as { kind?: string; name?: string; status?: string; stage?: string };
    if (!body.name || !(body.status || body.stage)) {
      return NextResponse.json({ error: "Record and stage are required" }, { status: 400 });
    }

    const stage = body.status || body.stage || "Open";
    const isOpportunity = body.kind === "opportunity" || body.kind === "deal";
    const method = isOpportunity ? "crm.update_deal" : "crm.update_lead";
    const args = isOpportunity
      ? { deal: body.name, data: { status: stage, stage, sales_stage: stage } }
      : { lead: body.name, data: { status: stage, stage } };

    const data = await erpMethod(method, args);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update pipeline" }, { status: 500 });
  }
}
