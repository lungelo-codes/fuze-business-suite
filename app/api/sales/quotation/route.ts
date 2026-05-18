import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

// Single quotation endpoint. Requires a `name` parameter to identify the quotation.
// Returns the full document as provided by sales.get_quotation.
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const name = params.get("name");
    if (!name) {
      return NextResponse.json({ error: "Parameter 'name' is required" }, { status: 400 });
    }
    const result = await erpMethod("fuze_suite.api.sales.get_quotation", { name });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch quotation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}