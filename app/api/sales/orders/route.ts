import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

// Sales orders endpoint. Lists orders with optional status filter and company scope.
// Pagination supported via limit and offset.
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const company = params.get("company") || undefined;
    const status = params.get("status") || undefined;
    const limitStr = params.get("limit");
    const offsetStr = params.get("offset");
    const args: any = {};
    if (company) args.company = company;
    if (status && status !== "all") args.status = status;
    if (limitStr) args.limit = parseInt(limitStr, 10);
    if (offsetStr) args.offset = parseInt(offsetStr, 10);
    const result = await erpMethod("fuze_suite.api.sales.get_sales_orders", args);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch sales orders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}