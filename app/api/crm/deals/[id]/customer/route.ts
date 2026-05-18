import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await erpMethod("fuze_suite.api.crm.convert_deal_to_customer", { deal: params.id, data: body });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to convert opportunity to customer" }, { status: 500 });
  }
}
