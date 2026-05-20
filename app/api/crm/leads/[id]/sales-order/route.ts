import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await erpMethod("crm.create_crm_sales_document", {
      kind: "sales-order",
      reference_doctype: "Lead",
      reference_name: params.id,
      lead: params.id,
      data: body,
    });
    const data = (result as any)?.data || (result as any)?.message || result || {};
    return NextResponse.json({ success: true, data, sales_order: data?.sales_order || data?.document || data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Could not save data" }, { status: error?.status || 500 });
  }
}
