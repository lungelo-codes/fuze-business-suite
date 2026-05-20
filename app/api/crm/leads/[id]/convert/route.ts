import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

type Params = { params: { id: string } };

/**
 * POST /api/crm/leads/[id]/convert
 * body: { organization?, contact?, create_organization?, create_contact? }
 *
 * Converts a CRM Lead → CRM Deal (CRM engine) or Opportunity.
 */
export async function POST(req: Request, { params }: Params) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await erpMethod("fuze_suite.api.crm.convert_lead_to_deal", {
      lead: params.id,
      organization:         body.organization         ?? null,
      contact:              body.contact              ?? null,
      create_organization:  body.create_organization  ?? true,
      create_contact:       body.create_contact       ?? true,
      data:                 body,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to convert lead" },
      { status: 500 }
    );
  }
}
