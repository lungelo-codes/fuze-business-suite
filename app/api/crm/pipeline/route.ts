import { NextResponse } from "next/server";
import { crmGetPipeline, crmGetLeads, crmGetCustomers } from "@/lib/server/apiClient";
import { erpPatch } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const stage = searchParams.get("stage") || undefined;
    const search = searchParams.get("search") || undefined;

    const [pipelineData, leadsData, customersData] = await Promise.allSettled([
      crmGetPipeline({ limit: 200, stage, search }),
      crmGetLeads({ limit: 200, search }),
      crmGetCustomers({ limit: 50 }),
    ]);

    const pipeline = pipelineData.status === "fulfilled" ? (pipelineData.value as Record<string, unknown>) : {};
    const leadsResult = leadsData.status === "fulfilled" ? (leadsData.value as Record<string, unknown>) : {};
    const customersResult = customersData.status === "fulfilled" ? (customersData.value as Record<string, unknown>) : {};

    return NextResponse.json({ pipeline, leads: leadsResult, customers: customersResult });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load pipeline" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { kind?: string; name?: string; status?: string };
    if (!body.name || !body.status) {
      return NextResponse.json({ error: "Record name and status are required" }, { status: 400 });
    }
    const isOpportunity = body.kind === "opportunity";
    const doctype = isOpportunity ? "Opportunity" : "Lead";
    const data = await erpPatch(doctype, body.name, { status: body.status });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update pipeline" }, { status: 500 });
  }
}
