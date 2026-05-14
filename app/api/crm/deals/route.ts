import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

/**
 * GET  /api/crm/deals
 *   ?limit=50&offset=0&stage=Qualification&search=acme&owner=user@example.com
 *
 * POST /api/crm/deals
 *   body: { lead_name, organization, status, deal_value, currency,
 *           expected_closing, probability, deal_owner, source, contacts[] }
 */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const args: Record<string, string | number> = {};

  const limit  = searchParams.get("limit");
  const offset = searchParams.get("offset");
  const stage  = searchParams.get("stage");
  const search = searchParams.get("search");
  const owner  = searchParams.get("owner");

  if (limit)  args.limit  = Number(limit);
  if (offset) args.offset = Number(offset);
  if (stage && stage !== "all") args.stage = stage;
  if (search) args.search = search;
  if (owner)  args.owner  = owner;

  try {
    const result = await erpMethod("fuze_suite.api.crm.get_pipeline", args);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch deals" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await erpMethod("fuze_suite.api.crm.create_deal", { data: body });
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to create deal" },
      { status: 500 }
    );
  }
}
