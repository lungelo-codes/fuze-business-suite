import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await erpMethod("crm.create_crm_sales_document", {
      kind: "quote",
      reference_doctype: "Opportunity",
      reference_name: params.id,
      deal: params.id,
      data: body,
    });
    const data = (result as any)?.data || (result as any)?.message || result || {};
    return NextResponse.json({ success: true, data, quotation: data?.quotation || data?.document || data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Could not save data" }, { status: error?.status || 500 });
  }
}
