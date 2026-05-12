import { NextResponse } from "next/server";
import { erpPatch, erpGet } from "@/lib/server/erpnext";

const ALLOWED_STATUSES = ["Draft", "Provisioning", "Active", "Suspended", "Failed", "Cancelled"];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const res = await erpGet<{ data?: unknown; message?: unknown }>(
      `/api/resource/Fuze%20SaaS%20Tenant/${encodeURIComponent(params.id)}`
    );
    const tenant = res.data ?? res.message;
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    return NextResponse.json(tenant);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not fetch tenant" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const update: Record<string, unknown> = {};

    // Support shorthand action: "activate" | "suspend" | "cancel"
    if (body.action === "activate") {
      update.status = "Active";
    } else if (body.action === "suspend") {
      update.status = "Suspended";
    } else if (body.action === "cancel") {
      update.status = "Cancelled";
    }

    // Direct field updates
    if (body.status) {
      const status = String(body.status);
      if (!ALLOWED_STATUSES.includes(status)) {
        return NextResponse.json({ error: "Invalid tenant status" }, { status: 400 });
      }
      update.status = status;
    }
    if (body.trial_end) update.trial_end = String(body.trial_end);
    if (body.admin_email) update.admin_email = String(body.admin_email);
    if (body.subscription) update.subscription = String(body.subscription);

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const tenant = await erpPatch("Fuze SaaS Tenant", params.id, update);
    return NextResponse.json({
      success: true,
      message: `Tenant updated successfully`,
      tenant,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update tenant" },
      { status: 500 }
    );
  }
}
