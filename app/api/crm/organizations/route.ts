import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

/**
 * GET  /api/crm/organizations  ?limit=50&offset=0&search=acme
 * POST /api/crm/organizations  body: { organization_name, website, territory, annual_revenue, industry, no_of_employees, city, country }
 */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const args: Record<string, string | number> = {};

  const limit  = searchParams.get("limit");
  const offset = searchParams.get("offset");
  const search = searchParams.get("search");

  if (limit)  args.limit  = Number(limit);
  if (offset) args.offset = Number(offset);
  if (search) args.search = search;

  try {
    const result = await erpMethod("crm.get_organizations", args);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await erpMethod("crm.create_organization", { data: body });
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to create organization" },
      { status: 500 }
    );
  }
}
