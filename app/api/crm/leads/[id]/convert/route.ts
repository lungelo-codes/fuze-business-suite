import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
import { requireSaaSUser, safeJsonError, tenantArgs, tenantData } from "@/lib/server/apiGuard";

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  try {
    const session = requireSaaSUser();
    const body = await req.json().catch(() => ({}));
    const result = await erpMethod("fuze_suite.api.crm.convert_lead", tenantArgs({ lead: params.id, data: tenantData(body, session) }, session));
    return NextResponse.json({ ok: true, data: result });
  } catch (e: unknown) {
    return safeJsonError(e, "Could not convert lead.");
  }
}
