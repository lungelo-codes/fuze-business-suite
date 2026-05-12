import { NextResponse } from "next/server";
import { erpList, erpPatch } from "@/lib/server/erpnext";

type Row = Record<string, unknown>;

async function safeList(doctype: "Lead" | "Opportunity", fieldGroups: string[][]) {
  for (const fields of fieldGroups) {
    try {
      return await erpList<Row>(doctype, { fields, limit: 100, orderBy: "modified desc" });
    } catch {
      // Try the next smaller field set. ERPNext can reject fields per role/site.
    }
  }
  return [];
}

export async function GET() {
  const [leads, opportunities] = await Promise.all([
    safeList("Lead", [
      ["name","lead_name","company_name","status","email_id","mobile_no","territory","modified"],
      ["name","lead_name","company_name","status","email_id","modified"],
      ["name","lead_name","status","modified"],
      ["name","modified"],
    ]),
    safeList("Opportunity", [
      ["name","party_name","opportunity_from","status","opportunity_amount","expected_closing","modified"],
      ["name","party_name","status","modified"],
      ["name","modified"],
    ]),
  ]);
  return NextResponse.json({ leads, opportunities });
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as { kind?: string; name?: string; status?: string };
    if (!body.name || !body.status) return NextResponse.json({ error: "Record and status are required" }, { status: 400 });
    const isOpportunity = body.kind === "opportunity";
    const doctype = isOpportunity ? "Opportunity" : "Lead";
    const update: Record<string, unknown> = { status: body.status };

    const data = await erpPatch(doctype, body.name, update);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update pipeline" }, { status: 500 });
  }
}
