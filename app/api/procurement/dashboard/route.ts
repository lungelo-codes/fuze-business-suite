import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

// Procurement dashboard endpoint. Returns summary metrics for suppliers,
// purchase orders, receipts, bills, and inventory.
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const company = params.get("company") || undefined;
    const result = await erpMethod("procurement.get_dashboard", company ? { company } : {});
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch procurement dashboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}