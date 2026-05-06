import { NextResponse } from "next/server";
import { erpPatch, erpMethod } from "@/lib/server/erpnext";

const ALLOWED_STATUSES = ["Draft", "Provisioning", "Active", "Suspended", "Failed", "Cancelled"];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const update: Record<string, unknown> = {};

    if (body.action === "activate") update.status = "Active";
    if (body.action === "suspend") update.status = "Suspended";

    if (body.status) {
      const status = String(body.status);
      if (!ALLOWED_STATUSES.includes(status)) return NextResponse.json({ error: "Invalid tenant status" }, { status: 400 });
      update.status = status;
    }
    if (body.trial_end) update.trial_end = String(body.trial_end);
    if (body.admin_email) update.admin_email = String(body.admin_email);

    if (Object.keys(update).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    const tenant = await erpPatch("Fuze SaaS Tenant", params.id, update);
    return NextResponse.json({ success: true, message: "Tenant updated", tenant });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update tenant" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json()) as { action?: string };
    if (body.action !== "rerun_provisioning") {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }
    const result = await erpMethod("fuze_suite.api.saas.rerun_tenant_provisioning", { tenant: params.id }, { useToken: true });
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Action failed" }, { status: 500 });
  }
}
