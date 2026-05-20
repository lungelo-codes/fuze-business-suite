import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
import { createCrmSalesDocument } from "@/lib/server/crmDocs";

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  const body = await req.json().catch(() => ({}));
  try {
    const result = await erpMethod("fuze_suite.api.crm.create_contract_from_crm", { lead: params.id, data: body });
    const data = (result as any)?.data || (result as any)?.message || result;
    if (data && !((data as any).success === false) && !((data as any).error)) {
      return NextResponse.json({ success: true, data, contract: data }, { status: 201 });
    }
  } catch {
    // Fall back to the controlled Business Suite document path below.
  }

  try {
    const row = await createCrmSalesDocument("lead", params.id, "contract", body);
    return NextResponse.json({ success: true, data: row, contract: row }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Could not create contract" }, { status: error?.status || 500 });
  }
}
