import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

/**
 * GET  /api/crm/leads
 *   ?limit=50&offset=0&status=Open&search=acme&source=Website&owner=user@example.com
 *
 * POST /api/crm/leads
 *   body: { first_name, last_name, company, email, phone, source, status, lead_owner, website, city, country }
 */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const args: Record<string, string | number> = {};

  const limit  = searchParams.get("limit");
  const offset = searchParams.get("offset");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const source = searchParams.get("source");
  const owner  = searchParams.get("owner");

  if (limit)  args.limit  = Number(limit);
  if (offset) args.offset = Number(offset);
  if (status && status !== "all") args.status = status;
  if (search) args.search = search;
  if (source) args.source = source;
  if (owner)  args.owner  = owner;

  try {
    const result = await erpMethod("crm.get_leads", args);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await erpMethod("crm.create_lead", { data: body });
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to create lead" },
      { status: 500 }
    );
  }
}
