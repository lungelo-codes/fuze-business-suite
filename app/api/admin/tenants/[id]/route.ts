import { NextResponse } from "next/server";
import { erpPatch } from "@/lib/server/erpnext";
const ALLOWED_STATUSES = ["Draft", "Provisioning", "Active", "Suspended", "Failed", "Cancelled"];
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if (body.status) {
      const status = String(body.status);
      if (!ALLOWED_STATUSES.includes(status)) return NextResponse.json({ error: "Invalid tenant status" }, { status: 400 });
      update.status = status;
    }
    if (body.trial_end) update.trial_end = String(body.trial_end);
    if (body.admin_email) update.admin_email = String(body.admin_email);
    if (Object.keys(update).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    const tenant = await erpPatch("Fuze SaaS Tenant", params.id, update);
    return NextResponse.json({ success: true, tenant });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update tenant" }, { status: 500 });
  }
}
