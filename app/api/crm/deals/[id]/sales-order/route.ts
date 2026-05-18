import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
type Params = { params: { id: string } };
export async function POST(req: Request, { params }: Params) {
  try { const body = await req.json(); const result = await erpMethod("fuze_suite.api.crm.create_sales_order_from_crm", { deal: params.id, data: body }); return NextResponse.json(result, { status: 201 }); }
  catch (error: any) { return NextResponse.json({ error: error?.message || "Failed to create sales order" }, { status: 500 }); }
}
