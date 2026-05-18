import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

type Params = { params: { id: string } };

/**
 * GET    /api/crm/deals/[id]   – full deal + linked activity
 * PUT    /api/crm/deals/[id]   – partial update
 *   Special body key: { _action: "lost", lost_reason?, notes? } → calls crm.mark_deal_lost
 * DELETE /api/crm/deals/[id]   – not usually needed; kept for admin use
 */

export async function GET(_req: Request, { params }: Params) {
  try {
    const result = await erpMethod("fuze_suite.api.crm.get_deal", { deal: params.id });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Deal not found" },
      { status: 404 }
    );
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const body = await req.json();

    // Support marking a deal as lost via PUT with _action: "lost"
    if (body._action === "lost") {
      const result = await erpMethod("fuze_suite.api.crm.mark_deal_lost", {
        deal: params.id,
        lost_reason: body.lost_reason ?? null,
        notes: body.notes ?? null,
      });
      return NextResponse.json(result);
    }

    const result = await erpMethod("fuze_suite.api.crm.update_deal", { deal: params.id, data: body });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update deal" },
      { status: 500 }
    );
  }
}
