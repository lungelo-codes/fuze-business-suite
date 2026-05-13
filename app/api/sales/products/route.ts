import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

// Products endpoint. Lists items/products with optional search or item group filter
// and pagination. Delegates to sales.get_products.
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const search = params.get("search") || undefined;
    const item_group = params.get("item_group") || undefined;
    const limitStr = params.get("limit");
    const offsetStr = params.get("offset");
    const args: any = {};
    if (search) args.search = search;
    if (item_group) args.item_group = item_group;
    if (limitStr) args.limit = parseInt(limitStr, 10);
    if (offsetStr) args.offset = parseInt(offsetStr, 10);
    const result = await erpMethod("sales.get_products", args);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch products";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}