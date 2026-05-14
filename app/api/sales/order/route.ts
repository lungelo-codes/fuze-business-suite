import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

// Single sales order endpoint. Requires a `name` parameter to identify the order.
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const name = params.get("name");
    if (!name) {
      return NextResponse.json({ error: "Parameter 'name' is required" }, { status: 400 });
    }
    const result = await erpMethod("sales.get_sales_order", { name });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch sales order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}