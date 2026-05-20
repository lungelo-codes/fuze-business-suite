import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
import { createCrmSalesDocument } from "@/lib/server/crmDocs";

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  const body = await req.json().catch(() => ({}));
  try {
    const result = await erpMethod("fuze_suite.api.crm.create_invoice_from_crm", { deal: params.id, data: body });
    const data = (result as any)?.data || (result as any)?.message || result;
    if (data && !((data as any).success === false) && !((data as any).error)) {
      return NextResponse.json({ success: true, data, invoice: data }, { status: 201 });
    }
  } catch {
    // Fall back to the controlled Business Suite document path below.
  }

  try {
    const row = await createCrmSalesDocument("deal", params.id, "invoice", body);
    return NextResponse.json({ success: true, data: row, invoice: row }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Could not create invoice" }, { status: error?.status || 500 });
  }
}
