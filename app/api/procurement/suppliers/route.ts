import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

// Procurement suppliers endpoint. Lists suppliers with optional search query and
// pagination. Delegates to procurement.get_suppliers.
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const limitStr = params.get("limit");
    const offsetStr = params.get("offset");
    const search = params.get("search") || undefined;
    const args: any = {};
    if (limitStr) args.limit = parseInt(limitStr, 10);
    if (offsetStr) args.offset = parseInt(offsetStr, 10);
    if (search) args.search = search;
    const result = await erpMethod("procurement.get_suppliers", args);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch suppliers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}